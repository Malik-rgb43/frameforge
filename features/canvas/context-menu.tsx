"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  Link2,
  Copy,
  Trash2,
  Layers,
  LayersIcon,
  Lightbulb,
  Zap,
  Sparkles,
  Link as LinkIcon,
  AlignJustify,
  DollarSign,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "./store";
import { createContinuation } from "@/features/continuity/next-shot";
import {
  createConceptCard,
  groupSelectedNodes,
  ungroupSelectedNodes,
} from "@/features/concept-card/concept-card-logic";
import { getDataAdapter } from "@/lib/data-adapter";
import type { NodeRow } from "@/lib/supabase/types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "nd_" + Math.random().toString(36).slice(2);

interface Props {
  onEnhance?: (nodeId: string) => void;
  onMagicExpand?: (nodeId: string) => void;
}

export default function CanvasContextMenu({ onEnhance, onMagicExpand }: Props) {
  const menu = useCanvas((s) => s.contextMenu);
  const close = useCanvas((s) => s.closeContextMenu);
  const selectedIds = useCanvas((s) => s.selectedNodeIds);
  const nodes = useCanvas((s) => s.nodes);
  const openInspector = useCanvas((s) => s.openInspector);
  const toggleRef = useCanvas((s) => s.toggleRef);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, close]);

  if (!menu) return null;

  const nodeId = menu.nodeId;
  const node = nodeId ? nodes.find((n) => n.id === nodeId) : null;
  const multi = selectedIds.length > 1;
  const hasGroupableSelection = multi;
  const selectionHasGroups = selectedIds.some(
    (id) => nodes.find((n) => n.id === id)?.group_id
  );

  // Multi-select: connect refs → single concept card
  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));
  const conceptCardsInSelection = selectedNodes.filter((n) => n.type === "concept_card");
  const refNodesInSelection = selectedNodes.filter((n) => n.type !== "concept_card");
  const canConnectToConceptCard =
    multi && conceptCardsInSelection.length === 1 && refNodesInSelection.length > 0;

  const connectSelectedToConcept = () => {
    const conceptCard = conceptCardsInSelection[0];
    const store = useCanvas.getState();
    for (const ref of refNodesInSelection) {
      store.addEdge(ref.id, conceptCard.id);
    }
  };

  const SHOT_GAP = 20;

  // Smart sort: arranges nodes in an optimal grid based on count.
  // Concept cards stay in place; shot/source/continuation nodes are gridded.
  const smartSort = (ids: string[]) => {
    const state = useCanvas.getState();
    const selected = state.nodes.filter(n => ids.includes(n.id));
    const concepts = selected.filter(n => n.type === 'concept_card');
    const shots = selected.filter(n => n.type !== 'concept_card');
    if (shots.length === 0) return;

    // Use center of bounding box as anchor
    const minX = Math.min(...shots.map(n => n.x));
    const minY = Math.min(...shots.map(n => n.y));

    // Optimal columns: sqrt to get a roughly square grid, biased toward wider layouts
    const cols = shots.length <= 4 ? shots.length
      : shots.length <= 9 ? Math.ceil(Math.sqrt(shots.length))
      : Math.min(5, Math.ceil(Math.sqrt(shots.length)));

    // Sort shots: if concept card present, sort by connection (edges) then by existing x/y order
    const sortedShots = [...shots].sort((a, b) => a.x - b.x || a.y - b.y);

    sortedShots.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = minX + col * (n.w + SHOT_GAP);
      const y = minY + row * (n.h + SHOT_GAP);
      state.moveNode(n.id, x, y);
    });

    // If there's a concept card, place it to the left of the grid
    if (concepts.length > 0) {
      const card = concepts[0];
      const gridWidth = cols * (shots[0].w + SHOT_GAP) - SHOT_GAP;
      state.moveNode(card.id, minX - (card.w ?? 300) - 60, minY);
    }
  };

  const arrangeSelectedNodes = () => {
    const ids = selectedIds.length > 0 ? selectedIds : useCanvas.getState().nodes.map(n => n.id);
    smartSort(ids);
  };

  const arrangeAllNodes = () => {
    smartSort(useCanvas.getState().nodes.map(n => n.id));
  };

  const act = async (fn: () => unknown | Promise<unknown>) => {
    close();
    await Promise.resolve(fn());
  };

  const duplicate = async () => {
    if (!node) return;
    const adapter = await getDataAdapter();
    const input: Omit<NodeRow, "id" | "created_at" | "updated_at"> = {
      ...node,
      x: node.x + 40,
      y: node.y + 40,
      order_index: nodes.length,
      title: (node.title ?? "Copy") + " (copy)",
    } as Omit<NodeRow, "id" | "created_at" | "updated_at">;
    try {
      const saved = await adapter.createNode(input);
      useCanvas.getState().upsertNode(saved);
    } catch {
      useCanvas.getState().upsertNode({
        ...input,
        id: uid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as NodeRow);
    }
  };

  const del = async () => {
    if (!node) return;
    const adapter = await getDataAdapter();
    try {
      await adapter.deleteNode(node.id);
    } catch {
      /* ignore */
    }
    useCanvas.getState().removeNode(node.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed z-50 min-w-[220px] rounded-xl glass-panel shadow-panel border border-border-subtle overflow-hidden py-1"
        style={{
          left: Math.min(menu.x, window.innerWidth - 240),
          top: Math.min(menu.y, window.innerHeight - 320),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pane menu (right-click on empty canvas) */}
        {!node && (
          <>
            <MenuItem
              icon={Lightbulb}
              label="Create Concept Card"
              hint="C"
              onClick={() =>
                act(async () => {
                  await createConceptCard({ x: menu.x - 100, y: menu.y - 60 });
                })
              }
            />
            <MenuItem
              icon={DollarSign}
              label="Add Budget Tracker"
              onClick={() =>
                act(async () => {
                  const adapter = await getDataAdapter();
                  const state = useCanvas.getState();
                  const boardId = state.boardId;
                  if (!boardId) return;
                  const input: Omit<NodeRow, "id" | "created_at" | "updated_at"> = {
                    board_id: boardId,
                    group_id: null,
                    type: "budget_tracker" as NodeRow["type"],
                    x: menu.x - 110,
                    y: menu.y - 60,
                    w: 220,
                    h: 160,
                    order_index: state.nodes.length,
                    image_url: null,
                    thumbnail_url: null,
                    prompt: null,
                    prompt_enhanced: null,
                    title: "Budget Tracker",
                    status: "ready",
                    quality_score: null,
                    metadata: {},
                  };
                  try {
                    const saved = await adapter.createNode(input);
                    state.upsertNode(saved);
                  } catch {
                    state.upsertNode({
                      ...input,
                      id: crypto.randomUUID(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    } as NodeRow);
                  }
                })
              }
            />
            <Divider />
            <MenuItem
              icon={LayoutGrid}
              label="Sort all nodes"
              onClick={() => act(arrangeAllNodes)}
            />
            {hasGroupableSelection && <Divider />}
          </>
        )}

        {/* Node menu */}
        {node && !multi && (
          <>
            <MenuItem
              icon={Eye}
              label="Inspect"
              hint="Dbl"
              onClick={() => act(() => openInspector(node.id))}
            />
            <MenuItem
              icon={Link2}
              label="Toggle as reference"
              hint="⇧ click"
              onClick={() => act(() => toggleRef(node.id))}
            />
            {node.image_url && (
              <>
                <Divider />
                <MenuItem
                  icon={Zap}
                  label="Enhance"
                  hint="E"
                  onClick={() => act(() => onEnhance?.(node.id))}
                />
                <MenuItem
                  icon={Sparkles}
                  label="Magic Expand"
                  hint="M"
                  onClick={() => act(() => onMagicExpand?.(node.id))}
                />
              </>
            )}
            {(node.type === "shot" || node.type === "continuation") && (
              <MenuItem
                icon={LinkIcon}
                label="Create next shot"
                hint="⌘→"
                onClick={() => act(() => createContinuation(node.id))}
              />
            )}
            <Divider />
            <MenuItem icon={Copy} label="Duplicate" hint="⌘D" onClick={() => act(duplicate)} />
            <MenuItem
              icon={Trash2}
              label="Delete"
              hint="Del"
              onClick={() => act(del)}
              danger
            />
          </>
        )}

        {/* Multi-select menu */}
        {hasGroupableSelection && (
          <>
            {/* Cost summary */}
            {(() => {
              let generated = 0, uploaded = 0, totalCost = 0;
              for (const id of selectedIds) {
                const n = nodes.find(x => x.id === id);
                if (!n) continue;
                const meta = (n.metadata ?? {}) as Record<string, unknown>;
                if (meta.uploaded) { uploaded++; }
                else if (n.image_url || n.status === 'ready') {
                  generated++;
                  totalCost += typeof meta.cost_usd === "number" ? meta.cost_usd : 0;
                }
              }
              if (generated === 0 && uploaded === 0) return null;
              return (
                <div className="px-3 py-2 flex items-center gap-2 border-b border-border-subtle">
                  <span className="text-2xs text-text-muted flex-1">
                    {generated > 0 && `${generated} generated`}
                    {generated > 0 && uploaded > 0 && ' · '}
                    {uploaded > 0 && `${uploaded} uploaded ($0)`}
                  </span>
                  {totalCost > 0 && (
                    <span className="text-2xs font-mono text-accent-warm">
                      ~${totalCost.toFixed(4)}
                    </span>
                  )}
                </div>
              );
            })()}
            <MenuItem
              icon={Layers}
              label={`Group ${selectedIds.length} nodes`}
              onClick={() => act(() => groupSelectedNodes())}
            />
            {selectionHasGroups && (
              <MenuItem
                icon={LayersIcon}
                label="Ungroup selection"
                onClick={() => act(() => ungroupSelectedNodes())}
              />
            )}
            {canConnectToConceptCard && (
              <MenuItem
                icon={Link2}
                label={`Connect ${refNodesInSelection.length} refs → concept`}
                onClick={() => act(connectSelectedToConcept)}
              />
            )}
            <MenuItem
              icon={LayoutGrid}
              label="Sort"
              hint="⌘⇧S"
              onClick={() => act(arrangeSelectedNodes)}
            />
            <Divider />
            <MenuItem
              icon={Copy}
              label="Duplicate all"
              onClick={() =>
                act(async () => {
                  const adapter = await getDataAdapter();
                  for (const id of selectedIds) {
                    const n = nodes.find((x) => x.id === id);
                    if (!n) continue;
                    try {
                      const input: Omit<
                        NodeRow,
                        "id" | "created_at" | "updated_at"
                      > = {
                        ...n,
                        x: n.x + 40,
                        y: n.y + 40,
                        order_index: nodes.length,
                      } as Omit<NodeRow, "id" | "created_at" | "updated_at">;
                      const saved = await adapter.createNode(input);
                      useCanvas.getState().upsertNode(saved);
                    } catch {
                      /* ignore */
                    }
                  }
                })
              }
            />
            <MenuItem
              icon={Trash2}
              label="Delete all"
              danger
              onClick={() =>
                act(async () => {
                  const adapter = await getDataAdapter();
                  for (const id of selectedIds) {
                    try {
                      await adapter.deleteNode(id);
                    } catch {
                      /* ignore */
                    }
                    useCanvas.getState().removeNode(id);
                  }
                })
              }
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-8 px-3 flex items-center gap-2 text-xs text-left transition-colors",
        danger
          ? "text-status-error hover:bg-status-error/10"
          : "text-text-primary hover:bg-white/5"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="flex-1">{label}</span>
      {hint && <span className="font-mono text-2xs text-text-muted">{hint}</span>}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-border-subtle my-1" />;
}
