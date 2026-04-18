"use client";
import React, { useState } from "react";
import { I } from "./icons";

// ─────────────────────────────────────────────────────────
// Shared button style helper (used for icon buttons in chrome)
// ─────────────────────────────────────────────────────────
export const iconBtnStyle = (): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 6,
  background: "var(--ash)",
  border: "1px solid var(--iron)",
  color: "var(--ash-gray)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 120ms var(--e-out)",
});

// ─────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────
type ChipColor = "default" | "lime" | "cyan" | "amber" | "mint" | "coral";
export function Chip({
  children,
  color = "default",
  onClick,
  active,
  style,
}: {
  children: React.ReactNode;
  color?: ChipColor;
  onClick?: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  const palette: Record<ChipColor, { bg: string; fg: string; bd: string }> = {
    default: { bg: "var(--ash)",                fg: "var(--ash-gray)", bd: "var(--iron)" },
    lime:    { bg: "rgba(212,255,58,0.12)",     fg: "var(--lime)",     bd: "rgba(212,255,58,0.3)" },
    cyan:    { bg: "rgba(125,249,255,0.10)",    fg: "var(--cyan)",     bd: "rgba(125,249,255,0.25)" },
    amber:   { bg: "rgba(251,191,36,0.12)",     fg: "var(--amber)",    bd: "rgba(251,191,36,0.3)" },
    mint:    { bg: "rgba(74,222,128,0.10)",     fg: "var(--mint)",     bd: "rgba(74,222,128,0.25)" },
    coral:   { bg: "rgba(255,90,95,0.10)",      fg: "var(--coral)",    bd: "rgba(255,90,95,0.25)" },
  };
  const p = palette[color] || palette.default;
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
        padding: "0 8px",
        borderRadius: 4,
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        fontSize: 11,
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        ...(active ? { boxShadow: "0 0 0 1px var(--lime)" } : {}),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────
type BtnVariant = "default" | "ghost" | "primary" | "danger";
type BtnSize = "sm" | "md" | "lg";
export function Btn({
  children,
  variant = "default",
  size = "md",
  icon,
  onClick,
  style,
  disabled,
}: {
  children?: React.ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const sizes: Record<BtnSize, { h: number; px: number; fs: number }> = {
    sm: { h: 28, px: 10, fs: 12 },
    md: { h: 32, px: 14, fs: 13 },
    lg: { h: 40, px: 18, fs: 14 },
  };
  const variants: Record<BtnVariant, { bg: string; fg: string; bd: string }> = {
    default: { bg: "var(--ash)",  fg: "var(--bone)",     bd: "var(--iron)" },
    ghost:   { bg: "transparent", fg: "var(--ash-gray)", bd: "transparent" },
    primary: { bg: "var(--lime)", fg: "var(--lime-ink)", bd: "var(--lime)" },
    danger:  { bg: "transparent", fg: "var(--coral)",    bd: "rgba(255,90,95,0.3)" },
  };
  const s = sizes[size];
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 6,
        fontSize: s.fs,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 120ms var(--e-out)",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onClick,
  padding = 16,
  hoverable,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  padding?: number;
  hoverable?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--onyx)",
        border: `1px solid ${hoverable && hov ? "var(--iron-2)" : "var(--iron)"}`,
        borderRadius: "var(--r-card)",
        padding,
        cursor: onClick ? "pointer" : "default",
        transition: "all 160ms var(--e-out)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────
export function SectionHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
      <div>
        {eyebrow && (
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--slate-2)",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontFamily: "var(--f-mono)",
            marginBottom: 4,
          }}>
            {eyebrow}
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.2 }}>{title}</div>
      </div>
      <div style={{ flex: 1, height: 1, background: "var(--iron)", marginBottom: 8 }} />
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Slide-over panel
// ─────────────────────────────────────────────────────────
export function SlideOver({
  open,
  onClose,
  title,
  width = 420,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms var(--e-out)",
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: "var(--onyx)",
          borderLeft: "1px solid var(--iron)",
          transform: open ? "translateX(0)" : `translateX(${width}px)`,
          transition: "transform 280ms var(--e-out)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-20px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--iron)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bone)" }}>{title}</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={iconBtnStyle()}>
            <I.X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--ash-gray)",
        marginBottom: 6,
        letterSpacing: 0.3,
      }}>
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  style,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        height: 34,
        padding: "0 12px",
        background: "var(--ash)",
        border: "1px solid var(--iron)",
        borderRadius: 6,
        color: "var(--bone)",
        fontSize: 13,
        outline: "none",
        ...style,
      }}
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  style,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
}) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: 10,
        background: "var(--ash)",
        border: "1px solid var(--iron)",
        borderRadius: 6,
        color: "var(--bone)",
        fontSize: 13,
        outline: "none",
        resize: "none",
        fontFamily: "var(--f-ui)",
        lineHeight: 1.5,
        ...style,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 10,
        background: checked ? "var(--lime)" : "var(--iron-2)",
        border: "none",
        padding: 2,
        cursor: "pointer",
        transition: "background 160ms var(--e-out)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked ? "var(--lime-ink)" : "var(--ash-gray)",
          transform: checked ? "translateX(14px)" : "translateX(0)",
          transition: "transform 200ms var(--e-out)",
        }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Segmented control
// ─────────────────────────────────────────────────────────
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
}) {
  return (
    <div style={{
      display: "inline-flex",
      padding: 2,
      background: "var(--ash)",
      border: "1px solid var(--iron)",
      borderRadius: 8,
      gap: 2,
    }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            height: 26,
            padding: "0 12px",
            background: value === o.value ? "var(--iron-2)" : "transparent",
            color: value === o.value ? "var(--bone)" : "var(--ash-gray)",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Status dot
// ─────────────────────────────────────────────────────────
type DotStatus = "active" | "draft" | "rendering" | "archived" | "ready" | "generating" | "error";
export function StatusDot({ status }: { status: string }) {
  const c = ({
    active: "var(--mint)",
    draft: "var(--slate-2)",
    rendering: "var(--amber)",
    archived: "var(--slate)",
    ready: "var(--mint)",
    generating: "var(--amber)",
    error: "var(--coral)",
  } as Record<string, string>)[status] || "var(--slate-2)";
  const pulse = ["rendering", "generating"].includes(status);
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: c,
        marginRight: 6,
        animation: pulse ? "lime-pulse 1.4s ease-in-out infinite" : "none",
      }}
    />
  );
}
