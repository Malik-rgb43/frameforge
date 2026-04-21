// NanoBanana (Gemini Image) wrapper.
// Generates images and reports cost so the Usage dashboard has real numbers.
//
// Strategy:
//  • No ref images  → client.models.generateImages with imagen-3.0-generate-002
//                     (highest quality, proper aspectRatio support)
//  • With ref images → client.models.generateContent with gemini-2.0-flash-exp
//                      (supports inline image input; aspect ratio via prompt)

import { GoogleGenAI } from "@google/genai";
import { estimateImageCost, getImageModel } from "./pricing";

export interface NanoBananaResult {
  imageBase64: string;
  mimeType: string;
  usage: {
    model: string;
    imagesGenerated: number;
    costUsd: number;
    durationMs: number;
  };
}

export interface NanoBananaCallOptions {
  modelId?: "nanobanana-pro" | "nanobanana-2" | "nanobanana-flash";
  aspectRatio?: "9:16" | "1:1" | "16:9" | "4:5" | "3:4";
  thinkingLevel?: "LOW" | "HIGH";
  seed?: number;
  refImages?: Array<{ base64: string; mimeType: string }>;
  /** Optional AbortSignal — if aborted, the call throws immediately. */
  signal?: AbortSignal;
}

// Imagen 3 model — highest quality, supports aspectRatio, no ref images
const IMAGEN_MODEL = "imagen-3.0-generate-002";

// Gemini Flash Exp — supports inline image input (for refs), responseModalities IMAGE
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp";

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_client) {
    const key = process.env.GOOGLE_GENAI_API_KEY;
    if (!key) throw new Error("GOOGLE_GENAI_API_KEY not set");
    _client = new GoogleGenAI({ apiKey: key });
  }
  return _client;
}

export function isNanoBananaConfigured(): boolean {
  return !!process.env.GOOGLE_GENAI_API_KEY;
}

/** Returns true for transient errors that are safe to retry (network, 503, quota). */
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("econnreset") ||
    msg.includes("503") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
}

/** Aspect ratio → human-readable for prompt injection */
function aspectLabel(ar: string): string {
  const map: Record<string, string> = {
    "9:16": "9:16 portrait (vertical, mobile)",
    "16:9": "16:9 landscape (horizontal, widescreen)",
    "1:1": "1:1 square",
    "4:5": "4:5 portrait (Instagram feed)",
    "3:4": "3:4 portrait",
  };
  return map[ar] ?? ar;
}

async function callNanaBananaOnce(
  prompt: string,
  opts: NanoBananaCallOptions,
  started: number
): Promise<NanoBananaResult> {
  const modelId = opts.modelId ?? "nanobanana-pro";
  const hasRefs = opts.refImages && opts.refImages.length > 0;

  // Abort early if caller already cancelled
  if (opts.signal?.aborted) {
    throw new Error("NanaBanana call aborted before start");
  }

  const client = getClient();

  if (!hasRefs) {
    // ── Path A: No refs → Imagen 3 (best quality, proper aspect ratio) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.models as any).generateImages({
      model: IMAGEN_MODEL,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: opts.aspectRatio ?? "9:16",
        ...(opts.seed != null ? { seed: opts.seed } : {}),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageBytes = (response as any)?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) throw new Error("NanoBanana returned no image (Imagen path)");

    return {
      imageBase64: imageBytes,
      mimeType: "image/png",
      usage: {
        model: modelId,
        imagesGenerated: 1,
        costUsd: estimateImageCost(modelId, 1),
        durationMs: Date.now() - started,
      },
    };
  } else {
    // ── Path B: With refs → Gemini Flash Exp (supports inline image input) ──
    const aspectHint = `\n\nIMAGE ASPECT RATIO: ${aspectLabel(opts.aspectRatio ?? "9:16")} — compose and crop accordingly.`;
    const fullPrompt = prompt + aspectHint;

    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
      { text: fullPrompt },
    ];
    for (const ref of (opts.refImages ?? []).slice(0, 4)) {
      parts.push({ inlineData: { data: ref.base64, mimeType: ref.mimeType } });
    }

    const response = await client.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [{ role: "user", parts }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { responseModalities: ["IMAGE"] } as any,
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      throw new Error("NanoBanana returned no image (Gemini path)");
    }

    return {
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
      usage: {
        model: modelId,
        imagesGenerated: 1,
        costUsd: estimateImageCost(modelId, 1),
        durationMs: Date.now() - started,
      },
    };
  }
}

export async function callNanoBanana(
  prompt: string,
  opts: NanoBananaCallOptions = {}
): Promise<NanoBananaResult> {
  const started = Date.now();
  try {
    return await callNanaBananaOnce(prompt, opts, started);
  } catch (firstErr) {
    // 1 retry for transient errors (network hiccup, 503, quota backoff).
    // Non-transient errors (bad key, invalid prompt, "returned no image") are NOT retried.
    if (isTransientError(firstErr) && !opts.signal?.aborted) {
      await new Promise((r) => setTimeout(r, 2000));
      return await callNanaBananaOnce(prompt, opts, started);
    }
    throw firstErr;
  }
}
