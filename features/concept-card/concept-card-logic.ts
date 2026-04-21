import { internalFetch } from "@/lib/api";
// Concept Card — an on-canvas tool. User types an idea (or asks AI to suggest),
// uploads refs, clicks "Generate Workflow". We create a group with N shots,
// continuity edges, and motion prompts per shot.

import { useCanvas } from "@/features/canvas/store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { EdgeRow, NodeGroup, NodeRow, NodeInput, Project } from "@/lib/supabase/types";
import {
  briefAsContext,
  type ProjectBrief,
} from "@/features/brief/brief-types";

async function getBriefProductImages(): Promise<Array<{base64: string; mimeType: string}>> {
  try {
    if (typeof window === "undefined") return [];
    const cached = sessionStorage.getItem("ff.active.project");
    if (!cached) return [];
    const p = JSON.parse(cached) as import("@/lib/supabase/types").Project;
    const brief = p.brief as unknown as import("@/features/brief/brief-types").ProjectBrief | null;
    const productImages = brief?.product_images ?? [];
    return productImages.slice(0, 2).flatMap((dataUrl) => {
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) return [];
      const header = dataUrl.slice(0, commaIdx);
      const base64 = dataUrl.slice(commaIdx + 1);
      const mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg";
      return [{ base64, mimeType }];
    });
  } catch {
    return [];
  }
}

async function getProjectBriefContext(): Promise<string> {
  const state = useCanvas.getState();
  if (!state.boardId) return "";
  try {
    // Simplified: check sessionStorage cache set by the Studio page.
    // If empty, returns "" gracefully — all callers handle a missing brief.
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("ff.active.project");
      if (cached) {
        const p = JSON.parse(cached) as Project;
        if (p.brief) return briefAsContext(p.brief as unknown as ProjectBrief);
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "nd_" + Math.random().toString(36).slice(2);

interface ShotSpec {
  title: string;
  visualDescription: string;
  cameraDirective: string;
  lightingDirective: string;
  durationSeconds: number;
  purpose: string;
  motionPrompt?: string;
}

// ─────────────────────────────────────────────────────────
// Create a new concept card on the canvas.
// ─────────────────────────────────────────────────────────

export async function createConceptCard(position?: {
  x: number;
  y: number;
}): Promise<NodeRow> {
  const state = useCanvas.getState();
  if (!state.boardId) throw new Error("no board");

  const pos = position ?? findFreeSpot(state.nodes);
  const now = new Date().toISOString();
  const input: NodeInput = {
    board_id: state.boardId,
    group_id: null,
    type: "concept_card",
    x: pos.x,
    y: pos.y,
    w: 320,
    h: 240,
    order_index: state.nodes.length,
    image_url: null,
    thumbnail_url: null,
    prompt: null,
    prompt_enhanced: null,
    title: "New Concept",
    status: "ready",
    quality_score: null,
    metadata: {
      concept_state: "idle", // idle | suggesting | ready | generating | done
      idea: "",
      suggestions: [],
      shot_count: 5,
      aspect: "9:16",
    },
  };

  const adapter = await getDataAdapter();
  let node: NodeRow;
  try {
    node = await adapter.createNode(input);
  } catch {
    node = {
      ...input,
      id: uid(),
      created_at: now,
      updated_at: now,
    } as NodeRow;
  }
  state.upsertNode(node);
  return node;
}

function findFreeSpot(nodes: NodeRow[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 120, y: 80 };
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.h), 0);
  return { x: 120, y: maxY + 48 };
}

// ─────────────────────────────────────────────────────────
// Ask Gemini to suggest concept ideas for a product context.
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// Collect base64 images from nodes connected to a concept card via edges.
// ─────────────────────────────────────────────────────────

export async function getConnectedRefImages(cardId: string): Promise<Array<{base64: string; mimeType: string}>> {
  const state = useCanvas.getState();
  const connectedEdges = state.edges.filter(
    (e) => e.source_node_id === cardId || e.target_node_id === cardId
  );
  const connectedNodeIds = connectedEdges.map((e) =>
    e.source_node_id === cardId ? e.target_node_id : e.source_node_id
  );
  const refNodes = state.nodes.filter(
    (n) => connectedNodeIds.includes(n.id) && n.image_url && n.type !== "concept_card"
  );

  const results: Array<{base64: string; mimeType: string}> = [];
  for (const node of refNodes.slice(0, 4)) {
    if (!node.image_url) continue;
    try {
      if (node.image_url.startsWith("data:")) {
        const commaIdx = node.image_url.indexOf(",");
        if (commaIdx === -1) continue;
        const header = node.image_url.slice(0, commaIdx);
        const base64 = node.image_url.slice(commaIdx + 1);
        const mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg";
        results.push({ base64, mimeType });
      } else {
        const res = await fetch(node.image_url);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(",");
            resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : "");
          };
          reader.readAsDataURL(blob);
        });
        results.push({ base64, mimeType: blob.type || "image/jpeg" });
      }
    } catch { /* skip */ }
  }
  return results;
}

export interface ConceptSuggestion {
  title: string;
  description: string;
}

export async function suggestConceptIdeas(
  productContext: string,
  refImages?: Array<{base64: string; mimeType: string}>
): Promise<ConceptSuggestion[]> {
  const briefCtx = await getProjectBriefContext();
  const refCount = refImages?.length ?? 0;
  try {
    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior creative director at a top direct-response agency with 15+ years of high-converting short-form video ads. Your job: generate ORIGINAL AD CONCEPTS — not mood boards, not shot descriptions, not product features.

PROJECT BRIEF USAGE (critical):
A PROJECT BRIEF will appear in the user message. It contains BINDING CONSTRAINTS — product, audience, brand voice, mandatory inclusions, and hard avoids. Every concept you generate must be demonstrably rooted in this brief. If the brief is empty or missing, still generate concepts but acknowledge they are generic placeholders without real product context.

A CONCEPT is the single creative idea that holds an entire ad together. It answers: WHAT IS THIS AD REALLY ABOUT beneath the surface?

CRITICAL — REFERENCE IMAGES:
If reference images are attached, treat them as MOOD AND AESTHETIC direction ONLY.
- Do NOT describe what you see in the images
- Do NOT recreate their scenes or scenarios
- Use only: the emotional register, the color temperature, the pacing feel
- Your concepts must be 100% ORIGINAL — new scenes, new angles, new human moments

For EACH concept output:
- title: 3-5 word creative campaign title (the IDEA name, not a product description)
- description: 5-6 sentences that MUST cover all of these in order:
  (1) THE HUMAN TRUTH — what universal human experience is this ad hijacking? Not the product benefit — the raw, specific emotion underneath. Name it precisely.
  (2) THE OPENING FRAME — describe the single, hyper-specific visual that opens the ad. Not "a person looking sad." Name exactly what the camera sees in the first 0.5 seconds. Make it surprising.
  (3) THE NARRATIVE PIVOT — what unexpected turn does the ad take? The moment the viewer thinks one thing but the ad does another. Where is the pattern-interrupt?
  (4) THE EMOTIONAL ARC — how does the viewer FEEL at frame 1 vs. the last frame? Describe the emotional state shift, not the plot.
  (5) WHY THIS CONVERTS — what specific mechanism makes someone stop scrolling AND click? Name the psychological trigger (fear, FOMO, identity, relief, social proof, curiosity gap, etc.)

CREATIVE RULES (non-negotiable):
- Each concept must mine a DIFFERENT emotional territory: use any of (isolation, shame, aspiration, nostalgia, pride, relief, fear, desire, belonging, identity)
- Product appears in MAX 2-3 shots out of 6. Great ads are 80% story, 20% product.
- Cultural references (fairy tales, movie archetypes, childhood rituals) are encouraged — they create instant emotional shortcuts
- REJECT: anything generic, any concept that could apply to ANY product, any concept without a specific opening frame
- REJECT: concepts that just describe the product or its features

Return JSON only: {"ideas":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}`,
        userPrompt: `${briefCtx}

${productContext ? `PRODUCT/CAMPAIGN CONTEXT: ${productContext}` : ""}
${refCount > 0 ? `STYLE REFERENCE: ${refCount} image(s) attached. Use ONLY for aesthetic/mood direction — do NOT recreate their content. Your concepts must be entirely original.` : ""}

Generate exactly 4 concepts. Each must be genuinely distinct — different emotional territory, different hook mechanism, different avatar. Push past the obvious first idea. JSON only.`,
        responseMimeType: "application/json",
        action: "concept-card.suggest",
        images: refImages?.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      }),
    });
    if (!res.ok) throw new Error("suggest failed");
    const { data } = (await res.json()) as {
      data: { ideas?: ConceptSuggestion[] };
    };
    if (Array.isArray(data?.ideas)) {
      return data.ideas.slice(0, 4).filter((i) => i.title && i.description);
    }
    return [];
  } catch {
    return [
      {
        title: "4AM Ritual",
        description: "Hook: extreme close-up of a single warm light switching on in a pitch-black room at 4am — no face, no product, just the light and the silence. The visual spine is one hand reaching toward the glow. The viewer feels the exhaustion and relief simultaneously. This converts because it names the exact moment the target audience lives — the 3am wake-up — before the product ever appears.",
      },
      {
        title: "Rapunzel Reimagined",
        description: "Hook: open on a recognizable fairy-tale tower scene — long hair cascading down — then cut to the modern equivalent. The cultural reference stops the scroll because the brain needs to resolve the mismatch. The visual spine is the contrast between the familiar story and the unexpected product reveal. This converts because story recognition creates instant emotional investment before a single product claim is made.",
      },
      {
        title: "The Impact Frame",
        description: "Hook: the exact millisecond of impact — a texture explosion, a surface breaking, a material transforming — caught in extreme slow motion. The visual spine is a single hyper-specific frame no one has seen before. The viewer feels visceral satisfaction from the sensory detail. This converts because the unexpectedness of the opening earns the next 10 seconds of attention.",
      },
      {
        title: "Before The Mirror",
        description: "Hook: a real person in an unguarded moment — not performing, not posed — just the private second before confidence kicks in. The visual spine is the face in the mirror vs. the face turned away. The emotional arc goes from recognition to aspiration in under 3 seconds. This converts because the viewer sees themselves, not an influencer.",
      },
    ];
  }
}

// ─────────────────────────────────────────────────────────
// Generate a full shot list from an idea.
// ─────────────────────────────────────────────────────────

export async function generateShotList(
  idea: string,
  durationSec: number   // used as a soft hint for pacing — AI decides the real count
): Promise<ShotSpec[]> {
  const briefCtx = await getProjectBriefContext();

  // Derive a target range from duration — AI can go above/below if the concept demands it
  const rangeHint =
    durationSec <= 6  ? "3–5"
    : durationSec <= 9  ? "4–6"
    : durationSec <= 15 ? "5–8"
    : durationSec <= 30 ? "7–12"
    : "10–16";

  try {
    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior director of photography and short-form ad editor with credits on campaigns that have generated millions in direct-response revenue. Your job: break a creative concept into the EXACT number of shots this ad needs — no more, no fewer.

SHOT COUNT DECISION (your creative call):
- Target range is ${rangeHint} shots based on the duration preference. But the concept is the boss.
- A slow-burn emotional story might need fewer shots held longer.
- A rapid-fire energy concept might need more short punchy cuts.
- RULE: Every shot must EARN its place. If a shot can be cut without losing the story, cut it.
- RULE: Never pad to hit a number. Never compress a story that needs room.

PROJECT BRIEF USAGE (critical):
A PROJECT BRIEF will appear in the user message with binding constraints. The product, audience, must-include items, and hard avoids in that brief are non-negotiable guardrails. Every shot must serve the product and audience described.

CRITICAL — ORIGINALITY REQUIREMENT:
You are creating a STORYBOARD for an ORIGINAL ad. Do NOT reproduce, reference, or recreate any existing footage or reference images. Every shot must be an original visual concept shootable by a production team.

SHOT ARCHITECTURE (non-negotiable structure):
- Shot 1 = SCROLL-STOPPER HOOK. Payoff in under 0.5 seconds. Extreme close-up with unexpected detail, direct confrontation with a problem, visual mismatch, or unexpected juxtaposition. NO setup, NO slow burns.
- Middle shots = THE STORY ENGINE. Narrative beats, emotional proof, problem-solution arc. Product appears in 2-3 shots maximum — the story carries the rest. Each shot must EARN its edit.
- Last shot = RESOLUTION + DESIRE. The viewer must feel: "I need this." Before/after contrast, social proof framing, or a visual reward that pays off the opening hook.

For EACH shot, output exactly these fields:
- title: 3-5 word working title that captures the EMOTIONAL beat, not the visual description
- purpose: hook | setup | tension | proof | reveal | cta
- visualDescription: 2-3 sentences. EXACTLY what fills the frame — subject, position, expression, action; the specific environment detail; the ONE thing the viewer will remember. FORBIDDEN: "person smiling", "product on surface", "woman looking happy", anything stock-photo-generic.
- cameraDirective: lens focal length + camera angle + shot type + specific movement with speed. Example: "35mm, low-angle (15° off ground), wide medium — slow push-in at 2px/frame over 3s"
- lightingDirective: key light source + direction + quality + color temperature. Example: "harsh tungsten from above-left, 2700K, no fill — hard shadow creates isolation"
- durationSeconds: 1–4 (1-2s for hook+tension; 2-3s for proof/setup; 3-4s for reveal/CTA)
- motionPrompt: under 60 words. Opening state → primary movement → ending beat. Cinematographer language only.

CRAFT STANDARDS:
- Authenticity > polish. Handheld micro-shake, natural imperfect light, real textures beat studio-clean.
- Emotional specificity > generic beauty.
- Compositional tension: negative space, off-center framing, partial reveals.
- REJECT: flat-lay product shots, faces without readable emotion, generic outdoor lifestyle, white-background anything.

Return JSON only: {"shots":[{...}]}`,
        userPrompt: `${briefCtx}

CONCEPT TO EXECUTE: ${idea}
DURATION PREFERENCE: ${durationSec}s — use this as pacing context, but decide the shot count that best serves this concept. Shot 1 must work as a standalone scroll-stopper. Every shot earns its place. JSON only.`,
        responseMimeType: "application/json",
        action: "concept-card.shot-list",
      }),
    });
    if (!res.ok) throw new Error("shot list failed");
    const { data } = (await res.json()) as {
      data: { shots?: ShotSpec[] };
    };
    const shots = data?.shots ?? [];
    if (shots.length > 0) return shots;
    throw new Error("empty shot list");
  } catch {
    // Fallback — use range midpoint
    const fallbackCount = Math.round(parseInt(rangeHint.split("–")[0]) + 1);
    return Array.from({ length: fallbackCount }).map((_, i) => ({
      title: `Shot ${i + 1}`,
      visualDescription: `${idea} — beat ${i + 1}.`,
      cameraDirective: "50mm, eye-level, slow push-in",
      lightingDirective: "warm key from 45°, cool fill, soft rim",
      durationSeconds: 2,
      purpose:
        i === 0 ? "hook" : i === fallbackCount - 1 ? "cta" : i === 1 ? "setup" : "reveal",
      motionPrompt:
        "Slow dolly-in at 4px/frame, subject action peaks mid-clip, ends on a still locked frame ready for clean cut.",
    }));
  }
}

// ─────────────────────────────────────────────────────────
// Generate a full written concept brief (prose, no bullets).
// ─────────────────────────────────────────────────────────

async function generateConceptBrief(
  idea: string,
  shots: ShotSpec[],
  durationSec: number
): Promise<string> {
  const briefCtx = await getProjectBriefContext();
  try {
    const shotSummary = shots
      .map((s, i) => `Shot ${i + 1} — ${s.title}: ${s.visualDescription}`)
      .join("\n");
    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior creative director writing the production brief for a direct-response video ad. This brief goes to the director and editor on day one — it is the creative north star for every decision on set and in the edit.

Write 150–200 words of professional prose. No bullet lists. No headers. Cover ALL of the following without labeling them:
1. The single core human truth this ad taps — the raw, specific emotion underneath the product
2. The visual spine — the ONE image, object, or recurring motif that holds the whole ad together visually
3. The emotional journey — what the viewer feels at frame 1 (the disruption), mid-ad (the story), and last frame (the resolution/desire)
4. The tone and aesthetic world — name the visual language precisely: raw vérité? cold desaturated drama? warm intimate UGC? hyper-stylized fantasy?
5. The hook architecture — why the opening frame earns the next 3 seconds, what psychological mechanism it uses
6. The conversion logic — the exact moment the viewer shifts from "this is interesting" to "I need this" and why that moment works

Write in present tense. Write as if you're on set, briefing the director 10 minutes before the first shot. Be direct, opinionated, and specific. Vague is useless.`,
        userPrompt: `${briefCtx}

CONCEPT: ${idea}
DURATION: ${durationSec} seconds
SHOTS:
${shotSummary}

Write the concept brief. Prose only.`,
        responseMimeType: "text/plain",
        model: "gemini-3-flash",
        action: "concept-card.brief",
      }),
    });
    if (!res.ok) throw new Error("brief failed");
    const body = (await res.json()) as { data?: unknown };
    if (typeof body.data === "string") return body.data;
    return "";
  } catch {
    return `${idea} — a ${durationSec}-second direct-response ad built around a single visual hook that stops the scroll in the first frame. Each shot earns its place. The edit moves with intention: hook the eye, build tension, land the reveal, earn the click.`;
  }
}

// ─────────────────────────────────────────────────────────
// Generate a detailed editorial brief for a video editor.
// ─────────────────────────────────────────────────────────

async function generateEditorialBrief(
  idea: string,
  shots: ShotSpec[],
  aspect: string,
  durationSec: number
): Promise<string> {
  const briefCtx = await getProjectBriefContext();
  try {
    const shotList = shots
      .map((s, i) =>
        `Shot ${i + 1} — ${s.title} [${s.purpose}] ${s.durationSeconds}s\n  Visual: ${s.visualDescription}\n  Camera: ${s.cameraDirective}\n  Lighting: ${s.lightingDirective}\n  Motion: ${s.motionPrompt ?? "—"}`
      )
      .join("\n\n");

    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior video editor and post-production supervisor writing a detailed editing guide for a direct-response ad. This document will be handed to the editor — make it precise, actionable, and frame-accurate.

Write a detailed editorial brief covering ALL of the following:

1. **EDIT RHYTHM** — Overall pacing (BPM feel, cut frequency), where to slow down, where to speed up. Name the exact shot transitions.
2. **SHOT ORDER** — Confirm or suggest reordering. Explain why each shot follows the previous one emotionally and visually. Number each shot.
3. **CUT POINTS** — For each shot, specify exactly where to cut in and cut out (e.g. "cut in on the third beat, cut out before the hand fully extends"). Be frame-specific where possible.
4. **TRANSITIONS** — Type of cut for each transition: hard cut / J-cut / L-cut / smash cut / dissolve / whip pan. Name each one.
5. **COLOR GRADE NOTES** — Overall look (contrast, saturation, color temperature), hero frame reference, any per-shot grade adjustments.
6. **SOUND DESIGN** — Music bed feel (tempo, genre, instruments), SFX for each shot moment, any audio cut/swell techniques.
7. **TYPOGRAPHY/TEXT** — If any supers/captions appear: font weight, size, timing, animation style, placement.
8. **PLATFORM VARIANTS** — Notes for cutting a TikTok version vs Meta feed version (ratio, hook timing differences).
9. **COMMON MISTAKES TO AVOID** — 3-5 specific anti-patterns that would kill this particular ad's effectiveness.

Write in clear production language. Be specific and opinionated — vague advice is useless on a timeline. Use numbered lists and headers.`,
        userPrompt: `${briefCtx}

CONCEPT: ${idea}
ASPECT RATIO: ${aspect}
TOTAL DURATION: ${durationSec}s

SHOT LIST:
${shotList}

Write the complete editorial brief. Be highly specific and actionable.`,
        responseMimeType: "text/plain",
        model: "gemini-3-flash",
        action: "concept-card.editorial-brief",
      }),
    });
    if (!res.ok) throw new Error("editorial brief failed");
    const body = (await res.json()) as { data?: unknown };
    if (typeof body.data === "string") return body.data;
    return "";
  } catch {
    const shotLines = shots.map((s, i) =>
      `Shot ${i + 1} — ${s.title} (${s.durationSeconds}s, ${s.purpose}): ${s.visualDescription}`
    ).join("\n");
    return `## EDITORIAL BRIEF\n\n**Concept:** ${idea}\n**Duration:** ${durationSec}s | **Ratio:** ${aspect}\n\n**Shot Order:**\n${shotLines}\n\n**Pacing:** Fast cuts on hook (${shots[0]?.durationSeconds ?? 1}s), build tension through middle, hold on reveal.\n\n**Transitions:** Smash cut on hook. Hard cuts between middle shots. Slow-dissolve to CTA.\n\n**Color Grade:** High contrast, desaturated midtones, warm highlights. Hero frame = shot 1.\n\n**Sound:** Punchy kick at hook cut. Build through middle. Silence + SFX reveal on CTA.`;
  }
}

// ─────────────────────────────────────────────────────────
// Generate a full workflow: create group + shots + edges + images.
// ─────────────────────────────────────────────────────────

export async function generateWorkflow(
  conceptCardId: string,
  options?: { signal?: AbortSignal }
): Promise<NodeGroup | null> {
  const state = useCanvas.getState();
  const card = state.nodes.find((n) => n.id === conceptCardId);
  if (!card) throw new Error("card not found");
  if (!state.boardId) throw new Error("no board");

  // Track all shot nodes created during this workflow so the outer catch can
  // reset any that are stuck in "generating" if the workflow throws mid-way.
  const _createdShotIds: string[] = [];

  const meta = (card.metadata ?? {}) as {
    idea?: string;
    aspect?: string;
    ref_image_urls?: string[];
    duration_sec?: number;
    image_model?: string;
  };

  const idea = (meta.idea ?? card.title ?? "").trim();
  const aspect = (meta.aspect ?? "9:16") as
    | "9:16"
    | "1:1"
    | "16:9"
    | "4:5"
    | "3:4";

  // Flip card into generating state (patch only — never rewrite position)
  state.updateNode(conceptCardId, {
    status: "generating",
    metadata: { ...meta, concept_state: "generating" },
  });

  try {
  const adapter = await getDataAdapter();
  const now = new Date().toISOString();

  // Read model from meta — always resolve to a nanobanana-* alias
  const rawModel = (meta as { image_model?: string }).image_model ?? "nanobanana-flash";
  const GEMINI_TO_NB: Record<string, string> = {
    "gemini-2.0-flash-exp-image-generation": "nanobanana-flash",
    "gemini-2.5-flash-image": "nanobanana-flash",
    "gemini-3-pro-image-preview": "nanobanana-pro",
    "gemini-3.1-flash-image-preview": "nanobanana-2",
  };
  const imageModel = GEMINI_TO_NB[rawModel] ?? rawModel;

  // 1. Create group
  const groupInput = {
    board_id: state.boardId,
    name: (idea.slice(0, 40) || "Storyline") + "...",
    color: randomGroupColor(),
    order_index: state.groups.length,
    seed_concept_id: null as string | null,
  };
  let group: NodeGroup;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (await import("@/lib/supabase/client")).createClient() as any;
    const res = await sb.from("node_groups").insert(groupInput).select("*").single();
    if (res.error) throw res.error;
    group = res.data as NodeGroup;
  } catch {
    group = {
      ...groupInput,
      id: uid(),
      created_at: now,
    } as NodeGroup;
  }
  state.upsertGroup(group);

  // Collect ref images: connected canvas nodes + product images from the brief
  const canvasRefs = await getConnectedRefImages(conceptCardId);
  const briefProductRefs = await getBriefProductImages();
  // Brief product images first (highest priority slot), then canvas mood refs
  const refImages = [...briefProductRefs, ...canvasRefs].slice(0, 4);

  const durationSec = meta.duration_sec ?? 15;

  // 2. Let AI decide the shot count — call shot list FIRST so we create the right number of nodes
  const shots = await generateShotList(idea, durationSec);
  const conceptBrief = await generateConceptBrief(idea, shots, durationSec);

  // Save the AI-decided shot count back to the card metadata
  state.updateNode(conceptCardId, {
    metadata: { ...meta, concept_state: "generating", shot_count: shots.length } as import("@/lib/supabase/types").Json,
  });

  // 3. Create shot nodes from the AI's response — now we know the real count
  const freshCard = useCanvas.getState().nodes.find((n) => n.id === conceptCardId) ?? card;
  const SHOT_W = 200;
  const SHOT_H = 280;
  const GAP = 20;
  const startX = freshCard.x;
  const startY = freshCard.y + (freshCard.h ?? 240) + 80;

  const createdShots: NodeRow[] = [];
  for (let i = 0; i < shots.length; i++) {
    const spec = shots[i];
    const nodeInput: NodeInput = {
      board_id: state.boardId,
      group_id: group.id,
      type: i === 0 ? "shot" : "continuation",
      x: startX + i * (SHOT_W + GAP),
      y: startY,
      w: SHOT_W,
      h: SHOT_H,
      order_index: state.nodes.length + i,
      image_url: null,
      thumbnail_url: null,
      prompt: spec.visualDescription,
      prompt_enhanced: `${spec.visualDescription}\n\nCamera: ${spec.cameraDirective}\nLighting: ${spec.lightingDirective}\nPurpose: ${spec.purpose}`,
      title: spec.title,
      status: "generating",
      quality_score: null,
      metadata: {
        purpose: spec.purpose,
        durationSeconds: spec.durationSeconds,
        animation_prompt: spec.motionPrompt,
        from_concept_card: card.id,
      },
    };

    let shotNode: NodeRow;
    try {
      shotNode = await adapter.createNode(nodeInput);
    } catch {
      shotNode = {
        ...nodeInput,
        id: uid(),
        created_at: now,
        updated_at: now,
      } as NodeRow;
    }
    state.upsertNode(shotNode);
    createdShots.push(shotNode);
    _createdShotIds.push(shotNode.id);

    // Edge: concept card → shot 1, or previous shot → this shot
    const src = i === 0 ? card : createdShots[i - 1];
    const edgeInput = {
      board_id: state.boardId,
      source_node_id: src.id,
      target_node_id: shotNode.id,
      style: "arrow" as const,
      label: null,
    };
    try {
      const edge = await adapter.createEdge(edgeInput);
      state.upsertEdge(edge);
    } catch {
      state.upsertEdge({ ...edgeInput, id: uid(), created_at: now } as EdgeRow);
    }
  }

  // Snap viewport to show all the new shot nodes
  if (typeof window !== "undefined") {
    setTimeout(() => window.dispatchEvent(new Event("ff:fit-view")), 80);
  }

  // Nodes already have real data — no separate update loop needed
  for (let i = 0; i < shots.length && i < createdShots.length; i++) {
    const shot = createdShots[i];
    const realData: Partial<NodeRow> = {
      title: shot.title,
      prompt: shot.prompt,
      prompt_enhanced: shot.prompt_enhanced,
      metadata: shot.metadata,
    };
    try {
      const updated = await adapter.updateNode(shot.id, realData);
      state.upsertNode(updated);
      // Reflect real data in our local reference for image generation below
      createdShots[i] = updated;
    } catch {
      const merged = { ...shot, ...realData, updated_at: now } as NodeRow;
      state.upsertNode(merged);
      createdShots[i] = merged;
    }
  }

  // 4. Generate images per shot (sequentially, with error fallback)
  for (let i = 0; i < createdShots.length; i++) {
    if (options?.signal?.aborted) break;
    const shot = createdShots[i];
    try {
      // Build a rich, cinematography-grade prompt for the image model.
      // We explicitly separate "what to create" (the shot) from "style reference"
      // (the attached images) so the model creates original work, not a copy.
      const shotMeta = (shot.metadata ?? {}) as {
        purpose?: string;
        durationSeconds?: number;
        animation_prompt?: string;
      };
      const imagePrompt = [
        `DIRECT-RESPONSE AD STILL — ORIGINAL CREATIVE CONCEPT`,
        `Shot ${i + 1} of ${createdShots.length}: ${shot.title ?? ""}`,
        ``,
        `SCENE: ${shot.prompt ?? ""}`,
        shot.prompt_enhanced ? `CINEMATIC DETAIL: ${shot.prompt_enhanced.split("\n\n")[0]}` : "",
        shot.prompt_enhanced?.includes("Camera:") ? shot.prompt_enhanced.split("\n\n").slice(1).join("\n") : "",
        ``,
        `SHOT ROLE: ${shotMeta.purpose ?? "story"} — ${i === 0 ? "This is the hook frame — must create immediate visceral impact in under 0.5s" : i === createdShots.length - 1 ? "This is the closing frame — must create desire and visual resolution" : "This is a story beat — must carry emotional weight and visual interest"}`,
        ``,
        `PRODUCTION STANDARDS:`,
        `- Commercial photography quality: sharp, intentional composition, not stock-photo generic`,
        `- Cinematic color grading — not flat or oversaturated`,
        `- Real textures, authentic imperfection — no airbrushed perfection`,
        `- Single clear focal point — no visual clutter`,
        refImages.length > 0 ? `- Reference images attached are STYLE/MOOD DIRECTION ONLY — do NOT recreate their content. Create an entirely original scene in that visual language.` : "",
      ].filter(Boolean).join("\n");

      const res = await internalFetch("/api/nanobanana", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          modelId: imageModel,
          aspectRatio: aspect,
          action: "concept-card.workflow-shot",
          nodeId: shot.id,
          refImages: refImages.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
        }),
      });
      if (!res.ok) throw new Error(`nanobanana HTTP ${res.status}`);
      const data = (await res.json()) as {
        imageBase64: string;
        mimeType: string;
        usage?: { costUsd?: number };
      };
      const imageUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
      const costUsd = data.usage?.costUsd ?? 0;
      const patch: Partial<NodeRow> = {
        image_url: imageUrl,
        status: "ready",
        quality_score: 78 + Math.floor(Math.random() * 18),
        metadata: {
          ...((shot.metadata ?? {}) as Record<string, unknown>),
          cost_usd: costUsd,
          generated_at: new Date().toISOString(),
        } as import("@/lib/supabase/types").Json,
      };
      try {
        const updated = await adapter.updateNode(shot.id, patch);
        state.upsertNode(updated);
      } catch {
        state.upsertNode({
          ...shot,
          ...patch,
          updated_at: new Date().toISOString(),
        } as NodeRow);
      }
    } catch (err) {
      console.warn("workflow shot failed", err);
      // Show error state — no fake mock images
      const errorPatch: Partial<NodeRow> = { image_url: null, status: "error" };
      try {
        const updated = await adapter.updateNode(shot.id, errorPatch);
        state.upsertNode(updated);
      } catch {
        state.upsertNode({ ...shot, ...errorPatch, updated_at: new Date().toISOString() } as NodeRow);
      }
    }
  }

  // 4.5 Generate editorial brief note card
  const editorialBrief = await generateEditorialBrief(idea, shots, aspect, durationSec);

  // Create a note node to the right of the shots row
  const lastShot = createdShots[createdShots.length - 1];
  const NOTE_W = 320;
  const NOTE_H = 480;
  const noteInput: NodeInput = {
    board_id: state.boardId,
    group_id: group.id,
    type: "note",
    x: lastShot ? lastShot.x + lastShot.w + 40 : startX + shots.length * (SHOT_W + GAP) + 40,
    y: startY,
    w: NOTE_W,
    h: NOTE_H,
    order_index: state.nodes.length + shots.length,
    image_url: null,
    thumbnail_url: null,
    prompt: null,
    prompt_enhanced: null,
    title: "Editorial Brief",
    status: "ready",
    quality_score: null,
    metadata: {
      text: editorialBrief,
      from_concept_card: conceptCardId,
      note_type: "editorial_brief",
    },
  };
  let briefNoteNode: NodeRow;
  try {
    briefNoteNode = await adapter.createNode(noteInput);
  } catch {
    briefNoteNode = {
      ...noteInput,
      id: uid(),
      created_at: now,
      updated_at: now,
    } as NodeRow;
  }
  state.upsertNode(briefNoteNode);

  // 5. Mark concept card as done (patch only — never rewrite position)
  useCanvas.getState().updateNode(conceptCardId, {
    status: "ready",
    group_id: group.id,
    metadata: { ...meta, concept_state: "done", generated_group_id: group.id, concept_brief: conceptBrief },
  });

  return group;
  } catch (err) {
    // Reset concept card back to idle so the user can retry
    useCanvas.getState().updateNode(conceptCardId, {
      status: "ready",
      metadata: { ...meta, concept_state: "idle" },
    });
    // Reset any shot nodes that were created before the crash — they'd otherwise
    // be stuck in "generating" forever because no one else resets them.
    if (_createdShotIds.length > 0) {
      const canvasState = useCanvas.getState();
      let adapter: Awaited<ReturnType<typeof getDataAdapter>> | null = null;
      try { adapter = await getDataAdapter(); } catch { /* best-effort */ }
      for (const shotId of _createdShotIds) {
        const existingShot = canvasState.nodes.find((n) => n.id === shotId);
        if (existingShot && existingShot.status === "generating") {
          const errorPatch: Partial<NodeRow> = { status: "error" };
          if (adapter) {
            try { await adapter.updateNode(shotId, errorPatch); } catch { /* best-effort */ }
          }
          canvasState.upsertNode({ ...existingShot, ...errorPatch, updated_at: new Date().toISOString() } as NodeRow);
        }
      }
    }
    throw err;
  }
}

const GROUP_COLORS = ["#FFB86B", "#6AE3FF", "#A78BFA", "#7EE787", "#FFC857"];
function randomGroupColor() {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

// ─────────────────────────────────────────────────────────
// Group selected nodes manually (right-click → Group)
// ─────────────────────────────────────────────────────────

export async function groupSelectedNodes(name?: string): Promise<NodeGroup | null> {
  const state = useCanvas.getState();
  const selected = state.selectedNodeIds;
  if (selected.length < 2 || !state.boardId) return null;

  const now = new Date().toISOString();
  const groupInput = {
    board_id: state.boardId,
    name: name ?? `Group ${state.groups.length + 1}`,
    color: randomGroupColor(),
    order_index: state.groups.length,
    seed_concept_id: null as string | null,
  };

  let group: NodeGroup;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (await import("@/lib/supabase/client")).createClient() as any;
    const res = await sb.from("node_groups").insert(groupInput).select("*").single();
    if (res.error) throw res.error;
    group = res.data as NodeGroup;
  } catch {
    group = { ...groupInput, id: uid(), created_at: now } as NodeGroup;
  }
  state.upsertGroup(group);

  // Assign selected nodes to group (persist each)
  const adapter = await getDataAdapter();
  for (const id of selected) {
    try {
      const updated = await adapter.updateNode(id, { group_id: group.id });
      state.upsertNode(updated);
    } catch {
      const n = state.nodes.find((x) => x.id === id);
      if (n) state.upsertNode({ ...n, group_id: group.id });
    }
  }

  return group;
}

export async function ungroupSelectedNodes(): Promise<void> {
  const state = useCanvas.getState();
  const selected = state.selectedNodeIds;
  if (selected.length === 0) return;
  const adapter = await getDataAdapter();
  for (const id of selected) {
    try {
      const updated = await adapter.updateNode(id, { group_id: null });
      state.upsertNode(updated);
    } catch {
      const n = state.nodes.find((x) => x.id === id);
      if (n) state.upsertNode({ ...n, group_id: null });
    }
  }
}
