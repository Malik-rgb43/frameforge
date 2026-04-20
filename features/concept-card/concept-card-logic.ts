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
    return productImages.slice(0, 2).map((dataUrl) => {
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg";
      return { base64, mimeType };
    });
  } catch {
    return [];
  }
}

async function getProjectBriefContext(): Promise<string> {
  const state = useCanvas.getState();
  if (!state.boardId) return "";
  try {
    const adapter = await getDataAdapter();
    // Board → Project chain: we don't have a direct way, so traverse via mock/supabase
    // Simplified: check sessionStorage cache set by the Studio page
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
        const [header, base64] = node.image_url.split(",");
        const mimeType = header.split(":")[1].split(";")[0];
        results.push({ base64, mimeType });
      } else {
        const res = await fetch(node.image_url);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
        results.push({ base64, mimeType: blob.type || "image/jpeg" });
      }
    } catch { /* skip */ }
  }
  return results;
}

export async function suggestConceptIdeas(
  productContext: string,
  refImages?: Array<{base64: string; mimeType: string}>
): Promise<string[]> {
  const briefCtx = await getProjectBriefContext();
  const refCount = refImages?.length ?? 0;
  try {
    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior direct-response creative director specializing in short-form video ads (TikTok, Instagram Reels, Meta). You turn product/service briefs into 4 distinct scroll-stopping concepts.

Each concept must:
- Lead with the HOOK (what stops the scroll in <1 second) — not the brand
- Target a specific avatar-pain-moment combination
- Work for both products AND services
- Feel native to the feed, not like a broadcast commercial
- Have a clear visual spine (one image that defines the whole ad)

Five hook mechanisms to choose from: (1) pattern interrupt — physics-defying or reversed moment, (2) curiosity gap — reaction before the cause, (3) extreme close-up — intimate texture/detail, (4) direct problem naming — self-selects the viewer in frame 1, (5) before/after reveal — outcome first, explanation follows.

REJECT: smiling-at-camera, marble-flat-lay, generic product-on-surface, hand-reach close-up, talking-head-with-logo.

Return JSON: {"ideas":["...","...","...","..."]}. Each idea ≤ 1 sentence. No prose, no fences.`,
        userPrompt: `${briefCtx}

${productContext ? `ADDITIONAL CONTEXT: ${productContext}` : ""}
${refCount > 0 ? `REFERENCE IMAGES: ${refCount} attached — read their mood/palette/style as creative input.` : ""}

Generate 4 distinct scroll-stopping concepts. Each must have a different hook mechanism and different target avatar. JSON only.`,
        responseMimeType: "application/json",
        action: "concept-card.suggest",
        images: refImages?.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      }),
    });
    if (!res.ok) throw new Error("suggest failed");
    const { data } = (await res.json()) as {
      data: { ideas?: string[] };
    };
    return Array.isArray(data?.ideas) ? data.ideas.slice(0, 4) : [];
  } catch {
    return [
      "A 4am ritual: a single warm light and one hand pouring — no words.",
      "An unexpected mid-action product shot — the exact second of impact.",
      "Voyeur through-glass frame with condensation beading on the lens.",
      "Pattern interrupt: extreme macro on a material surface nobody's seen.",
    ];
  }
}

// ─────────────────────────────────────────────────────────
// Generate a full shot list from an idea.
// ─────────────────────────────────────────────────────────

export async function generateShotList(
  idea: string,
  shotCount: number
): Promise<ShotSpec[]> {
  const briefCtx = await getProjectBriefContext();
  try {
    const res = await internalFetch("/api/gemini", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `You are a senior director of photography and short-form ad editor. Break this concept into ${shotCount} precise, shootable shots for a direct-response video ad.

SHOT STRUCTURE LAW:
- Shot 1 = HOOK. Must deliver payoff in <0.5 seconds. No build-up. Pattern interrupt, extreme close-up, or direct problem naming. If it doesn't stop a scroll, it fails.
- Middle shots = PROOF/TRANSFORMATION. Visual evidence — product in use, before/after, transformation moment. NO narration shots, NO beauty filler.
- Last shot = REVEAL/CTA. Clear outcome or click trigger. Not a text card unless unavoidable.

For EACH shot output these exact fields:
- title: 3-5 word working title
- purpose: hook | setup | reveal | proof | cta
- visualDescription: 2 sentences max, hyper-specific and cinematic. Name the subject, the exact moment, the environment detail. NO "product on surface", NO "person smiling", NO vague descriptions.
- cameraDirective: lens (e.g. "85mm") + angle + shot type + camera movement (e.g. "low-angle medium, slow dolly-in 2px/frame")
- lightingDirective: key source type + direction + quality + color temp (e.g. "soft window light from left, warm 3200K, no fill")
- durationSeconds: 1-4 (impulse products: keep fast; services/considered: allow 3-4s)
- motionPrompt: image-to-video directive under 50 words. Camera movement + subject action + final beat. Cinematographer language only.

Platform pacing: TikTok/Reels = fast cuts 1-2s each. Meta feed = allow 2-3s for proof shots.
Authenticity markers (use these): handheld micro-movements, slight film grain, imperfect natural light, real textures.
REJECT: generic AI faces, excessive overlays, visual noise, motion-blur overuse.

Return JSON only: {"shots":[{...}]}`,
        userPrompt: `${briefCtx}

CONCEPT: ${idea}

Build ${shotCount} shots. Shot 1 is the hook (payoff in <0.5s). JSON only.`,
        responseMimeType: "application/json",
        action: "concept-card.shot-list",
      }),
    });
    if (!res.ok) throw new Error("shot list failed");
    const { data } = (await res.json()) as {
      data: { shots?: ShotSpec[] };
    };
    return (data?.shots ?? []).slice(0, shotCount);
  } catch {
    // Fallback
    return Array.from({ length: shotCount }).map((_, i) => ({
      title: `Shot ${i + 1}`,
      visualDescription: `${idea} — beat ${i + 1}.`,
      cameraDirective: "50mm, eye-level, slow push-in",
      lightingDirective: "warm key from 45°, cool fill, soft rim",
      durationSeconds: 2,
      purpose:
        i === 0 ? "hook" : i === shotCount - 1 ? "cta" : i === 1 ? "setup" : "reveal",
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
        systemPrompt: `You are a senior creative director writing the creative brief for a direct-response video ad. This brief will guide the entire production — so be specific, inspiring, and honest about what makes this concept work.

Write 130–180 words of flowing prose. Cover:
1. The core creative idea — what is the one thing this ad says/shows
2. The visual spine — the single image or moment that defines the whole piece
3. The emotional arc — how the viewer feels from frame 1 to the last frame
4. Tone and aesthetic — is it raw/UGC, cinematic, editorial, energetic, calm?
5. The hook mechanic — how does frame 1 earn the next 3 seconds
6. Why this concept converts — what makes a viewer stop, watch, and click

No bullet lists. No headers. Professional prose only. Write as if briefing a director on set.`,
        userPrompt: `${briefCtx}

CONCEPT: ${idea}
DURATION: ${durationSec} seconds
SHOTS:
${shotSummary}

Write the concept brief. Prose only.`,
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
// Generate a full workflow: create group + shots + edges + images.
// ─────────────────────────────────────────────────────────

export async function generateWorkflow(
  conceptCardId: string
): Promise<NodeGroup | null> {
  const state = useCanvas.getState();
  const card = state.nodes.find((n) => n.id === conceptCardId);
  if (!card) throw new Error("card not found");
  if (!state.boardId) throw new Error("no board");

  const meta = (card.metadata ?? {}) as {
    idea?: string;
    shot_count?: number;
    aspect?: string;
    ref_image_urls?: string[];
  };

  const idea = (meta.idea ?? card.title ?? "").trim();
  const shotCount = meta.shot_count ?? 5;
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

  const adapter = await getDataAdapter();
  const now = new Date().toISOString();

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

  // 2. Ask Gemini for a shot list first, then generate the concept brief using the real shots.
  // Brief depends on shots for accurate per-shot referencing, so shots must resolve first.
  const durationSec = (meta as { duration_sec?: number }).duration_sec ?? 15;
  const shots = await generateShotList(idea, shotCount);
  const conceptBrief = await generateConceptBrief(idea, shots, durationSec);

  // 3. Lay out shots HORIZONTALLY BELOW the concept card (exits from bottom handle)
  // Get fresh card position to avoid stale coords
  const freshCard = useCanvas.getState().nodes.find((n) => n.id === conceptCardId) ?? card;
  const SHOT_W = 200;
  const SHOT_H = 280;
  const GAP = 20;
  const startX = freshCard.x;
  const startY = freshCard.y + (freshCard.h ?? 240) + 80;

  const createdShots: NodeRow[] = [];
  for (let i = 0; i < shots.length; i++) {
    const spec = shots[i];
    const shotInput: NodeInput = {
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
      shotNode = await adapter.createNode(shotInput);
    } catch {
      shotNode = {
        ...shotInput,
        id: uid(),
        created_at: now,
        updated_at: now,
      } as NodeRow;
    }
    state.upsertNode(shotNode);
    createdShots.push(shotNode);

    // Edge from previous shot → this one (continuity) or from concept card → shot 1
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
      state.upsertEdge({
        ...edgeInput,
        id: uid(),
        created_at: now,
      } as EdgeRow);
    }
  }

  // 4. Generate images per shot (sequentially, with mock fallback)
  for (let i = 0; i < createdShots.length; i++) {
    const shot = createdShots[i];
    try {
      const res = await internalFetch("/api/nanobanana", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: shot.prompt_enhanced ?? shot.prompt,
          modelId: "nanobanana-pro",
          aspectRatio: aspect,
          action: "concept-card.workflow-shot",
          nodeId: shot.id,
          refImages: refImages.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
        }),
      });
      let imageUrl: string | null = null;
      let costUsd = 0;
      if (res.ok) {
        const data = (await res.json()) as {
          imageBase64: string;
          mimeType: string;
          usage?: { costUsd?: number };
        };
        imageUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
        costUsd = data.usage?.costUsd ?? 0;
      }
      const patch: Partial<NodeRow> = {
        image_url: imageUrl ?? pickMock(i),
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
      state.upsertNode({
        ...shot,
        image_url: pickMock(i),
        status: "ready",
      });
    }
  }

  // 5. Mark concept card as done (patch only — never rewrite position)
  useCanvas.getState().updateNode(conceptCardId, {
    status: "ready",
    group_id: group.id,
    metadata: { ...meta, concept_state: "done", generated_group_id: group.id, concept_brief: conceptBrief },
  });

  return group;
}

const MOCK = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1522992319-0365e5f11656?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=480&h=640&fit=crop",
];
const pickMock = (i: number) => MOCK[i % MOCK.length];

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
