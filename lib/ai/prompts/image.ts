import type { Brief, Concept, ImagePrompt, ShotBrief } from "./types";

// ─────────────────────────────────────────────────────────
// NanoBanana Pro image prompts — built from a ShotBrief
// using the 7-Layer Formula (subject/action/env/comp/light/style/camera).
// Natural-language mode; falls back to JSON if >3 elements.
// ─────────────────────────────────────────────────────────

export function shotToImagePrompt(
  shot: ShotBrief,
  concept: Concept,
  brief: Brief,
  totalShots: number
): ImagePrompt {
  const primary = [
    shot.visualDescription,
    shot.subjectAction,
    `Product context: ${brief.product}`,
    `Environment consistent with the concept "${concept.title}" — ${concept.visualSpine}`,
    `Camera: ${shot.cameraDirective}`,
    `Lighting: ${shot.lightingDirective}. Color temperature must match the palette mood.`,
    `Style: cinematic, 35mm film feel, analog texture, commercial-grade but not plasticky.`,
    `Palette: dominant colors ${concept.palette.join(", ")}. ${shot.paletteNote}`,
    `Shot ${shot.orderIndex + 1} of ${totalShots} — frame must work on its own AND fit the sequence.`,
    `Aspect ratio ${brief.aspect}. Single focal point, nothing competing for attention.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    primary,
    negatives: [
      "stock-photo aesthetic",
      "generic ad composition",
      "watermark",
      "text overlay unless specified",
      "UI elements",
      "waxy skin",
      "deformed hands",
      "extra fingers",
      "uncanny faces",
      "flat lighting",
      "over-processed HDR",
      "plastic product sheen",
    ],
    aspect: brief.aspect,
    modelTier: "pro",
    thinkingLevel: "HIGH",
  };
}

// ─────────────────────────────────────────────────────────
// Variant prompt — 1 shot → N compositional variations
// (different angles, crops, light setups — same DNA)
// ─────────────────────────────────────────────────────────

const VARIANT_COMPOSITIONS = [
  "eye-level hero frontal, warm rim-light from 45° behind",
  "3/4 angle, subject off-center golden-ratio, shallow DOF",
  "extreme macro — single material detail, texture hero",
  "overhead flat-lay on textured surface, soft top light",
  "handheld in-context lifestyle, subject blurred out of frame",
  "rim-lit silhouette against deep black, rembrandt key",
  "low-angle hero from floor, subject looming",
  "through-glass voyeur frame, reflections on lens",
];

export function variantImagePrompt(
  base: ImagePrompt,
  variantIdx: number,
  totalVariants: number
): ImagePrompt {
  const composition =
    VARIANT_COMPOSITIONS[variantIdx % VARIANT_COMPOSITIONS.length];

  return {
    ...base,
    primary: `${base.primary}

VARIANT ${variantIdx + 1} of ${totalVariants} — composition directive: ${composition}. Keep subject identity, palette, and mood consistent with the other variants. Change only framing, angle, and depth of field.`,
  };
}

// ─────────────────────────────────────────────────────────
// Continuity prompt — bake the prior shot as slot-1 reference
// ─────────────────────────────────────────────────────────

export function continuityImagePrompt(
  base: ImagePrompt,
  priorShot: ShotBrief
): ImagePrompt {
  return {
    ...base,
    primary: `${base.primary}

CONTINUITY DIRECTIVE: Use the attached reference image (prior frame from this sequence) as the PRIMARY identity anchor. Preserve: subject face/body, clothing, palette, lighting direction. Change only: camera angle per directive, subject action per the new frame. This must read as the next cut in the same scene, not a new scene.`,
    thinkingLevel: "HIGH",
  };
}

// ─────────────────────────────────────────────────────────
// User's raw prompt → enhanced NanoBanana prompt
// Used when the user types into the Chat Bar with refs
// ─────────────────────────────────────────────────────────

export function enhanceUserPrompt(
  userPrompt: string,
  refCount: number,
  aspect: Brief["aspect"] = "9:16",
  briefContext?: Partial<Brief>
): ImagePrompt {
  const enhanced = [
    userPrompt.trim(),
    "",
    "Production specs:",
    "- Photorealistic cinematic, 35mm film feel, subtle grain, analog texture",
    "- Shallow depth of field on the hero element",
    "- Cinematic color grade (mood-matched, never generic teal-orange)",
    "- Single clear focal point — no competing elements",
    "- Professional commercial polish — not stock, not plastic",
    `- Aspect ratio: ${aspect}`,
    briefContext?.product ? `- Product context: ${briefContext.product}` : "",
    refCount > 0
      ? `- ${refCount} reference image${refCount === 1 ? "" : "s"} attached — use them for subject identity, palette, and mood. Do NOT copy their compositions.`
      : "- No references — invent the world per the directive above.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    primary: enhanced,
    negatives: [
      "stock-photo aesthetic",
      "generic advertising composition",
      "watermark",
      "deformed hands",
      "uncanny faces",
      "flat lighting",
      "plastic product sheen",
      "AI-generated look",
    ],
    aspect,
    modelTier: "pro",
    thinkingLevel: refCount >= 2 ? "HIGH" : "LOW",
  };
}

// ─────────────────────────────────────────────────────────
// Moodboard image prompt — for concept card thumbnails
// Generates a 2x2 collage seed from a concept's DNA
// ─────────────────────────────────────────────────────────

export function conceptMoodboardPrompt(
  concept: Concept,
  tileIndex: 0 | 1 | 2 | 3
): ImagePrompt {
  const tileDirectives = [
    `a tight detail shot capturing the texture and intimacy of the mood`,
    `a wide environmental frame showing the world of the concept`,
    `a human moment — a specific subject in a specific action that embodies the insight`,
    `a graphic still-life or symbol that distills the concept to one image`,
  ];

  return {
    primary: `Moodboard tile ${tileIndex + 1}/4 for the concept "${concept.title}".
Concept insight: ${concept.coreInsight}
Visual spine: ${concept.visualSpine}
Palette: ${concept.palette.join(", ")}
Mood: ${concept.moodKeywords.join(", ")}

This tile: ${tileDirectives[tileIndex]}

Style: cinematic 35mm, analog grain, commercial art-direction. No text, no UI, no watermark. Single focal point. Must feel hand-directed, not AI-generated.`,
    negatives: [
      "stock photo",
      "text overlay",
      "watermark",
      "generic advertising",
      "collage edges",
      "multiple subjects",
    ],
    aspect: "1:1",
    modelTier: "pro",
    thinkingLevel: "LOW",
  };
}
