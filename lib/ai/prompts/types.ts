// Shared types for the prompt system — all AI actions speak this vocabulary.

export type Aspect = "9:16" | "1:1" | "16:9" | "4:5";
export type AwarenessStage =
  | "unaware"
  | "problem-aware"
  | "solution-aware"
  | "product-aware"
  | "most-aware";
export type HookArchetype =
  | "question"
  | "overstated-claim"
  | "statistic"
  | "story"
  | "open-loop"
  | "pattern-interrupt";
export type CopyFramework = "AIDA" | "PAS" | "BAB" | "4Ps" | "FAB";

export interface Brief {
  projectName: string;
  client?: string;
  product: string;
  goal: string;
  audience?: string;
  placements?: string[];
  mustInclude?: string[];
  mustAvoid?: string[];
  aspect: Aspect;
  tone?: string;
  productDescription?: string;
  productReviews?: string;
  competitors?: string[];
  lengthSeconds?: number;
}

export interface Avatar {
  name: string;
  demographics: string;
  psychographics: string;
  pain: string;
  dream: string;
  objections: string[];
  awarenessStage: AwarenessStage;
  voice: string;
}

export interface Concept {
  title: string;
  tagline: string;
  avatar: Avatar | string;
  coreInsight: string;
  hookArchetype: HookArchetype;
  visualSpine: string;
  palette: [string, string, string];
  moodKeywords: string[];
  lengthSeconds: number;
  shotCount: number;
  creativityLevel: "safe" | "distinctive" | "bold" | "breakthrough";
}

export interface ShotBrief {
  orderIndex: number;
  title: string;
  purpose: "hook" | "setup" | "reveal" | "proof" | "cta" | "continuation";
  visualDescription: string;
  subjectAction: string;
  cameraDirective: string;
  lightingDirective: string;
  paletteNote: string;
  durationSeconds: number;
  textOverlay?: string;
  voiceover?: string;
}

export interface ImagePrompt {
  primary: string;
  negatives: string[];
  aspect: Aspect;
  modelTier: "pro" | "nb2" | "flash";
  thinkingLevel?: "LOW" | "HIGH";
  refSlots?: { slot1?: string; slot2?: string; slot3?: string };
}

export interface ReferenceDNA {
  moodKeywords: string[];
  palette: string[];
  composition: string;
  cameraLanguage: string;
  lightingStyle: string;
  narrativeBeat: string;
  whatMakesItWork: string;
  transferableElements: string[];
  avoidCopyingElements: string[];
}

export interface AdCopy {
  headline: string;
  body: string;
  cta: string;
  framework: CopyFramework;
  hookArchetype: HookArchetype;
  wordCount: number;
}

export interface VisualHook {
  description: string;
  firstFrameDirective: string;
  timingSeconds: number;
  reasoningWhy: string;
}

export type EntryMode =
  | "brief-only"
  | "refs-only"
  | "brief-and-refs"
  | "url-remix"
  | "manual-concept"
  | "manual-shots";

export interface CreativityDirective {
  level: Concept["creativityLevel"];
  temperature: number;
  constraints: string[];
  amplifiers: string[];
}
