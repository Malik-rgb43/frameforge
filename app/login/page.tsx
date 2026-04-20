"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const sb = createClient();

    try {
      if (mode === "sign_in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-4"
      style={{
        backgroundImage: "repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-warm to-accent-cool flex items-center justify-center shadow-[0_0_24px_rgba(255,184,107,0.3)]">
            <span className="text-canvas font-bold text-sm">F</span>
          </div>
          <span className="text-lg font-semibold">FrameForge</span>
          <span className="text-2xs font-mono text-text-muted px-1.5 py-0.5 rounded bg-panel border border-border-subtle">
            v2
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-panel border border-border-subtle shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-6">
          <h1 className="text-base font-semibold mb-1">
            {mode === "sign_in" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-xs text-text-muted mb-5">
            {mode === "sign_in"
              ? "Welcome back to your creative studio."
              : "Set up your FrameForge workspace."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-9 bg-canvas border border-border-subtle rounded-lg px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/30 focus:border-accent-warm/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-9 bg-canvas border border-border-subtle rounded-lg px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/30 focus:border-accent-warm/40"
              />
            </div>

            {error && (
              <p className="text-xs text-status-error bg-status-error/10 border border-status-error/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-9 rounded-lg bg-accent-warm text-canvas text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,184,107,0.25)] transition-all"
            >
              {loading ? "Loading…" : mode === "sign_in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            {mode === "sign_in" ? "No account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(null); }}
              className="text-accent-warm hover:underline"
            >
              {mode === "sign_in" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
