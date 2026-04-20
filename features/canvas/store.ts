"use client";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { EdgeRow, NodeGroup, NodeRow } from "@/lib/supabase/types";

export type ViewMode = "board" | "storyboard";

interface CanvasState {
  boardId: string | null;
  nodes: NodeRow[];
  edges: EdgeRow[];
  groups: NodeGroup[];

  selectedNodeIds: string[];
  hoveredNodeId: string | null;

  refNodeIds: string[]; // selected as references for next generation
  inspectorNodeId: string | null; // which node is open in inspector

  viewMode: ViewMode;

  // Context menu (right-click)
  contextMenu: { x: number; y: number; nodeId: string | null } | null;
  openContextMenu: (x: number, y: number, nodeId: string | null) => void;
  closeContextMenu: () => void;

  // Data loading
  setBoard: (
    boardId: string,
    nodes: NodeRow[],
    edges: EdgeRow[],
    groups?: NodeGroup[]
  ) => void;

  // Group ops
  upsertGroup: (group: NodeGroup) => void;
  removeGroup: (id: string) => void;
  assignToGroup: (nodeIds: string[], groupId: string | null) => void;

  // Node ops
  upsertNode: (node: NodeRow) => void;
  updateNode: (id: string, patch: Partial<NodeRow>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;

  // Edge ops
  upsertEdge: (edge: EdgeRow) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (id: string) => void;

  // Selection
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;

  // Refs
  toggleRef: (id: string) => void;
  addRefs: (ids: string[]) => void;
  clearRefs: () => void;

  // Inspector
  openInspector: (id: string) => void;
  closeInspector: () => void;

  // View mode
  setViewMode: (m: ViewMode) => void;
}

export const useCanvas = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    boardId: null,
    nodes: [],
    edges: [],
    groups: [],

    contextMenu: null,
    openContextMenu: (x, y, nodeId) => set({ contextMenu: { x, y, nodeId } }),
    closeContextMenu: () => set({ contextMenu: null }),

    selectedNodeIds: [],
    hoveredNodeId: null,

    refNodeIds: [],
    inspectorNodeId: null,

    viewMode: "board",

    setBoard: (boardId, nodes, edges, groups = []) =>
      set({
        boardId,
        nodes,
        edges,
        groups,
        selectedNodeIds: [],
        refNodeIds: [],
        inspectorNodeId: null,
      }),

    upsertGroup: (group) =>
      set((s) => {
        const idx = s.groups.findIndex((g) => g.id === group.id);
        if (idx === -1) return { groups: [...s.groups, group] };
        const next = [...s.groups];
        next[idx] = group;
        return { groups: next };
      }),

    removeGroup: (id) =>
      set((s) => ({
        groups: s.groups.filter((g) => g.id !== id),
        nodes: s.nodes.map((n) =>
          n.group_id === id ? { ...n, group_id: null } : n
        ),
      })),

    assignToGroup: (nodeIds, groupId) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          nodeIds.includes(n.id) ? { ...n, group_id: groupId } : n
        ),
      })),

    upsertNode: (node) =>
      set((s) => {
        const idx = s.nodes.findIndex((n) => n.id === node.id);
        if (idx === -1) return { nodes: [...s.nodes, node] };
        const next = [...s.nodes];
        next[idx] = node;
        return { nodes: next };
      }),

    updateNode: (id, patch) => {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }));
      import("@/lib/data-adapter").then(({ getDataAdapter }) =>
        Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter.updateNode(id, patch).catch(() => {})
        )
      );
    },

    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter(
          (e) => e.source_node_id !== id && e.target_node_id !== id
        ),
        selectedNodeIds: s.selectedNodeIds.filter((x) => x !== id),
        refNodeIds: s.refNodeIds.filter((x) => x !== id),
      })),

    moveNode: (id, x, y) => {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      }));
      // Persist position change to the data adapter (fire-and-forget)
      import("@/lib/data-adapter").then(({ getDataAdapter }) =>
        Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter.updateNode(id, { x, y }).catch(() => {
            // Ignore persistence errors — position stays in memory
          })
        )
      );
    },

    upsertEdge: (edge) =>
      set((s) => {
        const idx = s.edges.findIndex((e) => e.id === edge.id);
        if (idx === -1) return { edges: [...s.edges, edge] };
        const next = [...s.edges];
        next[idx] = edge;
        return { edges: next };
      }),

    addEdge: (sourceId, targetId) => {
      const s = get();
      const boardId = s.boardId;
      if (!boardId) return;
      const duplicate = s.edges.some(
        (e) => e.source_node_id === sourceId && e.target_node_id === targetId
      );
      if (duplicate) return;
      const tempEdge: EdgeRow = {
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        board_id: boardId,
        source_node_id: sourceId,
        target_node_id: targetId,
        style: "arrow",
        label: null,
        created_at: new Date().toISOString(),
      };
      // Optimistically add to store immediately, then persist
      set((prev) => ({ edges: [...prev.edges, tempEdge] }));
      // Fire-and-forget persistence — replace temp edge with persisted one on success
      import("@/lib/data-adapter").then(({ getDataAdapter }) =>
        Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter
            .createEdge({
              board_id: boardId,
              source_node_id: sourceId,
              target_node_id: targetId,
              style: "arrow",
              label: null,
            })
            .then((saved) => {
              set((prev) => ({
                edges: prev.edges.map((e) =>
                  e.id === tempEdge.id ? saved : e
                ),
              }));
            })
            .catch(() => {
              // Temp edge stays in memory — acceptable for offline/mock mode
            })
        )
      );
    },

    removeEdge: (id) => {
      set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
      import("@/lib/data-adapter").then(({ getDataAdapter }) =>
        Promise.resolve(getDataAdapter()).then((adapter) =>
          adapter.deleteEdge(id).catch(() => {})
        )
      );
    },

    setSelectedIds: (ids) => set({ selectedNodeIds: ids }),

    toggleSelected: (id, additive = false) =>
      set((s) => {
        if (!additive) return { selectedNodeIds: [id] };
        const isIn = s.selectedNodeIds.includes(id);
        return {
          selectedNodeIds: isIn
            ? s.selectedNodeIds.filter((x) => x !== id)
            : [...s.selectedNodeIds, id],
        };
      }),

    clearSelection: () => set({ selectedNodeIds: [] }),

    setHovered: (id) => set({ hoveredNodeId: id }),

    toggleRef: (id) =>
      set((s) => {
        const isIn = s.refNodeIds.includes(id);
        if (isIn) return { refNodeIds: s.refNodeIds.filter((x) => x !== id) };
        if (s.refNodeIds.length >= 8) return {}; // max 8 refs
        return { refNodeIds: [...s.refNodeIds, id] };
      }),

    addRefs: (ids) =>
      set((s) => {
        const merged = Array.from(new Set([...s.refNodeIds, ...ids])).slice(
          0,
          8
        );
        return { refNodeIds: merged };
      }),

    clearRefs: () => set({ refNodeIds: [] }),

    openInspector: (id) => set({ inspectorNodeId: id }),
    closeInspector: () => set({ inspectorNodeId: null }),

    setViewMode: (m) => set({ viewMode: m }),
  }))
);

// Derived helpers
export function getRefNodes(): NodeRow[] {
  const { nodes, refNodeIds } = useCanvas.getState();
  return nodes.filter((n) => refNodeIds.includes(n.id));
}

export function getInspectorNode(): NodeRow | null {
  const { nodes, inspectorNodeId } = useCanvas.getState();
  if (!inspectorNodeId) return null;
  return nodes.find((n) => n.id === inspectorNodeId) ?? null;
}
