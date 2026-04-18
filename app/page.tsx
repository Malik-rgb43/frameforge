"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { WindowShell, AppHeader, LeftRail, type ScreenId } from "@/components/chrome";
import ScreenHome from "@/components/screen-home";
import ScreenConcept from "@/components/screen-concept";
import ScreenBoard from "@/components/screen-board";
import ScreenStoryboard from "@/components/screen-storyboard";
import ScreenExport from "@/components/screen-export";
import NewProjectModal from "@/components/new-project-modal";
import ProjectSettings from "@/components/settings";
import { type Project } from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import {
  createProject,
  dbToProject,
  listMyProjects,
  type DBProject,
} from "@/lib/queries";
import { seedDemoShots } from "@/lib/queries-shots";
import { seedDemoConcepts } from "@/lib/queries-concepts";
import { useSession } from "@/lib/use-session";

function useProjects() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useSession();
  const [rows, setRows] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listMyProjects(supabase);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, refresh, supabase };
}

// All screens start empty. User populates via upload + AI generation.
// No seed/demo content anywhere.
async function ensureProjectSeeded(
  _supabase: ReturnType<typeof createClient>,
  _projectId: string
): Promise<void> {
  /* intentionally empty — no seeding */
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  // null = no project opened yet; all project-scoped screens redirect to home.
  const [project, setProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [focusShot, setFocusShot] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { rows, refresh, supabase } = useProjects();

  const projects: Project[] = useMemo(() => rows.map(dbToProject), [rows]);

  const activeProjectId = project?.id ?? null;

  // Seed demo data once per open of a real project.
  const [seededIds, setSeededIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!activeProjectId) return;
    if (seededIds.has(activeProjectId)) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureProjectSeeded(supabase, activeProjectId);
        if (cancelled) return;
        setSeededIds((prev) => {
          const next = new Set(prev);
          next.add(activeProjectId);
          return next;
        });
      } catch (err) {
        console.error("ensureProjectSeeded", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, seededIds, supabase]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ff-screen") : null;
    if (saved) setScreen(saved as ScreenId);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ff-screen", screen);
  }, [screen]);

  // Force back to home if user navigates to a project-scoped screen without a project open.
  useEffect(() => {
    if (!project && screen !== "home") setScreen("home");
  }, [project, screen]);

  const breadcrumbs = (() => {
    if (!project || screen === "home") return [];
    const b = [project.name];
    if (screen === "concept") b.push("Concept");
    if (screen === "board") b.push("Board");
    if (screen === "storyboard") b.push("Storyboard");
    if (screen === "export") b.push("Export");
    return b;
  })();

  function navTo(s: ScreenId) {
    // LeftRail click: if no project, force home.
    if (s !== "home" && !project) return setScreen("home");
    setScreen(s);
  }

  async function handleCreateProject(data: { name: string; client: string; aspect: Project["aspect"] }) {
    setCreating(true);
    try {
      const row = await createProject(supabase, {
        name: data.name,
        client: data.client || undefined,
        aspect: data.aspect,
      });
      const asProject = dbToProject(row);
      setProject(asProject);
      await refresh();
      setNewProjectOpen(false);
      setScreen("concept");
    } catch (err) {
      console.error("createProject failed", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : JSON.stringify(err);
      alert(`Failed to create project: ${msg}`);
    } finally {
      setCreating(false);
    }
  }

  const effectiveScreen: ScreenId = !project && screen !== "home" ? "home" : screen;

  return (
    <WindowShell title={effectiveScreen === "home" ? "FrameForge — Projects" : `FrameForge — ${project?.name ?? ""}`}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <LeftRail screen={effectiveScreen} onNav={navTo} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <AppHeader
            projectName={project?.name}
            breadcrumbs={breadcrumbs}
            onBack={() => {
              setScreen("home");
              setProject(null);
            }}
            onSettings={() => project && setSettingsOpen(true)}
          />
          {effectiveScreen === "home" && (
            <ScreenHome
              projects={projects}
              onOpenProject={(p) => {
                setProject(p);
                setScreen("board");
              }}
              onNewProject={() => setNewProjectOpen(true)}
            />
          )}
          {effectiveScreen === "concept" && project && (
            <ScreenConcept onNext={() => setScreen("board")} projectId={activeProjectId} />
          )}
          {effectiveScreen === "board" && project && (
            <ScreenBoard
              projectId={activeProjectId}
              onShot={(n) => {
                setFocusShot(n);
                setScreen("storyboard");
              }}
            />
          )}
          {effectiveScreen === "storyboard" && project && (
            <ScreenStoryboard initialShot={focusShot} projectId={activeProjectId} />
          )}
          {effectiveScreen === "export" && project && <ScreenExport projectId={activeProjectId} />}
          <ProjectSettings
            open={settingsOpen && !!project}
            onClose={() => setSettingsOpen(false)}
            project={project}
          />
        </div>
      </div>
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreate={handleCreateProject}
        busy={creating}
      />
    </WindowShell>
  );
}
