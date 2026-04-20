import { buildSystemPrompt } from "./principles";
import type { ShotBrief } from "./types";

// ─────────────────────────────────────────────────────────
// Motion / Image-to-Video prompts — recommendations for
// external i2v tools (Kling 3, Runway Gen-3, Seedance 2, Sora).
// FrameForge does NOT generate video itself — it gives the user
// a production-ready motion prompt they paste into their tool.
// ─────────────────────────────────────────────────────────

export type MotionModel =
  | "kling-3"
  | "runway-gen3"
  | "seedance-2"
  | "sora"
  | "any";

export const MOTION_MODEL_NOTES: Record<MotionModel, string> = {
  "kling-3":
    "Kling 3 is premium cinematic, responds well to explicit camera language and dramatic pacing. Supports up to 10s clips, best for hero shots.",
  "runway-gen3":
    "Runway Gen-3 is fast and flexible, best for subtle motion and atmospheric moments. Keep prompts under 40 words. Strong with natural language.",
  "seedance-2":
    "Seedance 2 (ByteDance) is realistic and physics-aware. Best for product motion, liquid, fabric. Responds to specific physical directives.",
  sora:
    "Sora handles multi-beat narrative well. Up to 20s. Best for shots with 2 distinct phases (beat A → beat B).",
  any: "Neutral motion prompt that works across most i2v tools.",
};

const MOTION_SCHEMA = `{
  "motionPrompt": "the prompt the user will paste into their i2v tool — pure motion description, no preamble",
  "modelHint": "kling-3 | runway-gen3 | seedance-2 | sora | any",
  "durationSeconds": 2-10,
  "pacing": "slow | medium | punchy",
  "cameraMoves": ["ordered list of camera moves this shot calls for"],
  "subjectActions": ["ordered list of what the subject/product should do"],
  "finalBeat": "1 sentence — the exact ending frame so the cut to the next shot works"
}`;

export function motionPromptSystem(): string {
  return buildSystemPrompt(
    `You are a cinematographer writing image-to-video motion prompts. You receive a single still frame + its context. You output a prompt that describes how the camera, subject, and lighting move over 2-10 seconds — written in the language of a DP, not a marketer.

Rules:
- Motion ONLY — do NOT describe what's already in the frame (the model sees it)
- Keep under 60 words
- Use cinematographer verbs: dolly in, push, rack focus, whip pan, orbit, handheld drift, slow-reveal
- For subject: specific verbs — "liquid pours in slow motion and forms a bead on the rim", not "product looks good"
- End with a clear final beat so the NEXT shot can cut cleanly
- Match pacing to context: luxury = slow, energy drink = punchy, story = medium
- Return JSON matching the schema. No prose. No markdown fences.`,
    MOTION_SCHEMA,
    "distinctive"
  );
}

export function motionPromptUser(
  shot: ShotBrief,
  targetModel: MotionModel = "any",
  avatarAgeHint?: string,
): string {
  return `SHOT CONTEXT:
- Title: ${shot.title}
- Visual: ${shot.visualDescription}
- Subject action (in still): ${shot.subjectAction}
- Camera (still): ${shot.cameraDirective}
- Lighting: ${shot.lightingDirective}
- Shot duration goal: ${shot.durationSeconds}s
- Shot purpose: ${shot.purpose}

TARGET MODEL: ${targetModel}
MODEL NOTES: ${MOTION_MODEL_NOTES[targetModel]}
${avatarAgeHint ? `AVATAR AGE HINT: ${avatarAgeHint}` : ""}

Write the motion prompt. JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Deterministic builder — fallback if Gemini call fails
// Produces a decent motion prompt without LLM round-trip
// ─────────────────────────────────────────────────────────

export function fallbackMotionPrompt(
  shot: ShotBrief,
  targetModel: MotionModel = "any"
): {
  motionPrompt: string;
  modelHint: MotionModel;
  durationSeconds: number;
  pacing: "slow" | "medium" | "punchy";
} {
  const pacing: "slow" | "medium" | "punchy" =
    shot.purpose === "hook"
      ? "punchy"
      : shot.purpose === "cta" || shot.purpose === "reveal"
        ? "slow"
        : "medium";

  const motionLine =
    pacing === "punchy"
      ? "Snap-zoom in 0.3s followed by a micro-whip to final composition, subject action peaks in frame 2"
      : pacing === "slow"
        ? "Slow dolly-in at 4px/frame, subtle rack focus from foreground to hero element, lighting pulses warm 3% over the clip"
        : "Medium push-in while subject completes the action; handheld drift of 2-3px to feel lived-in, ends on a still frame";

  return {
    motionPrompt: `${motionLine}. Preserve palette and key-light direction from the still. End with: ${shot.title ? `"${shot.title}" beat resolved, composition reset for cut.` : "composition locked for clean cut."}`,
    modelHint: targetModel,
    durationSeconds: Math.min(Math.max(shot.durationSeconds, 2), 8),
    pacing,
  };
}
