"use client";
import React, { useEffect, useRef, useState } from "react";
import { I } from "./icons";
import { iconBtnStyle } from "./ui";
import { SEED_COLLABORATORS } from "@/lib/data";
import { useSession } from "@/lib/use-session";

// ─────────────────────────────────────────────────────────
// Full-viewport app shell — no fake desktop window chrome
// ─────────────────────────────────────────────────────────
export function WindowShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (typeof document !== "undefined" && title) document.title = title;
  }, [title]);
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "var(--graphite)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// App header — breadcrumbs, search, avatars, settings, generate
// ─────────────────────────────────────────────────────────
export function AppHeader({
  projectName,
  onSettings,
  onBack,
  breadcrumbs = [],
}: {
  projectName?: string;
  onSettings?: () => void;
  onBack?: () => void;
  breadcrumbs?: string[];
}) {
  return (
    <div
      style={{
        height: 48,
        flexShrink: 0,
        borderBottom: "1px solid var(--iron)",
        background: "var(--onyx)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 10,
      }}
    >
      <button
        onClick={onBack}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "transparent",
          border: "1px solid transparent",
          color: "#a1a1aa",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <I.ArrowLeft size={16} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ash-gray)" }}>
        <span>Projects</span>
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            <span style={{ opacity: 0.4 }}>/</span>
            <span
              style={{
                color: i === breadcrumbs.length - 1 ? "var(--bone)" : "var(--ash-gray)",
                fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
              }}
            >
              {b}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          width: 220,
          height: 30,
          background: "var(--ash)",
          border: "1px solid var(--iron)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 8,
        }}
      >
        <I.Search size={14} style={{ color: "var(--slate-2)" }} />
        <span style={{ fontSize: 12, color: "var(--slate-2)" }}>Search prompts, shots, assets</span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--f-mono)",
            padding: "2px 5px",
            borderRadius: 3,
            background: "rgba(255,255,255,0.04)",
            color: "var(--slate-2)",
            border: "1px solid var(--iron)",
          }}
        >
          Ctrl\·K
        </span>
      </div>

      <div style={{ display: "flex", marginLeft: 6 }}>
        {SEED_COLLABORATORS.slice(0, 3).map((u, i) => (
          <div
            key={u.id}
            title={u.name}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: u.color,
              color: "var(--obsidian)",
              marginLeft: i === 0 ? 0 : -8,
              border: "2px solid var(--onyx)",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--f-mono)",
            }}
          >
            {u.initials}
          </div>
        ))}
      </div>

      <button style={iconBtnStyle()}>
        <I.Share size={14} />
      </button>
      <button style={iconBtnStyle()} onClick={onSettings}>
        <I.Settings size={14} />
      </button>
      <button
        style={{
          height: 30,
          padding: "0 14px",
          background: "var(--lime)",
          color: "var(--lime-ink)",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <I.Sparkles size={14} /> Generate
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Left rail
// ─────────────────────────────────────────────────────────
export type ScreenId = "home" | "concept" | "board" | "storyboard" | "export";
export function LeftRail({
  screen,
  onNav,
}: {
  screen: ScreenId;
  onNav: (id: ScreenId) => void;
}) {
  const items: Array<{ id: ScreenId; icon: React.ReactNode; label: string }> = [
    { id: "home",       icon: <I.Folder   size={18} />, label: "Projects" },
    { id: "concept",    icon: <I.Sparkles size={18} />, label: "Concept" },
    { id: "board",      icon: <I.Board    size={18} />, label: "Board" },
    { id: "storyboard", icon: <I.Film     size={18} />, label: "Storyboard" },
    { id: "export",     icon: <I.Download size={18} />, label: "Export" },
  ];
  return (
    <div
      style={{
        width: 56,
        flexShrink: 0,
        background: "var(--graphite)",
        borderRight: "1px solid var(--iron)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 0",
        gap: 4,
      }}
    >
      {items.map((it) => {
        const active = it.id === screen;
        return (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            title={it.label}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: active ? "rgba(212,255,58,0.10)" : "transparent",
              color: active ? "var(--lime)" : "var(--ash-gray)",
              border: active ? "1px solid rgba(212,255,58,0.25)" : "1px solid transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            {it.icon}
            {active && (
              <div
                style={{
                  position: "absolute",
                  left: -12,
                  top: 10,
                  bottom: 10,
                  width: 2,
                  background: "var(--lime)",
                  borderRadius: 2,
                }}
              />
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <AccountMenu />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Account menu — shows current user email + logout.
// ─────────────────────────────────────────────────────────
function AccountMenu() {
  const { user, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const email = user?.email ?? "";
  const initials = email
    ? email
        .split("@")[0]
        .split(/[._-]+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("")
    : "";

  async function handleSignOut() {
    await signOut();
    // Full reload so middleware re-evaluates and sends us to /login.
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={email || "Account"}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: open ? "rgba(255,255,255,0.06)" : "transparent",
          border: "1px solid transparent",
          color: user ? "var(--bone)" : "var(--slate-2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        {initials ? (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--lime)",
              color: "var(--lime-ink)",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--f-mono)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initials || "?"}
          </div>
        ) : (
          <I.User size={18} />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            bottom: 0,
            minWidth: 240,
            background: "var(--onyx)",
            border: "1px solid var(--iron-2)",
            borderRadius: 10,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            padding: 6,
            zIndex: 60,
            animation: "float-fade 160ms var(--e-out)",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--iron)",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--f-mono)",
                letterSpacing: 1.2,
                color: "var(--slate-2)",
                marginBottom: 4,
              }}
            >
              SIGNED IN AS
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--bone)",
                fontWeight: 500,
                wordBreak: "break-all",
              }}
            >
              {email || "—"}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={menuItemStyle()}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <I.ArrowLeft size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = (): React.CSSProperties => ({
  width: "100%",
  height: 32,
  padding: "0 10px",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  color: "var(--bone)",
  fontSize: 12,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  textAlign: "left",
  transition: "background 120ms var(--e-out)",
});
