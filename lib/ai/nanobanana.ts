// NanoBanana (Gemini Image) wrapper.
// Generates images and reports cost so the Usage dashboard has real numbers.

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

const MODEL_TO_API: Record<string, string> = {
  "nanobanana-pro": "gemini-3-pro-image-preview",
  "nanobanana-2": "gemini-3.1-flash-image-preview",
  "nanobanana-flash": "gemini-2.5-flash-image",
};

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

async function callNanaBananaOnce(
  prompt: string,
  opts: NanoBananaCallOptions,
  started: number
): Promise<NanoBananaResult> {
  const modelId = opts.modelId ?? "nanobanana-pro";
  const apiModel = MODEL_TO_API[modelId];

  // Abort early if caller already cancelled
  if (opts.signal?.aborted) {
    throw new Error("NanaBanana call aborted before start");
  }

  const client = getClient();

  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];
  if (opts.refImages) {
    for (const ref of opts.refImages.slice(0, 4)) {
      parts.push({
        inlineData: { data: ref.base64, mimeType: ref.mimeType },
      });
    }
  }

  // Aspect ratio passes via generationConfig per @google/genai 0.8+
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    responseModalities: ["IMAGE"],
    imageConfig: {
      aspectRatio: opts.aspectRatio ?? "9:16",
    },
    ...(opts.seed != null ? { seed: opts.seed } : {}),
  };

  const response = await client.models.generateContent({
    model: apiModel,
    contents: [{ role: "user", parts }],
    config,
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error("NanoBanana returned no image");
  }

  const costUsd = estimateImageCost(modelId, 1);

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
    usage: {
      model: modelId,
      imagesGenerated: 1,
      costUsd,
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
