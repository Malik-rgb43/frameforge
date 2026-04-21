"use client";
import { internalFetch } from "@/lib/api";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Copy, Check, FileText, Link2, Film, Sparkles,
  Clapperboard, StickyNote, Image as ImageIcon, Lightbulb,
  Clock, Camera, Sun, Target, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/store";
import { useI18n } from "@/lib/i18n/store";
import { getDataAdapter } from "@/lib/data-adapter";
import type { NodeRow } from "@/lib/supabase/types";

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function InspectorPanel() {
  const t = useI18n((s) => s.t);
  const node = useCanvas((s) =>
    s.inspectorNodeId ? s.nodes.find((n) => n.id === s.inspectorNodeId) ?? null : null
  );
  const close = useCanvas((s) => s.closeInspector);

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key={node.id}
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -32, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-20 bottom-6 left-20 z-30 w-[380px] rounded-2xl glass-panel shadow-panel overflow-hidden flex flex-col"
        >
          {/* Shared header */}
          <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle flex-shrink-0">
            <NodeTypeBadge type={node.type} />
            <h2 className="text-sm font-medium text-text-primary truncate flex-1" dir="auto">
              {node.title || t("node.untitled")}
            </h2>
            {node.quality_score != null && (
              <span className="text-2xs font-mono text-accent-warm bg-accent-warm/10 border border-accent-warm/20 rounded px-1.5 py-0.5">
                {node.quality_score}
              </span>
            )}
            <button
              onClick={close}
              className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Type-specific body */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {(node.type === "shot" || node.type === "continuation") && (
              <ShotInspector node={node} />
            )}
            {node.type === "concept_card" && (
              <ConceptCardInspector node={node} />
            )}
            {node.type === "note" && (
              <NoteInspector node={node} />
            )}
            {(node.type === "source" || (!["shot","continuation","concept_card","note"].includes(node.type))) && (
              <SourceInspector node={node} />
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Shot / Continuation ───────────────────────────────────────────────────────

type ShotTab = "details" | "animation" | "refs";

function ShotInspector({ node }: { node: NodeRow }) {
  const t = useI18n((s) => s.t);
  const [tab, setTab] = useState<ShotTab>("details");
  const allNodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);

  const incomingRefs = edges
    .filter((e) => e.target_node_id === node.id)
    .map((e) => allNodes.find((n) => n.id === e.source_node_id))
    .filter((n): n is NodeRow => !!n);

  const meta = (node.metadata ?? {}) as {
    purpose?: string;
    durationSeconds?: number;
    animation_prompt?: string;
    from_concept_card?: string;
  };

  // Parse prompt_enhanced into sections
  const lines = (node.prompt_enhanced ?? "").split("\n");
  const visualDesc = node.prompt ?? lines[0] ?? "";
  const cameraLine = lines.find((l) => l.startsWith("Camera:"))?.replace("Camera:", "").trim() ?? "";
  const lightingLine = lines.find((l) => l.startsWith("Lighting:"))?.replace("Lighting:", "").trim() ?? "";
  const purposeLine = meta.purpose ?? lines.find((l) => l.startsWith("Purpose:"))?.replace("Purpose:", "").trim() ?? "";

  const TABS: { id: ShotTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "details", label: "Details", icon: Clapperboard },
    { id: "animation", label: "Animation", icon: Film },
    { id: "refs", label: "Refs", icon: Link2 },
  ];

  return (
    <>
      {/* Image preview */}
      {node.image_url && (
        <div className="px-4 pt-4 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={node.image_url}
            alt=""
            className="w-full max-h-[200px] object-contain rounded-lg border border-border-subtle bg-canvas/60"
          />
        </div>
      )}

      {/* Tabs */}
      <TabBar>
        {TABS.map(({ id, label, icon: Icon }) => (
          <TabBtn key={id} active={tab === id} onClick={() => setTab(id)}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "refs" && incomingRefs.length > 0 && (
              <span className="font-mono text-2xs text-text-muted">{incomingRefs.length}</span>
            )}
          </TabBtn>
        ))}
      </TabBar>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" dir="auto">
        {tab === "details" && (
          <>
            {/* Meta pills */}
            <div className="flex flex-wrap gap-2">
              {purposeLine && (
                <PurposePill purpose={purposeLine} />
              )}
              {meta.durationSeconds != null && (
                <MetaPill icon={Clock} label={`${meta.durationSeconds}s`} />
              )}
            </div>

            {/* Visual description */}
            {visualDesc && (
              <InfoBlock icon={ImageIcon} label="Visual" text={visualDesc} copyable />
            )}

            {/* Camera */}
            {cameraLine && (
              <InfoBlock icon={Camera} label="Camera" text={cameraLine} copyable />
            )}

            {/* Lighting */}
            {lightingLine && (
              <InfoBlock icon={Sun} label="Lighting" text={lightingLine} copyable />
            )}

            {!visualDesc && !cameraLine && !lightingLine && (
              <div className="text-xs text-text-muted text-center py-6 font-mono">
                {t("inspector.prompt.empty")}
              </div>
            )}
          </>
        )}

        {tab === "animation" && <AnimationTab node={node} />}
        {tab === "refs" && <RefsTab refs={incomingRefs} />}
      </div>
    </>
  );
}

// ─── Concept Card ──────────────────────────────────────────────────────────────

type ConceptTab = "brief" | "settings";

function ConceptCardInspector({ node }: { node: NodeRow }) {
  const [tab, setTab] = useState<ConceptTab>("brief");

  const meta = (node.metadata ?? {}) as {
    concept_state?: string;
    idea?: string;
    concept_brief?: string;
    shot_count?: number;
    aspect?: string;
    duration_sec?: number;
    image_model?: string;
  };

  const brief = meta.concept_brief ?? "";
  const idea = meta.idea ?? node.title ?? "";
  const state = meta.concept_state ?? "idle";

  const TABS: { id: ConceptTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "brief", label: "Brief", icon: FileText },
    { id: "settings", label: "Settings", icon: Target },
  ];

  return (
    <>
      {/* State pill */}
      <div className="px-4 pt-3 flex-shrink-0">
        <ConceptStatePill state={state} />
      </div>

      <TabBar>
        {TABS.map(({ id, label, icon: Icon }) => (
          <TabBtn key={id} active={tab === id} onClick={() => setTab(id)}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </TabBtn>
        ))}
      </TabBar>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" dir="auto">
        {tab === "brief" && (
          <>
            {idea && (
              <InfoBlock icon={Lightbulb} label="Concept Idea" text={idea} copyable />
            )}

            {brief ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-warm" />
                    <span className="text-xs font-medium text-text-primary">Creative Brief</span>
                  </div>
                  <CopyButton text={brief} />
                </div>
                <div className="text-xs leading-relaxed text-text-secondary p-3 rounded-lg bg-canvas border border-border-subtle max-h-[320px] overflow-y-auto whitespace-pre-wrap">
                  {brief}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
                <Lightbulb className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <div className="text-xs text-text-muted">
                  {state === "generating"
                    ? "Generating brief..."
                    : "Brief will appear here after generation"}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "settings" && (
          <div className="flex flex-col gap-3">
            <SettingRow label="Shot count" value={String(meta.shot_count ?? 5)} />
            <SettingRow label="Aspect ratio" value={meta.aspect ?? "9:16"} />
            <SettingRow label="Duration" value={`${meta.duration_sec ?? 15}s`} />
            {meta.image_model && (
              <SettingRow label="Image model" value={meta.image_model} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Note ──────────────────────────────────────────────────────────────────────

function NoteInspector({ node }: { node: NodeRow }) {
  const meta = (node.metadata ?? {}) as {
    text?: string;
    note_type?: string;
  };
  const text = meta.text ?? node.prompt ?? "";
  const isEditorialBrief = meta.note_type === "editorial_brief";

  if (isEditorialBrief) {
    return <EditorialBriefInspector text={text} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      {text ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-medium text-text-primary">Note</span>
            </div>
            <CopyButton text={text} />
          </div>
          <div
            className="text-xs leading-relaxed text-text-secondary flex-1 overflow-y-auto whitespace-pre-wrap p-3 rounded-lg bg-canvas border border-border-subtle"
            dir="auto"
          >
            {text}
          </div>
        </>
      ) : (
        <div className="text-xs text-text-muted text-center py-8 font-mono">
          Note is empty
        </div>
      )}
    </div>
  );
}

// Editorial Brief — parses markdown sections and renders as a structured doc
function EditorialBriefInspector({ text }: { text: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  // Split text into sections by ### or ## headers
  const sections = parseBriefSections(text);

  const toggleSection = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      {/* Sticky header bar */}
      <div className="px-4 pt-3 pb-2 border-b border-border-subtle flex items-center justify-between flex-shrink-0 bg-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-accent-cool" />
          <span className="text-xs font-semibold text-text-primary tracking-wide">Editorial Brief</span>
          <span className="text-2xs text-text-muted font-mono">({sections.length} sections)</span>
        </div>
        <CopyButton text={text} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
        {sections.length > 0 ? (
          sections.map((section, i) => (
            <BriefSection
              key={i}
              index={i}
              title={section.title}
              body={section.body}
              open={expanded.has(i)}
              onToggle={() => toggleSection(i)}
            />
          ))
        ) : (
          // Fallback: no parseable sections, render as plain text
          <div className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap p-3 rounded-lg bg-canvas border border-border-subtle" dir="auto">
            {text}
          </div>
        )}
      </div>
    </div>
  );
}

function BriefSection({
  index,
  title,
  body,
  open,
  onToggle,
}: {
  index: number;
  title: string;
  body: string;
  open: boolean;
  onToggle: () => void;
}) {
  // Section accent colors cycle through editorial palette
  const accents = [
    "border-l-accent-warm text-accent-warm",
    "border-l-accent-cool text-accent-cool",
    "border-l-purple-400 text-purple-400",
    "border-l-green-400 text-green-400",
    "border-l-orange-400 text-orange-400",
    "border-l-pink-400 text-pink-400",
    "border-l-yellow-400 text-yellow-400",
    "border-l-teal-400 text-teal-400",
    "border-l-red-400 text-red-400",
  ];
  const accent = accents[index % accents.length];

  return (
    <div className={cn("rounded-lg bg-canvas border border-border-subtle overflow-hidden border-l-2", accent.split(" ")[0])}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/3 transition-colors"
      >
        <span className={cn("text-2xs font-bold font-mono shrink-0", accent.split(" ")[1])}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-xs font-semibold text-text-primary flex-1 leading-tight">
          {title}
        </span>
        <span className={cn("text-2xs transition-transform duration-200 text-text-muted", open ? "rotate-180" : "")}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-border-subtle">
          <div className="mt-2 text-xs leading-relaxed text-text-secondary whitespace-pre-wrap" dir="auto">
            {renderBriefBody(body)}
          </div>
        </div>
      )}
    </div>
  );
}

// Parse "### N. TITLE" or "**N. TITLE:**" or "## TITLE" patterns into sections
function parseBriefSections(text: string): { title: string; body: string }[] {
  // Try to split by markdown headers (###, ##, **HEADER:**)
  const headerRe = /^(?:#{1,3}\s+(?:\d+\.\s+)?|(?:\*\*\d+\.\s+[^*]+\*\*:?\s*\n))/m;
  if (!headerRe.test(text)) return [];

  const lines = text.split("\n");
  const sections: { title: string; body: string }[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const h3Match = line.match(/^#{1,3}\s+(?:\d+\.\s+)?(.+)/);
    const boldMatch = line.match(/^\*\*(\d+\.\s+[^*]+)\*\*[:\s]*/);

    if (h3Match || boldMatch) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: currentLines.join("\n").trim() });
      }
      currentTitle = (h3Match?.[1] ?? boldMatch?.[1] ?? "").replace(/\*\*/g, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentLines.join("\n").trim() });
  }
  return sections;
}

// Render body text — turns **bold** into <strong>, bullet `- ` into proper bullets
function renderBriefBody(text: string): React.ReactNode {
  return text.split("\n").map((line, i) => {
    const isBullet = line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ");
    const clean = isBullet ? line.trimStart().slice(2) : line;
    // Render **bold** spans
    const parts = clean.split(/\*\*(.+?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="text-text-primary font-semibold">{part}</strong> : part
    );
    return (
      <div key={i} className={cn("min-h-[1em]", isBullet && "flex gap-1.5 items-start")}>
        {isBullet && <span className="mt-1 w-1 h-1 rounded-full bg-text-muted shrink-0 mt-[6px]" />}
        <span>{rendered}</span>
      </div>
    );
  });
}

// ─── Source / Generic ─────────────────────────────────────────────────────────

function SourceInspector({ node }: { node: NodeRow }) {
  const t = useI18n((s) => s.t);

  const handleDownload = () => {
    if (!node.image_url) return;
    const a = document.createElement("a");
    a.href = node.image_url;
    a.download = `${node.title ?? "image"}.png`;
    a.click();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {node.image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={node.image_url}
            alt=""
            className="w-full rounded-lg border border-border-subtle bg-canvas/60 object-contain max-h-[280px]"
          />
          <button
            onClick={handleDownload}
            className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 self-start transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border-subtle p-8 flex flex-col items-center gap-2">
          <ImageIcon className="w-8 h-8 text-text-muted" />
          <div className="text-xs text-text-muted">No image</div>
        </div>
      )}

      {node.prompt && (
        <InfoBlock icon={FileText} label={t("inspector.prompt.raw")} text={node.prompt} copyable />
      )}
    </div>
  );
}

// ─── Animation Tab (shared) ────────────────────────────────────────────────────

function AnimationTab({ node }: { node: NodeRow }) {
  const t = useI18n((s) => s.t);
  const upsertNode = useCanvas((s) => s.upsertNode);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [model, setModel] = useState<"kling-3" | "runway-gen3" | "seedance-2" | "sora" | "any">("kling-3");

  const existing = (node.metadata as { animation_prompt?: string } | null)?.animation_prompt;

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setGenError(null);
    try {
      const res = await internalFetch("/api/gemini", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemPrompt: `You are a cinematographer writing image-to-video motion prompts. Output JSON only:
{"motionPrompt":"string under 60 words","modelHint":"kling-3|runway-gen3|seedance-2|sora|any","durationSeconds":3,"pacing":"slow|medium|punchy","finalBeat":"1 sentence"}
Motion-only language. No describing the still image. End with a clear final beat.`,
          userPrompt: `Shot: "${node.title ?? "untitled"}"\nDescription: ${node.prompt ?? "(none)"}\nTarget model: ${model}\nWrite the motion prompt. JSON only.`,
          responseMimeType: "application/json",
          model: "gemini-3-pro",
          action: "motion.generate",
          nodeId: node.id,
        }),
      });

      const persist = (animPrompt: string, modelHint: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged = { ...(node.metadata as Record<string, unknown>), animation_prompt: animPrompt, animation_model_hint: modelHint } as any;
        upsertNode({ ...node, metadata: merged, animation_prompt: animPrompt, animation_model_hint: modelHint });
        void Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter.updateNode(node.id, { animation_prompt: animPrompt, animation_model_hint: modelHint, metadata: merged })
            .catch((err) => console.error("updateNode anim failed", err))
        );
      };

      if (res.ok) {
        const { data } = (await res.json()) as { data: { motionPrompt?: string; modelHint?: string } };
        persist(data?.motionPrompt ?? "", data?.modelHint ?? model);
      } else {
        persist("Slow dolly-in at 4px/frame with subtle rack-focus from foreground to hero. Subject action peaks in the middle third. End on a still locked frame ready for a clean cut.", model);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {genError && (
        <div className="text-xs text-status-error px-3 py-2 rounded-lg bg-status-error/10 border border-status-error/20">
          {genError}
        </div>
      )}

      {existing ? (
        <InfoBlock icon={Film} label={t("inspector.anim.label")} text={existing} copyable accent />
      ) : (
        <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
          <Film className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <div className="text-xs text-text-secondary mb-3">{t("inspector.anim.empty")}</div>
          <button
            onClick={generate}
            disabled={busy}
            className="text-xs font-medium text-accent-warm hover:brightness-110 transition-all disabled:opacity-50"
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
          className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 text-xs text-text-secondary hover:text-text-primary self-start transition-colors disabled:opacity-50"
        >
          {busy ? "Regenerating..." : "Regenerate"}
        </button>
      )}
    </div>
  );
}

// ─── Refs Tab (shared) ────────────────────────────────────────────────────────

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
              <img src={r.image_url} alt={r.title ?? ""} className="w-full h-full object-cover" />
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

// ─── Shared primitives ────────────────────────────────────────────────────────

function NodeTypeBadge({ type }: { type: string }) {
  const t = useI18n((s) => s.t);
  const cfgMap: Record<string, { dot: string; label: string }> = {
    source:       { dot: "bg-node-source",  label: t("inspector.type.source") },
    shot:         { dot: "bg-node-shot",    label: t("inspector.type.shot") },
    continuation: { dot: "bg-node-cont",    label: t("inspector.type.continuation") },
    note:         { dot: "bg-accent-cool",  label: "Note" },
    concept_card: { dot: "bg-purple-400",   label: "Concept" },
  };
  const cfg = cfgMap[type] ?? { dot: "bg-text-muted", label: type };

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-panel-2 border border-border-subtle">
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      <span className="text-2xs font-mono text-text-secondary uppercase tracking-wider">
        {cfg.label}
      </span>
    </div>
  );
}

function ConceptStatePill({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string }> = {
    idle:       { label: "Ready",      color: "text-text-muted bg-panel-2 border-border-subtle" },
    suggesting: { label: "Suggesting", color: "text-accent-cool bg-accent-cool/10 border-accent-cool/20" },
    generating: { label: "Generating", color: "text-accent-warm bg-accent-warm/10 border-accent-warm/20" },
    done:       { label: "Done",       color: "text-status-success bg-status-success/10 border-status-success/20" },
  };
  const cfg = map[state] ?? map.idle;
  return (
    <span className={cn("inline-flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded-full border", cfg.color)}>
      {state === "generating" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {cfg.label}
    </span>
  );
}

function PurposePill({ purpose }: { purpose: string }) {
  const colorMap: Record<string, string> = {
    hook:    "text-red-400 bg-red-400/10 border-red-400/20",
    setup:   "text-blue-400 bg-blue-400/10 border-blue-400/20",
    tension: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    proof:   "text-green-400 bg-green-400/10 border-green-400/20",
    reveal:  "text-purple-400 bg-purple-400/10 border-purple-400/20",
    cta:     "text-accent-warm bg-accent-warm/10 border-accent-warm/20",
  };
  const color = colorMap[purpose.toLowerCase()] ?? "text-text-muted bg-panel-2 border-border-subtle";
  return (
    <span className={cn("text-2xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border", color)}>
      {purpose}
    </span>
  );
}

function MetaPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-2xs font-mono text-text-muted bg-panel-2 border border-border-subtle px-2 py-0.5 rounded-full">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  text,
  copyable,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
  copyable?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", accent ? "text-accent-warm" : "text-text-muted")} />
          <span className="text-xs font-medium text-text-primary">{label}</span>
        </div>
        {copyable && <CopyButton text={text} />}
      </div>
      <pre
        className={cn(
          "text-xs leading-relaxed font-mono p-3 rounded-lg border max-h-[200px] overflow-y-auto whitespace-pre-wrap",
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas border border-border-subtle">
      <span className="text-2xs text-text-muted font-mono uppercase tracking-wider">{label}</span>
      <span className="text-xs font-medium text-text-primary font-mono">{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onCopy}
      className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TabBar({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex gap-1 px-4 pt-3 border-b border-border-subtle flex-shrink-0" role="tablist" dir="ltr">
      {children}
    </nav>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
        active
          ? "text-accent-warm border-accent-warm"
          : "text-text-secondary border-transparent hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
