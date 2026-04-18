"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { Btn, Field, Segmented, Toggle } from "./ui";
import { SEED_PRODUCT_IMAGES, SEED_SHOTS, shotURI } from "@/lib/data";

type Format = "mp4-h264" | "mp4-h265" | "prores" | "webm";
type Res = "720p" | "1080p" | "4k";

export default function ScreenExport() {
  const [format, setFormat] = useState<Format>("mp4-h264");
  const [res, setRes] = useState<Res>("1080p");

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Main preview */}
      <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--lime)" }}>
              FINAL \u00B7 READY TO EXPORT
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--bone)",
                letterSpacing: -0.4,
                marginTop: 2,
              }}
            >
              Weightless Ritual \u00B7 v3
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <Btn size="sm" icon={<I.Share size={14} />}>Share preview link</Btn>
        </div>

        <div
          style={{
            aspectRatio: "9 / 16",
            maxWidth: 380,
            margin: "0 auto",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--iron-2)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
            position: "relative",
            background: `url("${shotURI({ id: "final", kind: "bottle", tone: "amber", w: 600, h: 1000 })}") center/cover`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7))",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "4px 10px",
              borderRadius: 4,
              background: "rgba(10,10,12,0.75)",
              backdropFilter: "blur(10px)",
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
              color: "var(--bone)",
            }}
          >
            9:16 \u00B7 12.0s \u00B7 1080p
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 20,
              right: 20,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: -0.4,
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              AURA
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4, letterSpacing: 1 }}>
              Mornings, re-imagined.
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 20,
              right: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--lime-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.Play size={18} />
            </div>
            <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.25)", borderRadius: 2 }}>
              <div style={{ width: "28%", height: "100%", background: "var(--lime)" }} />
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", color: "#fff" }}>0:03 / 0:12</div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center" }}>
          {SEED_SHOTS.map((sh) => {
            const it = SEED_PRODUCT_IMAGES.find((i) => i.id === sh.refImageId);
            return (
              <div
                key={sh.n}
                style={{
                  width: 80,
                  height: 140,
                  borderRadius: 6,
                  background: `url("${shotURI({
                    id: sh.refImageId,
                    kind: it?.kind || "bottle",
                    tone: it?.tone || "amber",
                    w: 300,
                    h: 500,
                  })}") center/cover`,
                  border: "1px solid var(--iron)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
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
                    bottom: 4,
                    right: 4,
                    fontSize: 9,
                    fontFamily: "var(--f-mono)",
                    color: "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  {sh.duration}s
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — delivery */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          borderLeft: "1px solid var(--iron)",
          background: "var(--onyx)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 20, borderBottom: "1px solid var(--iron)" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--slate-2)" }}>
            DELIVERY
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--bone)", marginTop: 2 }}>Export options</div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 18 }}>
          <Field label="Format">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { id: "mp4-h264" as Format, label: "MP4 \u00B7 H.264", sub: "Universal" },
                { id: "mp4-h265" as Format, label: "MP4 \u00B7 H.265", sub: "4K-ready" },
                { id: "prores"   as Format, label: "ProRes",            sub: "Editing" },
                { id: "webm"     as Format, label: "WebM \u00B7 VP9",   sub: "Web" },
              ].map((f) => {
                const sel = f.id === format;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    style={{
                      padding: 10,
                      textAlign: "left",
                      background: sel ? "rgba(212,255,58,0.08)" : "var(--ash)",
                      border: `1px solid ${sel ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: sel ? "var(--lime)" : "var(--bone)",
                        fontFamily: "var(--f-mono)",
                      }}
                    >
                      {f.label}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2 }}>{f.sub}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Resolution">
            <Segmented<Res>
              value={res}
              onChange={setRes}
              options={[
                { value: "720p", label: "720p" },
                { value: "1080p", label: "1080p" },
                { value: "4k", label: "4K" },
              ]}
            />
          </Field>

          <Field label="Variations" hint="Automatic re-cuts for different placements.">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "9:16 \u00B7 TikTok/Reels", on: true,  size: "12s" },
                { label: "1:1 \u00B7 Feed post",     on: true,  size: "10s" },
                { label: "16:9 \u00B7 YouTube",      on: false, size: "15s" },
                { label: "9:16 \u00B7 6s cut",       on: true,  size: "6s" },
              ].map((v) => (
                <div
                  key={v.label}
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
                  <Toggle checked={v.on} />
                  <div style={{ flex: 1, fontSize: 12, color: "var(--bone)" }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>{v.size}</div>
                </div>
              ))}
            </div>
          </Field>

          <Field
            label="Editor pack"
            hint="Includes Premiere / DaVinci project, MOGRT titles, LUT, and individual shots."
          >
            <div
              style={{
                padding: 12,
                background: "rgba(125,249,255,0.06)",
                border: "1px solid rgba(125,249,255,0.25)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: "rgba(125,249,255,0.12)",
                  color: "var(--cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.Layers size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--bone)" }}>Premiere + DaVinci</div>
                <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>
                  4 shots \u00B7 3 variants \u00B7 1 LUT
                </div>
              </div>
              <Toggle checked={true} />
            </div>
          </Field>

          <Field label="Subtitles">
            <div
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
              <Toggle checked={true} />
              <div style={{ fontSize: 12, color: "var(--bone)" }}>Burn-in \u00B7 EN \u00B7 Auto-synced</div>
            </div>
          </Field>
        </div>

        <div style={{ padding: 18, borderTop: "1px solid var(--iron)" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10, fontSize: 11, color: "var(--slate-2)" }}>
            <span>Render time:</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: "var(--bone)", fontFamily: "var(--f-mono)" }}>~2 min</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14, fontSize: 11, color: "var(--slate-2)" }}>
            <span>Credits:</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: "var(--lime)", fontFamily: "var(--f-mono)" }}>$0.48</span>
          </div>
          <Btn
            variant="primary"
            size="lg"
            icon={<I.Download size={16} />}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Render & download
          </Btn>
        </div>
      </div>
    </div>
  );
}
