// NanoBanana (Gemini Image) wrapper.
// Generates images and reports cost so the Usage dashboard has real numbers.
//
// Uses gemini-2.0-flash-exp with responseModalities:["IMAGE"] for all paths.
// Aspect ratio is injected as a text instruction in the prompt.
// Ref images (style lock, product) are passed as inline inlineData parts.

import { GoogleGenAI } from "@google/genai";
import { estimateImageCost } from "./pricing";

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

// Single image model — the only Gemini model that supports responseModalities IMAGE
// with the standard Gemini Developer API key.
const IMAGE_MODEL = "gemini-2.0-flash-exp";

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

/** Aspect ratio → composition instruction appended to the prompt */
function aspectInstruction(ar: string): string {
  const label: Record<string, string> = {
    "9:16": "9:16 PORTRAIT (vertical, full-bleed mobile)",
    "16:9": "16:9 LANDSCAPE (horizontal, widescreen)",
    "1:1": "1:1 SQUARE (equal width and height)",
    "4:5": "4:5 PORTRAIT (Instagram feed)",
    "3:4": "3:4 PORTRAIT",
  };
  return `\n\nCOMPOSITION RATIO: ${label[ar] ?? ar} — generate the image in this exact aspect ratio. All composition and framing must fill this ratio with no letterboxing.`;
}

async function callNanaBananaOnce(
  prompt: string,
  opts: NanoBananaCallOptions,
  started: number
): Promise<NanoBananaResult> {
  const modelId = opts.modelId ?? "nanobanana-pro";

  // Abort early if caller already cancelled
  if (opts.signal?.aborted) {
    throw new Error("NanaBanana call aborted before start");
  }

  const client = getClient();

  // Build prompt + aspect ratio instruction
  const fullPrompt = prompt + aspectInstruction(opts.aspectRatio ?? "9:16");

  // Build content parts: prompt text first, then ref images
  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
    { text: fullPrompt },
  ];
  if (opts.refImages) {
    for (const ref of opts.refImages.slice(0, 4)) {
      parts.push({ inlineData: { data: ref.base64, mimeType: ref.mimeType } });
    }
  }

  const response = await client.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: { responseModalities: ["IMAGE"] } as any,
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    // Sometimes the model returns text describing the image instead of the image itself.
    // Log the text for debugging and surface a clear error.
    const textPart = candidate?.content?.parts?.find((p) => p.text);
    const hint = textPart?.text ? ` Model returned text: "${textPart.text.slice(0, 200)}"` : "";
    throw new Error(`NanoBanana returned no image.${hint}`);
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
