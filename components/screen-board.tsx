"use client";
import React, { useEffect, useMemo, useState } from "react";
import { I } from "./icons";
import { Btn, Chip, Field, Input, Segmented, StatusDot, Textarea, Toggle, iconBtnStyle } from "./ui";
import {
  SEED_PRODUCT_IMAGES,
  SEED_REF_LINKS,
  SEED_PROMPTS,
  shotURI,
  type RefLink,
} from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import {
  listBoardItems,
  listConnections,
  type DBBoardItemUI,
} from "@/lib/queries-board";

type Mode = "image" | "video";

interface Props {
  onShot: (n: number) => void;
  projectId?: string | null;
}

// Fallback prompt lookup by filename — lets us reuse SEED_PROMPTS after
// uuid remap (DB rows don't preserve the original "gen-1" seed id).
function fallbackPrompt(filename: string | null | undefined):
  | { image: string; video: string; videoModel: string; usedInShot?: number }
  | undefined {
  if (!filename) return undefined;
  const seed = SEED_PRODUCT_IMAGES.find((s) => s.filename === filename);
  if (!seed) return undefined;
  return SEED_PROMPTS[seed.id];
}

export default function ScreenBoard({ onShot, projectId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<DBBoardItemUI[]>([]);
  const [links, setLinks] = useState<RefLink[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promptCard, setPromptCard] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("image");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) {
        // Static preview fallback — matches the original design exactly.
        if (!active) return;
        const staticItems: DBBoardItemUI[] = SEED_PRODUCT_IMAGES.map((s) => ({
          ...s,
          imagePrompt: SEED_PROMPTS[s.id]?.image,
          videoPrompt: SEED_PROMPTS[s.id]?.video,
          videoModel: SEED_PROMPTS[s.id]?.videoModel,
        }));
        setItems(staticItems);
        setLinks(SEED_REF_LINKS);
        setPromptCard(staticItems.find((i) => i.generated)?.id ?? null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [rows, conns] = await Promise.all([
          listBoardItems(supabase, projectId),
          listConnections(supabase, projectId),
        ]);
        if (!active) return;
        setItems(rows);
        setLinks(conns);
        const firstGen = rows.find((i) => i.generated);
        setPromptCard(firstGen?.id ?? null);
      } catch (err) {
        console.error("load board", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, projectId]);

  const openCardItem = items.find((i) => i.id === promptCard);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left rail — assets */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--iron)",
          background: "var(--onyx)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--iron)" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--slate-2)" }}>
            ASSETS
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginTop: 2 }}>Product library</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--slate-2)",
              padding: "4px 6px",
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
            }}
          >
            REFERENCES \· {items.filter((i) => i.isRef).length}
          </div>
          {items.filter((i) => i.isRef).map((i) => (
            <AssetRow
              key={i.id}
              item={i}
              selected={selectedId === i.id}
              onClick={() => setSelectedId(i.id)}
            />
          ))}
          <div
            style={{
              fontSize: 10,
              color: "var(--slate-2)",
              padding: "8px 6px 4px",
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
            }}
          >
            GENERATED \· {items.filter((i) => i.generated).length}
          </div>
          {items.filter((i) => i.generated).map((i) => (
            <AssetRow
              key={i.id}
              item={i}
              selected={selectedId === i.id}
              onClick={() => setSelectedId(i.id)}
            />
          ))}
        </div>
        <div style={{ padding: 10, borderTop: "1px solid var(--iron)" }}>
          <Btn
            size="sm"
            icon={<I.Upload size={12} />}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Upload images
          </Btn>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--obsidian)" }}>
        {/* Top tools */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            right: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              background: "rgba(20,20,22,0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Segmented<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: "image", label: "Image", icon: <I.Image size={12} /> },
                { value: "video", label: "Video", icon: <I.Film size={12} /> },
              ]}
            />
          </div>
          <div
            style={{
              padding: "6px 10px",
              background: "rgba(20,20,22,0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {[
              { icon: <I.Plus size={14} />, tip: "Pan" },
              { icon: <I.Crop size={14} />, tip: "Select" },
              { icon: <I.Link size={14} />, tip: "Link" },
              { icon: <I.Pencil size={14} />, tip: "Annotate" },
            ].map((t, i) => (
              <button
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: i === 1 ? "var(--iron-2)" : "transparent",
                  border: "none",
                  color: "var(--bone)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: "6px 10px",
              background: "rgba(20,20,22,0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--slate-2)",
              fontFamily: "var(--f-mono)",
            }}
          >
            <span>100%</span>
            <span style={{ opacity: 0.4 }}>\·</span>
            <span>
              <StatusDot status="ready" />
              Saved
            </span>
          </div>
        </div>

        {/* Canvas body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0",
          }}
        >
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#d4ff3a" opacity="0.6" />
              </marker>
            </defs>
            {links.map((l, i) => {
              const a = items.find((it) => it.id === l.from);
              const b = items.find((it) => it.id === l.to);
              if (!a || !b) return null;
              const ax = a.x + a.w / 2,
                ay = a.y + a.h;
              const bx = b.x + b.w / 2,
                by = b.y;
              const midY = (ay + by) / 2;
              const d = `M${ax},${ay} C${ax},${midY} ${bx},${midY} ${bx},${by}`;
              return (
                <g key={i}>
                  <path
                    d={d}
                    stroke={l.kind === "variant" ? "#d4ff3a" : "#7df9ff"}
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray={l.kind === "reference" ? "4 4" : "0"}
                    opacity="0.5"
                    markerEnd="url(#arr)"
                  />
                </g>
              );
            })}
          </svg>

          <div
            style={{
              position: "absolute",
              left: 70,
              top: 24,
              fontSize: 10,
              color: "var(--slate-2)",
              fontFamily: "var(--f-mono)",
              letterSpacing: 2,
            }}
          >
            REFERENCE IMAGES
          </div>
          <div
            style={{
              position: "absolute",
              left: 70,
              top: 354,
              fontSize: 10,
              color: "var(--lime)",
              fontFamily: "var(--f-mono)",
              letterSpacing: 2,
            }}
          >
            GENERATED \· {mode.toUpperCase()}
          </div>

          {loading && projectId && (
            <div
              style={{
                position: "absolute",
                inset: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--lime)",
                fontSize: 11,
                fontFamily: "var(--f-mono)",
                letterSpacing: 1.5,
                animation: "lime-pulse 1.4s ease-in-out infinite",
              }}
            >
              LOADING BOARD...
            </div>
          )}

          {items.map((it) => (
            <BoardItemCard
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              promptOpen={promptCard === it.id}
              onClick={() => setSelectedId(it.id)}
              onOpenPrompt={() => setPromptCard(it.id === promptCard ? null : it.id)}
              onShotClick={onShot}
              mode={mode}
            />
          ))}

          {/* Plus add slot */}
          <div
            style={{
              position: "absolute",
              left: 820,
              top: 410,
              width: 170,
              height: 180,
              border: "1.5px dashed var(--iron-2)",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "var(--slate-2)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(212,255,58,0.08)",
                color: "var(--lime)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.Sparkles size={18} />
            </div>
            <div>New generation</div>
          </div>
        </div>

        {openCardItem && (
          <PromptCard
            item={openCardItem}
            allItems={items}
            mode={mode}
            onClose={() => setPromptCard(null)}
            onChangeMode={setMode}
          />
        )}
      </div>
    </div>
  );
}

function BoardItemCard({
  item,
  selected,
  promptOpen,
  onClick,
  onOpenPrompt,
  onShotClick,
  mode,
}: {
  item: DBBoardItemUI;
  selected: boolean;
  promptOpen: boolean;
  onClick: () => void;
  onOpenPrompt: () => void;
  onShotClick: (n: number) => void;
  mode: Mode;
}) {
  const img = shotURI({ id: item.id, kind: item.kind, tone: item.tone, w: 400, h: 500 });
  const isGen = !!item.generated;
  const fallback = fallbackPrompt(item.filename);
  const usedInShot = fallback?.usedInShot;
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        borderRadius: 8,
        overflow: "hidden",
        border: selected
          ? "2px solid var(--lime)"
          : isGen
          ? "1px solid rgba(212,255,58,0.3)"
          : "1px solid var(--iron-2)",
        boxShadow: selected
          ? "0 0 0 4px rgba(212,255,58,0.12), 0 20px 40px rgba(0,0,0,0.5)"
          : "0 12px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
        background: `url("${img}") center/cover`,
        transition: "all 180ms var(--e-out)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 7px",
          borderRadius: 4,
          background: "rgba(10,10,12,0.75)",
          backdropFilter: "blur(8px)",
          fontSize: 9,
          fontFamily: "var(--f-mono)",
          color: "var(--bone)",
        }}
      >
        {isGen ? (
          <>
            <span style={{ color: "var(--lime)" }}>●</span> GEN \· {item.model?.split(" ")[0] ?? "Gen"}
          </>
        ) : (
          <>{item.tag?.toUpperCase() || "REF"}</>
        )}
      </div>

      {isGen && mode === "video" && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.6))",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              padding: "3px 7px",
              borderRadius: 4,
              background: "rgba(10,10,12,0.85)",
              fontSize: 9,
              fontFamily: "var(--f-mono)",
              color: "var(--bone)",
            }}
          >
            ▶ 2.0s \· 24fps
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--lime)",
              color: "var(--lime-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.Play size={14} />
          </div>
        </>
      )}

      {isGen && usedInShot && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onShotClick(usedInShot);
          }}
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            padding: "3px 7px",
            borderRadius: 4,
            background: "rgba(212,255,58,0.15)",
            border: "1px solid rgba(212,255,58,0.3)",
            fontSize: 9,
            fontFamily: "var(--f-mono)",
            color: "var(--lime)",
            display: mode === "video" ? "none" : "inline-block",
          }}
        >
          SHOT #{usedInShot}
        </div>
      )}

      {isGen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenPrompt();
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: 4,
            background: promptOpen ? "var(--lime)" : "rgba(10,10,12,0.75)",
            color: promptOpen ? "var(--lime-ink)" : "var(--bone)",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Sparkles size={11} />
        </button>
      )}
    </div>
  );
}

function AssetRow({
  item,
  selected,
  onClick,
}: {
  item: DBBoardItemUI;
  selected: boolean;
  onClick: () => void;
}) {
  const img = shotURI({ id: item.id, kind: item.kind, tone: item.tone, w: 200, h: 200 });
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 6,
        borderRadius: 6,
        background: selected ? "rgba(212,255,58,0.08)" : "transparent",
        border: selected ? "1px solid rgba(212,255,58,0.25)" : "1px solid transparent",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          background: `url("${img}") center/cover`,
          border: "1px solid var(--iron)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: selected ? "var(--lime)" : "var(--bone)",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.filename}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "var(--slate-2)",
            fontFamily: "var(--f-mono)",
            letterSpacing: 0.5,
          }}
        >
          {item.tag}
        </div>
      </div>
    </div>
  );
}

function PromptCard({
  item,
  allItems,
  mode,
  onClose,
  onChangeMode,
}: {
  item: DBBoardItemUI;
  allItems: DBBoardItemUI[];
  mode: Mode;
  onClose: () => void;
  onChangeMode: (m: Mode) => void;
}) {
  const fb = fallbackPrompt(item.filename);
  const p = {
    image: item.imagePrompt || fb?.image || "",
    video: item.videoPrompt || fb?.video || "",
    videoModel: item.videoModel || fb?.videoModel || "Seedance 2",
  };
  const [tab, setTab] = useState<Mode>(mode);
  useEffect(() => setTab(mode), [mode]);

  const refItems = allItems.filter((i) => i.isRef).slice(0, 3);

  return (
    <div
      style={{
        position: "absolute",
        right: 20,
        top: 70,
        bottom: 20,
        width: 380,
        background: "rgba(20,20,22,0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--iron-2)",
        borderRadius: 12,
        boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        animation: "float-fade 240ms var(--e-out)",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--iron)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1.5,
              color: "var(--lime)",
            }}
          >
            PROMPT CARD
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginTop: 2 }}>{item.filename}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={iconBtnStyle()}>
          <I.X size={14} />
        </button>
      </div>

      <div style={{ padding: 14 }}>
        <div
          style={{
            height: 180,
            borderRadius: 8,
            background: `url("${shotURI({ id: item.id, kind: item.kind, tone: item.tone, w: 600, h: 400 })}") center/cover`,
            border: "1px solid var(--iron)",
            position: "relative",
          }}
        >
          {tab === "video" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55))",
                borderRadius: 8,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 7px",
              background: "rgba(10,10,12,0.75)",
              borderRadius: 4,
              fontSize: 9,
              fontFamily: "var(--f-mono)",
              color: "var(--bone)",
            }}
          >
            {tab === "video" ? `VIDEO \· ${p.videoModel}` : `IMAGE \· ${item.model ?? "NanoBanana"}`}
          </div>
          {tab === "video" && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                right: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--lime)",
                  color: "var(--lime-ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.Play size={10} />
              </div>
              <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                <div style={{ width: "35%", height: "100%", background: "var(--lime)", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", color: "var(--bone)" }}>
                0:00.7 / 0:02.0
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 14px 10px", display: "flex", gap: 4 }}>
        <Segmented<Mode>
          value={tab}
          onChange={(v) => {
            setTab(v);
            onChangeMode(v);
          }}
          options={[
            { value: "image", label: "Image prompt", icon: <I.Image size={12} /> },
            { value: "video", label: "Video prompt", icon: <I.Film size={12} /> },
          ]}
        />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        {tab === "image" ? (
          <>
            <Field label="Prompt">
              <Textarea rows={6} value={p.image} />
            </Field>
            <Field label="Negatives">
              <Input value="— plastic, studio lighting, hand model" />
            </Field>
            <Field label="Reference images" hint="Pinned to control composition.">
              <div style={{ display: "flex", gap: 6 }}>
                {refItems.map((r, idx) => (
                  <div
                    key={r.id}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      background: `url("${shotURI({ id: r.id, kind: r.kind, tone: r.tone, w: 200, h: 200 })}") center/cover`,
                      border: idx === 0 ? "2px solid var(--lime)" : "1px solid var(--iron)",
                    }}
                  />
                ))}
                <button
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px dashed var(--iron-2)",
                    color: "var(--slate-2)",
                    cursor: "pointer",
                  }}
                >
                  <I.Plus size={14} />
                </button>
              </div>
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
                  <span>{item.model ?? "NanoBanana Pro"}</span>
                  <I.ChevDown size={12} />
                </div>
              </Field>
              <Field label="Aspect">
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
                  <span>9:16 \· Vertical</span>
                  <I.ChevDown size={12} />
                </div>
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Motion prompt">
              <Textarea rows={5} value={p.video} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Duration">
                <div
                  style={{
                    height: 34,
                    padding: "0 10px",
                    background: "var(--ash)",
                    border: "1px solid var(--iron)",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--bone)",
                    fontFamily: "var(--f-mono)",
                  }}
                >
                  2.0s
                </div>
              </Field>
              <Field label="Video model">
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
                  <span>{p.videoModel}</span>
                  <I.ChevDown size={12} />
                </div>
              </Field>
            </div>
            <Field label="Start frame" hint="Use the current image as the first frame.">
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
                <div style={{ fontSize: 12, color: "var(--bone)" }}>
                  Pin <b>{item.filename}</b> as t=0
                </div>
              </div>
            </Field>
            <Field label="Camera move">
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["Static", "Dolly in", "Orbit", "Push", "Tilt up", "Whip pan"].map((m, i) => (
                  <Chip key={m} color={i === 1 ? "lime" : "default"}>
                    {m}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--iron)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>
          <span style={{ color: "var(--lime)" }}>~4s</span> \· $0.08
        </div>
        <div style={{ flex: 1 }} />
        <Btn size="sm" variant="ghost" icon={<I.Refresh size={12} />}>Variations</Btn>
        <Btn size="sm" variant="primary" icon={<I.Sparkles size={12} />}>Regenerate</Btn>
      </div>
    </div>
  );
}
