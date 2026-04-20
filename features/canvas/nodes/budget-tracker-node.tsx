"use client";
import { type NodeProps } from "reactflow";
import { DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "../store";
import type { NodeRow } from "@/lib/supabase/types";

export default function BudgetTrackerNode({ data, selected }: NodeProps<{ row: NodeRow }>) {
  const { row } = data;
  const nodes = useCanvas((s) => s.nodes);

  // Sum all cost_usd from all non-budget-tracker nodes on this board
  let totalCost = 0;
  let generatedCount = 0;
  let uploadedCount = 0;

  for (const n of nodes) {
    if (n.type === ("budget_tracker" as NodeRow["type"])) continue;
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    if (meta.uploaded) {
      uploadedCount++;
    } else if (n.image_url || n.status === "ready") {
      generatedCount++;
      totalCost += typeof meta.cost_usd === "number" ? meta.cost_usd : 0;
    }
  }

  const sessionBudget = (row.metadata as Record<string, unknown>)?.budget_limit as number | undefined;
  const overBudget = sessionBudget != null && totalCost > sessionBudget;

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-panel backdrop-blur-sm transition-all duration-200 ease-spring overflow-hidden border",
        selected
          ? "border-status-success shadow-[0_0_0_1px_rgba(74,222,128,0.4),0_8px_32px_rgba(74,222,128,0.15)]"
          : overBudget
          ? "border-status-error/50 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "border-status-success/25 shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
      )}
      style={{ width: row.w ?? 220 }}
    >
      {/* Glowing top bar */}
      <div className={cn("h-[2px] w-full", overBudget ? "bg-status-error" : "bg-status-success")} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2.5">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", overBudget ? "bg-status-error/15" : "bg-status-success/15")}>
          <DollarSign className={cn("w-3.5 h-3.5", overBudget ? "text-status-error" : "text-status-success")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary leading-none">Budget</div>
          <div className="text-[10px] text-text-muted mt-0.5">Real-time spend</div>
        </div>
        <TrendingUp className={cn("w-4 h-4 flex-shrink-0", overBudget ? "text-status-error" : "text-status-success")} />
      </div>

      <div className="mx-4 h-px bg-border-subtle" />

      {/* Body */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        <div className={cn("text-2xl font-bold font-mono tracking-tight", overBudget ? "text-status-error" : "text-status-success")}>
          ${totalCost.toFixed(4)}
        </div>

        {sessionBudget != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", overBudget ? "bg-status-error" : "bg-status-success")}
                style={{ width: `${Math.min(100, (totalCost / sessionBudget) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-text-muted">${sessionBudget.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1">
          <div className="flex flex-col">
            <span className="text-lg font-semibold font-mono text-text-primary">{generatedCount}</span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">generated</span>
          </div>
          <div className="w-px h-8 bg-border-subtle" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold font-mono text-text-primary">{uploadedCount}</span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">uploaded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
