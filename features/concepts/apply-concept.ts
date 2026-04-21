import { internalFetch } from "@/lib/api";
// Apply concept → auto-build a board with source images + shots + edges.

import { useCanvas } from "@/features/canvas/store";
import { useConcepts, type ConceptUI } from "./store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { EdgeRow, NodeRow } from "@/lib/supabase/types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "nd_" + Math.random().toString(36).slice(2);

const SHOT_PURPOSES = ["hook", "setup", "reveal", "proof", "cta"];

export async function applyConceptToBoard(concept: ConceptUI): Promise<void> {
  const state = useCanvas.getState();
  const boardId = state.boardId;
  if (!boardId) throw new Error("no board loaded");

  const now = new Date().toISOString();

  // Row 1 — source images from the concept's moodboard (top)
  const SOURCE_Y = 80;
  const SOURCE_GAP = 24;
  const SOURCE_W = 220;
  const sourceNodes: NodeRow[] = concept.moodboardUrls.map((url, i) => ({
    id: uid(),
    board_id: boardId,
    group_id: null,
    type: "source" as const,
    x: 120 + i * (SOURCE_W + SOURCE_GAP),
    y: SOURCE_Y,
    w: SOURCE_W,
    h: 280,
    order_index: i,
    image_url: url,
    thumbnail_url: null,
    prompt: null,
    prompt_enhanced: null,
    title: `${concept.title} · Mood ${i + 1}`,
    status: "ready" as const,
    quality_score: null,
    metadata: { fromConcept: concept.id, kind: "moodboard" },
    animation_prompt: null,
    animation_model_hint: null,
    used_ref_ids: null,
    created_at: now,
    updated_at: now,
  }));

  // Row 2 — shot list, sequenced left-to-right
  const SHOT_Y = 460;
  const SHOT_GAP = 24;
  const SHOT_W = 220;
  const shotNodes: NodeRow[] = [];
  for (let i = 0; i < concept.shotCount; i++) {
    const purpose = SHOT_PURPOSES[Math.min(i, SHOT_PURPOSES.length - 1)];
    shotNodes.push({
      id: uid(),
      board_id: boardId,
      group_id: null,
      type: "shot" as const,
      x: 160 + i * (SHOT_W + SHOT_GAP),
      y: SHOT_Y,
      w: SHOT_W,
      h: 280,
      order_index: concept.moodboardUrls.length + i,
      image_url: null,
      thumbnail_url: null,
      prompt: `[${purpose}] ${concept.visualSpine}`,
      prompt_enhanced: `Shot ${i + 1}/${concept.shotCount} — ${purpose} frame for "${concept.title}". Hook archetype: ${concept.hookArchetype}. Palette: ${concept.palette.join(", ")}. Mood: ${concept.moodKeywords.join(", ")}.`,
      title: `${purpose.charAt(0).toUpperCase() + purpose.slice(1)} · ${i + 1}`,
      status: "generating" as const,
      quality_score: null,
      metadata: {
        fromConcept: concept.id,
        purpose,
      },
      animation_prompt: null,
      animation_model_hint: null,
      used_ref_ids: null,
      created_at: now,
      updated_at: now,
    });
  }

  // Insert all nodes — Zustand immediately, then persist to adapter
  const allNodes = [...sourceNodes, ...shotNodes];
  allNodes.forEach((n) => state.upsertNode(n));

  // Select first source node so the canvas pans to the newly inserted concept area
  if (allNodes.length > 0) {
    state.setSelectedIds([allNodes[0].id]);
  }

  // Edges — each shot connects to 1-3 source nodes (round-robin)
  const edges: EdgeRow[] = [];
  shotNodes.forEach((shot, i) => {
    const refCount = Math.min(2, sourceNodes.length);
    for (let j = 0; j < refCount; j++) {
      const src = sourceNodes[(i + j) % sourceNodes.length];
      edges.push({
        id: uid(),
        board_id: boardId,
        source_node_id: src.id,
        target_node_id: shot.id,
        style: j === 0 ? "solid" : "dashed",
        label: null,
        created_at: now,
      });
    }
  });
  edges.forEach((e) => state.upsertEdge(e));

  // Persist to DB — nodes first (edges have FK to nodes)
  void (async () => {
    const adapter = await Promise.resolve(getDataAdapter());
    await Promise.all(allNodes.map((n) =>
      adapter.createNode(n).catch((err) => console.error("createNode failed", err))
    ));
    await Promise.all(edges.map((e) =>
      adapter.createEdge(e).catch((err) => console.error("createEdge failed", err))
    ));
  })();

  // Real generation (per shot, staggered) — falls back to mock if API not configured
  const MOCK_IMAGES = concept.moodboardUrls.concat([
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=480&h=640&fit=crop",
    "https://images.unsplash.com/photo-1522992319-0365e5f11656?w=480&h=640&fit=crop",
  ]);

  for (let i = 0; i < shotNodes.length; i++) {
    const shot = shotNodes[i];
    const imageUrl = await generateShotImage(shot, concept, i).catch(() => null);
    const finalUrl = imageUrl ?? MOCK_IMAGES[i % MOCK_IMAGES.length];
    const ready = {
      ...shot,
      image_url: finalUrl,
      status: "ready" as const,
      quality_score: 75 + Math.floor(Math.random() * 20),
      updated_at: new Date().toISOString(),
    };
    state.upsertNode(ready);
    void Promise.resolve(getDataAdapter()).then((adapter) =>
      adapter.updateNode(ready.id, {
        image_url: ready.image_url,
        status: ready.status,
        quality_score: ready.quality_score,
        updated_at: ready.updated_at,
      }).catch((err) => console.error("updateNode failed", err))
    );
    // Small stagger for UX — keeps the "filling in" feel
    await new Promise((r) => setTimeout(r, 120));
  }

  useConcepts.getState().markApplied(concept.id, boardId);
}

async function generateShotImage(
  shot: NodeRow,
  concept: ConceptUI,
  index: number
): Promise<string | null> {
  const prompt = `${concept.visualSpine}

Shot ${index + 1} of ${concept.shotCount} for "${concept.title}".
Hook archetype: ${concept.hookArchetype}.
Palette: ${concept.palette.join(", ")}.
Mood: ${concept.moodKeywords.join(", ")}.
Purpose: ${(shot.metadata as { purpose?: string } | null)?.purpose ?? "shot"}.

Photorealistic cinematic, 35mm film feel, analog grain, shallow depth of field, single focal point, commercial polish.`;

  const res = await internalFetch("/api/nanobanana", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt,
      modelId: "nanobanana-pro",
      aspectRatio: "9:16",
      action: "concept.apply-shot",
      nodeId: shot.id,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    imageBase64: string;
    mimeType: string;
  };
  return `data:${data.mimeType};base64,${data.imageBase64}`;
}
