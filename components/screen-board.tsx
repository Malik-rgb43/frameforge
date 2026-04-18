"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  createBoardItemFromUpload,
  createConnection,
  listBoardItems,
  listConnections,
  updateBoardItem,
  type DBBoardItemUI,
} from "@/lib/queries-board";
import { beginDrag, findBoardItemIdFromEl } from "@/lib/drag-utils";
import UploadZone from "./upload-zone";
import { generateShots } from "@/lib/ai-queries";

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
  // Drag preview state — which item is being dragged + its temp x/y
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number; shift: boolean } | null>(null);
  // Live endpoint for the ghost connection line when Shift-dragging.
  // Stored in canvas-local coords (relative to the canvas body container).
  const [linkPreview, setLinkPreview] = useState<{
    fromId: string;
    x: number;
    y: number;
    overItemId: string | null;
  } | null>(null);
  // Whether the user is hovering an item (drives the "Shift-drag to link" chip)
  const [hoveringItem, setHoveringItem] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) {
        // No real project open — show empty board, user creates/opens one.
        if (!active) return;
        setItems([]);
        setLinks([]);
        setPromptCard(null);
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

  // Re-query the DB after a drag so positions match server truth and
  // we don't drift over time (optimistic updates layered on top).
  const refetchItems = useCallback(async () => {
    if (!projectId) return;
    try {
      const [rows, conns] = await Promise.all([
        listBoardItems(supabase, projectId),
        listConnections(supabase, projectId),
      ]);
      setItems(rows);
      setLinks(conns);
    } catch (err) {
      console.error("refetch board", err);
    }
  }, [supabase, projectId]);

  const handleItemPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: DBBoardItemUI) => {
      // Only left-button / primary pointer.
      if (e.button !== 0) return;
      // Ignore pointerdowns on buttons inside the card (prompt toggle, etc.)
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      e.preventDefault();
      e.stopPropagation();

      const shiftAtStart = e.shiftKey;
      const canvas = canvasRef.current;
      const canvasRect = canvas?.getBoundingClientRect();

      beginDrag(
        e,
        {
          pointerX: e.clientX,
          pointerY: e.clientY,
          originX: item.x,
          originY: item.y,
          shiftAtStart,
        },
        {
          onMove: (info) => {
            const shift = info.shift || shiftAtStart;
            if (shift) {
              // Connection-draw mode — don't move the card, just track
              // the ghost line endpoint.
              if (canvasRect) {
                setLinkPreview({
                  fromId: item.id,
                  x: info.currentX - canvasRect.left,
                  y: info.currentY - canvasRect.top,
                  overItemId: findBoardItemIdFromEl(
                    document.elementFromPoint(info.currentX, info.currentY) as HTMLElement | null
                  ),
                });
              }
            } else {
              setDragging({
                id: item.id,
                x: info.originX + info.dx,
                y: info.originY + info.dy,
                shift: false,
              });
            }
          },
          onEnd: async (info) => {
            setLinkPreview(null);
            setDragging(null);

            // Didn't cross threshold — treat as click.
            if (info.cancelled) return;

            const shift = info.shift || shiftAtStart;

            if (shift) {
              // Connection-draw drop: if released over a different item, create a connection.
              const targetId = findBoardItemIdFromEl(info.targetEl);
              if (!targetId || targetId === item.id) return;
              if (!projectId) return;
              const kind: RefLink["kind"] = item.generated ? "variant" : "reference";
              // Optimistic
              setLinks((prev) => [...prev, { from: item.id, to: targetId, kind }]);
              try {
                await createConnection(supabase, projectId, item.id, targetId, kind);
              } catch (err) {
                console.error("createConnection", err);
                // Rollback on failure.
                setLinks((prev) =>
                  prev.filter((l) => !(l.from === item.id && l.to === targetId && l.kind === kind))
                );
              }
              return;
            }

            // Position drop: commit new x/y.
            const newX = Math.round(info.originX + info.dx);
            const newY = Math.round(info.originY + info.dy);
            // Optimistic local update so the card doesn't snap back.
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, x: newX, y: newY } : i)));
            if (!projectId) return;
            try {
              await updateBoardItem(supabase, item.id, { canvas_x: newX, canvas_y: newY });
              await refetchItems();
            } catch (err) {
              console.error("updateBoardItem", err);
            }
          },
        }
      );
    },
    [supabase, projectId, refetchItems]
  );

  // Position in canvas-local coords of the link-preview source item center.
  const linkPreviewSource = linkPreview
    ? (() => {
        const src = items.find((i) => i.id === linkPreview.fromId);
        if (!src) return null;
        return { x: src.x + src.w / 2, y: src.y + src.h / 2 };
      })()
    : null;

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
            REFERENCES · {items.filter((i) => i.isRef).length}
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
            GENERATED · {items.filter((i) => i.generated).length}
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
        <div style={{ padding: 10, borderTop: "1px solid var(--iron)", display: "flex", flexDirection: "column", gap: 6 }}>
          <Btn
            size="sm"
            icon={<I.Upload size={12} />}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setUploadOpen(true)}
            disabled={!projectId}
          >
            Upload images
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon={<I.Sparkles size={12} />}
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!projectId || generating || items.filter((i) => i.isRef).length === 0}
            onClick={async () => {
              if (!projectId) return;
              setGenerating(true);
              setAiError(null);
              try {
                const ref = items.find((i) => i.id === selectedId && i.isRef) ?? items.find((i) => i.isRef);
                await generateShots(projectId, {
                  referenceItemId: ref?.id,
                  count: 3,
                  conceptTitle: "Weightless Ritual",
                  conceptHook: "Cinematic product shot",
                  productDescription: ref?.filename ?? "product",
                });
                await refetchItems();
              } catch (err) {
                setAiError(err instanceof Error ? err.message : "Generation failed");
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? "Generating…" : "Generate variants"}
          </Btn>
          {aiError && (
            <div style={{ padding: "6px 8px", background: "rgba(255,90,95,0.08)", border: "1px solid rgba(255,90,95,0.3)", borderRadius: 4, fontSize: 10, color: "var(--coral)" }}>
              {aiError}
            </div>
          )}
        </div>
      </div>

      {uploadOpen && projectId && (
        <UploadModal
          projectId={projectId}
          onClose={() => setUploadOpen(false)}
          onUploaded={async (res) => {
            try {
              await createBoardItemFromUpload(supabase, projectId, {
                filename: res.filename,
                imageUrl: res.publicUrl,
                storagePath: res.storagePath,
              });
              await refetchItems();
            } catch (err) {
              console.error("create board item from upload", err);
            }
          }}
        />
      )}

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
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              <StatusDot status="ready" />
              Saved
            </span>
          </div>
        </div>

        {/* Canvas body */}
        <div
          ref={canvasRef}
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
            {/* Live ghost connection while Shift-dragging */}
            {linkPreview && linkPreviewSource && (
              <g>
                <path
                  d={`M${linkPreviewSource.x},${linkPreviewSource.y} L${linkPreview.x},${linkPreview.y}`}
                  stroke="#d4ff3a"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="6 4"
                  opacity="0.85"
                  markerEnd="url(#arr)"
                />
                <circle
                  cx={linkPreview.x}
                  cy={linkPreview.y}
                  r={linkPreview.overItemId && linkPreview.overItemId !== linkPreview.fromId ? 8 : 4}
                  fill="#d4ff3a"
                  opacity={linkPreview.overItemId && linkPreview.overItemId !== linkPreview.fromId ? 0.9 : 0.5}
                />
              </g>
            )}
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
            GENERATED · {mode.toUpperCase()}
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

          {items.map((it) => {
            const isDragging = dragging?.id === it.id;
            const displayItem = isDragging
              ? { ...it, x: dragging!.x, y: dragging!.y }
              : it;
            const isLinkSource = linkPreview?.fromId === it.id;
            const isLinkTarget =
              !!linkPreview &&
              linkPreview.overItemId === it.id &&
              linkPreview.fromId !== it.id;
            return (
              <BoardItemCard
                key={it.id}
                item={displayItem}
                selected={selectedId === it.id}
                promptOpen={promptCard === it.id}
                dragging={isDragging}
                linkSource={isLinkSource}
                linkTarget={isLinkTarget}
                onClick={() => setSelectedId(it.id)}
                onOpenPrompt={() => setPromptCard(it.id === promptCard ? null : it.id)}
                onShotClick={onShot}
                onPointerDown={(e) => handleItemPointerDown(e, it)}
                onHoverChange={(h) => setHoveringItem(h)}
                mode={mode}
              />
            );
          })}
        </div>

        {/* Shift-drag to link hint — only while hovering an item and not already dragging */}
        {hoveringItem && !dragging && !linkPreview && (
          <div
            style={{
              position: "absolute",
              bottom: 18,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "5px 10px",
              background: "rgba(20,20,22,0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--iron-2)",
              borderRadius: 6,
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
              color: "var(--slate-2)",
              pointerEvents: "none",
              zIndex: 15,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                padding: "1px 5px",
                borderRadius: 3,
                background: "var(--iron-2)",
                color: "var(--bone)",
                fontSize: 9,
              }}
            >
              SHIFT
            </span>
            <span>+ drag to link</span>
          </div>
        )}
        {linkPreview && (
          <div
            style={{
              position: "absolute",
              bottom: 18,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "5px 10px",
              background: "rgba(212,255,58,0.15)",
              border: "1px solid rgba(212,255,58,0.5)",
              borderRadius: 6,
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1,
              color: "var(--lime)",
              pointerEvents: "none",
              zIndex: 15,
            }}
          >
            {linkPreview.overItemId && linkPreview.overItemId !== linkPreview.fromId
              ? "DROP TO LINK"
              : "DRAG OVER AN ITEM TO LINK"}
          </div>
        )}

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
  dragging,
  linkSource,
  linkTarget,
  onClick,
  onOpenPrompt,
  onShotClick,
  onPointerDown,
  onHoverChange,
  mode,
}: {
  item: DBBoardItemUI;
  selected: boolean;
  promptOpen: boolean;
  dragging?: boolean;
  linkSource?: boolean;
  linkTarget?: boolean;
  onClick: () => void;
  onOpenPrompt: () => void;
  onShotClick: (n: number) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onHoverChange?: (hovering: boolean) => void;
  mode: Mode;
}) {
  const img = item.imageUrl
    ? item.imageUrl
    : shotURI({ id: item.id, kind: item.kind, tone: item.tone, w: 400, h: 500 });
  const isGen = !!item.generated;
  const fallback = fallbackPrompt(item.filename);
  const usedInShot = fallback?.usedInShot;
  // Visual border/shadow priority: link target > drag > selected > default
  const border = linkTarget
    ? "2px solid var(--lime)"
    : dragging || linkSource
    ? "2px solid var(--lime)"
    : selected
    ? "2px solid var(--lime)"
    : isGen
    ? "1px solid rgba(212,255,58,0.3)"
    : "1px solid var(--iron-2)";
  const boxShadow = dragging || linkSource
    ? "0 0 0 6px rgba(212,255,58,0.22), 0 20px 40px rgba(0,0,0,0.6)"
    : linkTarget
    ? "0 0 0 6px rgba(212,255,58,0.3), 0 20px 40px rgba(0,0,0,0.6)"
    : selected
    ? "0 0 0 4px rgba(212,255,58,0.12), 0 20px 40px rgba(0,0,0,0.5)"
    : "0 12px 24px rgba(0,0,0,0.4)";
  return (
    <div
      data-board-item-id={item.id}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        borderRadius: 8,
        overflow: "hidden",
        border,
        boxShadow,
        cursor: dragging ? "grabbing" : "grab",
        background: `url("${img}") center/cover`,
        transition: dragging ? "none" : "border 180ms var(--e-out), box-shadow 180ms var(--e-out)",
        zIndex: dragging ? 30 : linkSource ? 25 : 1,
        touchAction: "none",
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
            <span style={{ color: "var(--lime)" }}>●</span> GEN · {item.model?.split(" ")[0] ?? "Gen"}
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
            ▶ 2.0s · 24fps
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
            {tab === "video" ? `VIDEO · ${p.videoModel}` : `IMAGE · ${item.model ?? "NanoBanana"}`}
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
                  <span>9:16 · Vertical</span>
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
          <span style={{ color: "var(--lime)" }}>~4s</span> · $0.08
        </div>
        <div style={{ flex: 1 }} />
        <Btn size="sm" variant="ghost" icon={<I.Refresh size={12} />}>Variations</Btn>
        <Btn size="sm" variant="primary" icon={<I.Sparkles size={12} />}>Regenerate</Btn>
      </div>
    </div>
  );
}

function UploadModal({
  projectId,
  onClose,
  onUploaded,
}: {
  projectId: string;
  onClose: () => void;
  onUploaded: (res: { filename: string; publicUrl: string; storagePath: string }) => void | Promise<void>;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540,
          maxWidth: "90vw",
          background: "var(--onyx)",
          border: "1px solid var(--iron-2)",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--f-mono)", letterSpacing: 1.5, color: "var(--slate-2)" }}>
              UPLOAD
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--bone)", marginTop: 2 }}>
              Add product photos
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={iconBtnStyle()}>
            <I.X size={14} />
          </button>
        </div>
        <UploadZone projectId={projectId} onUploaded={onUploaded} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="primary" onClick={onClose}>Done</Btn>
        </div>
      </div>
    </div>
  );
}
