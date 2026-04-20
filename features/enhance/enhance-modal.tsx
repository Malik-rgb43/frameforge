"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Wand2,
  Loader2,
  ImageOff,
  Zap,
  Film,
  Droplets,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/store";
import { formatUsd, getImageModel } from "@/lib/ai/pricing";
import { enhanceNode, type EnhancementPreset } from "./enhance";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS: {
  id: EnhancementPreset;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "polish", label: "Polish", hint: "Subtle sharpen + grade", icon: Sparkles },
  { id: "cinematic", label: "Cinematic", hint: "Film grain + deep blacks", icon: Film },
  { id: "clean", label: "Clean", hint: "Denoise + balance", icon: Droplets },
  { id: "premium", label: "Premium", hint: "Commercial polish", icon: Gem },
];

export default function EnhanceModal({ open, onClose }: Props) {
  const selectedId = useCanvas((s) => s.selectedNodeIds[0]);
  const nodes = useCanvas((s) => s.nodes);

  const source = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [selectedId, nodes]
  );

  const [preset, setPreset] = useState<EnhancementPreset>("polish");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastCost, setLastCost] = useState<number | null>(null);

  const model = getImageModel("nanobanana-pro");
  const canApply = !!source?.image_url && !busy;

  const run = async () => {
    if (!source || !canApply) return;
    setBusy(true);
    try {
      const ready = await enhanceNode(source.id, {
        preset,
        extraPrompt: extraPrompt.trim() || undefined,
        replaceInPlace: false,
      });
      if (ready) {
        const cost = (ready.metadata as { cost_usd?: number } | null)?.cost_usd;
        if (typeof cost === "number") setLastCost(cost);
        setTimeout(() => onClose(), 600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Enhance failed";
      alert(msg);
    } finally {
      setBusy(false);
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
            className="fixed bottom-6 right-6 z-50 w-[360px] max-h-[90vh] overflow-y-auto glass-panel shadow-panel rounded-2xl border border-border-subtle"
          >
            <header className="h-14 px-5 flex items-center gap-3 border-b border-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-accent-cool/10 border border-accent-cool/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent-cool" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-text-primary">Enhance</h2>
                <p className="text-2xs text-text-muted truncate">
                  Upscale and polish an existing image — NanoBanana Pro identity-locked
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

            <div className="p-5 grid grid-cols-1 gap-5">
              {/* Source preview */}
              <div className="flex flex-col gap-2">
                <div className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                  Source
                </div>
                {source?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={source.image_url}
                    alt=""
                    className="w-full aspect-video object-cover rounded-lg border border-border-subtle"
                  />
                ) : (
                  <div className="aspect-video rounded-lg border border-dashed border-border-subtle flex items-center justify-center text-text-muted">
                    <ImageOff className="w-6 h-6" />
                  </div>
                )}
                <div className="text-xs font-medium text-text-primary truncate">
                  {source?.title ?? "Select a shot first"}
                </div>
                {source?.quality_score != null && (
                  <div className="text-2xs text-text-muted font-mono">
                    current quality: {source.quality_score}/100
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-4">
                {/* Preset */}
                <div>
                  <label className="text-xs font-medium text-text-primary mb-2 block">
                    Enhancement style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p) => {
                      const Icon = p.icon;
                      const active = preset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPreset(p.id)}
                          className={cn(
                            "text-left p-3 rounded-lg border transition-all ease-spring",
                            active
                              ? "bg-accent-cool/5 border-accent-cool/40 ring-1 ring-accent-cool/30"
                              : "bg-panel-2 border-border-subtle hover:border-border-hover"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 mb-2",
                              active ? "text-accent-cool" : "text-text-secondary"
                            )}
                          />
                          <div className="text-xs font-medium text-text-primary">
                            {p.label}
                          </div>
                          <div className="text-2xs text-text-muted mt-0.5">
                            {p.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Extra prompt */}
                <div>
                  <label className="text-xs font-medium text-text-primary mb-1.5 block">
                    Additional direction (optional)
                  </label>
                  <textarea
                    value={extraPrompt}
                    onChange={(e) => setExtraPrompt(e.target.value)}
                    rows={2}
                    placeholder="e.g. warmer color grade, tighter focus on hands"
                    className="w-full bg-canvas border border-border-subtle rounded-lg p-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cool/40 focus:border-accent-cool/30 resize-none leading-relaxed"
                  />
                </div>

                <div className="text-2xs text-text-muted font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cool/60" />
                  Enhanced copy will appear as a new card on the canvas
                </div>

                {lastCost != null && (
                  <div className="text-2xs text-status-success font-mono">
                    Last run: {formatUsd(lastCost)}
                  </div>
                )}
              </div>
            </div>

            <footer className="px-5 py-4 border-t border-border-subtle flex items-center gap-2 justify-end">
              <button
                onClick={onClose}
                className="h-9 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={!canApply}
                className={cn(
                  "h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ease-spring",
                  canApply
                    ? "bg-accent-cool text-canvas hover:brightness-110 shadow-[0_0_20px_rgba(106,227,255,0.25)]"
                    : "bg-white/5 text-text-muted cursor-not-allowed"
                )}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {busy ? "Enhancing..." : "Apply Enhance"}
              </button>
            </footer>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
