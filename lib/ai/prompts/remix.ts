import { buildSystemPrompt } from "./principles";
import type { Brief, ReferenceDNA } from "./types";

// ─────────────────────────────────────────────────────────
// Stealth remix — from an existing reference, forge a
// NEW creative that inherits craft but not surface.
// ─────────────────────────────────────────────────────────

const REMIX_CHECK_SCHEMA = `{
  "traceability": {
    "score": 0-100,
    "verdict": "safe | caution | too-close",
    "reasoning": "1-2 sentences — what elements might be traced back",
    "fixes": ["concrete swaps to push further from source if score > 40"]
  }
}`;

export function remixTraceabilitySystem(): string {
  return buildSystemPrompt(
    `You are a creative director running a PLAGIARISM DRIFT CHECK. Given the source DNA and the new concept, score how traceable the new work is to the source. Be brutally honest — if a viewer might say "that's just the X ad with a new product", score it high (>50).`,
    REMIX_CHECK_SCHEMA,
    "distinctive"
  );
}

export function remixTraceabilityUser(
  sourceDNA: ReferenceDNA,
  newConceptDescription: string
): string {
  return `SOURCE DNA (original reference):
- Mood: ${sourceDNA.moodKeywords.join(", ")}
- Composition: ${sourceDNA.composition}
- Camera: ${sourceDNA.cameraLanguage}
- Lighting: ${sourceDNA.lightingStyle}
- Narrative beat: ${sourceDNA.narrativeBeat}
- What made it work: ${sourceDNA.whatMakesItWork}

OUR NEW CONCEPT:
${newConceptDescription}

Score traceability 0-100. If > 40, suggest concrete fixes. JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Subject-swap remix — keep the craft, swap the hero
// Useful when a user loves a reference but has a different product
// ─────────────────────────────────────────────────────────

const SWAP_SCHEMA = `{
  "swap": {
    "originalSubject": "what the reference features",
    "newSubject": "our product/scene",
    "paletteShift": "1 sentence — how we move the palette away",
    "compositionShift": "1 sentence — how we reframe",
    "moodShift": "1 sentence — how we re-score the mood",
    "oneSentenceNewConcept": "the new concept in 1 sentence"
  }
}`;

export function subjectSwapSystem(): string {
  return buildSystemPrompt(
    `You are performing a SUBJECT SWAP on a reference ad. Keep the craft DNA (lighting style, camera language, narrative beat) but swap in the user's product AND adjust palette/mood/composition so the new work feels autonomous.`,
    SWAP_SCHEMA,
    "distinctive"
  );
}

export function subjectSwapUser(
  sourceDNA: ReferenceDNA,
  brief: Brief
): string {
  return `SOURCE DNA (to inherit craft from):
- Mood: ${sourceDNA.moodKeywords.join(", ")}
- Composition: ${sourceDNA.composition}
- Camera: ${sourceDNA.cameraLanguage}
- Lighting: ${sourceDNA.lightingStyle}

OUR PRODUCT: ${brief.product}
OUR AUDIENCE: ${brief.audience ?? "unspecified"}
OUR GOAL: ${brief.goal}

Propose the swap as JSON.`;
}
