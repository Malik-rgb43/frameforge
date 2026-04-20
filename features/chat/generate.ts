import { internalFetch } from "@/lib/api";
// Generate flow — calls real NanoBanana Pro when GOOGLE_GENAI_API_KEY is set,
// falls back to mock images if the API isn't configured yet.

import { useCanvas } from "@/features/canvas/store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { EdgeRow, NodeRow } from "@/lib/supabase/types";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=480&h=640&fit=crop",
  "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=480&h=640&fit=crop",
];

interface GenerateOptions {
  prompt: string;
  isContinuation?: boolean;
  modelId?: string;
  aspect?: "9:16" | "1:1" | "16:9" | "4:5" | "3:4";
  thinkingLevel?: "LOW" | "HIGH";
  seed?: number;
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mimeType: blob.type || "image/jpeg" };
  } catch {
    return null;
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "node_" + Math.random().toString(36).slice(2);

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Find a free spot on the board for a new node
function findFreeSpot(nodes: NodeRow[]): { x: number; y: number } {
  // Place below the lowest existing node, offset by 40px
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.h), 0);
  const spread = nodes.length * 40;
  return {
    x: 300 + (spread % 600),
    y: maxY + 40,
  };
}

export async function generateFromPrompt(opts: GenerateOptions): Promise<NodeRow> {
  const {
    prompt,
    isContinuation = false,
    modelId = "nanobanana-pro",
    aspect = "9:16",
    thinkingLevel,
    seed,
  } = opts;
  const state = useCanvas.getState();
  const { boardId, nodes, refNodeIds } = state;

  if (!boardId) throw new Error("no board loaded");

  const { x, y } = findFreeSpot(nodes);
  const now = new Date().toISOString();

  const enhancedPrompt = `${prompt}

Production specs:
- Photorealistic cinematic, 35mm film feel, subtle grain, analog texture
- Shallow depth of field on the hero element
- Single clear focal point
- Professional commercial polish — not stock, not plastic
- Aspect ratio: ${aspect}
${refNodeIds.length > 0 ? `- ${refNodeIds.length} reference images attached for subject + palette continuity` : ""}`;

  const adapter = await getDataAdapter();

  // Persist placeholder node
  const placeholderInput: Omit<NodeRow, "id" | "created_at" | "updated_at"> = {
    board_id: boardId,
    group_id: null,
    type: isContinuation ? "continuation" : "shot",
    x,
    y,
    w: 240,
    h: 320,
    order_index: nodes.length,
    image_url: null,
    thumbnail_url: null,
    prompt,
    prompt_enhanced: enhancedPrompt,
    title: prompt.slice(0, 40),
    status: "generating",
    quality_score: null,
    metadata: { used_ref_ids: [...refNodeIds] },
  };

  let placeholder: NodeRow;
  try {
    placeholder = await adapter.createNode(placeholderInput);
  } catch {
    placeholder = {
      ...placeholderInput,
      id: uid(),
      created_at: now,
      updated_at: now,
    } as NodeRow;
  }
  state.upsertNode(placeholder);

  // Persist ref edges
  for (const [i, refId] of refNodeIds.entries()) {
    const edgeInput: Omit<EdgeRow, "id" | "created_at"> = {
      board_id: boardId,
      source_node_id: refId,
      target_node_id: placeholder.id,
      style: i === 0 && isContinuation ? "arrow" : "solid",
      label: null,
    };
    try {
      const saved = await adapter.createEdge(edgeInput);
      state.upsertEdge(saved);
    } catch {
      state.upsertEdge({
        ...edgeInput,
        id: uid(),
        created_at: now,
      } as EdgeRow);
    }
  }

  // Convert up to 3 refs to base64 for NanoBanana slots
  const refImageDataList = await Promise.all(
    refNodeIds
      .slice(0, 3)
      .map((id) => nodes.find((n) => n.id === id)?.image_url)
      .filter((u): u is string => !!u)
      .map((u) => urlToBase64(u))
  );
  const refImages = refImageDataList.filter(
    (r): r is { base64: string; mimeType: string } => !!r
  );

  // Try real API first, fall back to mock only if API key not configured (503).
  try {
    const res = await internalFetch("/api/nanobanana", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        modelId,
        aspectRatio: aspect,
        refImages,
        thinkingLevel,
        seed,
        nodeId: placeholder.id,
        action: isContinuation ? "image.continuity" : "image.generate",
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        imageBase64: string;
        mimeType: string;
        usage: { costUsd: number; durationMs: number };
      };
      const patch: Partial<NodeRow> = {
        image_url: `data:${data.mimeType};base64,${data.imageBase64}`,
        status: "ready",
        quality_score: 80 + Math.floor(Math.random() * 15),
        metadata: {
          ...(placeholder.metadata as Record<string, unknown>),
          cost_usd: data.usage.costUsd,
          duration_ms: data.usage.durationMs,
          model_used: modelId,
        },
      };
      let ready: NodeRow;
      try {
        ready = await adapter.updateNode(placeholder.id, patch);
      } catch {
        ready = {
          ...placeholder,
          ...patch,
          updated_at: new Date().toISOString(),
        } as NodeRow;
      }
      state.upsertNode(ready);
      state.clearRefs();
      return ready;
    }

    // 503 = API key not configured → fall through to mock
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status !== 503) {
      // Real API error (auth, server error, etc.) — mark node as failed and re-throw
      state.updateNode(placeholder.id, { status: "error" });
      throw new Error(errBody.error ?? `HTTP ${res.status}`);
    }
    // status === 503: fall through to mock below
  } catch (err) {
    // Only fall through to mock for network-level errors (no response at all).
    // Re-throw errors that were explicitly thrown above (non-503 HTTP errors).
    if (err instanceof Error && err.message.startsWith("HTTP ")) throw err;
    console.warn("NanoBanana API unavailable, falling back to mock:", err);
  }

  // Mock fallback
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
  const patch: Partial<NodeRow> = {
    image_url: pickRandom(MOCK_IMAGES),
    status: "ready",
    quality_score: 70 + Math.floor(Math.random() * 20),
    metadata: {
      ...(placeholder.metadata as Record<string, unknown>),
      mock: true,
    },
  };
  let ready: NodeRow;
  try {
    ready = await adapter.updateNode(placeholder.id, patch);
  } catch {
    ready = {
      ...placeholder,
      ...patch,
      updated_at: new Date().toISOString(),
    } as NodeRow;
  }
  state.upsertNode(ready);
  state.clearRefs();
  return ready;
}
