// Server-side Supabase client for API routes.
// Prefers service role key (bypasses RLS) but falls back to anon key —
// generations_log RLS allows anon inserts so logging always works.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Reads the authenticated user's workspace_id via cookie session (Next.js server context).
export async function getSessionWorkspaceId(): Promise<string | null> {
  try {
    const { createClient: createServerClient } = await import("./server");
    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single();
    return (data?.workspace_id as string) ?? null;
  } catch {
    return null;
  }
}

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  _client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export async function logGeneration(row: {
  workspace_id?: string;
  project_id?: string | null;
  node_id?: string | null;
  action: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  images_generated?: number;
  cost_usd?: number;
  duration_ms?: number;
  status?: "ok" | "error" | "timeout";
  error_message?: string;
}) {
  const sb = getServiceClient();
  if (!sb) return; // silently skip in dev without service role
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceId = row.workspace_id;
    if (!workspaceId) return; // skip log if no workspace context
    await (sb as any).from("generations_log").insert({
      workspace_id: workspaceId,
      project_id: row.project_id ?? null,
      node_id: row.node_id ?? null,
      action: row.action,
      model: row.model,
      input_tokens: row.input_tokens ?? null,
      output_tokens: row.output_tokens ?? null,
      images_generated: row.images_generated ?? 0,
      cost_usd: row.cost_usd ?? null,
      duration_ms: row.duration_ms ?? null,
      status: row.status ?? "ok",
      error_message: row.error_message ?? null,
    });
  } catch (err) {
    console.warn("logGeneration failed", err);
  }
}
