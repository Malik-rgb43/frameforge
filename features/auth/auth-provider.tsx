"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
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

// Timeout wrapper — returns null instead of throwing so callers stay alive.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function ensureWorkspace(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;

  // Use .maybeSingle() instead of .single() — .single() throws PGRST116 when
  // there are multiple rows (which happens when the user has duplicate entries).
  // .maybeSingle() returns the first row without error, or null if there are none.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberResult = await withTimeout<{ data: any; error: any }>(
    sb
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    15_000
  );

  if (memberResult?.data?.workspace_id) return memberResult.data.workspace_id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsResult = await withTimeout<{ data: any; error: any }>(
    sb
      .from("workspaces")
      .insert({ name: "My Workspace", owner_user_id: userId })
      .select("id")
      .single(),
    15_000
  );

  if (!wsResult || wsResult.error || !wsResult.data) return null;

  await withTimeout(
    sb.from("workspace_members").insert({
      workspace_id: wsResult.data.id,
      user_id: userId,
      role: "owner",
    }),
    15_000
  );

  return wsResult.data.id as string;
}

async function resolveSession(session: Session): Promise<Partial<AuthState>> {
  const cached = getCachedWorkspaceId();
  if (cached) {
    // Fast path — use cached workspace, validate silently in background
    ensureWorkspace(session.user.id)
      .then((id) => { if (id && id !== cached) setCachedWorkspaceId(id); })
      .catch(() => { /* network slow — keep cached value */ });
    return { user: session.user, workspaceId: cached, loading: false };
  }
  // First-ever load: resolve from DB
  const workspaceId = await ensureWorkspace(session.user.id);
  setCachedWorkspaceId(workspaceId);
  return { user: session.user, workspaceId, loading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage cache — eliminates skeleton on repeat visits
  const [state, setState] = useState<AuthState>(() => {
    const cached = getCachedWorkspaceId();
    return { user: null, workspaceId: cached, loading: !cached };
  });

  useEffect(() => {
    const sb = createClient();

    // Eagerly resolve session on mount so we don't wait for onAuthStateChange
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        // No active session — middleware will redirect, but update state now
        setState({ user: null, workspaceId: null, loading: false });
        return;
      }
      const patch = await resolveSession(session);
      setState((s) => ({ ...s, ...patch }));
    }).catch((err) => {
      console.error("getSession failed", err);
      setState({ user: null, workspaceId: null, loading: false });
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        setCachedWorkspaceId(null);
        setState({ user: null, workspaceId: null, loading: false });
        // Session expired mid-session — redirect to login
        if (event === "SIGNED_OUT" && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
        return;
      }
      try {
        const patch = await resolveSession(session);
        setState((s) => ({ ...s, ...patch }));
      } catch (err) {
        console.warn("resolveSession failed in onAuthStateChange", err);
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
