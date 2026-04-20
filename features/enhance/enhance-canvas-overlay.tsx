"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/store";
import { enhanceNode } from "./enhance";
import type { EnhancementPreset } from "./enhance";
import { formatUsd, getImageModel } from "@/lib/ai/pricing";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Resolution = "4K" | "2K" | "HD";

const RESOLUTION_PREFIX: Record<Resolution, string> = {
  "4K": "Output at maximum 4K detail level. Ultra-high resolution rendering. ",
  "2K": "Output at crisp 2K resolution. High-detail rendering. ",
  "HD": "Output at standard HD resolution. Clean and sharp. ",
};

const PRESETS: { id: EnhancementPreset; label: string; desc: string }[] = [
  { id: "polish", label: "Polish", desc: "Subtle sharpening + color grade" },
  { id: "cinematic", label: "Cinematic", desc: "Filmic grade + grain" },
  { id: "clean", label: "Clean", desc: "Denoise + lift shadows" },
  { id: "premium", label: "Premium", desc: "Commercial glossy polish" },
];

export default function EnhanceCanvasOverlay({ open, onClose }: Props) {
  const selectedId = useCanvas((s) => s.selectedNodeIds[0]);
  const nodes = useCanvas((s) => s.nodes);
  const source = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [selectedId, nodes]);

  const [resolution, setResolution] = useState<Resolution>("4K");
  const [preset, setPreset] = useState<EnhancementPreset>("polish");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setContainerSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const cw = containerSize.w;
    const ch = containerSize.h;
    const iw = Math.min(cw * 0.42, 340);
    const ih = Math.min(ch * 0.62, 460);
    setImgRect({ x: (cw - iw) / 2, y: (ch - ih) / 2, w: iw, h: ih });
  }, [open, containerSize.w, containerSize.h]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canApply = !!source?.image_url;
  const model = getImageModel("nanobanana-pro");

  const apply = () => {
    if (!source || !canApply) return;
    const capturedPreset = preset;
    const capturedExtraPrompt = RESOLUTION_PREFIX[resolution];
    const capturedSourceId = source.id;
    onClose();
    void (async () => {
      try {
        await enhanceNode(capturedSourceId, {
          preset: capturedPreset,
          extraPrompt: capturedExtraPrompt,
          replaceInPlace: false,
        });
      } catch (err) {
        console.error("Enhance failed", err);
      }
    })();
  };

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
          <div ref={containerRef} className="flex-1 relative overflow-hidden">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[11px] text-text-secondary pointer-events-none">
              <span className="text-text-primary font-medium">Enhance</span>
              <span className="text-text-muted font-mono">~{formatUsd(model.perImage ?? 0)}</span>
            </div>

            {/* Right-side floating controls panel */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 p-3 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              {/* Resolution */}
              <div className="flex flex-col gap-1">
                <div className="text-[9px] font-mono text-text-muted text-center tracking-wider">RES</div>
                {(["4K", "2K", "HD"] as Resolution[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={cn(
                      "h-7 w-14 rounded-lg text-[11px] font-mono transition-all border",
                      resolution === r
                        ? "bg-accent-cool/15 border-accent-cool/50 text-accent-cool"
                        : "bg-white/5 border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-hover"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Style presets */}
              <div className="flex flex-col gap-1">
                <div className="text-[9px] font-mono text-text-muted text-center tracking-wider">STYLE</div>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    title={p.desc}
                    className={cn(
                      "h-7 w-14 rounded-lg text-[10px] transition-all border",
                      preset === p.id
                        ? "bg-accent-violet/15 border-accent-violet/50 text-accent-violet"
                        : "bg-white/5 border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-hover"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {source?.image_url ? (
              <>
                {/* Cyan glow frame */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: imgRect.x,
                    top: imgRect.y,
                    width: imgRect.w,
                    height: imgRect.h,
                    borderRadius: 10,
                    boxShadow: "0 0 0 2px rgba(106,227,255,0.9), 0 0 0 3px rgba(106,227,255,0.5), 0 0 32px 4px rgba(106,227,255,0.35), 0 0 64px 8px rgba(106,227,255,0.2)",
                  }}
                />

                {/* Image */}
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
                  }}
                  draggable={false}
                />

                {/* Preset label badge */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-mono text-text-primary flex items-center gap-2 pointer-events-none">
                  <span className="text-accent-cool">{resolution}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-text-secondary capitalize">{preset}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <ImageOff className="w-8 h-8 text-text-muted" />
                <div className="text-sm font-medium text-text-primary">Select a shot first</div>
                <div className="text-xs text-text-muted">Click a shot on the canvas, then open Enhance.</div>
              </div>
            )}
          </div>

          {/* Bottom bar — Apply only */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 py-2.5 bg-panel-2/90 backdrop-blur-xl border-t border-border-subtle">
            <button
              onClick={apply}
              disabled={!canApply}
              className={cn(
                "h-8 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                canApply
                  ? "bg-accent-cool text-canvas hover:brightness-110 shadow-[0_0_16px_rgba(106,227,255,0.3)]"
                  : "bg-white/5 text-text-muted cursor-not-allowed"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Apply Enhance
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
