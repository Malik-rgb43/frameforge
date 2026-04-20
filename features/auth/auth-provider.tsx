"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  workspaceId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, workspaceId: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

async function ensureWorkspace(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;
  // Find existing workspace
  const { data: members } = await sb
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (members?.workspace_id) return members.workspace_id as string;

  // Create workspace for this user
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
  const [state, setState] = useState<AuthState>({ user: null, workspaceId: null, loading: true });

  useEffect(() => {
    const sb = createClient();

    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setState({ user: null, workspaceId: null, loading: false });
        return;
      }
      const workspaceId = await ensureWorkspace(session.user.id);
      setState({ user: session.user, workspaceId, loading: false });
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setState({ user: null, workspaceId: null, loading: false });
        return;
      }
      const workspaceId = await ensureWorkspace(session.user.id);
      setState({ user: session.user, workspaceId, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
