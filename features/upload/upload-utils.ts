import { useCanvas } from "@/features/canvas/store";
import type { NodeRow, NodeInput } from "@/lib/supabase/types";
import { getDataAdapter } from "@/lib/data-adapter";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "nd_" + Math.random().toString(36).slice(2);

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function findFreeSpot(nodes: NodeRow[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 120, y: 80 };
  const sources = nodes.filter((n) => n.type === "source");
  if (sources.length > 0) {
    const maxX = Math.max(...sources.map((n) => n.x + n.w));
    return { x: maxX + 24, y: sources[0].y };
  }
  return { x: 120, y: 80 };
}

export async function uploadImagesAsSources(files: File[]): Promise<NodeRow[]> {
  const state = useCanvas.getState();
  if (!state.boardId) throw new Error("no board loaded");

  const adapter = await getDataAdapter();
  const created: NodeRow[] = [];
  const now = new Date().toISOString();
  const startSpot = findFreeSpot(state.nodes);

  let offsetX = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await fileToDataUrl(file);
    const input: NodeInput = {
      board_id: state.boardId,
      group_id: null,
      type: "source",
      x: startSpot.x + offsetX,
      y: startSpot.y,
      w: 220,
      h: 300,
      order_index: state.nodes.length + created.length,
      image_url: dataUrl,
      thumbnail_url: null,
      prompt: null,
      prompt_enhanced: null,
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
      status: "ready",
      quality_score: null,
      metadata: { uploaded: true, size_bytes: file.size },
    };
    try {
      const saved = await adapter.createNode(input);
      state.upsertNode(saved);
      created.push(saved);
    } catch {
      // Fallback: add to Zustand only (mock adapter still works, but be resilient)
      const local: NodeRow = {
        ...input,
        id: uid(),
        animation_prompt: null,
        animation_model_hint: null,
        used_ref_ids: null,
        created_at: now,
        updated_at: now,
      };
      state.upsertNode(local);
      created.push(local);
    }
    offsetX += 240;
  }
  return created;
}

export function pickFiles(accept = "image/*", multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export async function downloadNodeImage(node: NodeRow): Promise<void> {
  if (!node.image_url) return;
  const name = (node.title ?? "shot").replace(/[^a-z0-9-_]+/gi, "_");
  let blob: Blob;
  if (node.image_url.startsWith("data:")) {
    const match = node.image_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return;
    const byteStr = atob(match[2]);
    const bytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
    blob = new Blob([bytes], { type: match[1] });
  } else {
    const res = await fetch(node.image_url);
    blob = await res.blob();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAllShots(nodes: NodeRow[]): Promise<void> {
  const shots = nodes.filter(
    (n) =>
      (n.type === "shot" || n.type === "continuation") && n.image_url
  );
  for (const s of shots) {
    await downloadNodeImage(s);
    await new Promise((r) => setTimeout(r, 120)); // stagger
  }
}
