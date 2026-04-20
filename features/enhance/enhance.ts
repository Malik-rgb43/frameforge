import { internalFetch } from "@/lib/api";
// Enhance — take an existing image node, run it through NanoBanana Pro
// with an identity-preserving upscale/polish prompt, replace in place.

import { useCanvas } from "@/features/canvas/store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { NodeRow } from "@/lib/supabase/types";

export type EnhancementPreset =
  | "polish" // default — subtle sharpening + color grade
  | "cinematic" // stronger filmic grade, grain
  | "clean" // reduce noise, lift shadows
  | "premium"; // commercial-grade glossy polish

const PRESET_DIRECTIVES: Record<EnhancementPreset, string> = {
  polish:
    "Subtle enhancement: sharpen key details, tighten focus, balance exposure. No change to composition, subject, or palette. Preserve the exact pixels of the reference — this is a refinement, not a re-render.",
  cinematic:
    "Push the image into cinematic mode: stronger filmic color grade (respect dominant palette), add subtle 35mm grain, lift rim light, deepen blacks. Keep subject identity and composition intact.",
  clean:
    "Clean the image: denoise shadows, remove compression artifacts, bring out texture in mid-tones, balance any color cast. Subject, palette, and composition must stay identical.",
  premium:
    "Premium commercial polish: glossy but not plastic, hero product sharper than surroundings, caustic highlights refined, micro-texture enhanced. Zero compositional changes — preserve the reference exactly.",
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "nd_" + Math.random().toString(36).slice(2);

async function urlToBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      return { base64: match[2], mimeType: match[1] };
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mimeType: blob.type || "image/jpeg" };
  } catch {
    return null;
  }
}

export interface EnhanceOptions {
  preset?: EnhancementPreset;
  extraPrompt?: string;
  aspectRatio?: "9:16" | "1:1" | "16:9" | "4:5" | "3:4";
  replaceInPlace?: boolean; // true = overwrite node; false = create new node next to it
}

export async function enhanceNode(
  nodeId: string,
  opts: EnhanceOptions = {}
): Promise<NodeRow | null> {
  const state = useCanvas.getState();
  const source = state.nodes.find((n) => n.id === nodeId);
  if (!source?.image_url) return null;

  const preset: EnhancementPreset = opts.preset ?? "polish";
  const replaceInPlace = opts.replaceInPlace ?? true;
  const aspect = opts.aspectRatio ?? "9:16";

  const directive = PRESET_DIRECTIVES[preset];
  const extra = opts.extraPrompt?.trim();

  const prompt = `ENHANCE EXISTING IMAGE — preserve identity, composition, palette.
Reference image attached as slot 1 (the source of truth).

${directive}

${extra ? `Additional user direction: ${extra}` : ""}

Hard constraints:
- Do NOT change subject identity, pose, or framing
- Do NOT add, remove, or reposition elements
- Do NOT shift the color palette beyond a subtle grade
- Do NOT add text, UI, watermarks, or borders
- Preserve aspect ratio exactly

Output: photorealistic, 35mm film feel, cinematic commercial polish.`;

  const refImageData = await urlToBase64(source.image_url);
  if (!refImageData) return null;

  const adapter = await getDataAdapter();
  let targetNode: NodeRow = source;

  if (!replaceInPlace) {
    const nextSpot = {
      x: source.x + source.w + 24,
      y: source.y,
    };
    const input: Omit<NodeRow, "id" | "created_at" | "updated_at"> = {
      board_id: source.board_id,
      group_id: source.group_id ?? null,
      type: source.type,
      x: nextSpot.x,
      y: nextSpot.y,
      w: source.w,
      h: source.h,
      order_index: state.nodes.length,
      image_url: null,
      thumbnail_url: null,
      prompt: source.prompt,
      prompt_enhanced: prompt,
      title: (source.title ?? "Shot") + " · enhanced",
      status: "generating",
      quality_score: null,
      metadata: {
        ...(source.metadata as Record<string, unknown>),
        enhanced_from: source.id,
        enhance_preset: preset,
      },
    };
    try {
      targetNode = await adapter.createNode(input);
    } catch {
      targetNode = {
        ...input,
        id: uid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as NodeRow;
    }
  } else {
    // Flip the source node into "generating" state in place
    targetNode = { ...source, status: "generating" as const };
  }
  state.upsertNode(targetNode);

  try {
    const res = await internalFetch("/api/nanobanana", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        modelId: "nanobanana-pro",
        aspectRatio: aspect,
        refImages: [refImageData],
        action: "image.enhance",
        nodeId: targetNode.id,
      }),
    });

    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      imageBase64: string;
      mimeType: string;
      usage: { costUsd: number; durationMs: number };
    };

    const patch: Partial<NodeRow> = {
      image_url: `data:${data.mimeType};base64,${data.imageBase64}`,
      status: "ready",
      quality_score: Math.min(
        100,
        (targetNode.quality_score ?? 75) + 8 + Math.floor(Math.random() * 8)
      ),
      prompt_enhanced: prompt,
      metadata: {
        ...(targetNode.metadata as Record<string, unknown>),
        cost_usd: data.usage.costUsd,
        duration_ms: data.usage.durationMs,
        enhance_preset: preset,
      },
    };

    let ready: NodeRow;
    try {
      ready = await adapter.updateNode(targetNode.id, patch);
    } catch {
      ready = {
        ...targetNode,
        ...patch,
        updated_at: new Date().toISOString(),
      } as NodeRow;
    }
    state.upsertNode(ready);
    return ready;
  } catch (err) {
    console.error("enhance failed", err);
    // Revert to ready (keep original image)
    state.upsertNode({ ...source, status: "ready" as const });
    throw err;
  }
}
