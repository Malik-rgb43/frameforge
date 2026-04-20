import { buildSystemPrompt } from "./principles";
import type { AdCopy, Avatar, Concept, VisualHook } from "./types";

// ─────────────────────────────────────────────────────────
// Ad copy variations — 3 frameworks (AIDA / PAS / BAB) per concept
// ─────────────────────────────────────────────────────────

const COPY_SCHEMA = `{
  "copy": [
    {
      "headline": "4-7 words — one of: curious, benefit, how-to, problem, list, urgency archetype",
      "body": "40-80 words — one coherent structure: AIDA, PAS, or BAB. No exclamation marks.",
      "cta": "2-5 words — action verb + specificity + mild urgency",
      "framework": "AIDA | PAS | BAB | 4Ps | FAB",
      "hookArchetype": "question | overstated-claim | statistic | story | open-loop | pattern-interrupt",
      "wordCount": 0
    }
  ]
}`;

export function adCopySystem(): string {
  return buildSystemPrompt(
    `You write direct-response ad copy for Meta, TikTok, and YouTube. Every line must earn its place or it gets cut.

Platform rules built in:
- Meta: headline in first 125 chars; body front-loads the pain/benefit; CTA creates urgency without lying
- TikTok: first line is spoken aloud — write it phonetically if needed; casual, not polished
- YouTube: hook at 0s, proof at 5s, offer at 15s

Copy rules:
- Write for ONE specific human (the avatar) not a demographic segment
- Use open loops, customer-verbatim language, short sentences
- Proof > claims — "7,000 reviews" beats "highly rated"
- Specificity = credibility — "lost 4.2kg in 6 weeks" beats "lost weight"
- Reject: unlock, elevate, seamless, revolutionary, game-changing, transform, empower, journey`,
    COPY_SCHEMA,
    "bold"
  );
}

export function adCopyUser(concept: Concept, avatar: Avatar | string): string {
  const avatarBlock =
    typeof avatar === "string"
      ? `AVATAR: ${avatar}`
      : `AVATAR: ${avatar.name}
- Demographics: ${avatar.demographics}
- Pain (verbatim): ${avatar.pain}
- Dream: ${avatar.dream}
- Objections: ${avatar.objections.join("; ")}
- Their voice samples: ${avatar.voice}`;

  return `CONCEPT:
- Title: ${concept.title}
- Tagline: ${concept.tagline}
- Core insight: ${concept.coreInsight}
- Hook archetype: ${concept.hookArchetype}

${avatarBlock}

Write 3 copy variations — use DIFFERENT frameworks (AIDA, PAS, BAB). Each must feel like it was written by a different copywriter who happens to know this avatar personally. JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Visual hooks — 5 first-frame ideas for a chosen concept
// ─────────────────────────────────────────────────────────

const HOOK_SCHEMA = `{
  "visualHooks": [
    {
      "description": "1 sentence — what we see in the first 0-1s frame",
      "firstFrameDirective": "camera + subject + light in a single frame",
      "timingSeconds": 0.5-1.5,
      "reasoningWhy": "why this stops the scroll — be honest, not marketing-speak"
    }
  ]
}`;

export function visualHookSystem(): string {
  return buildSystemPrompt(
    `You are a short-form ad hook specialist. The first 0-1s of a scroll ad is everything — if it fails, nothing after matters. Generate 5 DISTINCT first-frame hooks for the concept. Use contrast, unexpected framing, mid-action, or an "impossible" image. Cinematic only — no meme-face POVs.`,
    HOOK_SCHEMA,
    "breakthrough"
  );
}

export function visualHookUser(concept: Concept): string {
  return `CONCEPT: ${concept.title}
Visual spine: ${concept.visualSpine}
Mood: ${concept.moodKeywords.join(", ")}
Palette: ${concept.palette.join(", ")}

Generate 5 first-frame visual hooks. Each must:
- Stop the scroll in <1 second
- NOT rely on text overlay (visual only)
- Not look like a typical ad opening (no product-on-white, no talking head, no "hi guys")

JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Text hooks — first-line spoken/written hooks (5 archetypes)
// ─────────────────────────────────────────────────────────

const TEXT_HOOK_SCHEMA = `{
  "textHooks": {
    "question": "a question that implicates the viewer",
    "overstated-claim": "a provocative assertion that risks backlash to create pull",
    "statistic": "a real or plausible number that reframes the category",
    "story": "first 1-2 lines of a true-feeling personal story — include a specific number or detail",
    "open-loop": "a sentence that promises a payoff 10 seconds later",
    "pattern-interrupt": "a sentence that breaks the platform's rhythm — lowercase, unexpected punctuation, or jarring shift"
  }
}`;

export function textHookSystem(): string {
  return buildSystemPrompt(
    `Write 6 text hooks — one per archetype — for the concept. These are the FIRST 3-4 seconds spoken or written. Each must be in the voice of the avatar, NOT the brand. 4th-grade reading level. No exclamation marks. Short sentences.`,
    TEXT_HOOK_SCHEMA,
    "bold"
  );
}

export function textHookUser(concept: Concept, avatar: Avatar | string): string {
  const voice =
    typeof avatar === "object" && avatar.voice
      ? `Their voice samples: ${avatar.voice}`
      : `Avatar: ${typeof avatar === "string" ? avatar : avatar.name}`;

  return `CONCEPT: ${concept.title}
Insight: ${concept.coreInsight}
${voice}

Write one hook per archetype. 6 total. JSON only.`;
}
