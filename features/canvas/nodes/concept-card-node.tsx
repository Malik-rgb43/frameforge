"use client";
import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  Loader2,
  Wand2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "../store";
import {
  generateWorkflow,
  suggestConceptIdeas,
  getConnectedRefImages,
} from "@/features/concept-card/concept-card-logic";
import type { NodeRow } from "@/lib/supabase/types";

function shotsFromDuration(sec: number): number {
  if (sec <= 6) return 3;
  if (sec <= 9) return 4;
  if (sec <= 15) return 6;
  if (sec <= 30) return 10;
  if (sec <= 45) return 14;
  return 18;
}

function AspectIcon({ ratio, active }: { ratio: string; active: boolean }) {
  const cls = cn(
    "border rounded-[1px] transition-colors",
    active ? "border-accent-violet" : "border-current opacity-60"
  );
  if (ratio === "9:16") return <div className={cn(cls, "w-[7px] h-[10px]")} />;
  if (ratio === "1:1") return <div className={cn(cls, "w-[9px] h-[9px]")} />;
  return <div className={cn(cls, "w-[12px] h-[7px]")} />;
}

export default function ConceptCardNode({
  data,
  selected,
}: NodeProps<{ row: NodeRow }>) {
  const { row } = data;
  const updateNode = useCanvas((s) => s.updateNode);
  const meta = (row.metadata ?? {}) as {
    idea?: string;
    concept_state?: "idle" | "suggesting" | "ready" | "generating" | "done";
    suggestions?: string[];
    duration_sec?: number;
    shot_count?: number;
    aspect?: string;
    concept_brief?: string;
  };

  const [idea, setIdea] = useState(meta.idea ?? "");
  const [durationSec, setDurationSec] = useState(meta.duration_sec ?? 15);
  const [aspect, setAspect] = useState(meta.aspect ?? "9:16");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(
    meta.suggestions ?? []
  );
  const state = meta.concept_state ?? "idle";

  const saveMeta = (patch: Record<string, unknown>) => {
    const latestNode = useCanvas.getState().nodes.find((n) => n.id === row.id);
    const latestMeta = (latestNode?.metadata ?? {}) as Record<string, unknown>;
    updateNode(row.id, {
      metadata: { ...latestMeta, ...patch } as import("@/lib/supabase/types").Json,
      updated_at: new Date().toISOString(),
    });
  };

  const runSuggest = async () => {
    setSuggesting(true);
    try {
      const refImages = await getConnectedRefImages(row.id);
      const ideas = await suggestConceptIdeas(idea || "", refImages);
      setSuggestions(ideas);
      updateNode(row.id, {
        metadata: { ...meta, suggestions: ideas },
        updated_at: new Date().toISOString(),
      });
    } finally {
      setSuggesting(false);
    }
  };

  const runGenerate = async () => {
    saveMeta({
      idea,
      duration_sec: durationSec,
      shot_count: shotsFromDuration(durationSec),
      aspect,
    });
    try {
      await generateWorkflow(row.id);
    } catch (err) {
      console.error("workflow failed", err);
    }
  };

  const isDone = state === "done";
  const isGen = state === "generating" || row.status === "generating";
  const canGenerate = idea.trim().length > 0 && !isGen;
  const shotCount = shotsFromDuration(durationSec);

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-panel overflow-hidden transition-all duration-200",
        selected
          ? "border border-accent-violet shadow-[0_0_0_1px_rgba(167,139,250,0.5),0_8px_32px_rgba(167,139,250,0.2)]"
          : "border border-accent-violet/25 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      )}
      style={{ width: row.w ?? 300 }}
    >
      {/* Top glow line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent-violet to-transparent" />

      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 bg-gradient-to-b from-accent-violet/10 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-violet/30 to-accent-violet/10 border border-accent-violet/25 flex items-center justify-center flex-shrink-0">
            <Film className="w-3.5 h-3.5 text-accent-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Concept</span>
              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">
              {isGen
                ? "Building workflow…"
                : isDone
                ? "Workflow ready"
                : "Idea → storyboard"}
            </div>
          </div>
          {!isDone && !isGen && (
            <div className="px-2 py-0.5 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-[9px] font-mono text-accent-violet whitespace-nowrap">
              {shotCount} shots
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="nodrag px-3 pt-1 pb-3 flex flex-col gap-2">
        {isGen ? (
          /* Generating */
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full bg-accent-violet/15 animate-ping" />
              <div className="w-10 h-10 rounded-full bg-accent-violet/10 border border-accent-violet/25 flex items-center justify-center relative">
                <Loader2 className="w-4 h-4 text-accent-violet animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-text-primary">
                Generating {shotCount} shots
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Building images for each scene…
              </div>
            </div>
          </div>
        ) : isDone ? (
          /* Done */
          <div className="flex flex-col gap-2 pt-1">
            <div className="text-[11px] text-text-secondary leading-relaxed">
              {meta.idea}
            </div>
            {meta.concept_brief && (
              <div className="rounded-xl bg-canvas/60 border border-border-subtle/50 p-2.5">
                <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1">
                  Brief
                </div>
                <div className="text-[10px] text-text-secondary leading-relaxed max-h-[120px] overflow-y-auto">
                  {meta.concept_brief}
                </div>
              </div>
            )}
            <button
              onClick={() => saveMeta({ concept_state: "idle" })}
              className="flex items-center gap-1.5 text-[10px] text-accent-violet/70 hover:text-accent-violet transition-colors w-fit mt-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Edit &amp; regenerate
            </button>
          </div>
        ) : (
          <>
            {/* Textarea with inline suggest button */}
            <div className="relative">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onBlur={() => saveMeta({ idea })}
                rows={3}
                dir="auto"
                placeholder="Describe the concept…"
                className="w-full bg-canvas/50 rounded-xl px-2.5 py-2 pr-8 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-violet/30 resize-none leading-relaxed border border-border-subtle/50 focus:border-accent-violet/20"
              />
              <button
                onClick={runSuggest}
                disabled={suggesting}
                className="absolute top-2 right-2 w-5 h-5 rounded-md bg-accent-violet/15 hover:bg-accent-violet/30 flex items-center justify-center transition-colors"
                title="Suggest ideas"
              >
                {suggesting ? (
                  <Loader2 className="w-3 h-3 text-accent-violet animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-accent-violet" />
                )}
              </button>
            </div>

            {/* Suggestion chips */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIdea(s);
                      saveMeta({ idea: s });
                    }}
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full border transition-all leading-tight",
                      idea === s
                        ? "bg-accent-violet/20 border-accent-violet/50 text-accent-violet"
                        : "bg-canvas/50 border-border-subtle/40 text-text-muted hover:text-text-secondary hover:border-border-subtle"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Duration + Aspect controls */}
            <div className="flex items-center gap-1.5">
              {/* Duration segmented */}
              <div className="flex items-center rounded-lg overflow-hidden border border-border-subtle/50 bg-canvas/40">
                {[6, 9, 15, 30, 45, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDurationSec(d);
                      saveMeta({
                        duration_sec: d,
                        shot_count: shotsFromDuration(d),
                      });
                    }}
                    className={cn(
                      "px-1.5 h-[22px] text-[9px] font-mono transition-all",
                      durationSec === d
                        ? "bg-accent-violet/25 text-accent-violet"
                        : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Aspect ratio icon buttons */}
              <div className="flex items-center rounded-lg overflow-hidden border border-border-subtle/50 bg-canvas/40">
                {["9:16", "1:1", "16:9"].map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setAspect(a);
                      saveMeta({ aspect: a });
                    }}
                    className={cn(
                      "w-[28px] h-[22px] flex items-center justify-center transition-all",
                      aspect === a
                        ? "bg-accent-violet/25 text-accent-violet"
                        : "text-text-muted hover:text-text-secondary hover:bg-white/5"
                    )}
                    title={a}
                  >
                    <AspectIcon ratio={a} active={aspect === a} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Generate button */}
      {!isDone && (
        <div className="nodrag px-3 pb-3">
          <button
            onClick={runGenerate}
            disabled={!canGenerate}
            className={cn(
              "w-full h-9 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-2 transition-all ease-spring",
              canGenerate && !isGen
                ? "bg-accent-violet text-white shadow-[0_2px_20px_rgba(167,139,250,0.4)] hover:brightness-110 hover:shadow-[0_2px_28px_rgba(167,139,250,0.55)]"
                : "bg-white/5 text-text-muted cursor-not-allowed"
            )}
          >
            {isGen ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {isGen ? "Generating…" : `Generate ${shotCount} shots`}
          </button>
        </div>
      )}

      {/* Refs come in: Left + Top */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-4 !h-4 !bg-accent-violet/60 hover:!bg-accent-violet !border-2 !border-panel transition-colors"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-4 !h-4 !bg-accent-violet/60 hover:!bg-accent-violet !border-2 !border-panel transition-colors"
      />
      {/* Shots flow out: Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-4 !h-4 !bg-accent-violet hover:!bg-white !border-2 !border-panel transition-colors"
      />
    </div>
  );
}
