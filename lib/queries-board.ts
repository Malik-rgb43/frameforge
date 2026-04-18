// Supabase query helpers for board_items + connections.
// Works in both client and server contexts — pass the appropriate
// SupabaseClient.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SEED_PRODUCT_IMAGES,
  SEED_REF_LINKS,
  SEED_PROMPTS,
  type BoardItem,
  type Kind,
  type RefLink,
  type ShotStatus,
  type Tone,
} from "./data";

// ─────────────────────────────────────────────────────────
// DB row shapes
// ─────────────────────────────────────────────────────────
export interface DBBoardItem {
  id: string;
  project_id: string;
  canvas_x: number | null;
  canvas_y: number | null;
  width: number | null;
  height: number | null;
  kind: Kind;
  tone: Tone;
  filename: string | null;
  tag: string | null;
  is_ref: boolean | null;
  is_generated: boolean | null;
  image_prompt: string | null;
  video_prompt: string | null;
  video_model: string | null;
  source_item_id: string | null;
  status: ShotStatus | null;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
}

export interface DBConnection {
  id: string;
  project_id: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: RefLink["kind"];
  created_at: string;
}

// BoardItem augmented with DB fields the screens need
export interface DBBoardItemUI extends BoardItem {
  project_id?: string;
  imagePrompt?: string | null;
  videoPrompt?: string | null;
  videoModel?: string | null;
  sourceItemId?: string | null;
  imageUrl?: string | null;
  storagePath?: string | null;
}

export interface BoardItemInput {
  kind: Kind;
  tone: Tone;
  filename?: string;
  tag?: string;
  canvas_x?: number;
  canvas_y?: number;
  width?: number;
  height?: number;
  is_ref?: boolean;
  is_generated?: boolean;
  image_prompt?: string | null;
  video_prompt?: string | null;
  video_model?: string | null;
  source_item_id?: string | null;
  status?: ShotStatus;
  image_url?: string | null;
  storage_path?: string | null;
}

export type BoardItemPatch = Partial<BoardItemInput>;

// ─────────────────────────────────────────────────────────
// Row → UI adapter
// ─────────────────────────────────────────────────────────
export function dbToBoardItem(row: DBBoardItem): DBBoardItemUI {
  return {
    id: row.id,
    kind: row.kind,
    tone: row.tone,
    tag: row.tag ?? "",
    filename: row.filename ?? "",
    x: row.canvas_x ?? 0,
    y: row.canvas_y ?? 0,
    w: row.width ?? 200,
    h: row.height ?? 260,
    isRef: !!row.is_ref,
    generated: !!row.is_generated,
    model: row.video_model ?? undefined,
    status: row.status ?? undefined,
    project_id: row.project_id,
    imagePrompt: row.image_prompt,
    videoPrompt: row.video_prompt,
    videoModel: row.video_model,
    sourceItemId: row.source_item_id,
    imageUrl: row.image_url,
    storagePath: row.storage_path,
  };
}

export function dbToRefLink(row: DBConnection): RefLink {
  return {
    from: row.from_item_id,
    to: row.to_item_id,
    kind: row.relation_type,
  };
}

// ─────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────
export async function listBoardItems(
  client: SupabaseClient,
  projectId: string
): Promise<DBBoardItemUI[]> {
  const { data, error } = await client
    .from("board_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as DBBoardItem[]).map(dbToBoardItem);
}

export async function listConnections(
  client: SupabaseClient,
  projectId: string
): Promise<RefLink[]> {
  const { data, error } = await client
    .from("connections")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as DBConnection[]).map(dbToRefLink);
}

export async function createBoardItem(
  client: SupabaseClient,
  projectId: string,
  input: BoardItemInput
): Promise<DBBoardItemUI> {
  const row = {
    project_id: projectId,
    kind: input.kind,
    tone: input.tone,
    filename: input.filename ?? null,
    tag: input.tag ?? null,
    canvas_x: input.canvas_x ?? 0,
    canvas_y: input.canvas_y ?? 0,
    width: input.width ?? 200,
    height: input.height ?? 260,
    is_ref: input.is_ref ?? false,
    is_generated: input.is_generated ?? false,
    image_prompt: input.image_prompt ?? null,
    video_prompt: input.video_prompt ?? null,
    video_model: input.video_model ?? null,
    source_item_id: input.source_item_id ?? null,
    status: input.status ?? "ready",
    image_url: input.image_url ?? null,
    storage_path: input.storage_path ?? null,
  };
  const { data, error } = await client
    .from("board_items")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToBoardItem(data as DBBoardItem);
}

export async function createBoardItemFromUpload(
  client: SupabaseClient,
  projectId: string,
  args: { filename: string; imageUrl: string; storagePath: string; x?: number; y?: number }
): Promise<DBBoardItemUI> {
  return createBoardItem(client, projectId, {
    kind: "bottle",
    tone: "amber",
    filename: args.filename,
    tag: "Ref",
    canvas_x: args.x ?? 80 + Math.floor(Math.random() * 240),
    canvas_y: args.y ?? 80 + Math.floor(Math.random() * 160),
    width: 200,
    height: 260,
    is_ref: true,
    is_generated: false,
    image_url: args.imageUrl,
    storage_path: args.storagePath,
    status: "ready",
  });
}

export async function updateBoardItem(
  client: SupabaseClient,
  id: string,
  patch: BoardItemPatch
): Promise<DBBoardItemUI> {
  const { data, error } = await client
    .from("board_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToBoardItem(data as DBBoardItem);
}

export async function deleteBoardItem(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("board_items").delete().eq("id", id);
  if (error) throw error;
}

export async function createConnection(
  client: SupabaseClient,
  projectId: string,
  fromItemId: string,
  toItemId: string,
  relationType: RefLink["kind"] = "reference"
): Promise<RefLink> {
  const { data, error } = await client
    .from("connections")
    .insert({
      project_id: projectId,
      from_item_id: fromItemId,
      to_item_id: toItemId,
      relation_type: relationType,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToRefLink(data as DBConnection);
}

// ─────────────────────────────────────────────────────────
// Seeding — only fires when board is empty for the project.
// Returns true if it actually seeded.
// ─────────────────────────────────────────────────────────
export async function seedDemoBoard(
  client: SupabaseClient,
  projectId: string
): Promise<boolean> {
  // Idempotency — bail if anything already exists.
  const { count, error: countErr } = await client
    .from("board_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return false;

  // Map seed ids ("img-1", "gen-1", ...) → newly-created DB UUIDs
  // so we can rebuild the connection graph correctly.
  const idMap = new Map<string, string>();
  for (const s of SEED_PRODUCT_IMAGES) {
    const prompt = SEED_PROMPTS[s.id];
    const inserted = await createBoardItem(client, projectId, {
      kind: s.kind,
      tone: s.tone,
      filename: s.filename,
      tag: s.tag,
      canvas_x: s.x,
      canvas_y: s.y,
      width: s.w,
      height: s.h,
      is_ref: !!s.isRef,
      is_generated: !!s.generated,
      image_prompt: prompt?.image ?? null,
      video_prompt: prompt?.video ?? null,
      video_model: prompt?.videoModel ?? s.model ?? null,
      status: s.status ?? "ready",
    });
    idMap.set(s.id, inserted.id);
  }

  // Now seed the connections using remapped UUIDs.
  for (const link of SEED_REF_LINKS) {
    const from = idMap.get(link.from);
    const to = idMap.get(link.to);
    if (!from || !to) continue;
    const { error } = await client.from("connections").insert({
      project_id: projectId,
      from_item_id: from,
      to_item_id: to,
      relation_type: link.kind,
    });
    if (error) throw error;
  }

  return true;
}
