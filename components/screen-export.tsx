"use client";
import React, { useEffect, useMemo, useState } from "react";
import { I } from "./icons";
import { Btn, Field, Segmented, Toggle } from "./ui";
import {
  SEED_PRODUCT_IMAGES,
  SEED_SHOTS,
  shotURI,
  type Kind,
  type Tone,
} from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import { listShots, type DBShotUI } from "@/lib/queries-shots";
import { listBoardItems, type DBBoardItemUI } from "@/lib/queries-board";
import { getProject, type DBProject } from "@/lib/queries";
import { exportPack } from "@/lib/ai-queries";

type Format = "mp4-h264" | "mp4-h265" | "prores" | "webm";
type Res = "720p" | "1080p" | "4k";

interface Props {
  projectId?: string | null;
}

export default function ScreenExport({ projectId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [shots, setShots] = useState<DBShotUI[]>([]);
  const [items, setItems] = useState<DBBoardItemUI[]>([]);
  const [project, setProject] = useState<DBProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<Format>("mp4-h264");
  const [res, setRes] = useState<Res>("1080p");
  const [packing, setPacking] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) {
        if (!active) return;
        const staticShots: DBShotUI[] = SEED_SHOTS.map((s, i) => ({
          ...s,
          dbId: s.refImageId + "-" + i,
          orderIndex: i,
          refItemId: s.refImageId,
        }));
        setShots(staticShots);
        setItems(SEED_PRODUCT_IMAGES.map((s) => ({ ...s })));
        setProject(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [s, it, pr] = await Promise.all([
          listShots(supabase, projectId),
          listBoardItems(supabase, projectId),
          getProject(supabase, projectId),
        ]);
        if (!active) return;
        setShots(s);
        setItems(it);
        setProject(pr);
      } catch (err) {
        console.error("load export", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, projectId]);

  function refOf(shot: DBShotUI): {
    kind: Kind;
    tone: Tone;
    id: string;
    imageUrl: string | null;
  } {
    const match =
      items.find((i) => i.id === shot.refItemId) ||
      items.find((i) => i.id === shot.refImageId);
    return {
      kind: match?.kind || "bottle",
      tone: match?.tone || "amber",
      id: match?.id || shot.refImageId || shot.refItemId || "na",
      imageUrl: match?.imageUrl ?? null,
    };
  }

  const totalDur = shots.reduce((s, sh) => s + sh.duration, 0);

  const conceptTitle =
    project?.concept_title || (projectId ? "Untitled concept" : "Weightless Ritual · v3");
  const heroShot = shots[0];
  const heroRef = heroShot ? refOf(heroShot) : null;
  const heroBg = heroRef?.imageUrl
    ? `url("${heroRef.imageUrl}") center/cover`
    : `url("${shotURI({
        id: heroRef?.id || "final",
        kind: heroRef?.kind || "bottle",
        tone: heroRef?.tone || "amber",
        w: 600,
        h: 1000,
      })}") center/cover`;

  async function handleExport() {
    if (!projectId) {
      alert("Open a project first to export its editor pack.");
      return;
    }
    setPacking(true);
    setPackError(null);
    try {
      const res = await exportPack(projectId);
      if (!res.ok) {
        let msg = `Export failed: ${res.status}`;
        try {
          const j = await res.json();
          if (j && typeof j.error === "string") msg = j.error;
        } catch {
          /* ignore */
        }
        setPackError(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const nameMatch = cd.match(/filename="?([^";]+)"?/i);
      const filename = nameMatch?.[1] || `frameforge-${projectId}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      setPackError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPacking(false);
    }
  }

  async function handleShare() {
    if (!projectId) {
      alert("Open a project first to share a preview link.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite/${projectId}?email=`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error("share copy failed", err);
      alert(`Copy failed. Link:\n${link}`);
    }
  }

  const hasShots = shots.length > 0;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Main preview */}
      <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--lime)" }}>
              FINAL · READY TO EXPORT
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
              {conceptTitle}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {shareCopied && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--lime)",
                  fontFamily: "var(--f-mono)",
                  letterSpacing: 0.3,
                }}
              >
                Copied!
              </span>
            )}
            <Btn size="sm" icon={<I.Share size={14} />} onClick={handleShare}>
              Share preview link
            </Btn>
          </div>
        </div>

        {!hasShots && !loading ? (
          <div
            style={{
              maxWidth: 380,
              margin: "60px auto 0",
              padding: 40,
              textAlign: "center",
              border: "1px dashed var(--iron-2)",
              borderRadius: 12,
              background: "var(--onyx)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--bone)",
                marginBottom: 6,
              }}
            >
              No shots yet
            </div>
            <div style={{ fontSize: 12, color: "var(--slate-2)" }}>
              Go back to the Storyboard to create your first shot.
            </div>
          </div>
        ) : (
          <>
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
                background: heroBg,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7))",
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
                {project?.aspect || "9:16"} · {totalDur.toFixed(1)}s · 1080p
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
                  {conceptTitle}
                </div>
                {project?.concept_hook && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.8)",
                      marginTop: 4,
                      letterSpacing: 0.3,
                      lineHeight: 1.4,
                      maxWidth: 300,
                      margin: "4px auto 0",
                    }}
                  >
                    {project.concept_hook.length > 90
                      ? project.concept_hook.slice(0, 90) + "…"
                      : project.concept_hook}
                  </div>
                )}
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
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 2,
                  }}
                >
                  <div style={{ width: "28%", height: "100%", background: "var(--lime)" }} />
                </div>
                <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", color: "#fff" }}>
                  0:03 / 0:{String(Math.round(totalDur)).padStart(2, "0")}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 6,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {loading && projectId
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 80,
                        height: 140,
                        borderRadius: 6,
                        border: "1px solid var(--iron)",
                        background: "var(--onyx)",
                        animation: "lime-pulse 1.4s ease-in-out infinite",
                        opacity: 0.6,
                      }}
                    />
                  ))
                : shots.map((sh) => {
                    const r = refOf(sh);
                    const bg = r.imageUrl
                      ? `url("${r.imageUrl}") center/cover`
                      : `url("${shotURI({
                          id: r.id,
                          kind: r.kind,
                          tone: r.tone,
                          w: 300,
                          h: 500,
                        })}") center/cover`;
                    return (
                      <div
                        key={sh.dbId}
                        style={{
                          width: 80,
                          height: 140,
                          borderRadius: 6,
                          background: bg,
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
          </>
        )}
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
                { id: "mp4-h264" as Format, label: "MP4 · H.264", sub: "Universal" },
                { id: "mp4-h265" as Format, label: "MP4 · H.265", sub: "4K-ready" },
                { id: "prores"   as Format, label: "ProRes",            sub: "Editing" },
                { id: "webm"     as Format, label: "WebM · VP9",   sub: "Web" },
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
                { label: "9:16 · TikTok/Reels", on: true,  size: "12s" },
                { label: "1:1 · Feed post",     on: true,  size: "10s" },
                { label: "16:9 · YouTube",      on: false, size: "15s" },
                { label: "9:16 · 6s cut",       on: true,  size: "6s" },
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
            hint="Includes prompts.md, sequence.json, VO script, and every shot image."
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
                  {shots.length} shots · refs + prompts + VO
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
              <div style={{ fontSize: 12, color: "var(--bone)" }}>Burn-in · EN · Auto-synced</div>
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
          {packError && (
            <div
              style={{
                marginBottom: 10,
                padding: 8,
                borderRadius: 6,
                background: "rgba(255,90,95,0.10)",
                border: "1px solid rgba(255,90,95,0.3)",
                color: "var(--coral)",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {packError}
            </div>
          )}
          <Btn
            variant="primary"
            size="lg"
            icon={packing ? undefined : <I.Download size={16} />}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleExport}
            disabled={packing || !hasShots}
          >
            {packing ? "Packing…" : "Render & download"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
