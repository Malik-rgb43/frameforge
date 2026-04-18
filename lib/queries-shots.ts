// Supabase query helpers for shots.
// Pass the appropriate SupabaseClient (from createClient() on client,
// or lib/supabase-server on server).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SEED_PRODUCT_IMAGES,
  SEED_SHOTS,
  type Aspect,
  type ShotStatus,
  type Shot,
} from "./data";

// ─────────────────────────────────────────────────────────
// DB row shape — mirrors the `shots` table.
// ─────────────────────────────────────────────────────────
export interface DBShot {
  id: string;
  project_id: string;
  order_index: number;
  sequence_name: string | null;
  title: string | null;
  ref_item_id: string | null;
  video_prompt: string | null;
  model: string | null;
  aspect: Aspect | null;
  motion: string | null;
  duration: number | null;
  voiceover: string | null;
  status: ShotStatus | null;
  created_at: string;
}

// Shot augmented with DB-only fields the screens need
export interface DBShotUI extends Shot {
  dbId: string;
  orderIndex: number;
  refItemId: string | null;
}

export interface ShotInput {
  order_index: number;
  sequence_name?: string;
  title?: string;
  ref_item_id?: string | null;
  video_prompt?: string;
  model?: string;
  aspect?: Aspect;
  motion?: string;
  duration?: number;
  voiceover?: string | null;
  status?: ShotStatus;
}

export type ShotPatch = Partial<ShotInput>;

// ─────────────────────────────────────────────────────────
// Row → UI adapter
// ─────────────────────────────────────────────────────────
export function dbToShotUI(row: DBShot): DBShotUI {
  return {
    n: row.order_index + 1,
    sequence: row.sequence_name ?? "SEQ 1",
    title: row.title ?? "",
    duration: Number(row.duration ?? 2.5),
    refImageId: row.ref_item_id ?? "",
    prompt: row.video_prompt ?? "",
    model: row.model ?? "Seedance 2",
    aspect: (row.aspect ?? "9:16") as Aspect,
    motion: row.motion ?? "",
    vo: row.voiceover,
    status: (row.status ?? "ready") as ShotStatus,
    dbId: row.id,
    orderIndex: row.order_index,
    refItemId: row.ref_item_id,
  };
}

// ─────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────
export async function listShots(
  client: SupabaseClient,
  projectId: string
): Promise<DBShotUI[]> {
  const { data, error } = await client
    .from("shots")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return ((data || []) as DBShot[]).map(dbToShotUI);
}

export async function createShot(
  client: SupabaseClient,
  projectId: string,
  input: ShotInput
): Promise<DBShotUI> {
  const row = {
    project_id: projectId,
    order_index: input.order_index,
    sequence_name: input.sequence_name ?? null,
    title: input.title ?? null,
    ref_item_id: input.ref_item_id ?? null,
    video_prompt: input.video_prompt ?? null,
    model: input.model ?? "seedance-2",
    aspect: input.aspect ?? "9:16",
    motion: input.motion ?? null,
    duration: input.duration ?? 2.5,
    voiceover: input.voiceover ?? null,
    status: input.status ?? "ready",
  };
  const { data, error } = await client
    .from("shots")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToShotUI(data as DBShot);
}

export async function updateShot(
  client: SupabaseClient,
  id: string,
  patch: ShotPatch
): Promise<DBShotUI> {
  const { data, error } = await client
    .from("shots")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToShotUI(data as DBShot);
}

export async function deleteShot(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("shots").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderShots(
  client: SupabaseClient,
  orders: { id: string; order_index: number }[]
): Promise<void> {
  // Sequential updates — shots table is small per project.
  for (const o of orders) {
    const { error } = await client
      .from("shots")
      .update({ order_index: o.order_index })
      .eq("id", o.id);
    if (error) throw error;
  }
}

// ─────────────────────────────────────────────────────────
// Seeding — requires board_items to already exist for the project
// so that ref_item_id can point at real rows.
// Returns true if it actually seeded.
// ─────────────────────────────────────────────────────────
export async function seedDemoShots(
  client: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { count, error: countErr } = await client
    .from("shots")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return false;

  // Pull all board items for this project so we can map seed refImageId
  // (e.g. "img-3", "gen-1") to the actual DB UUID via filename matching.
  const { data: items, error: itemsErr } = await client
    .from("board_items")
    .select("id, filename")
    .eq("project_id", projectId);
  if (itemsErr) throw itemsErr;

  const filenameToId = new Map<string, string>();
  for (const it of (items || []) as { id: string; filename: string | null }[]) {
    if (it.filename) filenameToId.set(it.filename, it.id);
  }
  const seedIdToFilename = new Map<string, string>();
  for (const s of SEED_PRODUCT_IMAGES) {
    seedIdToFilename.set(s.id, s.filename);
  }

  for (let i = 0; i < SEED_SHOTS.length; i++) {
    const s = SEED_SHOTS[i];
    const filename = seedIdToFilename.get(s.refImageId);
    const ref_item_id = filename ? filenameToId.get(filename) ?? null : null;

    const { error } = await client.from("shots").insert({
      project_id: projectId,
      order_index: i,
      sequence_name: s.sequence,
      title: s.title,
      ref_item_id,
      video_prompt: s.prompt,
      model: s.model,
      aspect: s.aspect,
      motion: s.motion,
      duration: s.duration,
      voiceover: s.vo,
      status: s.status,
    });
    if (error) throw error;
  }

  return true;
}
