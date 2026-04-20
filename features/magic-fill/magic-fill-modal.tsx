"use client";
import { internalFetch } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Wand2, Loader2, ImageOff, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/store";
import { useCanvas } from "@/features/canvas/store";
import { getDataAdapter } from "@/lib/data-adapter";
import { formatUsd, getImageModel } from "@/lib/ai/pricing";

interface Props {
  open: boolean;
  onClose: () => void;
}

type AspectPreset = "9:16" | "1:1" | "16:9" | "4:5" | "3:4" | "custom";

const PRESETS: { id: AspectPreset; label: string; w: number; h: number }[] = [
  { id: "9:16", label: "9:16 · Vertical", w: 720, h: 1280 },
  { id: "1:1", label: "1:1 · Square", w: 1080, h: 1080 },
  { id: "4:5", label: "4:5 · Portrait", w: 1080, h: 1350 },
  { id: "3:4", label: "3:4 · Classic", w: 1080, h: 1440 },
  { id: "16:9", label: "16:9 · Wide", w: 1920, h: 1080 },
];

const HANDLES = [
  "tl", "tc", "tr",
  "ml",        "mr",
  "bl", "bc", "br",
] as const;
type Handle = (typeof HANDLES)[number];

export default function MagicFillModal({ open, onClose }: Props) {
  const t = useI18n((s) => s.t);
  const selectedId = useCanvas((s) => s.selectedNodeIds[0]);
  const nodes = useCanvas((s) => s.nodes);

  const source = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [selectedId, nodes]
  );

  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<AspectPreset>("1:1");
  const [applying, setApplying] = useState(false);
  const [cost, setCost] = useState<number | null>(null);

  // imgRect: where the original image is displayed (fixed)
  // frame: the expand border (starts at imgRect, user drags outward)
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 560, h: 420 });

  useEffect(() => {
    if (!open || !source?.image_url) return;
    const cw = containerSize.w;
    const ch = containerSize.h;
    // Image shown at ~60% of container, centered
    const iw = Math.max(80, Math.min(cw * 0.60, 260));
    const ih = Math.max(80, Math.min(ch * 0.68, 360));
    const rect = { x: (cw - iw) / 2, y: (ch - ih) / 2, w: iw, h: ih };
    setImgRect(rect);
    setFrame(rect); // frame starts exactly around the image
    setCost(null);
    setPrompt("");
  }, [open, source?.image_url, containerSize.w, containerSize.h]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Apply preset by snapping frame ratio to the preset
  useEffect(() => {
    if (preset === "custom") return;
    const p = PRESETS.find((x) => x.id === preset);
    if (!p) return;
    const ratio = p.w / p.h;
    setFrame((f) => {
      // Keep the center, resize to match ratio while staying inside container
      const maxW = Math.min(f.w, containerSize.w - 40);
      const maxH = Math.min(f.h, containerSize.h - 40);
      let w = Math.max(maxW, 120);
      let h = w / ratio;
      if (h > containerSize.h - 40) {
        h = containerSize.h - 40;
        w = h * ratio;
      }
      const cx = f.x + f.w / 2;
      const cy = f.y + f.h / 2;
      return {
        x: Math.max(0, cx - w / 2),
        y: Math.max(0, cy - h / 2),
        w,
        h,
      };
    });
  }, [preset, containerSize.w, containerSize.h]);

  // Drag handle logic
  const dragState = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    startFrame: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const onHandlePointerDown =
    (handle: Handle) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragState.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startFrame: { ...frame },
      };
      setPreset("custom");
    };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    setFrame((prev) => resizeFrame(st.startFrame, st.handle, dx, dy));
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // Derived: output dimensions at nearest preset
  const output = useMemo(() => {
    const ratio = frame.w / frame.h;
    const best = PRESETS.reduce((b, p) => {
      const pr = p.w / p.h;
      const diff = Math.abs(pr - ratio);
      return diff < b.diff ? { id: p.id, diff } : b;
    }, { id: "1:1" as AspectPreset, diff: Infinity });
    const matched = PRESETS.find((p) => p.id === best.id) ?? PRESETS[1];
    return {
      aspect: matched.id,
      w: matched.w,
      h: matched.h,
      label: matched.label,
    };
  }, [frame]);

  const canApply = !!source?.image_url && !applying;

  const model = getImageModel("nanobanana-pro");

  const apply = async () => {
    if (!source || !canApply) return;
    setApplying(true);
    try {
      const extendedPrompt =
        prompt.trim() ||
        "Extend this image seamlessly to fill the new canvas. Continue the existing scene naturally in all exposed areas.";
      const fullPrompt = `MAGIC EXPAND:
Original image attached as reference — preserve it exactly where it appears.
New canvas aspect: ${output.aspect} (${output.w}×${output.h}).
Extension directive: ${extendedPrompt}

Preserve:
- Subject identity, composition, palette, lighting of the original
- Cinematic commercial polish

Avoid:
- Text overlays, watermarks, UI
- Plastic or uncanny artifacts
- Blatantly AI-looking seams`;

      // Convert source image to base64 for reference
      let refImages: Array<{ base64: string; mimeType: string }> = [];
      if (source.image_url) {
        try {
          const imgUrl = source.image_url;
          if (imgUrl.startsWith("data:")) {
            const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) refImages = [{ mimeType: match[1], base64: match[2] }];
          } else {
            const imgRes = await fetch(imgUrl);
            const blob = await imgRes.blob();
            const b64 = await new Promise<string>((res) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                res(m ? m[2] : "");
              };
              reader.readAsDataURL(blob);
            });
            if (b64) refImages = [{ mimeType: blob.type || "image/jpeg", base64: b64 }];
          }
        } catch {
          // proceed without ref
        }
      }

      const res = await internalFetch("/api/nanobanana", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          modelId: "nanobanana-pro",
          aspectRatio: output.aspect,
          refImages,
          action: "image.expand",
          nodeId: source.id,
        }),
      });

      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({
          error: "API call failed",
        }))) as { error?: string };
        throw new Error(error ?? "API call failed");
      }
      const data = (await res.json()) as {
        imageBase64: string;
        mimeType: string;
        usage: { costUsd: number };
      };

      setCost(data.usage.costUsd);
      const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;

      // Create a NEW node next to the source instead of overwriting it
      const store = useCanvas.getState();
      const boardId = store.boardId;
      if (boardId) {
        const adapter = await getDataAdapter();
        const newNodeInput = {
          board_id: boardId,
          group_id: source.group_id,
          type: "shot" as const,
          x: source.x + (source.w ?? 240) + 24,
          y: source.y,
          w: source.w ?? 240,
          h: source.h ?? 300,
          order_index: store.nodes.length,
          image_url: dataUrl,
          thumbnail_url: null,
          prompt: (source.prompt ?? "") + "\n\n+ Magic Expand: " + extendedPrompt,
          prompt_enhanced: fullPrompt,
          title: (source.title ?? "Shot") + " (expanded)",
          status: "ready" as const,
          quality_score: 85,
          metadata: { cost_usd: data.usage.costUsd } as import("@/lib/supabase/types").Json,
        };
        try {
          const saved = await adapter.createNode(newNodeInput);
          store.upsertNode(saved);
        } catch {
          store.upsertNode({
            ...newNodeInput,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as import("@/lib/supabase/types").NodeRow);
        }
      }
      setTimeout(() => onClose(), 600);
    } catch (err) {
      console.error("Magic expand failed", err);
      const msg = err instanceof Error ? err.message : "Failed";
      alert(msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[min(96vw,520px)] max-h-[90vh] glass-panel shadow-panel rounded-2xl overflow-hidden border border-border-subtle flex flex-col"
          >
            <header className="h-14 px-5 flex items-center gap-3 border-b border-border-subtle flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
                <Maximize2 className="w-4 h-4 text-accent-warm" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-text-primary">
                  Magic Expand
                </h2>
                <p className="text-2xs text-text-muted truncate">
                  Drag the handles to extend the canvas. NanoBanana fills the new areas.
                </p>
              </div>
              <span className="text-2xs font-mono text-text-muted">
                ~{formatUsd(model.perImage ?? 0)}/gen
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 flex" style={{ minHeight: 260 }}>
              {/* Canvas area */}
              <div
                ref={containerRef}
                className="flex-1 relative bg-canvas overflow-hidden border-r border-border-subtle"
                style={{
                  minHeight: 260,
                  backgroundImage:
                    "repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              >
                {source?.image_url ? (
                  <>
                    {/* Expanding frame outline — marching-ants stroke */}
                    <svg
                      className="absolute pointer-events-none"
                      style={{
                        left: frame.x - 2,
                        top: frame.y - 2,
                        width: frame.w + 4,
                        height: frame.h + 4,
                        filter: "drop-shadow(0 0 40px rgba(255,184,107,0.25))",
                      }}
                    >
                      <rect
                        x={2}
                        y={2}
                        width={frame.w}
                        height={frame.h}
                        fill="none"
                        stroke="#FFB86B"
                        strokeWidth={2}
                        strokeDasharray="8 6"
                        className="ants-outline"
                      />
                    </svg>

                    {/* Original image — fixed position, frame expands around it */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={source.image_url}
                      alt=""
                      className="absolute pointer-events-none select-none"
                      style={{
                        left: imgRect.x,
                        top: imgRect.y,
                        width: imgRect.w,
                        height: imgRect.h,
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                      draggable={false}
                    />

                    {/* Handles */}
                    {HANDLES.map((h) => {
                      const pos = handlePos(h, frame);
                      return (
                        <div
                          key={h}
                          onPointerDown={onHandlePointerDown(h)}
                          className={cn(
                            "absolute w-4 h-4 rounded-full bg-white border-2 border-accent-warm shadow-lg",
                            cursorFor(h)
                          )}
                          style={{
                            left: pos.x - 8,
                            top: pos.y - 8,
                            touchAction: "none",
                          }}
                        />
                      );
                    })}

                    {/* Dimensions badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-2xs font-mono text-text-primary flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3 text-accent-warm" />
                      {Math.round(frame.w)} × {Math.round(frame.h)}
                      <span className="text-text-muted">→</span>
                      <span className="text-accent-warm">
                        {output.w}×{output.h}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <ImageOff className="w-8 h-8 text-text-muted" />
                    <div className="text-sm font-medium text-text-primary">
                      Select a shot first
                    </div>
                    <div className="text-xs text-text-muted max-w-xs">
                      Click a shot on the canvas, then open Magic Expand.
                    </div>
                  </div>
                )}
              </div>

              {/* Right controls */}
              <div className="w-[200px] flex-shrink-0 flex flex-col">
                <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5">
                  {/* Resolution presets */}
                  <div>
                    <label className="text-xs font-medium text-text-primary mb-2 block">
                      Output aspect
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPreset(p.id)}
                          className={cn(
                            "h-9 px-3 rounded-lg text-xs text-left transition-all flex items-center justify-between",
                            preset === p.id
                              ? "bg-accent-warm/10 border border-accent-warm/40 text-accent-warm"
                              : "bg-panel-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-hover"
                          )}
                        >
                          <span className="font-medium">{p.label}</span>
                          <span className="font-mono text-2xs opacity-60">
                            {p.w}×{p.h}
                          </span>
                        </button>
                      ))}
                      {preset === "custom" && (
                        <div className="h-9 px-3 rounded-lg bg-accent-cool/10 border border-accent-cool/30 text-accent-cool text-xs flex items-center">
                          Custom — dragged freely
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div>
                    <label className="text-xs font-medium text-text-primary mb-1.5 block">
                      What should fill the new area? (optional)
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      placeholder="e.g. extend the concrete wall, add steam rising from the cup, continue the shadow to the left..."
                      className="w-full bg-canvas border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/40 focus:border-accent-warm/30 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Cost preview */}
                  <div className="rounded-lg bg-canvas border border-border-subtle p-3">
                    <div className="text-2xs text-text-muted font-mono uppercase tracking-wider mb-2">
                      Estimated cost
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-accent-warm">
                        {formatUsd(model.perImage ?? 0)}
                      </span>
                      <span className="text-2xs text-text-muted">per generation</span>
                    </div>
                    {cost != null && (
                      <div className="text-2xs text-status-success mt-1">
                        Last run: {formatUsd(cost)}
                      </div>
                    )}
                  </div>
                </div>

                <footer className="px-5 py-4 border-t border-border-subtle flex items-center gap-2 justify-end flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="h-9 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={apply}
                    disabled={!canApply}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ease-spring",
                      canApply
                        ? "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_20px_rgba(255,184,107,0.25)]"
                        : "bg-white/5 text-text-muted cursor-not-allowed"
                    )}
                  >
                    {applying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    {applying ? "Expanding..." : "Apply Expand"}
                  </button>
                </footer>
              </div>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}

function handlePos(
  h: Handle,
  f: { x: number; y: number; w: number; h: number }
): { x: number; y: number } {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  switch (h) {
    case "tl": return { x: f.x, y: f.y };
    case "tc": return { x: cx, y: f.y };
    case "tr": return { x: f.x + f.w, y: f.y };
    case "ml": return { x: f.x, y: cy };
    case "mr": return { x: f.x + f.w, y: cy };
    case "bl": return { x: f.x, y: f.y + f.h };
    case "bc": return { x: cx, y: f.y + f.h };
    case "br": return { x: f.x + f.w, y: f.y + f.h };
  }
}

function cursorFor(h: Handle): string {
  switch (h) {
    case "tl":
    case "br":
      return "cursor-nwse-resize";
    case "tr":
    case "bl":
      return "cursor-nesw-resize";
    case "tc":
    case "bc":
      return "cursor-ns-resize";
    case "ml":
    case "mr":
      return "cursor-ew-resize";
  }
}

function resizeFrame(
  start: { x: number; y: number; w: number; h: number },
  handle: Handle,
  dx: number,
  dy: number
) {
  const MIN = 80;
  let { x, y, w, h } = start;
  if (handle.includes("l")) {
    x = start.x + dx;
    w = start.w - dx;
  }
  if (handle.includes("r")) {
    w = start.w + dx;
  }
  if (handle.startsWith("t")) {
    y = start.y + dy;
    h = start.h - dy;
  }
  if (handle.startsWith("b")) {
    h = start.h + dy;
  }
  if (w < MIN) {
    if (handle.includes("l")) x = start.x + (start.w - MIN);
    w = MIN;
  }
  if (h < MIN) {
    if (handle.startsWith("t")) y = start.y + (start.h - MIN);
    h = MIN;
  }
  return { x, y, w, h };
}
