"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { GenerationLog } from "@/lib/supabase/types";
import { IMAGE_MODELS, TEXT_MODELS, formatUsd } from "@/lib/ai/pricing";

export default function UsagePage() {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const sb = createClient();
        const since =
          range === "7d"
            ? new Date(Date.now() - 7 * 86400000).toISOString()
            : range === "30d"
              ? new Date(Date.now() - 30 * 86400000).toISOString()
              : new Date(0).toISOString();
        const { data } = await sb
          .from("generations_log")
          .select("*")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!active) return;
        setLogs((data ?? []) as GenerationLog[]);
      } catch (err) {
        console.error("usage fetch", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);

  const stats = useMemo(() => {
    const total = logs.reduce((s, l) => s + Number(l.cost_usd ?? 0), 0);
    const images = logs.reduce((s, l) => s + (l.images_generated ?? 0), 0);
    const textCalls = logs.filter((l) => l.model.startsWith("gemini")).length;
    const errors = logs.filter((l) => l.status === "error").length;

    // Per-day breakdown (last 14 days)
    const byDay: Record<string, number> = {};
    for (const l of logs) {
      const d = new Date(l.created_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + Number(l.cost_usd ?? 0);
    }

    // Per-model breakdown
    const byModel: Record<string, { cost: number; count: number }> = {};
    for (const l of logs) {
      const m = l.model;
      byModel[m] = byModel[m] ?? { cost: 0, count: 0 };
      byModel[m].cost += Number(l.cost_usd ?? 0);
      byModel[m].count += 1;
    }

    return { total, images, textCalls, errors, byDay, byModel };
  }, [logs]);

  return (
    <main className="min-h-screen bg-canvas">
      <header className="h-16 border-b border-border-subtle flex items-center gap-4 px-6">
        <Link
          href="/"
          className="h-8 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold">Usage &amp; Costs</h1>
          <p className="text-2xs text-text-muted">
            Real API costs tracked from generations_log
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </header>

      <section className="max-w-[1400px] mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border-subtle bg-panel h-28 animate-pulse-subtle"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign}
                label="Total spend"
                value={formatUsd(stats.total)}
                accent="warm"
              />
              <StatCard
                icon={ImageIcon}
                label="Images generated"
                value={stats.images.toString()}
                accent="cool"
              />
              <StatCard
                icon={Sparkles}
                label="Text calls"
                value={stats.textCalls.toString()}
                accent="violet"
              />
              <StatCard
                icon={AlertCircle}
                label="Errors"
                value={stats.errors.toString()}
                accent={stats.errors > 0 ? "error" : "muted"}
              />
            </div>

            {/* Daily spend bar chart */}
            <div className="mt-6 rounded-xl bg-panel border border-border-subtle p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Daily spend</h2>
                <TrendingUp className="w-4 h-4 text-text-muted" />
              </div>
              <DailyChart byDay={stats.byDay} />
            </div>

            {/* Per-model breakdown */}
            <div className="mt-6 rounded-xl bg-panel border border-border-subtle p-5">
              <h2 className="text-sm font-semibold mb-4">Spend by model</h2>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.byModel)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([modelId, info]) => (
                    <ModelRow
                      key={modelId}
                      modelId={modelId}
                      cost={info.cost}
                      count={info.count}
                      maxCost={Math.max(
                        ...Object.values(stats.byModel).map((x) => x.cost)
                      )}
                    />
                  ))}
              </div>
            </div>

            {/* Recent log */}
            <div className="mt-6 rounded-xl bg-panel border border-border-subtle overflow-hidden">
              <div className="p-5 pb-3">
                <h2 className="text-sm font-semibold">Recent generations</h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-border-subtle text-text-muted font-mono uppercase tracking-wider">
                    <th className="text-left font-medium py-2 px-5">When</th>
                    <th className="text-left font-medium py-2 px-5">Action</th>
                    <th className="text-left font-medium py-2 px-5">Model</th>
                    <th className="text-right font-medium py-2 px-5">
                      Duration
                    </th>
                    <th className="text-right font-medium py-2 px-5">Cost</th>
                    <th className="text-right font-medium py-2 px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 30).map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: "7d" | "30d" | "all";
  onChange: (v: "7d" | "30d" | "all") => void;
}) {
  return (
    <div className="inline-flex h-8 rounded-lg bg-panel p-0.5 border border-border-subtle">
      {(["7d", "30d", "all"] as const).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "h-full px-3 rounded-md text-xs font-medium transition-colors",
            value === r
              ? "bg-panel-2 text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "warm" | "cool" | "violet" | "error" | "muted";
}) {
  const cfg = {
    warm: "bg-accent-warm/10 border-accent-warm/20 text-accent-warm",
    cool: "bg-accent-cool/10 border-accent-cool/20 text-accent-cool",
    violet: "bg-accent-violet/10 border-accent-violet/20 text-accent-violet",
    error: "bg-status-error/10 border-status-error/20 text-status-error",
    muted: "bg-white/5 border-border-subtle text-text-muted",
  }[accent];
  return (
    <div className="rounded-xl bg-panel border border-border-subtle p-5">
      <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center mb-3", cfg)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold tracking-tight text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary mt-1">{label}</div>
    </div>
  );
}

function DailyChart({ byDay }: { byDay: Record<string, number> }) {
  // Last 14 days
  const days: { date: string; cost: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, cost: byDay[d] ?? 0 });
  }
  const max = Math.max(...days.map((d) => d.cost), 0.0001);

  return (
    <div className="flex items-end gap-1.5 h-32">
      {days.map((d) => {
        const h = (d.cost / max) * 100;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group"
            title={`${d.date}: ${formatUsd(d.cost)}`}
          >
            <div
              className="w-full rounded-t bg-gradient-to-t from-accent-warm/70 to-accent-warm/30 group-hover:from-accent-warm group-hover:to-accent-warm/60 transition-colors"
              style={{ height: `${Math.max(h, 2)}%` }}
            />
            <span className="text-[9px] font-mono text-text-muted">
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ModelRow({
  modelId,
  cost,
  count,
  maxCost,
}: {
  modelId: string;
  cost: number;
  count: number;
  maxCost: number;
}) {
  const all = [...IMAGE_MODELS, ...TEXT_MODELS];
  const model = all.find((m) => m.id === modelId);
  const label = model?.label ?? modelId;
  const kind = model?.kind;
  const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-text-primary truncate">{label}</div>
      <div className="flex-1 h-5 rounded bg-canvas overflow-hidden">
        <div
          className={cn(
            "h-full rounded",
            kind === "image" ? "bg-accent-warm/70" : "bg-accent-cool/70"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 text-right text-2xs font-mono text-text-muted">
        {count} calls
      </div>
      <div className="w-20 text-right text-xs font-mono text-text-primary">
        {formatUsd(cost)}
      </div>
    </div>
  );
}

function LogRow({ log }: { log: GenerationLog }) {
  const when = new Date(log.created_at);
  const minsAgo = Math.floor((Date.now() - when.getTime()) / 60000);
  const label =
    minsAgo < 60
      ? `${minsAgo}m ago`
      : minsAgo < 1440
        ? `${Math.floor(minsAgo / 60)}h ago`
        : `${Math.floor(minsAgo / 1440)}d ago`;

  return (
    <tr className="border-t border-border-subtle hover:bg-white/3 transition-colors">
      <td className="py-2 px-5 text-text-muted">{label}</td>
      <td className="py-2 px-5 text-text-primary font-mono text-[11px]">
        {log.action}
      </td>
      <td className="py-2 px-5 text-text-secondary font-mono text-[11px]">
        {log.model}
      </td>
      <td className="py-2 px-5 text-right text-text-muted font-mono text-[11px] flex items-center justify-end gap-1">
        <Clock className="w-2.5 h-2.5" />
        {log.duration_ms ? `${log.duration_ms}ms` : "—"}
      </td>
      <td className="py-2 px-5 text-right text-text-primary font-mono">
        {formatUsd(Number(log.cost_usd ?? 0))}
      </td>
      <td className="py-2 px-5 text-right">
        {log.status === "ok" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success inline-block" />
        ) : log.status === "error" ? (
          <span className="text-status-error flex items-center gap-1 justify-end">
            <AlertCircle className="w-3.5 h-3.5" />
            error
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="py-24 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
        <DollarSign className="w-7 h-7 text-accent-warm" />
      </div>
      <h3 className="text-lg font-semibold">No API usage yet</h3>
      <p className="text-sm text-text-secondary max-w-sm">
        Once you start generating images and concepts, real costs will appear
        here — tracked per call, per model, per project.
      </p>
    </div>
  );
}
