import { buildSystemPrompt } from "./principles";

// ─────────────────────────────────────────────────────────
// Avatar extraction — from reviews, description, or both.
// Avatars drive concept → shot → copy alignment.
// ─────────────────────────────────────────────────────────

const AVATAR_SCHEMA = `{
  "avatars": [
    {
      "name": "2-3 word handle ('Tired Dawn Mom', 'Gym-Bro Skeptic')",
      "demographics": "age range + gender/identity + life context in 1 sentence",
      "psychographics": "values + status drivers + how they'd describe themselves",
      "pain": "THE exact friction — not a category ('I have to stop my day to refill my coffee') not ('people want convenience')",
      "dream": "THE exact transformation — what their ideal Tuesday at 9am looks like after using the product",
      "objections": ["3-5 likely purchase objections, phrased in their own voice"],
      "awarenessStage": "unaware | problem-aware | solution-aware | product-aware | most-aware",
      "voice": "3-5 sample phrases they'd actually say (verbatim, not cleaned up)"
    }
  ]
}`;

export function avatarSystem(): string {
  return buildSystemPrompt(
    `You are a voice-of-customer researcher who has read thousands of reviews and 1-star rants. Extract 3 avatars for this product. Use customer LANGUAGE verbatim where possible. Never invent pains that the reviews don't support. Never make avatars who all feel like the same person with different jobs — each must have a distinct worldview.`,
    AVATAR_SCHEMA,
    "distinctive"
  );
}

export function avatarUser(productDescription: string, reviews?: string): string {
  return `PRODUCT:
${productDescription}

${reviews ? `VOICE-OF-CUSTOMER (review excerpts):\n${reviews.slice(0, 4000)}` : "NO REVIEWS PROVIDED — extract plausible avatars from the product description and category knowledge. Flag any assumption explicitly in the psychographics field."}

Extract 3 avatars. At least 1 must be at "problem-aware" stage (knows they have the problem, hasn't found this solution). JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Avatar from IMAGE — infer from a single lifestyle/product shot
// ─────────────────────────────────────────────────────────

export function avatarFromImageSystem(): string {
  return buildSystemPrompt(
    `Given a product or lifestyle image, infer WHO this image is speaking to. Read the visual cues — props, setting, subject, aesthetic — and extract 3 plausible avatars who would resonate. Be specific and honest; don't flatten them into marketer-safe descriptions.`,
    AVATAR_SCHEMA,
    "distinctive"
  );
}

export function avatarFromImageUser(contextHint?: string): string {
  return `Analyze the attached image and extract 3 plausible target avatars.
${contextHint ? `\nContext: ${contextHint}` : ""}

Rules:
- Read the visual cues first (setting, props, aesthetic, subject)
- Don't invent demographic data not supported by the image
- Each avatar must have a distinct worldview, not just a different job title

JSON only.`;
}
