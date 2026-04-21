"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  workspaceId: string | null;
  loading: boolean;
}

const CACHE_KEY = "ff_workspace_id";

function getCachedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CACHE_KEY);
}

function setCachedWorkspaceId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(CACHE_KEY, id);
  else localStorage.removeItem(CACHE_KEY);
}

const AuthContext = createContext<AuthState>({ user: null, workspaceId: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

async function ensureWorkspace(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;
  const { data: members } = await sb
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (members?.workspace_id) return members.workspace_id as string;

  const { data: ws, error: wsErr } = await sb
    .from("workspaces")
    .insert({ name: "My Workspace", owner_user_id: userId })
    .select("id")
    .single();

  if (wsErr || !ws) return null;

  await sb.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner",
  });

  return ws.id as string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage cache — eliminates skeleton on repeat visits
  const [state, setState] = useState<AuthState>(() => {
    const cached = getCachedWorkspaceId();
    return { user: null, workspaceId: cached, loading: !cached };
  });

  useEffect(() => {
    const sb = createClient();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setCachedWorkspaceId(null);
        setState({ user: null, workspaceId: null, loading: false });
        return;
      }

      // If we already have a cached workspaceId, resolve loading immediately
      // while workspace is re-validated in the background.
      const cached = getCachedWorkspaceId();
      if (cached) {
        setState({ user: session.user, workspaceId: cached, loading: false });
        // Re-validate silently — update if it ever changes
        ensureWorkspace(session.user.id).then((id) => {
          if (id && id !== cached) {
            setCachedWorkspaceId(id);
            setState((s) => ({ ...s, workspaceId: id }));
          }
        });
        return;
      }

      // First-ever load: fetch workspace, then cache it
      const workspaceId = await ensureWorkspace(session.user.id);
      setCachedWorkspaceId(workspaceId);
      setState({ user: session.user, workspaceId, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
