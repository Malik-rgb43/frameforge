// Collaborator query helpers — works in both server & client contexts.
// Pass the appropriate SupabaseClient (from createClient() on client, or
// lib/supabase-server on server).

import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────
// DB row shape — mirrors the `collaborators` table.
// ─────────────────────────────────────────────────────────
export interface DBCollaborator {
  id: string;
  project_id: string;
  user_id: string | null;
  invited_email: string;
  role: "editor" | "viewer";
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
}

export interface CollaboratorRow extends DBCollaborator {
  displayName: string;
  initials: string;
  color: string;
  accepted: boolean;
}

// ─────────────────────────────────────────────────────────
// Utilities: pastel color + initials from an email
// ─────────────────────────────────────────────────────────

const PASTEL_PALETTE = [
  "#d4ff3a",
  "#7df9ff",
  "#ff5a5f",
  "#fbbf24",
  "#4ade80",
  "#f0abfc",
  "#fda4af",
  "#a5b4fc",
  "#fde68a",
  "#86efac",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForEmail(email: string): string {
  return PASTEL_PALETTE[hashStr(email.toLowerCase()) % PASTEL_PALETTE.length];
}

export function initialsForEmail(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return "??";
  const parts = local.split(/[.\-_+]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (local.length >= 2) {
    return (local[0] + local[1]).toUpperCase();
  }
  return (local[0] + local[0]).toUpperCase();
}

export function displayNameForEmail(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return email;
  // Capitalize first letter, replace separators with spaces.
  const cleaned = local.replace(/[.\-_+]/g, " ");
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function decorateCollaborator(row: DBCollaborator): CollaboratorRow {
  return {
    ...row,
    displayName: displayNameForEmail(row.invited_email),
    initials: initialsForEmail(row.invited_email),
    color: colorForEmail(row.invited_email),
    accepted: !!row.accepted_at,
  };
}

// Basic RFC-ish email sanity check — doesn't need to be bulletproof,
// the server-side RLS is the real gate.
export function isValidEmail(email: string): boolean {
  const v = email.trim();
  if (!v) return false;
  if (v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ─────────────────────────────────────────────────────────
// Collaborator CRUD
// ─────────────────────────────────────────────────────────

export async function listCollaborators(
  client: SupabaseClient,
  projectId: string
): Promise<CollaboratorRow[]> {
  const { data, error } = await client
    .from("collaborators")
    .select("*")
    .eq("project_id", projectId)
    .order("invited_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as DBCollaborator[]).map(decorateCollaborator);
}

export async function inviteCollaborator(
  client: SupabaseClient,
  projectId: string,
  email: string,
  role: "editor" | "viewer"
): Promise<CollaboratorRow> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    throw new Error("Enter a valid email address.");
  }

  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  const row = {
    project_id: projectId,
    invited_email: trimmed,
    role,
    invited_by: user.id,
    user_id: null,
    accepted_at: null,
  };

  const { data, error } = await client
    .from("collaborators")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return decorateCollaborator(data as DBCollaborator);
}

export async function removeCollaborator(
  client: SupabaseClient,
  rowId: string
): Promise<void> {
  const { error } = await client.from("collaborators").delete().eq("id", rowId);
  if (error) throw error;
}

export async function acceptInvite(
  client: SupabaseClient,
  projectId: string
): Promise<DBCollaborator> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  const email = (user.email || "").toLowerCase();
  if (!email) throw new Error("Your account has no email address.");

  // RLS policy `collab_accept_self` only allows the update when the
  // invited_email matches the JWT email. Match on that here too so we
  // don't accidentally update an unrelated row.
  const { data, error } = await client
    .from("collaborators")
    .update({
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("invited_email", email)
    .select()
    .single();
  if (error) throw error;
  return data as DBCollaborator;
}

// ─────────────────────────────────────────────────────────
// Minimal project shape used by the invite page.
// ─────────────────────────────────────────────────────────
export interface InviteProjectSummary {
  id: string;
  name: string;
  client: string | null;
  hero_kind: string | null;
  hero_tone: string | null;
  aspect: string;
}

export async function getInviteProject(
  client: SupabaseClient,
  projectId: string
): Promise<InviteProjectSummary | null> {
  const { data, error } = await client
    .from("projects")
    .select("id, name, client, hero_kind, hero_tone, aspect")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as InviteProjectSummary | null) ?? null;
}
