import { buildSystemPrompt } from "./principles";
import type { Brief, Concept, ShotBrief } from "./types";

// ─────────────────────────────────────────────────────────
// Shot list generation — from a chosen concept
// Produces an ordered shot breakdown with purpose-per-shot
// ─────────────────────────────────────────────────────────

const SHOT_LIST_SCHEMA = `{
  "shots": [
    {
      "orderIndex": 0,
      "title": "3-5 word working title ('4am pour', 'The lid twist')",
      "purpose": "hook | setup | reveal | proof | cta | continuation",
      "visualDescription": "1-2 sentences — what we see in this frame, specific and cinematic",
      "subjectAction": "what the subject or product is DOING (active verbs, no static descriptions)",
      "cameraDirective": "lens + angle + framing + movement (e.g. '50mm, eye-level medium, slow push-in')",
      "lightingDirective": "key source + quality + color temp + rim/fill notes",
      "paletteNote": "which hex colors dominate this frame and why",
      "durationSeconds": 1-5,
      "textOverlay": "exact on-screen text if any, in double quotes — otherwise omit",
      "voiceover": "VO line if any — otherwise omit"
    }
  ]
}`;

export function shotListSystem(): string {
  return buildSystemPrompt(
    `You are a DP and short-form ad editor who cuts performance creative for Meta and TikTok. Break the concept into a shot list optimized for 9:16 mobile, sound-off viewing.

Shot rules:
- Shot 1 = the hook. It must work as a still image — someone who sees only the first frame must be curious enough to keep watching. No text cards as shot 1.
- Every shot must advance the narrative — no "beauty" filler
- For sound-off viewers: each shot must communicate something without audio
- Total duration must not exceed the concept's lengthSeconds
- Final shot must earn the cut to a buy/link-in-bio action`,
    SHOT_LIST_SCHEMA,
    "bold"
  );
}

export function shotListUser(concept: Concept, brief: Brief): string {
  return `CONCEPT TO REALIZE:
- Title: ${concept.title}
- Tagline: ${concept.tagline}
- Avatar: ${typeof concept.avatar === "string" ? concept.avatar : concept.avatar.name + " — " + concept.avatar.demographics}
- Core insight: ${concept.coreInsight}
- Hook archetype: ${concept.hookArchetype}
- Visual spine: ${concept.visualSpine}
- Palette: ${concept.palette.join(", ")}
- Mood: ${concept.moodKeywords.join(", ")}
- Total length: ${concept.lengthSeconds}s
- Shot count: ${concept.shotCount}
- Creativity level: ${concept.creativityLevel}

PRODUCT: ${brief.product}
ASPECT: ${brief.aspect}
${brief.mustInclude?.length ? `MUST INCLUDE: ${brief.mustInclude.join(", ")}` : ""}
${brief.mustAvoid?.length ? `AVOID: ${brief.mustAvoid.join(", ")}` : ""}

Produce an ordered shot list of ${concept.shotCount} shots totaling ~${concept.lengthSeconds}s.

Requirements:
- Shot 1 = hook (must work in <1 second)
- Last shot = end card or reveal — NOT a CTA text card unless concept explicitly calls for it
- Every shot's visual spine must reference ${concept.visualSpine}
- Durations must sum approximately to ${concept.lengthSeconds}
- No "generic product beauty shot" unless justified by concept

JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Single shot from BRIEF (user skipping concept stage)
// ─────────────────────────────────────────────────────────

const SINGLE_SHOT_SCHEMA = `{
  "shot": {
    "orderIndex": 0,
    "title": "3-5 words",
    "purpose": "hook | setup | reveal | proof | cta | continuation",
    "visualDescription": "1-2 sentences",
    "subjectAction": "active verbs",
    "cameraDirective": "lens + angle + framing",
    "lightingDirective": "source + quality + temp",
    "paletteNote": "hex notes",
    "durationSeconds": 1-5,
    "textOverlay": "optional",
    "voiceover": "optional"
  }
}`;

export function singleShotSystem(): string {
  return buildSystemPrompt(
    `Produce ONE polished shot brief. The user is giving you a raw idea — translate it into a director-ready directive with specific camera, lighting, and subject action. Do not ask questions; make creative decisions.`,
    SINGLE_SHOT_SCHEMA,
    "distinctive"
  );
}

export function singleShotUser(
  userPrompt: string,
  refCount: number,
  brief?: Partial<Brief>
): string {
  return `USER'S RAW IDEA:
"${userPrompt}"

${brief?.product ? `PRODUCT: ${brief.product}` : ""}
${brief?.aspect ? `ASPECT: ${brief.aspect}` : "ASPECT: 9:16 (default vertical)"}
${refCount > 0 ? `REFERENCES PROVIDED: ${refCount} images attached` : "NO REFERENCES — invent the visual world"}

Produce one shot brief. JSON only.`;
}

// ─────────────────────────────────────────────────────────
// Continuity extension — generate next shot FROM a prior shot
// Preserves subject, palette, and visual spine for consistency
// ─────────────────────────────────────────────────────────

export function continuityShotSystem(): string {
  return buildSystemPrompt(
    `You are extending a shot sequence. The next shot must be visually CONTINUOUS with the prior one — same subject, same palette, same world — but advance the story. Use camera movement, time-shift, or subject-action to create the progression. Do NOT start a new scene.`,
    SINGLE_SHOT_SCHEMA,
    "distinctive"
  );
}

export function continuityShotUser(priorShot: ShotBrief, userIntent?: string): string {
  return `PRIOR SHOT (we are continuing from this):
- Title: ${priorShot.title}
- Visual: ${priorShot.visualDescription}
- Action: ${priorShot.subjectAction}
- Camera: ${priorShot.cameraDirective}
- Lighting: ${priorShot.lightingDirective}
- Palette: ${priorShot.paletteNote}

${userIntent ? `USER'S INTENT FOR NEXT SHOT: "${userIntent}"` : "USER HASN'T SPECIFIED — make a natural narrative progression."}

Produce the NEXT shot that preserves continuity. Write the camera directive so the transition reads as a cut or natural movement from the prior frame (not a scene change). JSON only.`;
}
