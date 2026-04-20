"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeTypes,
  type NodeTypes,
  type Viewport,
  Panel,
} from "reactflow";
import { AnimatePresence, motion } from "framer-motion";
import { Link2 } from "lucide-react";
import "reactflow/dist/style.css";

import { useCanvas } from "./store";
import ShotNode from "./nodes/shot-node";
import NoteNode from "./nodes/note-node";
import ConceptCardNode from "./nodes/concept-card-node";
import BudgetTrackerNode from "./nodes/budget-tracker-node";
import FfEdge, { EdgeMarkers } from "./edges";
import type { EdgeRow, NodeRow } from "@/lib/supabase/types";

const nodeTypes: NodeTypes = {
  source: ShotNode,
  shot: ShotNode,
  continuation: ShotNode,
  note: NoteNode,
  concept_card: ConceptCardNode,
  budget_tracker: BudgetTrackerNode,
};

const edgeTypes: EdgeTypes = {
  ff: FfEdge,
};

function toRfNodes(rows: NodeRow[]): Node[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    position: { x: r.x, y: r.y },
    data: { row: r },
    draggable: r.type !== "concept_card",
    selectable: true,
    style: { width: r.w, height: r.h },
  }));
}

function toRfEdges(rows: EdgeRow[]): Edge[] {
  return rows.map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    type: "ff",
    data: { style: e.style },
    style: { pointerEvents: "all" },
  }));
}

// Selection action toolbar — shown when multiple nodes selected
function SelectionToolbar() {
  const selectedIds = useCanvas((s) => s.selectedNodeIds);
  const nodes = useCanvas((s) => s.nodes);
  const addEdge = useCanvas((s) => s.addEdge);

  if (selectedIds.length < 2) return null;

  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));
  const conceptCards = selectedNodes.filter((n) => n.type === "concept_card");
  const refNodes = selectedNodes.filter((n) => n.type !== "concept_card");

  if (conceptCards.length !== 1 || refNodes.length === 0) return null;

  const conceptCard = conceptCards[0];

  const connectAll = () => {
    for (const ref of refNodes) {
      addEdge(ref.id, conceptCard.id);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel border border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.4)] pointer-events-auto">
      <span className="text-xs text-text-muted font-mono">{refNodes.length} nodes</span>
      <div className="w-px h-4 bg-border-subtle" />
      <button
        onClick={connectAll}
        className="flex items-center gap-1.5 text-xs font-medium text-accent-violet hover:text-accent-violet/80 transition-colors"
      >
        <Link2 className="w-3.5 h-3.5" />
        Connect all → concept
      </button>
    </div>
  );
}

function ZoomHud() {
  const [zoom, setZoom] = useState(1);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useOnViewportChange({
    onChange: (v: Viewport) => {
      setZoom(v.zoom);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 900);
    },
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="px-3 py-1 rounded-full glass-panel text-xs font-mono text-text-secondary pointer-events-none"
        >
          {Math.round(zoom * 100)}%
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CanvasInner() {
  const nodeRows = useCanvas((s) => s.nodes);
  const edgeRows = useCanvas((s) => s.edges);
  const selectedIds = useCanvas((s) => s.selectedNodeIds);

  const moveNode = useCanvas((s) => s.moveNode);
  const setSelectedIds = useCanvas((s) => s.setSelectedIds);
  const openInspector = useCanvas((s) => s.openInspector);
  const toggleRef = useCanvas((s) => s.toggleRef);

  // React Flow owns node position state during drag (smooth) — we sync on drag end
  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState<NodeRow>(
    toRfNodes(nodeRows) as unknown as Node[]
  );
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState(toRfEdges(edgeRows));
  const { fitView, zoomTo } = useReactFlow();

  // Sync store → React Flow: preserve position/style when only data (metadata) changed.
  // Rebuilding position/style causes React Flow to re-measure and jump the viewport.
  useEffect(() => {
    setRfNodes((prev) => {
      const currentSelected = useCanvas.getState().selectedNodeIds;
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      const next = nodeRows.map((row) => {
        const existing = prevMap.get(row.id);
        if (existing) {
          // Only update data and type — keep position/style from RF's own state
          // to avoid viewport jumps when only metadata changed
          return {
            ...existing,
            type: row.type,
            data: { row },
            selected: existing.selected ?? currentSelected.includes(row.id),
            // Update position/size only if the store value actually differs
            ...(existing.position.x !== row.x || existing.position.y !== row.y
              ? { position: { x: row.x, y: row.y } }
              : {}),
            ...(Number(existing.style?.width) !== row.w
              ? { style: { ...existing.style, width: row.w, height: row.h } }
              : {}),
          };
        }
        // New node — create fresh
        return {
          ...toRfNodes([row])[0],
          selected: currentSelected.includes(row.id),
        };
      });
      return next as unknown as Node[];
    });
  }, [nodeRows, setRfNodes]);

  // Selection-only sync: update selected flag without rebuilding node objects
  useEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) => ({ ...n, selected: selectedIds.includes(n.id) }))
    );
  }, [selectedIds, setRfNodes]);

  useEffect(() => {
    setRfEdges(toRfEdges(edgeRows));
  }, [edgeRows, setRfEdges]);

  // Handle node changes: delegate to RF for local state, commit position on drag end
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRF(changes);

      // Sync box-selection (selectionOnDrag) back to our store
      const selectChanges = changes.filter((c) => c.type === "select");
      if (selectChanges.length > 0) {
        const store = useCanvas.getState();
        let ids = [...store.selectedNodeIds];
        for (const c of selectChanges) {
          if (c.type !== "select") continue;
          if (c.selected) {
            if (!ids.includes(c.id)) ids.push(c.id);
          } else {
            ids = ids.filter((id) => id !== c.id);
          }
        }
        setSelectedIds(ids);
      }

      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          moveNode(c.id, c.position.x, c.position.y);
        }
      }
    },
    [onNodesChangeRF, moveNode, setSelectedIds]
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => openInspector(node.id),
    [openInspector]
  );

  const onNodeClick = useCallback(
    (e: React.MouseEvent, node: Node) => {
      if (e.altKey) {
        const store = useCanvas.getState();
        const multiSelected = store.selectedNodeIds.includes(node.id) && store.selectedNodeIds.length > 1;
        if (multiSelected) {
          store.addRefs(store.selectedNodeIds);
        } else {
          toggleRef(node.id);
        }
        return;
      }
      // Shift+click = toggle as reference for generation
      if (e.shiftKey) {
        const store = useCanvas.getState();
        const multiSelected = store.selectedNodeIds.includes(node.id) && store.selectedNodeIds.length > 1;
        if (multiSelected) {
          store.addRefs(store.selectedNodeIds);
        } else {
          toggleRef(node.id);
        }
        return;
      }
      // Cmd/Ctrl+click = multi-select
      if (e.metaKey || e.ctrlKey) {
        const store = useCanvas.getState();
        const isSelected = store.selectedNodeIds.includes(node.id);
        if (isSelected) {
          store.setSelectedIds(store.selectedNodeIds.filter((id) => id !== node.id));
        } else {
          store.setSelectedIds([...store.selectedNodeIds, node.id]);
        }
        return;
      }
      setSelectedIds([node.id]);
    },
    [toggleRef, setSelectedIds]
  );

  const onConnect = useCallback(
    (params: { source: string | null; target: string | null }) => {
      if (params.source && params.target)
        useCanvas.getState().addEdge(params.source, params.target);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedIds([]);
    useCanvas.getState().closeContextMenu();
  }, [setSelectedIds]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent, node?: Node) => {
      e.preventDefault();
      useCanvas.getState().openContextMenu(e.clientX, e.clientY, node?.id ?? null);
      if (node) {
        const store = useCanvas.getState();
        if (!store.selectedNodeIds.includes(node.id)) {
          setSelectedIds([node.id]);
        }
      }
    },
    [setSelectedIds]
  );

  // Custom keyboard shortcuts (fit, zoom 100%)
  useEffect(() => {
    const onFit = () => fitView({ padding: 0.2, duration: 300 });
    const on100 = () => zoomTo(1, { duration: 220 });
    window.addEventListener("ff:fit-view", onFit);
    window.addEventListener("ff:zoom-100", on100);
    return () => {
      window.removeEventListener("ff:fit-view", onFit);
      window.removeEventListener("ff:zoom-100", on100);
    };
  }, [fitView, zoomTo]);

  useEffect(() => {
    document.body.dataset.rfReady = "1";
    return () => {
      delete document.body.dataset.rfReady;
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-canvas">
      <EdgeMarkers />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChangeRF}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onContextMenu}
        onPaneContextMenu={(e) => onContextMenu(e as unknown as React.MouseEvent)}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        panOnScroll
        panOnDrag={[1, 2]}
        selectionOnDrag
        zoomOnScroll
        zoomOnDoubleClick={false}
        onInit={(instance) => instance.fitView({ padding: 0.2, duration: 400, maxZoom: 0.75 })}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "ff" }}
      >
        <Background
          color="rgba(255,255,255,0.04)"
          gap={80}
          lineWidth={1}
          variant={BackgroundVariant.Lines}
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bottom-6 !right-6"
        />
{/* MiniMap removed per user request */}
        <Panel position="top-center">
          <div className="mt-2 flex items-center gap-2">
            <div className="px-3 py-1 rounded-full glass-panel text-2xs font-mono text-text-secondary">
              {nodeRows.length} nodes · {edgeRows.length} edges
            </div>
            <ZoomHud />
          </div>
        </Panel>
        <Panel position="bottom-center">
          <div className="mb-24">
            <SelectionToolbar />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
