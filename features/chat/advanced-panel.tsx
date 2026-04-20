"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Dices,
  MinusCircle,
  Copy,
  Palette,
  ChevronDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type QualityTierId = "draft" | "balanced" | "max";

export interface AdvancedSettings {
  quality: QualityTierId;
  seed: number | null;
  negativePrompt: string;
  variants: 1 | 2 | 4;
  stylePreset: string;
  shotType: string;
  promptStrength: number; // 0-1, maps to guidance
  refWeights: [number, number, number]; // weight per ref slot, 0-1
}

export const DEFAULT_ADVANCED: AdvancedSettings = {
  quality: "balanced",
  seed: null,
  negativePrompt: "",
  variants: 1,
  stylePreset: "none",
  shotType: "none",
  promptStrength: 0.7,
  refWeights: [1, 0.6, 0.4],
};

export const QUALITY_TIERS: {
  id: QualityTierId;
  label: string;
  hint: string;
  multiplier: number;
  thinking: "LOW" | "HIGH";
}[] = [
  {
    id: "draft",
    label: "Draft",
    hint: "Fast · ~3s · cheaper",
    multiplier: 0.5,
    thinking: "LOW",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Default · ~6s",
    multiplier: 1,
    thinking: "LOW",
  },
  {
    id: "max",
    label: "Max",
    hint: "Best · ~12s · deep reasoning",
    multiplier: 1.5,
    thinking: "HIGH",
  },
];

const STYLE_PRESETS = [
  { id: "none", label: "None · follow prompt only" },
  { id: "cinematic", label: "Cinematic · 35mm film, moody grade" },
  { id: "editorial", label: "Editorial · fashion, muted warm tones" },
  { id: "product", label: "Product · studio, clean, sharp" },
  { id: "lifestyle", label: "Lifestyle · natural light, candid" },
  { id: "noir", label: "Noir · harsh shadows, single source" },
  { id: "pastel", label: "Pastel · soft, muted, airy" },
  { id: "high-contrast", label: "High contrast · deep blacks, hot highlights" },
];

const SHOT_TYPES = [
  { id: "none",       label: "General",     hint: "No specific type" },
  { id: "background", label: "Background",  hint: "Scene / environment" },
  { id: "product",    label: "Product",     hint: "Product focus shot" },
  { id: "vibe",       label: "Vibe",        hint: "Mood / aesthetic" },
  { id: "reference",  label: "Reference",   hint: "Style reference" },
  { id: "character",  label: "Character",   hint: "Person / character" },
  { id: "text",       label: "Text / Logo", hint: "Text-heavy shot" },
];

interface Props {
  value: AdvancedSettings;
  onChange: (next: AdvancedSettings) => void;
  activeRefCount: number;
}

export default function AdvancedPanel({
  value,
  onChange,
  activeRefCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [shotTypeOpen, setShotTypeOpen] = useState(false);

  const setField = <K extends keyof AdvancedSettings>(
    key: K,
    v: AdvancedSettings[K]
  ) => onChange({ ...value, [key]: v });

  const randomSeed = () =>
    setField("seed", Math.floor(Math.random() * 1_000_000_000));

  const activeCount =
    (value.seed !== null ? 1 : 0) +
    (value.negativePrompt.trim() ? 1 : 0) +
    (value.variants > 1 ? 1 : 0) +
    (value.stylePreset !== "none" ? 1 : 0) +
    (value.shotType !== "none" ? 1 : 0) +
    (value.promptStrength !== 0.7 ? 1 : 0);

  return (
    <div className="border-t border-border-subtle">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full h-9 px-3 flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors",
          open && "text-text-primary"
        )}
      >
        <Sliders className="w-3 h-3" />
        Advanced
        {activeCount > 0 && (
          <span className="text-2xs font-mono text-accent-warm bg-accent-warm/10 px-1.5 py-0.5 rounded">
            {activeCount}
          </span>
        )}
        <div className="flex-1" />
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3 grid grid-cols-2 gap-3 border-t border-border-subtle bg-canvas/40">
              {/* Seed */}
              <div>
                <label className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  <Dices className="w-3 h-3" />
                  Seed
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={value.seed ?? ""}
                    onChange={(e) =>
                      setField(
                        "seed",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    placeholder="random"
                    className="flex-1 h-8 bg-panel-2 border border-border-subtle rounded-md px-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-warm/40"
                  />
                  <button
                    onClick={randomSeed}
                    className="w-8 h-8 rounded-md bg-panel-2 border border-border-subtle hover:border-border-hover text-text-secondary hover:text-text-primary flex items-center justify-center"
                    title="Randomise"
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Variants */}
              <div>
                <label className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  <Copy className="w-3 h-3" />
                  Variants
                </label>
                <div className="flex h-8 rounded-md bg-panel-2 border border-border-subtle p-0.5">
                  {[1, 2, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setField("variants", n as 1 | 2 | 4)}
                      className={cn(
                        "flex-1 rounded text-xs font-medium transition-all ease-spring",
                        value.variants === n
                          ? "bg-accent-warm/15 text-accent-warm"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Style preset */}
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  <Palette className="w-3 h-3" />
                  Style preset
                </label>
                <select
                  value={value.stylePreset}
                  onChange={(e) => setField("stylePreset", e.target.value)}
                  className="w-full h-8 bg-panel-2 border border-border-subtle rounded-md px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-warm/40"
                >
                  {STYLE_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shot type */}
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  <Layers className="w-3 h-3" />
                  Shot type
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShotTypeOpen((o) => !o)}
                    className="w-full h-8 bg-panel-2 border border-border-subtle rounded-md px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-warm/40 flex items-center justify-between gap-1.5"
                  >
                    <span>
                      {SHOT_TYPES.find((s) => s.id === value.shotType)?.label ?? "General"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 text-text-muted transition-transform duration-150 flex-shrink-0",
                        shotTypeOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {shotTypeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-1 left-0 right-0 rounded-xl glass-panel shadow-panel border border-border-subtle overflow-hidden z-50"
                      >
                        {SHOT_TYPES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setField("shotType", s.id);
                              setShotTypeOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between gap-2",
                              value.shotType === s.id && "bg-accent-warm/5"
                            )}
                          >
                            <span className="text-xs font-medium text-text-primary">
                              {s.label}
                            </span>
                            <span className="text-2xs text-text-muted">
                              {s.hint}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Prompt strength */}
              <div className="col-span-2">
                <label className="text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Prompt strength</span>
                  <span className="font-mono text-accent-warm">
                    {value.promptStrength.toFixed(2)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={value.promptStrength}
                  onChange={(e) =>
                    setField("promptStrength", Number(e.target.value))
                  }
                  className="w-full accent-accent-warm"
                />
                <div className="flex justify-between text-[9px] font-mono text-text-muted mt-0.5">
                  <span>loose</span>
                  <span>strict</span>
                </div>
              </div>

              {/* Negative prompt */}
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-2xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  <MinusCircle className="w-3 h-3" />
                  Avoid in image
                </label>
                <textarea
                  value={value.negativePrompt}
                  onChange={(e) => setField("negativePrompt", e.target.value)}
                  rows={2}
                  placeholder="e.g. text overlays, distorted hands, extra fingers, plastic look"
                  className="w-full bg-panel-2 border border-border-subtle rounded-md p-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-warm/40 resize-none"
                />
              </div>

              {/* Ref weights */}
              {activeRefCount > 0 && (
                <div className="col-span-2">
                  <label className="text-2xs font-mono text-text-muted uppercase tracking-wider mb-2 block">
                    Reference weights ({activeRefCount} active)
                  </label>
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: Math.min(3, activeRefCount) }).map(
                      (_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-2xs font-mono text-text-muted w-12">
                            Ref {i + 1}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={value.refWeights[i]}
                            onChange={(e) => {
                              const next = [...value.refWeights] as [
                                number,
                                number,
                                number,
                              ];
                              next[i] = Number(e.target.value);
                              setField("refWeights", next);
                            }}
                            className="flex-1 accent-accent-warm"
                          />
                          <span className="text-2xs font-mono text-accent-warm w-10 text-right">
                            {(value.refWeights[i] * 100).toFixed(0)}%
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
