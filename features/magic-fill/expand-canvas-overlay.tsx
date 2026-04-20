"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wand2, ImageOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { internalFetch } from "@/lib/api";
import { useCanvas } from "@/features/canvas/store";
import { getDataAdapter } from "@/lib/data-adapter";
import { formatUsd, getImageModel } from "@/lib/ai/pricing";
import type { NodeRow } from "@/lib/supabase/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type AspectPreset = "9:16" | "1:1" | "16:9" | "4:5" | "3:4" | "custom";

const PRESETS: { id: AspectPreset; label: string; w: number; h: number }[] = [
  { id: "9:16",  label: "9:16",  w: 720,  h: 1280 },
  { id: "1:1",   label: "1:1",   w: 1080, h: 1080 },
  { id: "4:5",   label: "4:5",   w: 1080, h: 1350 },
  { id: "3:4",   label: "3:4",   w: 1080, h: 1440 },
  { id: "16:9",  label: "16:9",  w: 1920, h: 1080 },
];

const HANDLE_KEYS = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"] as const;
type ExpandHandle = (typeof HANDLE_KEYS)[number];

function getHandleStyle(h: ExpandHandle): React.CSSProperties {
  const isHPill = h === "tc" || h === "bc";
  const isVPill = h === "ml" || h === "mr";
  return { width: isHPill ? 32 : isVPill ? 10 : 12, height: isHPill ? 10 : isVPill ? 32 : 12, borderRadius: 999 };
}

function getHandleOffset(h: ExpandHandle): { dx: number; dy: number } {
  const isHPill = h === "tc" || h === "bc";
  const isVPill = h === "ml" || h === "mr";
  return { dx: isHPill ? -16 : isVPill ? -5 : -6, dy: isHPill ? -5 : isVPill ? -16 : -6 };
}

function handlePos(h: ExpandHandle, f: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
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

function cursorFor(h: ExpandHandle): string {
  switch (h) {
    case "tl": case "br": return "cursor-nwse-resize";
    case "tr": case "bl": return "cursor-nesw-resize";
    case "tc": case "bc": return "cursor-ns-resize";
    case "ml": case "mr": return "cursor-ew-resize";
  }
}

function resizeFrame(start: { x: number; y: number; w: number; h: number }, handle: ExpandHandle, dx: number, dy: number) {
  const MIN = 80;
  let { x, y, w, h } = start;
  if (handle.includes("l")) { x = start.x + dx; w = start.w - dx; }
  if (handle.includes("r")) { w = start.w + dx; }
  if (handle.startsWith("t")) { y = start.y + dy; h = start.h - dy; }
  if (handle.startsWith("b")) { h = start.h + dy; }
  if (w < MIN) { if (handle.includes("l")) x = start.x + (start.w - MIN); w = MIN; }
  if (h < MIN) { if (handle.startsWith("t")) y = start.y + (start.h - MIN); h = MIN; }
  return { x, y, w, h };
}

export default function ExpandCanvasOverlay({ open, onClose }: Props) {
  const selectedId = useCanvas((s) => s.selectedNodeIds[0]);
  const nodes = useCanvas((s) => s.nodes);
  const source = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [selectedId, nodes]);

  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<AspectPreset>("1:1");
  const [promptOpen, setPromptOpen] = useState(false);

  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!open || !source?.image_url) return;
    const cw = containerSize.w;
    const ch = containerSize.h;
    const iw = Math.min(cw * 0.42, 340);
    const ih = Math.min(ch * 0.62, 460);
    const rect = { x: (cw - iw) / 2, y: (ch - ih) / 2, w: iw, h: ih };
    setImgRect(rect);
    setFrame(rect);
    setPrompt("");
  }, [open, source?.image_url, containerSize.w, containerSize.h]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setContainerSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (preset === "custom") return;
    const p = PRESETS.find((x) => x.id === preset);
    if (!p) return;
    const ratio = p.w / p.h;
    setFrame(() => {
      const maxW = Math.min(containerSize.w * 0.75, 520);
      const maxH = Math.min(containerSize.h * 0.72, 500);
      let w = Math.min(maxW, 300);
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      const cx = containerSize.w / 2;
      const cy = containerSize.h / 2;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    });
  }, [preset, containerSize.w, containerSize.h]);

  const dragState = useRef<{ handle: ExpandHandle; startX: number; startY: number; startFrame: typeof frame } | null>(null);

  const onHandlePointerDown = (handle: ExpandHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { handle, startX: e.clientX, startY: e.clientY, startFrame: { ...frame } };
    setPreset("custom");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    setFrame(resizeFrame(st.startFrame, st.handle, e.clientX - st.startX, e.clientY - st.startY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* */ }
  };

  const output = useMemo(() => {
    const ratio = frame.w / frame.h;
    const best = PRESETS.reduce((b, p) => {
      const diff = Math.abs(p.w / p.h - ratio);
      return diff < b.diff ? { id: p.id, diff } : b;
    }, { id: "1:1" as AspectPreset, diff: Infinity });
    return PRESETS.find((p) => p.id === best.id) ?? PRESETS[1];
  }, [frame]);

  const canApply = !!source?.image_url;
  const model = getImageModel("nanobanana-pro");

  const apply = () => {
    if (!source || !canApply) return;

    const extendedPrompt = prompt.trim() || "Extend this image seamlessly to fill the new canvas. Continue the existing scene naturally in all exposed areas.";
    const fullPrompt = `MAGIC EXPAND:\nOriginal image attached — preserve exactly where it appears.\nNew canvas: ${output.id} (${output.w}×${output.h}).\nExtension: ${extendedPrompt}\nPreserve subject identity, composition, palette, lighting. No text, watermarks, or AI seams.`;

    // Create placeholder node in "generating" state immediately
    const store = useCanvas.getState();
    const newNodeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const placeholder: NodeRow = {
      id: newNodeId,
      board_id: store.boardId ?? source.board_id,
      group_id: source.group_id ?? null,
      type: "shot",
      x: source.x + (source.w ?? 240) + 24,
      y: source.y,
      w: source.w ?? 240,
      h: source.h ?? 300,
      order_index: store.nodes.length,
      image_url: null,
      thumbnail_url: null,
      prompt: extendedPrompt,
      prompt_enhanced: fullPrompt,
      title: (source.title ?? "Shot") + " (expanded)",
      status: "generating",
      quality_score: null,
      metadata: {} as import("@/lib/supabase/types").Json,
      created_at: now,
      updated_at: now,
    };
    store.upsertNode(placeholder);

    // Close immediately — user returns to canvas and sees loading node
    onClose();

    // Run API in background (fire-and-forget)
    (async () => {
      try {
        let refImages: Array<{ base64: string; mimeType: string }> = [];
        if (source.image_url) {
          if (source.image_url.startsWith("data:")) {
            const m = source.image_url.match(/^data:([^;]+);base64,(.+)$/);
            if (m) refImages = [{ mimeType: m[1], base64: m[2] }];
          } else {
            const blob = await fetch(source.image_url).then((r) => r.blob());
            const b64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const m = (reader.result as string).match(/^data:([^;]+);base64,(.+)$/);
                resolve(m ? m[2] : "");
              };
              reader.readAsDataURL(blob);
            });
            if (b64) refImages = [{ mimeType: blob.type || "image/jpeg", base64: b64 }];
          }
        }

        const res = await internalFetch("/api/nanobanana", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            modelId: "nanobanana-pro",
            aspectRatio: output.id,
            refImages,
            action: "image.expand",
            nodeId: source.id,
          }),
        });
        if (!res.ok) throw new Error("API call failed");

        const data = (await res.json()) as { imageBase64: string; mimeType: string; usage: { costUsd: number } };
        const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;

        const adapter = await getDataAdapter();
        const nodeInput = {
          id: newNodeId,
          board_id: placeholder.board_id,
          group_id: placeholder.group_id,
          type: placeholder.type,
          x: placeholder.x,
          y: placeholder.y,
          w: placeholder.w,
          h: placeholder.h,
          order_index: placeholder.order_index,
          image_url: dataUrl,
          thumbnail_url: null,
          prompt: placeholder.prompt,
          prompt_enhanced: placeholder.prompt_enhanced,
          title: placeholder.title,
          status: "ready" as const,
          quality_score: 85,
          metadata: { cost_usd: data.usage.costUsd } as import("@/lib/supabase/types").Json,
        };
        try {
          const saved = await adapter.createNode(nodeInput);
          useCanvas.getState().upsertNode(saved);
        } catch {
          useCanvas.getState().upsertNode({ ...placeholder, image_url: dataUrl, status: "ready", quality_score: 85, metadata: { cost_usd: data.usage.costUsd } as import("@/lib/supabase/types").Json, updated_at: new Date().toISOString() });
        }
      } catch (err) {
        console.error("Magic expand failed", err);
        useCanvas.getState().upsertNode({ ...placeholder, status: "ready", image_url: source.image_url });
      }
    })();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex flex-col bg-canvas"
          style={{
            backgroundImage: "repeating-conic-gradient(rgba(255,255,255,0.025) 0% 25%, transparent 0% 50%)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* Canvas area */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[11px] text-text-secondary pointer-events-none">
              <span className="text-text-primary font-medium">Magic Expand</span>
              <span className="text-text-muted font-mono">~{formatUsd(model.perImage ?? 0)}</span>
            </div>

            {/* ── Aspect preset panel — left side of canvas ── */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              <div className="text-[9px] font-mono text-text-muted text-center tracking-wider mb-0.5">SIZE</div>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "h-7 px-2.5 rounded-lg text-[11px] font-mono transition-all border",
                    preset === p.id
                      ? "bg-accent-warm/15 border-accent-warm/50 text-accent-warm"
                      : "bg-white/5 border-white/10 text-text-muted hover:text-text-secondary hover:border-white/20"
                  )}
                >
                  {p.id}
                </button>
              ))}
              {preset === "custom" && (
                <span className="h-7 px-2.5 rounded-lg text-[11px] font-mono bg-accent-cool/10 border border-accent-cool/30 text-accent-cool flex items-center justify-center">
                  custom
                </span>
              )}
            </div>

            {source?.image_url ? (
              <>
                {/* Gradient glow frame */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: frame.x,
                    top: frame.y,
                    width: frame.w,
                    height: frame.h,
                    borderRadius: 10,
                    boxShadow: "0 0 0 2px #c44eff, 0 0 0 3px #627aff, 0 0 0 4px #4ec4ff, 0 0 32px 4px rgba(196,78,255,0.45), 0 0 64px 8px rgba(98,122,255,0.3)",
                  }}
                />

                {/* Original image */}
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
                    borderRadius: 8,
                    zIndex: 1,
                  }}
                  draggable={false}
                />

                {/* Handles */}
                {HANDLE_KEYS.map((h) => {
                  const pos = handlePos(h, frame);
                  const offset = getHandleOffset(h);
                  const style = getHandleStyle(h);
                  return (
                    <div
                      key={h}
                      onPointerDown={onHandlePointerDown(h)}
                      className={cn("absolute bg-white shadow-[0_1px_6px_rgba(0,0,0,0.6)]", cursorFor(h))}
                      style={{ ...style, left: pos.x + offset.dx, top: pos.y + offset.dy, zIndex: 10, touchAction: "none" }}
                    />
                  );
                })}

                {/* Dimension badge */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-mono text-text-primary flex items-center gap-2 pointer-events-none z-10">
                  <span className="text-text-muted">{Math.round(frame.w)}×{Math.round(frame.h)}</span>
                  <span className="text-white/30">→</span>
                  <span className="text-accent-warm">{output.w}×{output.h}</span>
                  <span className="text-text-muted">({output.id})</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <ImageOff className="w-8 h-8 text-text-muted" />
                <div className="text-sm font-medium text-text-primary">Select a shot first</div>
                <div className="text-xs text-text-muted">Click a shot on the canvas, then open Magic Expand.</div>
              </div>
            )}
          </div>

          {/* Prompt panel */}
          <AnimatePresence>
            {promptOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div className="px-4 pb-2 pt-2.5 bg-panel-2/90 backdrop-blur-xl border-t border-border-subtle">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="Describe what should fill the expanded area… (optional)"
                    className="w-full bg-canvas border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-warm/40 resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom bar — simplified */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-panel-2/90 backdrop-blur-xl border-t border-border-subtle">
            <button
              onClick={() => setPromptOpen((o) => !o)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] flex items-center gap-1.5 transition-all border",
                promptOpen
                  ? "bg-accent-cool/10 border-accent-cool/30 text-accent-cool"
                  : "bg-white/5 border-border-subtle text-text-muted hover:text-text-secondary"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Prompt
            </button>

            <div className="flex-1" />

            <button
              onClick={apply}
              disabled={!canApply}
              className={cn(
                "h-8 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                canApply
                  ? "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_16px_rgba(255,184,107,0.3)]"
                  : "bg-white/5 text-text-muted cursor-not-allowed"
              )}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Apply Expand
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
