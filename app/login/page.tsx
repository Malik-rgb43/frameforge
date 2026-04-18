"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { Btn, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase-client";
import { useSession } from "@/lib/use-session";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authed, bounce home.
  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email to continue.");
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          shouldCreateUser: mode === "signup",
        },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--onyx)",
          border: "1px solid var(--iron)",
          borderRadius: 14,
          padding: 32,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
          animation: "float-fade 260ms var(--e-out)",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <I.Spark size={28} />
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--bone)",
              letterSpacing: -0.2,
            }}
          >
            FrameForge
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 2,
              color: "var(--lime)",
              fontWeight: 600,
            }}
          >
            v2.4
          </div>
        </div>

        {sent ? (
          <SuccessState
            email={email}
            onReset={() => {
              setSent(false);
              setEmail("");
            }}
          />
        ) : (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "var(--bone)",
                letterSpacing: -0.4,
                marginBottom: 6,
              }}
            >
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ash-gray)",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              We'll send you a magic link — no password required.
            </div>

            {/* Segmented tabs */}
            <div
              style={{
                display: "flex",
                padding: 3,
                background: "var(--ash)",
                border: "1px solid var(--iron)",
                borderRadius: 8,
                gap: 2,
                marginBottom: 18,
              }}
            >
              {(
                [
                  { v: "signin" as Mode, label: "Sign in" },
                  { v: "signup" as Mode, label: "Sign up" },
                ]
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => {
                    setMode(o.v);
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    height: 30,
                    background: mode === o.v ? "var(--iron-2)" : "transparent",
                    color: mode === o.v ? "var(--bone)" : "var(--ash-gray)",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 120ms var(--e-out)",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ash-gray)",
                    marginBottom: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  Email
                </div>
                <Input
                  value={email}
                  onChange={setEmail}
                  placeholder="you@studio.co"
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,90,95,0.08)",
                    border: "1px solid rgba(255,90,95,0.3)",
                    borderRadius: 6,
                    color: "var(--coral)",
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <Btn
                variant="primary"
                size="lg"
                icon={<I.ArrowRight size={14} />}
                onClick={() => {
                  // noop — form submit handles it
                }}
                disabled={sending}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {sending
                  ? "Sending magic link…"
                  : mode === "signin"
                    ? "Send magic link"
                    : "Create account & send link"}
              </Btn>
            </form>

            <div
              style={{
                fontSize: 11,
                color: "var(--slate-2)",
                marginTop: 18,
                textAlign: "center",
              }}
            >
              {mode === "signin" ? (
                <>
                  New to FrameForge?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    style={linkStyle}
                  >
                    Create an account.
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    style={linkStyle}
                  >
                    Sign in.
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--lime)",
  cursor: "pointer",
  fontSize: 11,
  padding: 0,
  textDecoration: "underline",
  fontFamily: "inherit",
};

function SuccessState({
  email,
  onReset,
}: {
  email: string;
  onReset: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(212,255,58,0.10)",
          color: "var(--lime)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <I.Check size={28} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--bone)",
          marginBottom: 8,
        }}
      >
        Check your inbox
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ash-gray)",
          lineHeight: 1.5,
          marginBottom: 18,
          maxWidth: 320,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        We sent a magic link to <span style={{ color: "var(--bone)" }}>{email}</span>.
        Click the link to continue.
      </div>
      <button
        type="button"
        onClick={onReset}
        style={{
          ...linkStyle,
          fontSize: 12,
        }}
      >
        Use a different email
      </button>
    </div>
  );
}
