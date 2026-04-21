// Shared helpers for injecting Project Brief context into AI calls.
// Import from here — don't duplicate in each feature file.

import { briefAsContext, type ProjectBrief, EMPTY_BRIEF } from "@/features/brief/brief-types";
import type { Project } from "@/lib/supabase/types";

function getCachedProject(): Project | null {
  try {
    if (typeof window === "undefined") return null;
    const cached = sessionStorage.getItem("ff.active.project");
    if (!cached) return null;
    return JSON.parse(cached) as Project;
  } catch {
    return null;
  }
}

/** Returns the full PROJECT BRIEF block as a string, ready to prepend to any AI prompt. */
export function getBriefText(): string {
  const p = getCachedProject();
  if (!p?.brief) return "";
  return briefAsContext({ ...EMPTY_BRIEF, ...(p.brief as unknown as ProjectBrief) });
}

/** Returns product_images from the brief as base64 refs for NanoBanana (max 2). */
export function getBriefProductImages(): Array<{ base64: string; mimeType: string }> {
  const p = getCachedProject();
  const productImages = (p?.brief as unknown as ProjectBrief | null)?.product_images ?? [];
  return productImages.slice(0, 2).flatMap((dataUrl) => {
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) return [];
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg";
    return [{ base64, mimeType }];
  });
}

/** Returns a compact product snapshot (name + description) for inline prompt injection. */
export function getBriefProductSnapshot(): string {
  const p = getCachedProject();
  if (!p?.brief) return "";
  const brief = { ...EMPTY_BRIEF, ...(p.brief as unknown as ProjectBrief) };
  const parts: string[] = [];
  if (brief.productName) parts.push(`Product: ${brief.productName}`);
  if (brief.productDescription) parts.push(`Description: ${brief.productDescription}`);
  if (brief.brandVoice) parts.push(`Voice: ${brief.brandVoice}`);
  if (brief.goal) parts.push(`Goal: ${brief.goal}`);
  return parts.join(" | ");
}
