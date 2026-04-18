// Supabase query helpers for concepts.
// Pass the appropriate SupabaseClient (from createClient() on client,
// or lib/supabase-server on server).

import type { SupabaseClient } from "@supabase/supabase-js";
import { SEED_CONCEPTS, type Concept } from "./data";

// ─────────────────────────────────────────────────────────
// DB row shape — mirrors the `concepts` table.
// ─────────────────────────────────────────────────────────
export interface DBConcept {
  id: string;
  project_id: string;
  title: string;
  hook: string | null;
  vibe: string[] | null;
  palette: string[] | null;
  length_seconds: number | null;
  shot_count: number | null;
  is_selected: boolean | null;
  is_ai_generated: boolean | null;
  created_at: string;
}

// Concept augmented with DB id + selection state.
export interface DBConceptUI extends Concept {
  dbId: string;
  isSelected: boolean;
}

export interface ConceptInput {
  title: string;
  hook?: string;
  vibe?: string[];
  palette?: string[];
  length_seconds?: number;
  shot_count?: number;
  is_selected?: boolean;
  is_ai_generated?: boolean;
}

export type ConceptPatch = Partial<ConceptInput>;

// ─────────────────────────────────────────────────────────
// Row → UI adapter
// ─────────────────────────────────────────────────────────
export function dbToConceptUI(row: DBConcept): DBConceptUI {
  return {
    id: row.id,
    title: row.title,
    hook: row.hook ?? "",
    vibe: Array.isArray(row.vibe) ? row.vibe : [],
    palette: Array.isArray(row.palette) ? row.palette : [],
    length: Number(row.length_seconds ?? 0),
    shots: row.shot_count ?? 0,
    dbId: row.id,
    isSelected: !!row.is_selected,
  };
}

// ─────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────
export async function listConcepts(
  client: SupabaseClient,
  projectId: string
): Promise<DBConceptUI[]> {
  const { data, error } = await client
    .from("concepts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as DBConcept[]).map(dbToConceptUI);
}

export async function createConcept(
  client: SupabaseClient,
  projectId: string,
  input: ConceptInput
): Promise<DBConceptUI> {
  const row = {
    project_id: projectId,
    title: input.title,
    hook: input.hook ?? null,
    vibe: input.vibe ?? [],
    palette: input.palette ?? [],
    length_seconds: input.length_seconds ?? null,
    shot_count: input.shot_count ?? null,
    is_selected: input.is_selected ?? false,
    is_ai_generated: input.is_ai_generated ?? true,
  };
  const { data, error } = await client
    .from("concepts")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return dbToConceptUI(data as DBConcept);
}

export async function updateConcept(
  client: SupabaseClient,
  id: string,
  patch: ConceptPatch
): Promise<DBConceptUI> {
  const { data, error } = await client
    .from("concepts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToConceptUI(data as DBConcept);
}

// Mark one concept as selected — unselects all others in the project.
export async function setSelectedConcept(
  client: SupabaseClient,
  projectId: string,
  conceptId: string
): Promise<void> {
  // Unselect everything else.
  const { error: unselErr } = await client
    .from("concepts")
    .update({ is_selected: false })
    .eq("project_id", projectId)
    .neq("id", conceptId);
  if (unselErr) throw unselErr;

  // Select the chosen one.
  const { error: selErr } = await client
    .from("concepts")
    .update({ is_selected: true })
    .eq("id", conceptId);
  if (selErr) throw selErr;
}

// ─────────────────────────────────────────────────────────
// Seeding — 5 concepts from SEED_CONCEPTS, first is auto-selected.
// Returns true if it actually seeded.
// ─────────────────────────────────────────────────────────
export async function seedDemoConcepts(
  client: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { count, error: countErr } = await client
    .from("concepts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return false;

  // Insert in order; first concept gets is_selected=true for a fresh project.
  for (let i = 0; i < SEED_CONCEPTS.length; i++) {
    const c = SEED_CONCEPTS[i];
    const { error } = await client.from("concepts").insert({
      project_id: projectId,
      title: c.title,
      hook: c.hook,
      vibe: c.vibe,
      palette: c.palette,
      length_seconds: c.length,
      shot_count: c.shots,
      is_selected: i === 0,
      is_ai_generated: true,
    });
    if (error) throw error;
  }

  return true;
}
