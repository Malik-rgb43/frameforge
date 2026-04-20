"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, X, Sparkles, ChevronDown, Link2, Ratio, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/store";
import { useI18n } from "@/lib/i18n/store";
import { generateFromPrompt } from "./generate";
import { IMAGE_MODELS, formatUsd } from "@/lib/ai/pricing";
import AdvancedPanel, {
  DEFAULT_ADVANCED,
  QUALITY_TIERS,
  type AdvancedSettings,
} from "./advanced-panel";

const ASPECTS = [
  { id: "9:16", label: "9:16", hint: "Vertical · Reels / TikTok" },
  { id: "1:1", label: "1:1", hint: "Square · Instagram feed" },
  { id: "4:5", label: "4:5", hint: "Portrait · FB / IG feed" },
  { id: "3:4", label: "3:4", hint: "Classic portrait" },
  { id: "16:9", label: "16:9", hint: "Wide · YouTube / web" },
] as const;
type AspectId = (typeof ASPECTS)[number]["id"];

const RESOLUTIONS = [
  { id: "1k" as const, label: "1K", hint: "1080px long edge · fastest", longEdge: 1080 },
  { id: "2k" as const, label: "2K", hint: "2160px long edge · balanced", longEdge: 2160 },
  { id: "4k" as const, label: "4K", hint: "3840px long edge · max detail", longEdge: 3840 },
];
type ResolutionId = (typeof RESOLUTIONS)[number]["id"];

export default function ChatBar() {
  const t = useI18n((s) => s.t);
  const refIds = useCanvas((s) => s.refNodeIds);
  const nodes = useCanvas((s) => s.nodes);
  const toggleRef = useCanvas((s) => s.toggleRef);
  const clearRefs = useCanvas((s) => s.clearRefs);

  const refs = useMemo(
    () => refIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean),
    [refIds, nodes]
  );

  const [value, setValue] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [aspect, setAspect] = useState<AspectId>("9:16");
  const [aspectOpen, setAspectOpen] = useState(false);
  const [resolution, setResolution] = useState<ResolutionId>("2k");
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedSettings>(DEFAULT_ADVANCED);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const qualityTier =
    QUALITY_TIERS.find((q) => q.id === advanced.quality) ?? QUALITY_TIERS[1];
  const resolutionTier =
    RESOLUTIONS.find((r) => r.id === resolution) ?? RESOLUTIONS[1];
  const estCost =
    (model.perImage ?? 0) *
    qualityTier.multiplier *
    advanced.variants;

  const onGenerate = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      // Compose full prompt with negative + style preset
      let finalPrompt = value.trim();
      if (advanced.stylePreset !== "none") {
        finalPrompt += `\n\nStyle preset: ${advanced.stylePreset}`;
      }
      if (advanced.shotType && advanced.shotType !== "none") {
        const shotTypeLabels: Record<string, string> = {
          background: "background/environment scene",
          product: "product photography shot",
          vibe: "mood/vibe/aesthetic shot",
          reference: "style reference image",
          character: "character/person portrait",
          text: "text-heavy graphic with legible text",
        };
        finalPrompt += `\n\nShot type: ${shotTypeLabels[advanced.shotType] ?? advanced.shotType}`;
      }
      if (advanced.negativePrompt.trim()) {
        finalPrompt += `\n\nAvoid: ${advanced.negativePrompt.trim()}`;
      }
      if (advanced.promptStrength !== 0.7) {
        finalPrompt += `\n\nPrompt strength directive: ${
          advanced.promptStrength < 0.4
            ? "loose interpretation, creative freedom"
            : advanced.promptStrength > 0.8
              ? "strict literal interpretation"
              : "balanced interpretation"
        }`;
      }

      // Bake resolution hint into prompt (real API adoption will need to set imageConfig.resolution)
      const withResolution = `${finalPrompt}\n\nTarget resolution: ${resolutionTier.label} (long edge ${resolutionTier.longEdge}px).`;

      // Generate N variants sequentially (shows progress)
      for (let v = 0; v < advanced.variants; v++) {
        await generateFromPrompt({
          prompt: withResolution,
          modelId: model.id as
            | "nanobanana-pro"
            | "nanobanana-2"
            | "nanobanana-flash",
          aspect: aspect as "9:16" | "1:1" | "16:9" | "4:5" | "3:4",
          thinkingLevel: qualityTier.thinking,
          seed:
            advanced.seed !== null
              ? advanced.seed + v // offset per variant for diversity
              : undefined,
        });
      }
      setValue("");
    } catch (err) {
      console.error("generate failed", err);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onGenerate();
    }
  };

  const placeholder =
    refs.length > 0
      ? t("chat.placeholder.withRefs", { n: refs.length })
      : t("chat.placeholder.empty");

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,680px)]">
      <div className="group/chat rounded-2xl glass-panel shadow-chat border border-accent-warm/10 backdrop-blur-xl transition-all duration-200 focus-within:border-accent-warm/40 focus-within:shadow-[0_-24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,184,107,0.15)]">
        {/* Refs row */}
        <AnimatePresence initial={false}>
          {refs.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-border-subtle overflow-hidden rounded-t-2xl"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <Link2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <div className="flex gap-1.5 overflow-x-auto flex-1 scroll-smooth">
                  {refs.map((r) =>
                    r ? (
                      <RefChip
                        key={r.id}
                        imageUrl={r.image_url}
                        title={r.title ?? ""}
                        onRemove={() => toggleRef(r.id)}
                      />
                    ) : null
                  )}
                </div>
                <button
                  onClick={clearRefs}
                  className="text-2xs font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded flex-shrink-0"
                >
                  {t("chat.clearRefs")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-3">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            dir="auto"
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none font-sans leading-relaxed max-h-[120px]"
          />
        </div>

        <div className="px-3 pb-3 flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setModelOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-panel-2 hover:bg-panel-2/80 border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {model.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <AnimatePresence>
              {modelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 w-64 rounded-xl glass-panel shadow-panel border border-border-subtle overflow-hidden z-50"
                >
                  {IMAGE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModel(m);
                        setModelOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex flex-col gap-0.5",
                        model.id === m.id && "bg-accent-warm/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-text-primary">
                          {m.label}
                        </span>
                        <span className="text-2xs font-mono text-accent-warm">
                          {formatUsd(m.perImage ?? 0)}/img
                        </span>
                      </div>
                      <span className="text-2xs text-text-muted">{m.hint}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resolution picker (1K / 2K / 4K) */}
          <div className="relative">
            <button
              onClick={() => setResolutionOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-panel-2 hover:bg-panel-2/80 border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
              title="Output resolution"
            >
              <Monitor className="w-3 h-3" />
              {resolutionTier.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <AnimatePresence>
              {resolutionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 w-56 rounded-xl glass-panel shadow-panel border border-border-subtle overflow-hidden z-50"
                >
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setResolution(r.id);
                        setResolutionOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex flex-col gap-0.5",
                        resolution === r.id && "bg-accent-warm/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary">
                          {r.label}
                        </span>
                        <span className="text-2xs font-mono text-accent-warm">
                          {r.longEdge}px
                        </span>
                      </div>
                      <span className="text-2xs text-text-muted">{r.hint}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Aspect ratio picker */}
          <div className="relative">
            <button
              onClick={() => setAspectOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-panel-2 hover:bg-panel-2/80 border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Ratio className="w-3 h-3" />
              {aspect}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <AnimatePresence>
              {aspectOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 w-56 rounded-xl glass-panel shadow-panel border border-border-subtle overflow-hidden z-50"
                >
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setAspect(a.id);
                        setAspectOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between",
                        aspect === a.id && "bg-accent-warm/5"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-text-primary">
                          {a.label}
                        </span>
                        <span className="text-2xs text-text-muted">{a.hint}</span>
                      </div>
                      <AspectPreview aspect={a.id} active={aspect === a.id} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-2xs font-mono text-text-muted px-2">
            <span className="text-accent-warm/70">
              ~{formatUsd(estCost)}/gen
            </span>
          </div>

          <div className="flex-1" />

          <button
            onClick={onGenerate}
            disabled={!value.trim() || busy}
            className={cn(
              "h-9 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ease-spring duration-150",
              value.trim() && !busy
                ? "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_20px_rgba(255,184,107,0.3)]"
                : "bg-white/5 text-text-muted cursor-not-allowed"
            )}
          >
            <Wand2 className={cn("w-4 h-4", busy && "animate-spin")} />
            {busy ? t("chat.generating") : t("chat.generate")}
          </button>
        </div>

        <AdvancedPanel
          value={advanced}
          onChange={setAdvanced}
          activeRefCount={refs.length}
        />
      </div>
    </div>
  );
}

function AspectPreview({ aspect, active }: { aspect: AspectId; active: boolean }) {
  const [w, h] = aspect.split(":").map(Number);
  const maxSide = 14;
  let dw = maxSide;
  let dh = maxSide;
  if (w > h) dh = (h / w) * maxSide;
  else if (h > w) dw = (w / h) * maxSide;
  return (
    <div
      className={cn(
        "rounded-sm border flex-shrink-0",
        active ? "border-accent-warm bg-accent-warm/20" : "border-text-muted/50"
      )}
      style={{ width: dw, height: dh }}
    />
  );
}

function RefChip({
  imageUrl,
  title,
  onRemove,
}: {
  imageUrl: string | null;
  title: string;
  onRemove: () => void;
}) {
  return (
    <div className="group relative flex-shrink-0 h-8 pr-7 pl-1 rounded-lg bg-panel-2 border border-border-subtle hover:border-border-hover flex items-center gap-2 transition-colors">
      <div className="w-6 h-6 rounded overflow-hidden bg-canvas flex-shrink-0">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <span
        className="text-2xs text-text-secondary truncate max-w-[90px]"
        dir="auto"
      >
        {title}
      </span>
      <button
        onClick={onRemove}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary"
        aria-label="Remove ref"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
