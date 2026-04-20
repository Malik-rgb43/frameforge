"use client";
import { useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { useCanvas } from "@/features/canvas/store";
import { Clock, Eye, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDataAdapter } from "@/lib/data-adapter";
import type { NodeRow } from "@/lib/supabase/types";

export default function StoryboardView() {
  const nodes = useCanvas((s) => s.nodes);
  const groups = useCanvas((s) => s.groups);
  const upsertNode = useCanvas((s) => s.upsertNode);
  const openInspector = useCanvas((s) => s.openInspector);

  const allShots = nodes
    .filter((n) => n.type === "shot" || n.type === "continuation")
    .sort((a, b) => a.order_index - b.order_index);

  // Group shots by group_id. Ungrouped shots appear as "Loose shots".
  const grouped = new Map<string, NodeRow[]>();
  for (const s of allShots) {
    const key = s.group_id ?? "__ungrouped__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const sections = Array.from(grouped.entries())
    .map(([key, shots]) => {
      if (key === "__ungrouped__") {
        return {
          id: "__ungrouped__",
          name: "Loose shots",
          color: "#5A5D6A",
          order_index: 9999,
          shots,
        };
      }
      const group = groups.find((g) => g.id === key);
      return {
        id: key,
        name: group?.name ?? "Storyline",
        color: group?.color ?? "#FFB86B",
        order_index: group?.order_index ?? 0,
        shots,
      };
    })
    .filter((s) => s.shots.length > 0)
    .sort((a, b) => a.order_index - b.order_index);

  const shots = allShots; // keep for total count

  const onReorder = useCallback(
    async (reordered: NodeRow[]) => {
      const adapter = await getDataAdapter();
      await Promise.all(
        reordered.map(async (node, i) => {
          if (node.order_index !== i) {
            try {
              const saved = await adapter.updateNode(node.id, {
                order_index: i,
              });
              upsertNode(saved);
            } catch {
              upsertNode({ ...node, order_index: i });
            }
          }
        })
      );
    },
    [upsertNode]
  );

  const totalSec = shots.reduce((sum, s) => {
    const meta = (s.metadata as { durationSeconds?: number } | null) ?? {};
    return sum + (meta.durationSeconds ?? 2);
  }, 0);

  return (
    <div className="absolute inset-0 pt-20 pb-40 px-8 overflow-y-auto bg-canvas">
      <div className="max-w-[1600px] mx-auto">
        {/* Summary row */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-xs font-mono text-text-muted">
            {shots.length} shots
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-xs font-mono text-text-muted flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {totalSec}s
          </span>
        </div>

        {/* One Reorder.Group per section — each storyline is its own timeline */}
        {shots.length === 0 ? (
          <div className="py-20 w-full text-center text-sm text-text-muted">
            No shots yet. Generate some on the Board view.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: section.color }}
                  />
                  <h2 className="text-sm font-semibold text-text-primary">
                    {section.name}
                  </h2>
                  <span className="text-2xs font-mono text-text-muted">
                    {section.shots.length} shots
                  </span>
                </div>
                <Reorder.Group
                  axis="x"
                  values={section.shots}
                  onReorder={onReorder}
                  className="flex gap-3 overflow-x-auto pb-4 list-none"
                >
                  {section.shots.map((shot, i) => (
                    <Reorder.Item key={shot.id} value={shot} className="list-none">
                      <ShotCard
                        shot={shot}
                        index={i}
                        onInspect={() => openInspector(shot.id)}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {/* Per-section timeline bar */}
                <div className="flex items-center gap-2">
                  {section.shots.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="h-1 rounded-full flex-1 origin-left"
                      style={{ background: section.color, opacity: 0.65 }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

{/* Per-section timeline bars render inline above */}
      </div>
    </div>
  );
}

function ShotCard({
  shot,
  index,
  onInspect,
}: {
  shot: NodeRow;
  index: number;
  onInspect: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative flex-shrink-0 w-[260px] snap-start group"
    >
      <div
        className={cn(
          "rounded-xl overflow-hidden bg-panel border transition-colors",
          shot.type === "continuation"
            ? "border-accent-violet/30"
            : "border-border-subtle hover:border-border-hover"
        )}
      >
        {/* Number badge */}
        <div className="relative aspect-[9/16] bg-canvas">
          {shot.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-2xs font-mono">
              no image
            </div>
          )}
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-accent-warm text-canvas font-bold text-sm flex items-center justify-center shadow-lg">
            {index + 1}
          </div>
          {shot.type === "continuation" && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-accent-violet/80 backdrop-blur-sm text-2xs font-mono uppercase tracking-wider text-white">
              cont
            </div>
          )}

          {/* Hover actions */}
          <button
            onClick={onInspect}
            className="absolute inset-x-2 bottom-2 h-9 rounded-md bg-black/70 backdrop-blur-md text-xs text-text-primary font-medium flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect
          </button>
        </div>

        <div className="p-3">
          <div className="text-sm font-medium text-text-primary truncate" dir="auto">
            {shot.title ?? "Untitled"}
          </div>
          {shot.prompt && (
            <div className="text-2xs text-text-muted line-clamp-2 mt-1 leading-relaxed" dir="auto">
              {shot.prompt}
            </div>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <button
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-md bg-panel-2 border border-border-subtle flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3 h-3 text-text-muted" />
      </button>
    </motion.div>
  );
}
