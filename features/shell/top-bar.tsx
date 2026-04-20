"use client";
import Link from "next/link";
import { Menu, Users, LayoutGrid, Target, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas, type ViewMode } from "@/features/canvas/store";
import { useI18n } from "@/lib/i18n/store";

interface Props {
  projectName?: string;
  client?: string;
  onMenu?: () => void;
  onTeam?: () => void;
  onBrief?: () => void;
  briefCompletenessPct?: number;
  onAddBudgetTracker?: () => void;
}

export default function TopBar({
  projectName,
  client,
  onMenu,
  onTeam,
  onBrief,
  briefCompletenessPct,
  onAddBudgetTracker,
}: Props) {
  const t = useI18n((s) => s.t);
  const viewMode = useCanvas((s) => s.viewMode);
  const setViewMode = useCanvas((s) => s.setViewMode);

  return (
    <header className="fixed top-3 inset-x-3 z-10 h-12 flex items-center gap-2 px-3 rounded-2xl glass-panel">
      <Link
        href="/"
        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Dashboard"
        title="All projects"
      >
        <LayoutGrid className="w-4 h-4" />
      </Link>
      <button
        onClick={onMenu}
        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        aria-label={t("shell.menu")}
        title={t("shell.settings")}
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 min-w-0 max-w-[50%]">
        <span
          className="text-sm font-medium text-text-primary truncate"
          dir="auto"
        >
          {projectName ?? t("shell.untitled")}
        </span>
        {client && (
          <>
            <span className="text-text-muted">·</span>
            <span
              className="text-sm text-text-secondary truncate"
              dir="auto"
            >
              {client}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 flex justify-center">
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      <ProjectStats onAddBudget={onAddBudgetTracker} />

      <button
        onClick={onBrief}
        className="h-8 px-2.5 rounded-lg hover:bg-white/5 flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        title="Project brief — AI context"
      >
        <Target className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Brief</span>
        {briefCompletenessPct != null && briefCompletenessPct < 40 && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-warm animate-pulse-subtle" />
        )}
      </button>

      <button
        onClick={onTeam}
        className="h-8 px-2 rounded-lg hover:bg-white/5 flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        aria-label={t("shell.team")}
        title={t("shell.team")}
      >
        <Users className="w-4 h-4" />
        <span className="text-xs font-mono">1</span>
      </button>
      <div
        className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-warm to-accent-cool"
        title="Ori M."
      />
    </header>
  );
}

function ProjectStats({ onAddBudget }: { onAddBudget?: () => void }) {
  const nodes = useCanvas((s) => s.nodes);

  const todayStr = new Date().toDateString();
  let totalCost = 0;
  let todayCost = 0;
  let imageCount = 0;

  for (const n of nodes) {
    if (n.type === "budget_tracker" || n.type === "concept_card") continue;
    if (!n.image_url && n.status !== "ready") continue;
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    const cost = typeof meta.cost_usd === "number" ? meta.cost_usd : 0;
    imageCount++;
    totalCost += cost;
    const ts = (meta.generated_at as string | undefined) ?? n.updated_at;
    if (ts && new Date(ts).toDateString() === todayStr) todayCost += cost;
  }

  return (
    <div className="flex items-center h-8 rounded-lg border border-border-subtle overflow-hidden text-2xs font-mono">
      <div className="flex items-center gap-2 px-2.5 bg-canvas/30">
        <span className="text-text-muted">{imageCount} imgs</span>
        {todayCost > 0 && (
          <>
            <span className="text-border-subtle">·</span>
            <span className="text-text-secondary" title="Spent today">${todayCost.toFixed(3)} today</span>
          </>
        )}
        <span className="text-border-subtle">·</span>
        <span className={cn("font-mono", totalCost > 0 ? "text-accent-warm" : "text-text-muted")} title="Total project spend">
          ${totalCost.toFixed(3)}
        </span>
      </div>
      <button
        onClick={onAddBudget}
        className="h-full px-2 border-l border-border-subtle hover:bg-white/5 text-text-muted hover:text-accent-warm transition-colors"
        title="Add budget tracker card to canvas"
      >
        <DollarSign className="w-3 h-3" />
      </button>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const t = useI18n((s) => s.t);
  return (
    <div className="inline-flex h-8 rounded-lg bg-canvas p-0.5 border border-border-subtle">
      {(["board", "storyboard"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "relative h-full px-4 rounded-md text-xs font-medium transition-all ease-spring duration-200",
            value === m
              ? "bg-panel-2 text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {m === "board" ? t("shell.view.board") : t("shell.view.storyboard")}
        </button>
      ))}
    </div>
  );
}
