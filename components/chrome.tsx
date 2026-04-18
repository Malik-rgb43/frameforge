"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { iconBtnStyle } from "./ui";
import { SEED_COLLABORATORS } from "@/lib/data";

// ─────────────────────────────────────────────────────────
// Windows 11 window controls
// ─────────────────────────────────────────────────────────
function WinControls() {
  const base: React.CSSProperties = {
    width: 46,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
    transition: "background 120ms var(--e-out)",
    color: "#c6c6cb",
  };
  const [h, setH] = useState<string | null>(null);
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{ ...base, background: h === "min" ? "rgba(255,255,255,0.06)" : "transparent" }}
        onMouseEnter={() => setH("min")}
        onMouseLeave={() => setH(null)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div
        style={{ ...base, background: h === "max" ? "rgba(255,255,255,0.06)" : "transparent" }}
        onMouseEnter={() => setH("max")}
        onMouseLeave={() => setH(null)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div
        style={{
          ...base,
          width: 46,
          background: h === "close" ? "#e81123" : "transparent",
          color: h === "close" ? "#fff" : "#c6c6cb",
        }}
        onMouseEnter={() => setH("close")}
        onMouseLeave={() => setH(null)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Window shell — titlebar + body
// ─────────────────────────────────────────────────────────
export function WindowShell({
  children,
  title = "FrameForge",
  height = 900,
}: {
  children: React.ReactNode;
  title?: string;
  height?: number;
}) {
  return (
    <div
      style={{
        width: 1440,
        height,
        margin: "24px auto",
        background: "var(--graphite)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 32,
          flexShrink: 0,
          background: "var(--graphite)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div style={{ width: 12 }} />
        <I.Spark size={16} />
        <div style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "#d4d4d8", letterSpacing: 0.1 }}>
          {title}
        </div>
        <div style={{ flex: 1 }} />
        <WinControls />
      </div>
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
      <button
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "transparent",
          border: "1px solid transparent",
          color: "var(--slate-2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <I.User size={18} />
      </button>
    </div>
  );
}
