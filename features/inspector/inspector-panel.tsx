"use client";
import { internalFetch } from "@/lib/api";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check, FileText, Link2, Film, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/store";
import { useI18n } from "@/lib/i18n/store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { NodeRow } from "@/lib/supabase/types";

type Tab = "prompt" | "refs" | "animation";

const TABS: { id: Tab; labelKey: "inspector.tab.prompt" | "inspector.tab.refs" | "inspector.tab.animation"; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "prompt", labelKey: "inspector.tab.prompt", icon: FileText },
  { id: "refs", labelKey: "inspector.tab.refs", icon: Link2 },
  { id: "animation", labelKey: "inspector.tab.animation", icon: Film },
];

export default function InspectorPanel() {
  const t = useI18n((s) => s.t);
  const node = useCanvas((s) =>
    s.inspectorNodeId ? s.nodes.find((n) => n.id === s.inspectorNodeId) ?? null : null
  );
  const close = useCanvas((s) => s.closeInspector);
  const allNodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const [tab, setTab] = useState<Tab>("prompt");

  // Ref nodes = edges where THIS node is target, source_node_id → ref
  const incomingRefs = node
    ? edges
        .filter((e) => e.target_node_id === node.id)
        .map((e) => allNodes.find((n) => n.id === e.source_node_id))
        .filter((n): n is NodeRow => !!n)
    : [];

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -32, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-20 bottom-6 left-20 z-30 w-[380px] rounded-2xl glass-panel shadow-panel overflow-hidden flex flex-col"
        >
          {/* Header */}
          <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle flex-shrink-0">
            <NodeTypeBadge type={node.type} />
            <h2
              className="text-sm font-medium text-text-primary truncate flex-1"
              dir="auto"
            >
              {node.title || t("node.untitled")}
            </h2>
            <button
              onClick={close}
              className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              aria-label={t("inspector.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Image preview */}
          {node.image_url && (
            <div className="px-4 pt-4 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={node.image_url}
                alt=""
                className="w-full max-h-[220px] object-contain rounded-lg border border-border-subtle bg-canvas/60"
              />
            </div>
          )}

          {/* Tabs */}
          <nav
            className="flex gap-1 px-4 pt-3 border-b border-border-subtle flex-shrink-0"
            role="tablist"
            dir="ltr"
          >
            {TABS.map((tabDef) => {
              const Icon = tabDef.icon;
              const isActive = tab === tabDef.id;
              return (
                <button
                  key={tabDef.id}
                  onClick={() => setTab(tabDef.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                    isActive
                      ? "text-accent-warm border-accent-warm"
                      : "text-text-secondary border-transparent hover:text-text-primary"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(tabDef.labelKey)}
                  {tabDef.id === "refs" && incomingRefs.length > 0 && (
                    <span className="font-mono text-2xs text-text-muted">
                      {incomingRefs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-4" dir="auto">
            {tab === "prompt" && <PromptTab node={node} />}
            {tab === "refs" && <RefsTab refs={incomingRefs} />}
            {tab === "animation" && <AnimationTab node={node} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function NodeTypeBadge({ type }: { type: string }) {
  const t = useI18n((s) => s.t);
  const cfgMap: Record<string, { dot: string; labelKey: "inspector.type.source" | "inspector.type.shot" | "inspector.type.continuation" | "inspector.type.note" }> = {
    source: { dot: "bg-node-source", labelKey: "inspector.type.source" },
    shot: { dot: "bg-node-shot", labelKey: "inspector.type.shot" },
    continuation: { dot: "bg-node-cont", labelKey: "inspector.type.continuation" },
    note: { dot: "bg-node-note", labelKey: "inspector.type.note" },
  };
  const cfg = cfgMap[type] ?? { dot: "bg-text-muted", labelKey: "inspector.type.source" as const };

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-panel-2 border border-border-subtle">
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      <span className="text-2xs font-mono text-text-secondary uppercase tracking-wider">
        {t(cfg.labelKey)}
      </span>
    </div>
  );
}

function PromptTab({ node }: { node: NodeRow }) {
  const t = useI18n((s) => s.t);
  const hasUser = !!node.prompt;
  const hasEnhanced = !!node.prompt_enhanced;

  if (!hasUser && !hasEnhanced) {
    return (
      <div className="text-xs text-text-muted font-mono text-center py-8">
        {t("inspector.prompt.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasUser && (
        <PromptBlock
          label={t("inspector.prompt.raw")}
          text={node.prompt!}
          subtitle={t("inspector.prompt.raw.sub")}
        />
      )}
      {hasEnhanced && (
        <PromptBlock
          label={t("inspector.prompt.enhanced")}
          text={node.prompt_enhanced!}
          subtitle={t("inspector.prompt.enhanced.sub")}
          accent
        />
      )}
    </div>
  );
}

function PromptBlock({
  label,
  text,
  subtitle,
  accent,
}: {
  label: string;
  text: string;
  subtitle?: string;
  accent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-text-primary flex items-center gap-1.5">
            {accent && <Sparkles className="w-3 h-3 text-accent-warm" />}
            {label}
          </div>
          {subtitle && (
            <div className="text-2xs text-text-muted mt-0.5">{subtitle}</div>
          )}
        </div>
        <button
          onClick={onCopy}
          className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
          aria-label="Copy"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-status-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <pre
        className={cn(
          "text-xs leading-relaxed font-mono p-3 rounded-lg border max-h-[280px] overflow-y-auto whitespace-pre-wrap",
          accent
            ? "bg-accent-warm/5 border-accent-warm/20 text-text-primary"
            : "bg-canvas border-border-subtle text-text-secondary"
        )}
        dir="auto"
      >
        {text}
      </pre>
    </div>
  );
}

function RefsTab({ refs }: { refs: NodeRow[] }) {
  const t = useI18n((s) => s.t);
  if (refs.length === 0) {
    return (
      <div className="text-xs text-text-muted font-mono text-center py-8">
        {t("inspector.refs.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-text-secondary">
        {t("inspector.refs.summary", { n: refs.length })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {refs.map((r) => (
          <button
            key={r.id}
            className="group relative rounded-lg overflow-hidden bg-panel-2 border border-border-subtle hover:border-border-hover aspect-[3/4]"
            onClick={() => useCanvas.getState().openInspector(r.id)}
          >
            {r.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.image_url}
                alt={r.title ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-2xs font-mono">
                no image
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/85 to-transparent">
              <div className="text-2xs text-text-primary truncate" dir="auto">
                {r.title ?? t("node.untitled")}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AnimationTab({ node }: { node: NodeRow }) {
  const t = useI18n((s) => s.t);
  const upsertNode = useCanvas((s) => s.upsertNode);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<"kling-3" | "runway-gen3" | "seedance-2" | "sora" | "any">("kling-3");

  const existing = (node.metadata as { animation_prompt?: string } | null)
    ?.animation_prompt;

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const systemPrompt = `You are a cinematographer writing image-to-video motion prompts. Output JSON only:
{"motionPrompt":"string under 60 words","modelHint":"kling-3|runway-gen3|seedance-2|sora|any","durationSeconds":3,"pacing":"slow|medium|punchy","finalBeat":"1 sentence"}
Motion-only language (no describing the still). End with a clear final beat.`;
      const userPrompt = `Shot title: "${node.title ?? "untitled"}"
Shot prompt: ${node.prompt ?? "(none)"}
Target model: ${model}
Write the motion prompt. JSON only.`;

      const res = await internalFetch("/api/gemini", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          responseMimeType: "application/json",
          model: "gemini-3-pro",
          action: "motion.generate",
          nodeId: node.id,
        }),
      });

      const persistAnimMetadata = (meta: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged = { ...(node.metadata as Record<string, unknown>), ...meta } as any;
        upsertNode({ ...node, metadata: merged });
        void Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter.updateNode(node.id, { metadata: merged })
            .catch((err) => console.error("updateNode anim failed", err))
        );
      };

      if (res.ok) {
        const { data } = (await res.json()) as {
          data: { motionPrompt?: string; modelHint?: string };
        };
        persistAnimMetadata({
          animation_prompt: data?.motionPrompt ?? "",
          animation_model_hint: data?.modelHint ?? model,
        });
      } else {
        // Fallback deterministic builder
        persistAnimMetadata({
          animation_prompt: `Slow dolly-in at 4px/frame with subtle rack-focus from foreground to hero. Subject action peaks in the middle third. End on a still locked frame ready for a clean cut to the next shot.`,
          animation_model_hint: model,
        });
      }
    } catch (err) {
      console.error("motion prompt gen failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-text-secondary leading-relaxed flex items-start gap-2">
        <Film className="w-4 h-4 text-accent-cool flex-shrink-0 mt-0.5" />
        <span>{t("inspector.anim.intro")}</span>
      </div>

      {existing ? (
        <PromptBlock
          label={t("inspector.anim.label")}
          text={existing}
          accent
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
          <Film className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <div className="text-xs text-text-secondary mb-3">
            {t("inspector.anim.empty")}
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="text-xs font-medium text-accent-warm hover:brightness-110 transition-all"
          >
            {busy ? "Generating..." : t("inspector.anim.create")}
          </button>
        </div>
      )}

      <div className="rounded-lg bg-canvas border border-border-subtle p-3">
        <div className="text-2xs text-text-muted font-mono uppercase tracking-wider mb-2">
          {t("inspector.anim.modelHint")}
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as typeof model)}
          className="w-full bg-panel-2 border border-border-subtle rounded-md px-2 py-1.5 text-xs text-text-primary"
          dir="ltr"
        >
          <option value="kling-3">Kling 3 (cinematic)</option>
          <option value="runway-gen3">Runway Gen-3 (fast)</option>
          <option value="seedance-2">Seedance 2 (realistic)</option>
          <option value="sora">Sora (multi-beat)</option>
          <option value="any">Any i2v</option>
        </select>
      </div>

      {existing && (
        <button
          onClick={generate}
          disabled={busy}
          className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 text-xs text-text-secondary hover:text-text-primary self-start transition-colors"
        >
          {busy ? "Regenerating..." : "Regenerate"}
        </button>
      )}
    </div>
  );
}
