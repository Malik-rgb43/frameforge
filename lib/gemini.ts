// Thin wrapper around @google/generative-ai for text + image generation.
// Used server-side in API routes. Never import this from a client component.

import { GoogleGenerativeAI } from "@google/generative-ai";

function getKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function isGeminiConfigured(): boolean {
  return !!getKey();
}

function client() {
  const key = getKey();
  if (!key) throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set. Add it to your environment.");
  return new GoogleGenerativeAI(key);
}

// ─────────────────────────────────────────────────────────
// Text generation — concepts, video prompts
// ─────────────────────────────────────────────────────────
export async function generateText(system: string, user: string, opts?: { json?: boolean; model?: string }): Promise<string> {
  const genAI = client();
  const model = genAI.getGenerativeModel({
    model: opts?.model || "gemini-2.5-flash",
    systemInstruction: system,
    generationConfig: opts?.json
      ? { responseMimeType: "application/json", temperature: 0.8 }
      : { temperature: 0.8 },
  });
  const result = await model.generateContent(user);
  return result.response.text();
}

// ─────────────────────────────────────────────────────────
// Image generation — variants, shot frames
// Returns a base64-encoded PNG buffer.
// ─────────────────────────────────────────────────────────
export async function generateImage(prompt: string, referenceImages?: Array<{ data: string; mimeType: string }>): Promise<{ base64: string; mimeType: string }> {
  const genAI = client();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
  });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];
  if (referenceImages) {
    for (const ref of referenceImages) {
      parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } });
    }
  }

  const result = await model.generateContent(parts);
  const response = result.response;
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates.");
  }
  const content = candidates[0].content;
  if (!content || !content.parts) {
    throw new Error("Gemini response has no content.");
  }
  for (const part of content.parts) {
    const p = part as { inlineData?: { data: string; mimeType?: string } };
    if (p.inlineData?.data) {
      return {
        base64: p.inlineData.data,
        mimeType: p.inlineData.mimeType || "image/png",
      };
    }
  }
  throw new Error("Gemini response had no image data (only text).");
}

// Fetch a URL and return base64 + mimeType, for use as a reference image.
export async function fetchAsInlineData(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
  const buf = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") || "image/png";
  return { data: Buffer.from(buf).toString("base64"), mimeType };
}
