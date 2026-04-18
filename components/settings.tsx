"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { Btn, Chip, Field, Input, SlideOver, Textarea, Toggle, iconBtnStyle } from "./ui";
import { ASPECTS, MODELS, SEED_COLLABORATORS, type Project } from "@/lib/data";

type TabId = "general" | "brand" | "team" | "models" | "export";

export default function ProjectSettings({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  const [tab, setTab] = useState<TabId>("general");
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <I.Settings size={14} /> },
    { id: "brand",   label: "Brand",   icon: <I.Palette size={14} /> },
    { id: "team",    label: "Team",    icon: <I.Users size={14} /> },
    { id: "models",  label: "Models",  icon: <I.Sparkles size={14} /> },
    { id: "export",  label: "Export",  icon: <I.Download size={14} /> },
  ];

  return (
    <SlideOver open={open} onClose={onClose} title="Project Settings" width={520}>
      <div style={{ display: "flex", height: "100%" }}>
        <div
          style={{
            width: 140,
            flexShrink: 0,
            borderRight: "1px solid var(--iron)",
            padding: 12,
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: "100%",
                height: 32,
                background: tab === t.id ? "rgba(212,255,58,0.08)" : "transparent",
                color: tab === t.id ? "var(--lime)" : "var(--ash-gray)",
                border: "none",
                borderRadius: 6,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: 18, overflow: "auto" }}>
          {tab === "general" && <GeneralTab project={project} />}
          {tab === "brand" && <BrandTab />}
          {tab === "team" && <TeamTab />}
          {tab === "models" && <ModelsTab />}
          {tab === "export" && <ExportTab />}
        </div>
      </div>
    </SlideOver>
  );
}

function GeneralTab({ project }: { project: Project | null }) {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>General</div>
      <Field label="Project name">
        <Input value={project?.name || "AURA — Morning Campaign"} />
      </Field>
      <Field label="Client">
        <Input value={project?.client || "Aura Skincare"} />
      </Field>
      <Field label="Description" hint="Used as context for every prompt in this project.">
        <Textarea
          rows={3}
          value="Minimalist skincare brand. Premium amber glass. Cinematic, quiet, luxurious."
        />
      </Field>
      <Field label="Default aspect">
        <div style={{ display: "flex", gap: 6 }}>
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              style={{
                flex: 1,
                height: 56,
                background: a.id === (project?.aspect || "9:16") ? "rgba(212,255,58,0.08)" : "var(--ash)",
                border: `1px solid ${a.id === (project?.aspect || "9:16") ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                borderRadius: 6,
                color: a.id === (project?.aspect || "9:16") ? "var(--lime)" : "var(--bone)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span>{a.label}</span>
              <span style={{ fontSize: 10, color: "var(--slate-2)", fontWeight: 400 }}>{a.sub}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tags">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip color="lime">skincare</Chip>
          <Chip color="cyan">Q1-2026</Chip>
          <Chip>hero</Chip>
          <button
            style={{
              height: 22,
              padding: "0 8px",
              borderRadius: 4,
              background: "transparent",
              border: "1px dashed var(--iron-2)",
              color: "var(--slate-2)",
              fontSize: 11,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <I.Plus size={10} /> Add
          </button>
        </div>
      </Field>
      <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Danger zone</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="default" icon={<I.Copy size={14} />}>Duplicate</Btn>
        <Btn variant="default" icon={<I.Folder size={14} />}>Archive</Btn>
        <Btn variant="danger" icon={<I.Trash size={14} />}>Delete</Btn>
      </div>
    </>
  );
}

function BrandTab() {
  const swatches = ["#0a0a0c", "#f5f5f4", "#d4ff3a", "#8a4a1c", "#e6c893"];
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Brand reference</div>
      <Field label="Logo" hint="PNG or SVG. Used as negative mask for watermark-free renders.">
        <div
          style={{
            height: 100,
            border: "1px dashed var(--iron-2)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
            color: "var(--slate-2)",
            fontSize: 12,
            background: "var(--ash)",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4, color: "var(--bone)" }}>AURA</div>
          <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 2 }}>
            LOGO.SVG \u00B7 4.2 KB
          </div>
        </div>
      </Field>
      <Field label="Palette">
        <div style={{ display: "flex", gap: 6 }}>
          {swatches.map((c) => (
            <div
              key={c}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: c,
                border: "1px solid var(--iron)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: -16,
                  left: 0,
                  right: 0,
                  fontSize: 9,
                  color: "var(--slate-2)",
                  fontFamily: "var(--f-mono)",
                  textAlign: "center",
                }}
              >
                {c}
              </div>
            </div>
          ))}
          <button
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "transparent",
              border: "1px dashed var(--iron-2)",
              color: "var(--slate-2)",
              cursor: "pointer",
            }}
          >
            <I.Plus size={16} />
          </button>
        </div>
      </Field>
      <div style={{ height: 14 }} />
      <Field label="Typography" hint="Overlaid in storyboards for end-card text.">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)", marginBottom: 4 }}>DISPLAY</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.3 }}>S\u00F6hne</div>
          </div>
          <div style={{ flex: 1, padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)", marginBottom: 4 }}>BODY</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--bone)", letterSpacing: -0.1 }}>Inter</div>
          </div>
        </div>
      </Field>
      <Field label="Voice">
        <Textarea
          rows={3}
          value="Quiet confidence. Never shouts. Short sentences. No exclamation marks. Sensory verbs."
        />
      </Field>
    </>
  );
}

function TeamTab() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)" }}>Team</div>
        <div style={{ flex: 1 }} />
        <Btn size="sm" variant="primary" icon={<I.Plus size={12} />}>Invite</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SEED_COLLABORATORS.map((u) => (
          <div
            key={u.id}
            style={{
              padding: 10,
              background: "var(--ash)",
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: u.color,
                color: "var(--obsidian)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--f-mono)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {u.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bone)" }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "var(--slate-2)" }}>{u.email}</div>
            </div>
            <Chip color={u.role === "Owner" ? "lime" : "default"}>{u.role}</Chip>
            <button style={iconBtnStyle()}>
              <I.Dots size={14} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 10 }}>Share link</div>
      <div
        style={{
          padding: 10,
          background: "var(--ash)",
          border: "1px solid var(--iron)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          color: "var(--ash-gray)",
        }}
      >
        <I.Link size={14} />
        <div style={{ flex: 1 }}>frameforge.app/p/aura-morning/m8fK2x</div>
        <Btn size="sm">Copy</Btn>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <Toggle checked={true} />
        <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>
          Anyone with link can <b style={{ color: "var(--bone)" }}>view</b>
        </div>
      </div>
    </>
  );
}

function ModelsTab() {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>AI models</div>
      <Field label="Image model">
        <div style={{ display: "flex", gap: 8 }}>
          {["NanoBanana Pro", "Seedream 4", "Qwen-Img"].map((m, i) => (
            <div
              key={m}
              style={{
                flex: 1,
                padding: 12,
                background: i === 0 ? "rgba(212,255,58,0.06)" : "var(--ash)",
                border: `1px solid ${i === 0 ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--lime)" : "var(--bone)" }}>{m}</div>
              <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
                $0.04 / img
              </div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Video model">
        <div style={{ display: "flex", gap: 8 }}>
          {MODELS.map((m, i) => (
            <div
              key={m.id}
              style={{
                flex: 1,
                padding: 12,
                background: i === 0 ? "rgba(212,255,58,0.06)" : "var(--ash)",
                border: `1px solid ${i === 0 ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--lime)" : "var(--bone)" }}>
                {m.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
                {m.tag}
              </div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Consistency — character lock" hint="LoRA-style token pinned across shots.">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={true} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--bone)" }}>
              Lock to <b>AURA \u00B7 bottle ref #1</b>
            </div>
            <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
              Token: auralite_v3 \u00B7 4 references pinned
            </div>
          </div>
        </div>
      </Field>
      <Field label="Monthly budget">
        <div style={{ padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--bone)", fontFamily: "var(--f-mono)" }}>$184</div>
            <div style={{ fontSize: 11, color: "var(--slate-2)" }}>/ $500 used</div>
          </div>
          <div style={{ height: 4, background: "var(--iron)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: "37%", height: "100%", background: "var(--lime)" }} />
          </div>
        </div>
      </Field>
    </>
  );
}

function ExportTab() {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Export defaults</div>
      <Field label="Format">
        <div style={{ display: "flex", gap: 6 }}>
          {["MP4 \u00B7 H.264", "MP4 \u00B7 H.265", "ProRes", "WebM"].map((f, i) => (
            <button
              key={f}
              style={{
                flex: 1,
                height: 38,
                background: i === 0 ? "rgba(212,255,58,0.06)" : "var(--ash)",
                border: `1px solid ${i === 0 ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                borderRadius: 6,
                color: i === 0 ? "var(--lime)" : "var(--bone)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--f-mono)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Burn-in subtitles">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={false} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>Auto-generate from VO script</div>
        </div>
      </Field>
      <Field label="Editor pack" hint="Includes individual shots, MOGRT titles, LUT, and project .xml.">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={true} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>
            Include Premiere / DaVinci project files
          </div>
        </div>
      </Field>
      <Field label="Watermark">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={false} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>FrameForge mark bottom-right (free tier)</div>
        </div>
      </Field>
    </>
  );
}
