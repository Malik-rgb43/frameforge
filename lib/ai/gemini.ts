// Gemini 3 Pro / Flash wrapper for text generation.
// Returns structured JSON plus usage metrics for cost tracking.

import { GoogleGenAI } from "@google/genai";
import { estimateTextCost, getTextModel } from "./pricing";

export interface GeminiResult<T> {
  data: T;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
  };
}

export interface GeminiCallOptions {
  model?: "gemini-3-pro" | "gemini-3-flash";
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
  images?: Array<{ inlineData: { mimeType: string; data: string } }>;
}

const MODEL_TO_API: Record<string, string> = {
  "gemini-3-pro": "gemini-3.1-pro-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
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

export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_GENAI_API_KEY;
}

export async function callGemini<T>(
  systemPrompt: string,
  userPrompt: string,
  opts: GeminiCallOptions = {}
): Promise<GeminiResult<T>> {
  const started = Date.now();
  const modelId = opts.model ?? "gemini-3-pro";
  const apiModel = MODEL_TO_API[modelId];

  const client = getClient();
  const userParts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
    { text: userPrompt },
  ];
  if (opts.images) {
    for (const img of opts.images) {
      userParts.push({ inlineData: { data: img.inlineData.data, mimeType: img.inlineData.mimeType } });
    }
  }
  const response = await client.models.generateContent({
    model: apiModel,
    contents: [{ role: "user", parts: userParts }],
    config: {
      systemInstruction: systemPrompt,
      temperature: opts.temperature ?? 1.0,
      responseMimeType: opts.responseMimeType ?? "application/json",
    },
  });

  const text = response.text ?? "";
  let data: T;
  try {
    data =
      opts.responseMimeType === "text/plain"
        ? ((text as unknown) as T)
        : (JSON.parse(text) as T);
  } catch (err) {
    // If the model slipped a markdown fence, strip it and retry
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    data = JSON.parse(cleaned) as T;
  }

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const costUsd = estimateTextCost(modelId, inputTokens, outputTokens);

  return {
    data,
    usage: {
      model: modelId,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs: Date.now() - started,
    },
  };
}
