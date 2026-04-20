// Project Brief — the structured context every AI call pulls from.
// User fills this ONCE per project, then every Concept Card / Chat Bar
// generation injects it into the prompt automatically.

export interface ProjectBrief {
  // What you're selling
  productName: string;
  productDescription: string; // 1-3 sentences
  productCategory: string;

  // Who it's for
  audienceName: string; // e.g. "Creator Moms 28-40"
  audienceContext: string; // 1-3 sentences — pain, dreams, lifestyle
  audienceAwareness:
    | "unaware"
    | "problem-aware"
    | "solution-aware"
    | "product-aware"
    | "most-aware";

  // Brand voice
  brandVoice: string; // e.g. "calm, confident, a little bit cheeky"
  brandValues: string[]; // e.g. ["craft", "patience", "intentional"]

  // Campaign goal
  goal: string; // e.g. "Summer launch — 2.5× ROAS on Meta"
  placements: string[]; // e.g. ["Reels", "TikTok", "FB Feed"]

  // Must / avoid
  mustInclude: string[];
  mustAvoid: string[];

  // Voice of customer
  productReviews?: string; // 1-2k chars max

  // Competitors (for differentiation)
  competitors?: string[];
}

export const EMPTY_BRIEF: ProjectBrief = {
  productName: "",
  productDescription: "",
  productCategory: "",
  audienceName: "",
  audienceContext: "",
  audienceAwareness: "problem-aware",
  brandVoice: "",
  brandValues: [],
  goal: "",
  placements: [],
  mustInclude: [],
  mustAvoid: [],
};

// Stringify a brief for injection into an AI prompt
export function briefAsContext(brief: ProjectBrief): string {
  const parts: string[] = [];
  if (brief.productName) parts.push(`PRODUCT: ${brief.productName}`);
  if (brief.productCategory) parts.push(`CATEGORY: ${brief.productCategory}`);
  if (brief.productDescription)
    parts.push(`PRODUCT DETAIL: ${brief.productDescription}`);

  if (brief.audienceName || brief.audienceContext) {
    parts.push(
      `AUDIENCE: ${brief.audienceName}${
        brief.audienceContext ? ` — ${brief.audienceContext}` : ""
      } (awareness: ${brief.audienceAwareness})`
    );
  }

  if (brief.brandVoice) parts.push(`BRAND VOICE: ${brief.brandVoice}`);
  if (brief.brandValues.length)
    parts.push(`BRAND VALUES: ${brief.brandValues.join(", ")}`);

  if (brief.goal) parts.push(`CAMPAIGN GOAL: ${brief.goal}`);
  if (brief.placements.length)
    parts.push(`PLACEMENTS: ${brief.placements.join(", ")}`);

  if (brief.mustInclude.length)
    parts.push(`MUST INCLUDE: ${brief.mustInclude.join("; ")}`);
  if (brief.mustAvoid.length)
    parts.push(`AVOID: ${brief.mustAvoid.join("; ")}`);

  if (brief.productReviews)
    parts.push(
      `VOICE OF CUSTOMER (verbatim review excerpts):\n${brief.productReviews.slice(0, 2000)}`
    );

  if (brief.competitors?.length)
    parts.push(
      `DIFFERENTIATE FROM: ${brief.competitors.join(", ")} — do not echo their visual language.`
    );

  return parts.length
    ? `─── PROJECT BRIEF ───\n${parts.join("\n")}\n─── END BRIEF ───`
    : "";
}

export function isBriefFilled(brief: ProjectBrief | null | undefined): boolean {
  if (!brief) return false;
  const b = { ...EMPTY_BRIEF, ...brief };
  return !!(
    b.productName.trim() &&
    b.productDescription.trim() &&
    b.audienceContext.trim() &&
    b.goal.trim()
  );
}

export function briefCompleteness(brief: ProjectBrief | null | undefined): number {
  if (!brief) return 0;
  const b = { ...EMPTY_BRIEF, ...brief };
  const checks = [
    !!b.productName.trim(),
    !!b.productDescription.trim(),
    !!b.productCategory.trim(),
    !!b.audienceName.trim(),
    !!b.audienceContext.trim(),
    !!b.brandVoice.trim(),
    (b.brandValues ?? []).length > 0,
    !!b.goal.trim(),
    (b.placements ?? []).length > 0,
    (b.productReviews?.length ?? 0) > 100,
  ];
  return checks.filter(Boolean).length / checks.length;
}
