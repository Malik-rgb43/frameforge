// FrameForge Prompt Library — single import surface.
// All AI actions in the app go through this library.
// Prompts are versioned via their function names; breaking changes
// must be additive (new function) not in-place mutation.

export * from "./types";
export * from "./principles";

export {
  conceptFromBriefSystem,
  conceptFromBriefUser,
  conceptFromRefsOnlySystem,
  conceptFromRefsOnlyUser,
  referenceDNASystem,
  referenceDNAUser,
  conceptStealthRemixSystem,
  conceptStealthRemixUser,
  type ConceptBatchResponse,
} from "./concept";

export {
  avatarSystem,
  avatarUser,
  avatarFromImageSystem,
  avatarFromImageUser,
} from "./avatar";

export {
  shotListSystem,
  shotListUser,
  singleShotSystem,
  singleShotUser,
  continuityShotSystem,
  continuityShotUser,
} from "./shots";

export {
  shotToImagePrompt,
  variantImagePrompt,
  continuityImagePrompt,
  enhanceUserPrompt,
  conceptMoodboardPrompt,
} from "./image";

export {
  adCopySystem,
  adCopyUser,
  visualHookSystem,
  visualHookUser,
  textHookSystem,
  textHookUser,
} from "./copy";

export {
  remixTraceabilitySystem,
  remixTraceabilityUser,
  subjectSwapSystem,
  subjectSwapUser,
} from "./remix";

export {
  motionPromptSystem,
  motionPromptUser,
  fallbackMotionPrompt,
  MOTION_MODEL_NOTES,
  type MotionModel,
} from "./motion";

// ─────────────────────────────────────────────────────────
// Action → prompt mapping — what action calls which pair
// ─────────────────────────────────────────────────────────

export const ACTION_MAP = {
  "concept.from-brief": "conceptFromBriefSystem + conceptFromBriefUser",
  "concept.from-refs": "conceptFromRefsOnlySystem + conceptFromRefsOnlyUser",
  "concept.stealth-remix": "conceptStealthRemixSystem + conceptStealthRemixUser",
  "reference.extract-dna": "referenceDNASystem + referenceDNAUser",
  "avatar.from-reviews": "avatarSystem + avatarUser",
  "avatar.from-image": "avatarFromImageSystem + avatarFromImageUser",
  "shots.list-from-concept": "shotListSystem + shotListUser",
  "shots.single-from-brief": "singleShotSystem + singleShotUser",
  "shots.continuity": "continuityShotSystem + continuityShotUser",
  "image.from-shot": "shotToImagePrompt (builder, no system prompt)",
  "image.variant": "variantImagePrompt (builder)",
  "image.continuity": "continuityImagePrompt (builder)",
  "image.enhance-user-prompt": "enhanceUserPrompt (builder)",
  "image.moodboard-tile": "conceptMoodboardPrompt (builder)",
  "copy.ad-variations": "adCopySystem + adCopyUser",
  "copy.visual-hooks": "visualHookSystem + visualHookUser",
  "copy.text-hooks": "textHookSystem + textHookUser",
  "remix.traceability-check": "remixTraceabilitySystem + remixTraceabilityUser",
  "remix.subject-swap": "subjectSwapSystem + subjectSwapUser",
} as const;

export type ActionName = keyof typeof ACTION_MAP;
