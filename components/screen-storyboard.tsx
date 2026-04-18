"use client";
import React, { useState, useEffect } from "react";
import { I } from "./icons";
import {
  Btn,
  Chip,
  Field,
  Input,
  SlideOver,
  StatusDot,
  Textarea,
  iconBtnStyle,
} from "./ui";
import {
  SEED_PRODUCT_IMAGES,
  SEED_SHOTS,
  shotURI,
  type Shot,
} from "@/lib/data";

export default function ScreenStoryboard({ initialShot }: { initialShot: number | null }) {
  const [sel, setSel] = useState(initialShot || 2);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scrub] = useState(3.2);
  const totalDur = SEED_SHOTS.reduce((s, sh) => s + sh.duration, 0);

  useEffect(() => {
    if (initialShot) {
      setSel(initialShot);
      setDetailOpen(true);
    }
  }, [initialShot]);

  const selected = SEED_SHOTS.find((s) => s.n === sel)!;
  const selectedRef = SEED_PRODUCT_IMAGES.find((i) => i.id === selected.refImageId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Top header */}
      <div style={{ padding: "20px 28px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--slate-2)" }}>
            STORYBOARD \u00B7 {SEED_SHOTS.length} SHOTS \u00B7 {totalDur.toFixed(1)}S
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--bone)",
              marginTop: 2,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
            }}
          >
            Weightless Ritual
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Btn size="sm" icon={<I.Sparkles size={14} />}>Generate VO</Btn>
        <Btn size="sm" icon={<I.Music size={14} />}>Add soundtrack</Btn>
        <Btn size="sm" variant="primary" icon={<I.ArrowRight size={14} />}>Render preview</Btn>
      </div>

      {/* Preview stage */}
      <div style={{ padding: "0 28px", display: "flex", gap: 14, marginBottom: 10 }}>
        <div
          style={{
            width: 340,
            aspectRatio: "9 / 16",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--iron)",
            background: `url("${shotURI({
              id: selected.refImageId,
              kind: selectedRef?.kind || "bottle",
              tone: selectedRef?.tone || "amber",
              w: 600,
              h: 1000,
            })}") center/cover`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "4px 9px",
              borderRadius: 4,
              background: "rgba(10,10,12,0.75)",
              backdropFilter: "blur(10px)",
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
              color: "var(--bone)",
            }}
          >
            SHOT {String(selected.n).padStart(2, "0")} \u00B7 {selected.duration.toFixed(1)}s
          </div>
          {selected.status === "generating" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(10,10,12,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 10,
                color: "var(--amber)",
              }}
            >
              <I.Loader size={28} style={{ animation: "spin 1.2s linear infinite" }} />
              <div style={{ fontSize: 11, fontFamily: "var(--f-mono)", letterSpacing: 1.5 }}>GENERATING \u00B7 67%</div>
              <div style={{ width: 120, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                <div style={{ width: "67%", height: "100%", background: "var(--amber)", borderRadius: 2 }} />
              </div>
            </div>
          )}
          {selected.vo && (
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 16,
                right: 16,
                fontSize: 16,
                fontWeight: 500,
                color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                textAlign: "center",
                letterSpacing: -0.2,
              }}
            >
              {selected.vo}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--lime-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.Play size={12} />
            </div>
            <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
              <div style={{ width: "60%", height: "100%", background: "var(--lime)" }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Chip color="lime">{selected.sequence}</Chip>
            <Chip>{selected.model}</Chip>
            <Chip>{selected.aspect}</Chip>
            <Chip>{selected.motion}</Chip>
            <div style={{ flex: 1 }} />
            <Btn size="sm" onClick={() => setDetailOpen(true)} icon={<I.Edit size={12} />}>
              Edit shot
            </Btn>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--bone)",
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            {selected.title}
          </div>
          <div
            style={{
              padding: 14,
              background: "var(--onyx)",
              border: "1px solid var(--iron)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--ash-gray)",
              lineHeight: 1.55,
            }}
          >
            {selected.prompt}
          </div>
          {selected.vo && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "var(--ash)",
                border: "1px solid var(--iron)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <I.Mic size={14} style={{ color: "var(--lime)" }} />
              <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--bone)" }}>
                &quot;{selected.vo}&quot;
              </div>
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Btn size="sm" icon={<I.Refresh size={12} />}>Re-roll</Btn>
            <Btn size="sm" icon={<I.Layers size={12} />}>Variations</Btn>
            <Btn size="sm" icon={<I.Sliders size={12} />}>Adjust motion</Btn>
            <Btn size="sm" variant="danger" icon={<I.Trash size={12} />}>Remove</Btn>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div
        style={{
          borderTop: "1px solid var(--iron)",
          background: "var(--onyx)",
          padding: "10px 28px 16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 10,
            color: "var(--slate-2)",
            fontFamily: "var(--f-mono)",
            marginBottom: 6,
          }}
        >
          <span>TIMELINE \u00B7 {totalDur.toFixed(1)}s</span>
          <div style={{ flex: 1 }} />
          <span>
            {scrub.toFixed(1)}s / {totalDur.toFixed(1)}s
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* video track */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 60, fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>VIDEO</div>
            <div style={{ flex: 1, display: "flex", gap: 2, position: "relative" }}>
              {SEED_SHOTS.map((sh) => {
                const w = (sh.duration / totalDur) * 100;
                const isSel = sh.n === sel;
                const isGen = sh.status === "generating";
                const item = SEED_PRODUCT_IMAGES.find((i) => i.id === sh.refImageId);
                return (
                  <div
                    key={sh.n}
                    onClick={() => setSel(sh.n)}
                    style={{
                      flex: `0 0 ${w}%`,
                      height: 64,
                      borderRadius: 4,
                      border: isSel ? "2px solid var(--lime)" : "1px solid var(--iron-2)",
                      background: `url("${shotURI({
                        id: sh.refImageId,
                        kind: item?.kind || "bottle",
                        tone: item?.tone || "amber",
                        w: 400,
                        h: 400,
                      })}") center/cover`,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85))",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        fontSize: 9,
                        fontFamily: "var(--f-mono)",
                        color: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                      }}
                    >
                      #{String(sh.n).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 3,
                        left: 5,
                        right: 5,
                        fontSize: 9,
                        color: "#fff",
                        lineHeight: 1.2,
                        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sh.title}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 3,
                        right: 4,
                        fontSize: 9,
                        fontFamily: "var(--f-mono)",
                        color: "#fff",
                      }}
                    >
                      {sh.duration}s
                    </div>
                    {isGen && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "var(--amber)",
                          animation: "lime-pulse 1s infinite",
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {/* playhead */}
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  bottom: -4,
                  left: `${(scrub / totalDur) * 100}%`,
                  width: 1,
                  background: "var(--lime)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -6,
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: "var(--lime)",
                    color: "var(--lime-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    fontFamily: "var(--f-mono)",
                    fontWeight: 700,
                  }}
                >
                  ◆
                </div>
              </div>
            </div>
          </div>

          {/* audio track */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 60, fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>VO</div>
            <div style={{ flex: 1, display: "flex", gap: 2 }}>
              {SEED_SHOTS.map((sh) => {
                const w = (sh.duration / totalDur) * 100;
                const hasVO = !!sh.vo;
                return (
                  <div
                    key={sh.n}
                    style={{
                      flex: `0 0 ${w}%`,
                      height: 22,
                      borderRadius: 3,
                      background: hasVO ? "rgba(125,249,255,0.1)" : "var(--ash)",
                      border: `1px solid ${hasVO ? "rgba(125,249,255,0.3)" : "var(--iron)"}`,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 6px",
                      fontSize: 10,
                      color: hasVO ? "var(--cyan)" : "var(--slate-2)",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      fontStyle: "italic",
                    }}
                  >
                    {hasVO ? `"${sh.vo}"` : "—"}
                  </div>
                );
              })}
            </div>
          </div>

          {/* music track */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 60, fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>MUSIC</div>
            <div
              style={{
                flex: 1,
                height: 22,
                borderRadius: 3,
                background: "var(--ash)",
                border: "1px solid var(--iron)",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                fontSize: 10,
                color: "var(--slate-2)",
              }}
            >
              <I.Music size={10} style={{ marginRight: 6 }} />
              <span>Soundtrack \u00B7 Ambient \u00B7 72 BPM \u00B7 generated</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
                {Array.from({ length: 80 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 1.5,
                      height: 4 + Math.abs(Math.sin(i * 0.4)) * 10,
                      background: "var(--cyan)",
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button style={{ ...iconBtnStyle(), width: 32, height: 32 }}>
            <I.ChevLeft size={14} />
          </button>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--lime)",
              color: "var(--lime-ink)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Play size={16} />
          </button>
          <button style={{ ...iconBtnStyle(), width: 32, height: 32 }}>
            <I.ChevRight size={14} />
          </button>
          <div style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ash-gray)", marginLeft: 6 }}>
            {scrub.toFixed(1)}s / {totalDur.toFixed(1)}s
          </div>
          <div style={{ flex: 1 }} />
          <Chip>
            <I.Sparkles size={10} /> 1 rendering
          </Chip>
          <Btn size="sm" variant="ghost" icon={<I.Plus size={12} />}>Add shot</Btn>
        </div>
      </div>

      <SlideOver
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Shot ${String(selected.n).padStart(2, "0")} — ${selected.title}`}
        width={460}
      >
        <ShotDetailPanel shot={selected} />
      </SlideOver>
    </div>
  );
}

function ShotDetailPanel({ shot }: { shot: Shot }) {
  const item = SEED_PRODUCT_IMAGES.find((i) => i.id === shot.refImageId);
  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          aspectRatio: "9 / 16",
          borderRadius: 10,
          background: `url("${shotURI({
            id: shot.refImageId,
            kind: item?.kind || "bottle",
            tone: item?.tone || "amber",
            w: 600,
            h: 1000,
          })}") center/cover`,
          border: "1px solid var(--iron)",
          marginBottom: 16,
          maxHeight: 260,
        }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Chip color="lime">SHOT {String(shot.n).padStart(2, "0")}</Chip>
        <Chip>{shot.sequence}</Chip>
        <Chip>
          <StatusDot status={shot.status} />
          {shot.status}
        </Chip>
      </div>

      <Field label="Title">
        <Input value={shot.title} />
      </Field>
      <Field label="Prompt">
        <Textarea rows={6} value={shot.prompt} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Model">
          <div
            style={{
              height: 34,
              padding: "0 10px",
              background: "var(--ash)",
              border: "1px solid var(--iron)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--bone)",
            }}
          >
            {shot.model}
            <I.ChevDown size={12} />
          </div>
        </Field>
        <Field label="Duration">
          <Input value={`${shot.duration}s`} />
        </Field>
      </div>
      <Field label="Voice-over" hint="Optional. Auto-synced to shot length.">
        <Textarea rows={2} value={shot.vo || ""} placeholder="No VO on this shot" />
      </Field>

      <div style={{ height: 1, background: "var(--iron)", margin: "16px 0" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="default" icon={<I.Refresh size={14} />}>Re-roll</Btn>
        <Btn variant="primary" icon={<I.Sparkles size={14} />}>Regenerate</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="danger" icon={<I.Trash size={14} />}>{null}</Btn>
      </div>
    </div>
  );
}
