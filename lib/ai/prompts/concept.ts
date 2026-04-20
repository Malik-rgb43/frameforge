import { buildSystemPrompt } from "./principles";
import type { Brief, Concept, ReferenceDNA } from "./types";

// ─────────────────────────────────────────────────────────
// Concept generation — multiple entry points:
// 1. from brief alone
// 2. from reference images alone
// 3. from brief + references
// 4. from existing ad URL (stealth remix)
// ─────────────────────────────────────────────────────────

const CONCEPT_SCHEMA = `{
  "concepts": [
    {
      "title": "2-4 word evocative name (e.g. 'The 4am Ritual', 'Lazy Morning Upgrade')",
      "tagline": "one sentence that could be the ad's payoff line",
      "avatar": "one sentence — who, age, context, pain, awareness stage",
      "coreInsight": "the psychological truth this concept taps into (1 sentence)",
      "hookArchetype": "question | overstated-claim | statistic | story | open-loop | pattern-interrupt",
      "visualSpine": "1-2 sentences describing the recurring visual motif that ties all shots together — be cinematic and specific",
      "palette": ["#hex1", "#hex2", "#hex3"],
      "moodKeywords": ["3-5 concrete sensory words — no 'modern', no 'clean', no 'minimalist'"],
      "lengthSeconds": 6-20,
      "shotCount": 3-8,
      "creativityLevel": "safe | distinctive | bold | breakthrough"
    }
  ]
}`;

export function conceptFromBriefSystem(count = 5): string {
  return buildSystemPrompt(
    `Generate ${count} distinct marketing concepts. Each must target a DIFFERENT avatar, pain, or awareness stage — not just different palettes. No two concepts should share their core insight. Lead with AVATAR + PAIN + UNEXPECTED ANGLE, not with the product.`,
    CONCEPT_SCHEMA,
    "bold"
  );
}

export function conceptFromBriefUser(brief: Brief, refCount = 0): string {
  return `INPUT BRIEF:
- Project: ${brief.projectName}${brief.client ? ` (${brief.client})` : ""}
- Product: ${brief.product}
- Goal: ${brief.goal}
${brief.audience ? `- Audience: ${brief.audience}` : ""}
${brief.placements?.length ? `- Placements: ${brief.placements.join(", ")}` : ""}
${brief.mustInclude?.length ? `- Must include: ${brief.mustInclude.join(", ")}` : ""}
${brief.mustAvoid?.length ? `- Avoid: ${brief.mustAvoid.join(", ")}` : ""}
- Aspect ratio: ${brief.aspect}
${brief.tone ? `- Brand tone: ${brief.tone}` : ""}
${brief.productDescription ? `- Product detail:\n${brief.productDescription}` : ""}
${brief.productReviews ? `- Voice-of-customer (reviews):\n${brief.productReviews.slice(0, 2500)}` : ""}
${brief.competitors?.length ? `- Competitors to differentiate from: ${brief.competitors.join(", ")}` : ""}
${refCount > 0 ? `- Reference images attached: ${refCount} (analyze their mood/palette/composition as inputs)` : "- No reference images — invent the visual world from scratch"}

Generate exactly ${5} concepts. At least 2 must be "bold" or "breakthrough" level.`;
}

// ─────────────────────────────────────────────────────────
// Concept from REFERENCES ONLY (no brief) — Gemini looks at
// the images and proposes what's being advertised & how.
// ─────────────────────────────────────────────────────────

export function conceptFromRefsOnlySystem(): string {
  return buildSystemPrompt(
    `You are given reference images with NO brief. Your job: (1) identify what product/service is being advertised or could be, (2) extract the DNA (mood, palette, composition, story beat), (3) propose 5 distinct CONCEPTS that honor that DNA but go in FRESH directions. Do not just describe the references — extend them.`,
    CONCEPT_SCHEMA,
    "bold"
  );
}

export function conceptFromRefsOnlyUser(refCount: number, optionalHint?: string): string {
  return `${refCount} reference image${refCount === 1 ? "" : "s"} attached.
${optionalHint ? `\nUser hint: ${optionalHint}` : ""}

Tasks:
1. Mentally catalogue each reference: mood, palette, camera, composition, what it's selling
2. Find the common thread (the DNA)
3. Generate 5 concepts that inherit the DNA but explore NEW territory — not imitations
4. Each concept must be shootable without using the reference images as footage

Output JSON per schema. No prose.`;
}

// ─────────────────────────────────────────────────────────
// Reference DNA extraction — analyze a single reference
// ─────────────────────────────────────────────────────────

const DNA_SCHEMA = `{
  "moodKeywords": ["3-6 sensory words"],
  "palette": ["#hex", "#hex", "#hex", "#hex", "#hex"],
  "composition": "1 sentence — where's the subject, what's the framing, what creates depth",
  "cameraLanguage": "lens feel + angle + movement if visible (e.g. '35mm handheld drift, eye-level')",
  "lightingStyle": "source direction + quality + temperature",
  "narrativeBeat": "what moment in a story does this frame capture (e.g. 'the pause before decision')",
  "whatMakesItWork": "the ONE thing that gives this frame its power — be honest, not flattering",
  "transferableElements": ["3-5 concrete things a new ad could inherit"],
  "avoidCopyingElements": ["2-4 things that would feel plagiarized if reused"]
}`;

export function referenceDNASystem(): string {
  return buildSystemPrompt(
    `You are a visual-effects supervisor analyzing a single still for a DIRECTOR'S LOOKBOOK. Extract its DNA — the transferable craft — so we can build a NEW ad that feels kin but isn't a copy. Be specific, technical, and honest about what actually makes it work.`,
    DNA_SCHEMA,
    "distinctive"
  );
}

export function referenceDNAUser(contextHint?: string): string {
  return `Analyze the attached reference image.
${contextHint ? `\nContext: ${contextHint}` : ""}

Return the DNA as JSON. Be technically specific. No generic words like "beautiful", "modern", "clean".`;
}

// ─────────────────────────────────────────────────────────
// Concept from URL REMIX — stealth inspiration
// Takes a competitor's or inspiration ad and generates
// a concept that inherits its craft but is unrecognizable
// as derived.
// ─────────────────────────────────────────────────────────

export function conceptStealthRemixSystem(): string {
  return buildSystemPrompt(
    `You are running STEALTH INSPIRATION: take the DNA of an existing ad/reference and forge 5 concepts that could never be traced back to it. The inherited DNA is CRAFT (lighting style, pacing, hook structure, visual spine) — NOT subject, palette, or copy. If a human saw both side-by-side, they should NOT say "that's a copy".`,
    CONCEPT_SCHEMA,
    "breakthrough"
  );
}

export function conceptStealthRemixUser(
  brief: Brief,
  extractedDNA: ReferenceDNA,
  remixIntensity = 0.7
): string {
  return `OUR PRODUCT: ${brief.product}
OUR GOAL: ${brief.goal}
${brief.audience ? `OUR AUDIENCE: ${brief.audience}` : ""}

DNA WE'RE INHERITING (craft only — not subject matter):
- Mood: ${extractedDNA.moodKeywords.join(", ")}
- Composition approach: ${extractedDNA.composition}
- Camera language: ${extractedDNA.cameraLanguage}
- Lighting style: ${extractedDNA.lightingStyle}
- Narrative beat: ${extractedDNA.narrativeBeat}
- What makes it work: ${extractedDNA.whatMakesItWork}

TRANSFER these (OK to inherit): ${extractedDNA.transferableElements.join("; ")}
AVOID these (would be too on-the-nose): ${extractedDNA.avoidCopyingElements.join("; ")}

REMIX INTENSITY: ${remixIntensity} (0=close, 1=barely-traceable)

Generate 5 concepts for OUR product that embody the INHERITED craft but land in fresh subject territory. Output per schema.`;
}

// ─────────────────────────────────────────────────────────
// Helper: shape the response from Gemini into Concept[]
// ─────────────────────────────────────────────────────────

export interface ConceptBatchResponse {
  concepts: Concept[];
}
