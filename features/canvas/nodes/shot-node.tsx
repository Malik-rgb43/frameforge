"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { Eye, Link2, Loader2, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "../store";
import { useI18n } from "@/lib/i18n/store";
import { downloadNodeImage } from "@/features/upload/upload-utils";
import type { NodeRow } from "@/lib/supabase/types";

export interface ShotNodeData {
  row: NodeRow;
}

const STRIP_COLOR: Record<string, string> = {
  source: "bg-node-source",
  shot: "bg-node-shot",
  continuation: "bg-node-cont",
  note: "bg-node-note",
  concept_card: "bg-accent-violet",
};

const STRIP_GLOW: Record<string, string> = {
  source: "shadow-[0_0_12px_rgba(106,227,255,0.35)]",
  shot: "shadow-[0_0_12px_rgba(255,184,107,0.35)]",
  continuation: "shadow-[0_0_12px_rgba(167,139,250,0.35)]",
  note: "",
  concept_card: "shadow-[0_0_12px_rgba(167,139,250,0.35)]",
};

export default function ShotNode({ data, selected }: NodeProps<ShotNodeData>) {
  const { row } = data;
  const t = useI18n((s) => s.t);
  const isRef = useCanvas((s) => s.refNodeIds.includes(row.id));
  const openInspector = useCanvas((s) => s.openInspector);
  const toggleRef = useCanvas((s) => s.toggleRef);

  const type = row.type;
  const stripCls = STRIP_COLOR[type] ?? STRIP_COLOR.shot;
  const glowCls = STRIP_GLOW[type] ?? "";

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden bg-panel transition-all duration-200 ease-spring",
        "border border-border-subtle hover:border-border-hover",
        "hover:-translate-y-0.5 hover:shadow-node-hover active:scale-[0.995]",
        selected && "border-accent-warm shadow-node-hover -translate-y-0.5",
        isRef && "ring-2 ring-accent-warm ring-offset-2 ring-offset-canvas",
        !selected && "shadow-node",
        row.status === "generating" && "ring-1 ring-accent-warm/30"
      )}
      style={{ width: row.w, height: row.h }}
    >
      {/* Inline shimmer stripe while generating — replaces global toast */}
      {row.status === "generating" && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden z-10 pointer-events-none">
          <div className="shimmer-stripe absolute inset-0" />
        </div>
      )}
      {/* Top type strip */}
      <div className={cn("h-[3px] w-full", stripCls, glowCls)} />

      {/* Image / content */}
      <div className="relative flex-1" style={{ height: row.h - 50 }}>
        {row.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image_url}
            alt={row.title ?? ""}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-panel-2">
            {row.status === "generating" ? (
              <>
                <Loader2 className="w-6 h-6 text-accent-warm animate-spin" />
                <span className="text-2xs text-text-secondary font-mono uppercase tracking-wider">
                  {t("node.status.generating")}
                </span>
              </>
            ) : row.status === "error" ? (
              <>
                <AlertCircle className="w-6 h-6 text-status-error" />
                <span className="text-2xs text-status-error font-mono">
                  {t("node.status.error")}
                </span>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/4" />
            )}
          </div>
        )}

        {/* Status badge (top-right) */}
        {row.status !== "ready" && row.image_url && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1.5">
            {row.status === "generating" && (
              <Loader2 className="w-3 h-3 text-accent-warm animate-spin" />
            )}
            {row.status === "error" && (
              <AlertCircle className="w-3 h-3 text-status-error" />
            )}
            <span className="text-2xs text-text-primary font-mono">
              {row.status}
            </span>
          </div>
        )}

        {/* Quality badge (top-left on ready shots) */}
        {row.quality_score != null && row.status === "ready" && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-status-success" />
            <span className="text-2xs text-text-primary font-mono">
              {row.quality_score}
            </span>
          </div>
        )}

        {/* Hover action bar */}
        <div
          className={cn(
            "absolute inset-x-2 bottom-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              openInspector(row.id);
            }}
            className="flex-1 px-2 py-1.5 rounded-md bg-black/70 backdrop-blur-md hover:bg-black/85 text-text-primary text-2xs font-medium flex items-center justify-center gap-1.5 border border-white/5"
            title={t("node.action.inspect")}
          >
            <Eye className="w-3 h-3" />
            {t("node.action.inspect")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRef(row.id);
            }}
            className={cn(
              "px-2 py-1.5 rounded-md backdrop-blur-md text-2xs font-medium flex items-center justify-center gap-1.5 border",
              isRef
                ? "bg-accent-warm/90 text-canvas border-accent-warm"
                : "bg-black/70 hover:bg-black/85 text-text-primary border-white/5"
            )}
            title={t("node.action.addRef")}
          >
            <Link2 className="w-3 h-3" />
          </button>
          {row.image_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadNodeImage(row).catch((err) => console.error("download failed", err));
              }}
              className="px-2 py-1.5 rounded-md backdrop-blur-md text-2xs font-medium flex items-center justify-center gap-1.5 border bg-black/70 hover:bg-black/85 text-text-primary border-white/5"
              title="Download image"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="h-[34px] px-3 flex items-center gap-2 bg-panel-2 border-t border-border-subtle">
        <span
          className="text-xs font-medium text-text-primary truncate flex-1"
          dir="auto"
        >
          {row.title ?? t("node.untitled")}
        </span>
        {row.prompt && (
          <span className="text-2xs font-mono text-text-muted">
            {t("node.promptBadge")}
          </span>
        )}
      </div>

      {/* React Flow handles — all 4 sides */}
      <Handle type="target" position={Position.Left}   id="target-left"   className="!w-3 !h-3 !border-2 !border-canvas !bg-text-muted hover:!bg-accent-cool hover:!border-accent-cool transition-colors" />
      <Handle type="target" position={Position.Top}    id="target-top"    className="!w-3 !h-3 !border-2 !border-canvas !bg-text-muted hover:!bg-accent-cool hover:!border-accent-cool transition-colors" />
      <Handle type="source" position={Position.Right}  id="source-right"  className="!w-3 !h-3 !border-2 !border-canvas !bg-accent-warm hover:!bg-accent-cool hover:!border-accent-cool transition-colors" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-3 !h-3 !border-2 !border-canvas !bg-accent-warm hover:!bg-accent-cool hover:!border-accent-cool transition-colors" />
    </div>
  );
}
