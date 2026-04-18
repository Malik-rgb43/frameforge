// Supabase query helpers — works in both server & client contexts.
// Pass the appropriate SupabaseClient (from createClient() on client, or
// lib/supabase-server on server).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aspect, Kind, ProjectStatus, Tone } from "./data";

// ─────────────────────────────────────────────────────────
// DB row shape — mirrors the `projects` table.
// ─────────────────────────────────────────────────────────
export interface DBProject {
  id: string;
  owner_id: string;
  name: string;
  client: string | null;
  aspect: Aspect;
  status: ProjectStatus;
  hero_kind: Kind | null;
  hero_tone: Tone | null;
  default_model: string | null;
  default_duration: number | null;
  concept_title: string | null;
  concept_hook: string | null;
  concept_palette: string[] | null;
  shot_count: number | null;
  created_at: string;
  updated_at: string;
  // Optional columns — added via later migrations. Use optional chaining
  // on reads; older deployments may not have them.
  brand_logo_url?: string | null;
  default_image_model?: string | null;
  export_format?: string | null;
  export_burn_subtitles?: boolean | null;
  export_editor_pack?: boolean | null;
  export_watermark?: boolean | null;
}

export interface CreateProjectInput {
  name: string;
  client?: string;
  aspect: Aspect;
  hero_kind?: Kind;
  hero_tone?: Tone;
}

export type ProjectPatch = Partial<
  Pick<
    DBProject,
    | "name"
    | "client"
    | "aspect"
    | "status"
    | "hero_kind"
    | "hero_tone"
    | "default_model"
    | "default_duration"
    | "concept_title"
    | "concept_hook"
    | "concept_palette"
    | "shot_count"
    | "brand_logo_url"
    | "default_image_model"
    | "export_format"
    | "export_burn_subtitles"
    | "export_editor_pack"
    | "export_watermark"
  >
>;

// ─────────────────────────────────────────────────────────
// Project CRUD
// ─────────────────────────────────────────────────────────

export async function listMyProjects(client: SupabaseClient): Promise<DBProject[]> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DBProject[];
}

export async function getProject(
  client: SupabaseClient,
  id: string
): Promise<DBProject | null> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DBProject | null) ?? null;
}

export async function createProject(
  client: SupabaseClient,
  input: CreateProjectInput
): Promise<DBProject> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  const row = {
    owner_id: user.id,
    name: input.name,
    client: input.client ?? null,
    aspect: input.aspect,
    status: "draft" as ProjectStatus,
    hero_kind: input.hero_kind ?? "bottle",
    hero_tone: input.hero_tone ?? "amber",
    shot_count: 0,
  };

  const { data, error } = await client
    .from("projects")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as DBProject;
}

export async function updateProject(
  client: SupabaseClient,
  id: string,
  patch: ProjectPatch
): Promise<DBProject> {
  const { data, error } = await client
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DBProject;
}

export async function deleteProject(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProject(
  client: SupabaseClient,
  id: string
): Promise<DBProject> {
  const existing = await getProject(client, id);
  if (!existing) throw new Error("Project not found");

  return createProject(client, {
    name: `${existing.name} (copy)`,
    client: existing.client ?? undefined,
    aspect: existing.aspect,
    hero_kind: existing.hero_kind ?? undefined,
    hero_tone: existing.hero_tone ?? undefined,
  });
}

// Thin convenience wrapper for brand-tab updates. Swallows the PostgREST
// "column does not exist" error gracefully when optional columns (e.g.
// brand_logo_url) haven't been migrated yet in a deployment.
export async function updateProjectBrand(
  client: SupabaseClient,
  id: string,
  patch: Partial<Pick<DBProject, "brand_logo_url" | "concept_palette">>
): Promise<DBProject | null> {
  try {
    return await updateProject(client, id, patch);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
    if (/column .* does not exist|schema cache/i.test(message)) {
      console.warn("updateProjectBrand — optional column missing:", message);
      return null;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────
// Adapter — turn a DBProject into the legacy `Project` shape
// used by the UI screens. Lossless when we later wire the
// rest of the screens to use DBProject directly.
// ─────────────────────────────────────────────────────────
import type { Project } from "./data";

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 2) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return w === 1 ? "last week" : `${w} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

export function dbToProject(row: DBProject): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client ?? "",
    aspect: row.aspect,
    updated: relativeTime(row.updated_at),
    shots: row.shot_count ?? 0,
    status: row.status,
    heroKind: row.hero_kind ?? "bottle",
    heroTone: row.hero_tone ?? "amber",
  };
}
