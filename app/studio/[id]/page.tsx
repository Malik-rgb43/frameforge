"use client";
import { useCallback, useEffect, useState } from "react";
import Canvas from "@/features/canvas/canvas";
import { useCanvas } from "@/features/canvas/store";
import ToolRail from "@/features/shell/tool-rail";
import TopBar from "@/features/shell/top-bar";
import InspectorPanel from "@/features/inspector/inspector-panel";
import ChatBar from "@/features/chat/chat-bar";
import SettingsPanel from "@/features/shell/settings-panel";
import BriefPanel from "@/features/brief/brief-panel";
import {
  briefCompleteness,
  EMPTY_BRIEF,
  type ProjectBrief,
} from "@/features/brief/brief-types";
import KeyboardHelp from "@/features/shell/keyboard-help";
import ShortcutsHandler from "@/features/shell/shortcuts";
import TeamPanel from "@/features/team/team-panel";
import ExpandCanvasOverlay from "@/features/magic-fill/expand-canvas-overlay";
import EnhanceCanvasOverlay from "@/features/enhance/enhance-canvas-overlay";
import ConceptsPanel from "@/features/concepts/concepts-panel";
import { useConcepts } from "@/features/concepts/store";
import StoryboardView from "@/features/storyboard/storyboard-view";
import SimpleNewProject from "@/features/wizard/simple-new-project";
import DropZone from "@/features/upload/drop-zone";
import CanvasContextMenu from "@/features/canvas/context-menu";
import { createConceptCard } from "@/features/concept-card/concept-card-logic";
import {
  downloadAllShots,
  downloadNodeImage,
  pickFiles,
  uploadImagesAsSources,
} from "@/features/upload/upload-utils";
import ErrorBoundary from "@/components/error-boundary";
import { getDataAdapter } from "@/lib/data-adapter";
import type { Project } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";

export default function StudioPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState("select");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [magicFillOpen, setMagicFillOpen] = useState(false);
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const setBoard = useCanvas((s) => s.setBoard);
  const viewMode = useCanvas((s) => s.viewMode);
  const selectedNodeIds = useCanvas((s) => s.selectedNodeIds);
  const nodes = useCanvas((s) => s.nodes);
  const setConceptsOpen = useConcepts((s) => s.setOpen);

  // Listen for per-node enhance trigger from shot-node hover button
  useEffect(() => {
    const onEnhance = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) {
        useCanvas.getState().setSelectedIds([id]);
        setEnhanceOpen(true);
      }
    };
    window.addEventListener("ff:enhance-node", onEnhance);
    return () => window.removeEventListener("ff:enhance-node", onEnhance);
  }, []);

  // Listen for per-node magic expand trigger from shot-node hover button
  useEffect(() => {
    const onMagicExpand = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) {
        useCanvas.getState().setSelectedIds([id]);
        setMagicFillOpen(true);
      }
    };
    window.addEventListener("ff:magic-expand", onMagicExpand);
    return () => window.removeEventListener("ff:magic-expand", onMagicExpand);
  }, []);

  useEffect(() => {
    let active = true;
    const resolvedId = params.id === "demo" ? "proj_demo" : params.id;

    (async () => {
      setLoading(true);
      let fastLoaded = false;
      try {
        const adapter = await getDataAdapter();

        // ── Fast path: use cached board_id to skip project→boards round trips ──
        // On every successful load we store `ff.board.<projectId>` in localStorage.
        // On refresh we fire nodes+edges immediately (1 round trip vs 3 sequential).
        const BOARD_CACHE_KEY = `ff.board.${resolvedId}`;
        const cachedBoardId = typeof window !== "undefined"
          ? localStorage.getItem(BOARD_CACHE_KEY)
          : null;

        // Also restore project from sessionStorage so TopBar renders instantly
        const cachedProjRaw = typeof window !== "undefined"
          ? sessionStorage.getItem("ff.active.project")
          : null;
        if (cachedProjRaw) {
          try {
            const cachedProj = JSON.parse(cachedProjRaw) as Project;
            if (cachedProj.id === resolvedId) setProject(cachedProj);
          } catch { /* ignore */ }
        }

        // Fire nodes+edges immediately if we know the board_id
        if (cachedBoardId) {
          try {
            const [nds, eds] = await Promise.all([
              adapter.listNodes(cachedBoardId),
              adapter.listEdges(cachedBoardId),
            ]);
            if (!active) return;
            setBoard(cachedBoardId, nds, eds);
            setLoading(false);
            fastLoaded = true;
            if (nds.length > 0 && typeof window !== "undefined") {
              const hasSaved = !!localStorage.getItem(`ff.vp.${cachedBoardId}`);
              if (!hasSaved) setTimeout(() => window.dispatchEvent(new Event("ff:fit-view")), 80);
            }
          } catch {
            // Fast path failed — fall through to full load below
          }
        }

        // ── Always fetch project + boards in background to keep data fresh ──
        const proj = await adapter.getProject(resolvedId);
        if (!active || !proj) return;
        setProject(proj);
        if (typeof window !== "undefined") {
          try { sessionStorage.setItem("ff.active.project", JSON.stringify(proj)); } catch { /* quota */ }
        }

        const boards = await adapter.listBoards(proj.id);
        const board = boards[0];
        if (!board) return;

        // Cache board_id for next refresh
        if (typeof window !== "undefined") {
          try { localStorage.setItem(BOARD_CACHE_KEY, board.id); } catch { /* quota */ }
        }

        // If fast path already loaded this exact board, skip the full reload
        if (fastLoaded && board.id === cachedBoardId) return;

        // Slow path: board changed or no cache — load nodes+edges now
        const [nds, eds] = await Promise.all([
          adapter.listNodes(board.id),
          adapter.listEdges(board.id),
        ]);
        if (!active) return;
        setBoard(board.id, nds, eds);
        if (nds.length > 0 && typeof window !== "undefined") {
          const hasSaved = !!localStorage.getItem(`ff.vp.${board.id}`);
          if (!hasSaved) setTimeout(() => window.dispatchEvent(new Event("ff:fit-view")), 80);
        }
      } catch (err) {
        console.error("[studio] board load failed:", err);
      } finally {
        // Always clear the spinner — never leave the user stuck
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params.id, setBoard]);

  const handleToolPick = useCallback(
    async (toolId: string) => {
      setTool(toolId);
      switch (toolId) {
        case "magic":
          setMagicFillOpen(true);
          return;
        case "enhance":
          setEnhanceOpen(true);
          return;
        case "concepts":
          setConceptsOpen(true);
          return;
        case "image": {
          const files = await pickFiles();
          if (files.length > 0)
            uploadImagesAsSources(files).catch((e) => console.error(e));
          return;
        }
        case "conceptcard": {
          await createConceptCard();
          setTool("select");
          return;
        }
        case "download": {
          const selected = nodes.find((n) => n.id === selectedNodeIds[0]);
          if (selected?.image_url) {
            downloadNodeImage(selected).catch((e) => console.error(e));
          } else {
            downloadAllShots(nodes).catch((e) => console.error(e));
          }
          return;
        }
        case "remix": {
          const id = selectedNodeIds[0];
          if (id) {
            const src = nodes.find((n) => n.id === id);
            if (src) {
              // Toggle as reference + focus chat bar
              useCanvas.getState().toggleRef(id);
              const ta = document.querySelector<HTMLTextAreaElement>(
                "textarea[placeholder]"
              );
              ta?.focus();
            }
          }
          return;
        }
        case "generate": {
          const ta = document.querySelector<HTMLTextAreaElement>(
            "textarea[placeholder]"
          );
          ta?.focus();
          return;
        }
      }
    },
    [selectedNodeIds, nodes, setConceptsOpen]
  );

  return (
    <ErrorBoundary>
      <div className="relative w-screen h-screen overflow-hidden bg-canvas">
        <TopBar
          projectName={project?.name}
          client={project?.client ?? undefined}
          onMenu={() => setSettingsOpen(true)}
          onTeam={() => setTeamOpen(true)}
          onBrief={() => setBriefOpen(true)}
          briefCompletenessPct={Math.round(
            briefCompleteness(
              (project?.brief as unknown as ProjectBrief) ?? EMPTY_BRIEF
            ) * 100
          )}
          onAddBudgetTracker={async () => {
            const adapter = await getDataAdapter();
            const state = useCanvas.getState();
            if (!state.boardId) return;
            const freeY = state.nodes.reduce((m, n) => Math.max(m, n.y + (n.h ?? 160)), 80) + 48;
            const input = {
              board_id: state.boardId,
              group_id: null,
              type: "budget_tracker" as const,
              x: 100,
              y: freeY,
              w: 220,
              h: 160,
              order_index: state.nodes.length,
              image_url: null,
              thumbnail_url: null,
              prompt: null,
              prompt_enhanced: null,
              title: "Budget Tracker",
              status: "ready" as const,
              quality_score: null,
              metadata: {},
            };
            try {
              const saved = await adapter.createNode(input);
              state.upsertNode(saved);
            } catch {
              state.upsertNode({ ...input, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as import("@/lib/supabase/types").NodeRow);
            }
          }}
        />
        {viewMode === "board" && <ToolRail active={tool} onPick={handleToolPick} />}

        {viewMode === "board" ? (
          <>
            <Canvas />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-warm" />
                  <span className="text-xs font-mono">Loading board...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <StoryboardView />
        )}

        <InspectorPanel />
        {viewMode === "board" && <ChatBar />}
        <DropZone />
        <CanvasContextMenu
          onEnhance={(id) => {
            useCanvas.getState().setSelectedIds([id]);
            setEnhanceOpen(true);
          }}
          onMagicExpand={(id) => {
            useCanvas.getState().setSelectedIds([id]);
            setMagicFillOpen(true);
          }}
        />

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <TeamPanel open={teamOpen} onClose={() => setTeamOpen(false)} />
        <BriefPanel
          open={briefOpen}
          onClose={() => setBriefOpen(false)}
          project={project}
          onSaved={(p) => {
            setProject(p);
            try { sessionStorage.setItem("ff.active.project", JSON.stringify(p)); } catch {}
          }}
        />
        <KeyboardHelp />
        <ShortcutsHandler
          onMagicFill={() => setMagicFillOpen(true)}
          onConcepts={() => setConceptsOpen(true)}
          onSettings={() => setSettingsOpen(true)}
        />
        <ExpandCanvasOverlay
          open={magicFillOpen}
          onClose={() => setMagicFillOpen(false)}
        />
        <EnhanceCanvasOverlay
          open={enhanceOpen}
          onClose={() => setEnhanceOpen(false)}
        />
        <ConceptsPanel />
        <SimpleNewProject
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreate={async () => setWizardOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
