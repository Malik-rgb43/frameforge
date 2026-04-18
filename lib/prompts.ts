// FrameForge prompt system — structured templates for every AI task.
// Each function returns a complete prompt string with clear instructions,
// guardrails, and output format.

export interface Brief {
  projectName: string;
  client: string;
  goal: string;
  audience: string;
  placements: string[];
  mustInclude: string[];
  aspect: "9:16" | "1:1" | "16:9" | "4:5";
}

// ─────────────────────────────────────────────────────────
// Concept generation — from brief + references → 5 concepts
// ─────────────────────────────────────────────────────────
export function conceptSystemPrompt(): string {
  return `You are a senior creative director at a film-grade ad agency. You turn briefs into 5 distinct, production-ready video concepts for short-form ads (Reels, TikTok, YouTube Pre-roll).

Each concept must be:
- Cinematic and visually compelling, not generic
- Executable with image-to-video AI models (Seedance 2, Kling 3)
- Distinct from the others — different pacing, tone, and visual language

For each concept you must provide:
- title: 2-4 words (e.g. "Weightless Ritual")
- hook: 1-2 sentences describing the visual spine
- vibe: 3 tags (e.g. ["cinematic", "slow", "luxe"])
- palette: 3 hex colors that define the visual mood
- length_seconds: integer 6-20
- shot_count: integer 1-8

Return ONLY valid JSON as an array of 5 concepts. No prose before or after. No markdown fences.`;
}

export function conceptUserPrompt(brief: Brief, refCount: number): string {
  return `Brief:
- Project: ${brief.projectName}
- Client: ${brief.client}
- Goal: ${brief.goal}
- Audience: ${brief.audience}
- Placements: ${brief.placements.join(", ")}
- Must include: ${brief.mustInclude.join(", ")}
- Aspect ratio: ${brief.aspect}
- Reference images attached: ${refCount}

Generate exactly 5 distinct concepts as a JSON array.`;
}

// ─────────────────────────────────────────────────────────
// Shot image prompt — given concept + reference → image generation prompt
// ─────────────────────────────────────────────────────────
export function shotImagePrompt(conceptTitle: string, conceptHook: string, shotNumber: number, totalShots: number, productDescription: string): string {
  return `Generate a single high-end, cinematic product-ad frame.

Concept: "${conceptTitle}" — ${conceptHook}
Shot ${shotNumber} of ${totalShots}.
Product: ${productDescription}

Requirements:
- Photorealistic, 35mm lens feel, shallow depth of field
- Moody cinematic color grade (not flat stock photo)
- Product sharp and hero-framed
- No text overlays, no watermarks
- Aspect: matches project aspect ratio`;
}

// ─────────────────────────────────────────────────────────
// Image-to-video prompt — given generated frame + context → motion prompt
// ─────────────────────────────────────────────────────────
export function videoPromptSystemPrompt(): string {
  return `You write image-to-video prompts for Seedance 2 and Kling 3. You take a still frame plus a shot brief and output a motion prompt that describes exactly how the camera, subject, and lighting should move over 2-4 seconds.

Rules:
- Describe motion in cinematographer terms: "slow dolly in", "whip pan", "orbital pan", "macro ripple", "rack focus"
- Describe subject motion: "droplet falls", "bottle rotates a quarter turn", "liquid pours"
- Describe lighting shifts if any
- Keep it under 60 words. Motion only — the image already establishes composition.
- Do NOT describe the still frame's content (the model can see it)
- End on a clear final beat: "ends on the label crisp and centered", "ends with droplet suspended mid-air"

Return only the motion prompt, no preamble, no formatting.`;
}

export function videoPromptUserPrompt(shotTitle: string, conceptTitle: string, durationSec: number, model: "seedance-2" | "kling-3"): string {
  return `Shot: "${shotTitle}"
Part of concept: "${conceptTitle}"
Duration: ${durationSec}s
Target model: ${model === "seedance-2" ? "Seedance 2 (realistic, fast)" : "Kling 3 (premium cinematic)"}

Write the motion prompt.`;
}

// ─────────────────────────────────────────────────────────
// Variant prompt — given a reference image + user intent → N variations
// ─────────────────────────────────────────────────────────
export function variantImagePrompt(basePrompt: string, variantIdx: number, total: number): string {
  const angles = ["hero front-facing", "3/4 angle", "extreme macro detail", "overhead flat-lay", "in-context lifestyle", "rim-lit silhouette"];
  const angle = angles[variantIdx % angles.length];
  return `${basePrompt}

Variant ${variantIdx + 1} of ${total} — shoot this as a ${angle}. Keep the product identity, palette, and mood consistent with the reference. Change only the framing, angle, and depth.`;
}
