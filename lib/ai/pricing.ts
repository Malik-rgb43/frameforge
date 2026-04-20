// Gemini / NanoBanana API pricing (as of 2026 public pricing).
// All values in USD. Used to compute per-call cost and power Usage dashboard.

export interface ModelPricing {
  id: string;
  label: string;
  hint: string;
  kind: "image" | "text";
  /** USD per image (flat) */
  perImage?: number;
  /** USD per 1K input tokens */
  perInputK?: number;
  /** USD per 1K output tokens */
  perOutputK?: number;
  /** Output resolution max */
  maxResolution?: string;
  /** Whether this model supports reference images */
  supportsRefs?: boolean;
}

export const IMAGE_MODELS: ModelPricing[] = [
  {
    id: "nanobanana-pro",
    label: "NanoBanana Pro",
    hint: "Gemini 3 Pro Image · premium quality · 4K",
    kind: "image",
    perImage: 0.04,
    maxResolution: "4K",
    supportsRefs: true,
  },
  {
    id: "nanobanana-2",
    label: "NanoBanana 2",
    hint: "Gemini 3.1 Flash Image · fast · 4K",
    kind: "image",
    perImage: 0.01,
    maxResolution: "4K",
    supportsRefs: true,
  },
  {
    id: "nanobanana-flash",
    label: "NanoBanana Flash",
    hint: "Gemini 2.5 Flash Image · drafts only",
    kind: "image",
    perImage: 0.005,
    maxResolution: "1080p",
    supportsRefs: true,
  },
];

export const TEXT_MODELS: ModelPricing[] = [
  {
    id: "gemini-3-pro",
    label: "Gemini 3 Pro",
    hint: "Reasoning + concepts",
    kind: "text",
    perInputK: 0.0015,
    perOutputK: 0.006,
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    hint: "Fast text",
    kind: "text",
    perInputK: 0.00015,
    perOutputK: 0.0006,
  },
];

export function getImageModel(id: string): ModelPricing {
  return IMAGE_MODELS.find((m) => m.id === id) ?? IMAGE_MODELS[0];
}

export function getTextModel(id: string): ModelPricing {
  return TEXT_MODELS.find((m) => m.id === id) ?? TEXT_MODELS[0];
}

export function estimateImageCost(modelId: string, count = 1): number {
  const m = getImageModel(modelId);
  return (m.perImage ?? 0) * count;
}

export function estimateTextCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const m = getTextModel(modelId);
  return (
    ((m.perInputK ?? 0) * inputTokens + (m.perOutputK ?? 0) * outputTokens) /
    1000
  );
}

export function formatUsd(v: number): string {
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
}
