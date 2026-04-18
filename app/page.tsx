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
import { DEFAULT_PROJECTS, type Project } from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import {
  createProject,
  dbToProject,
  listMyProjects,
  type DBProject,
} from "@/lib/queries";
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

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [project, setProject] = useState<Project>(DEFAULT_PROJECTS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [focusShot, setFocusShot] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { rows, refresh, supabase } = useProjects();

  const projects: Project[] = useMemo(() => rows.map(dbToProject), [rows]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ff-screen") : null;
    if (saved) setScreen(saved as ScreenId);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ff-screen", screen);
  }, [screen]);

  const breadcrumbs = (() => {
    const b = [project.name];
    if (screen === "concept") b.push("Concept");
    if (screen === "board") b.push("Board");
    if (screen === "storyboard") b.push("Storyboard");
    if (screen === "export") b.push("Export");
    return screen === "home" ? [] : b;
  })();

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
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <WindowShell title={screen === "home" ? "FrameForge — Projects" : `FrameForge — ${project.name}`}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <LeftRail screen={screen} onNav={setScreen} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <AppHeader
            projectName={project.name}
            breadcrumbs={breadcrumbs}
            onBack={() => setScreen("home")}
            onSettings={() => setSettingsOpen(true)}
          />
          {screen === "home" && (
            <ScreenHome
              projects={projects}
              onOpenProject={(p) => {
                setProject(p);
                setScreen("concept");
              }}
              onNewProject={() => setNewProjectOpen(true)}
            />
          )}
          {screen === "concept" && <ScreenConcept onNext={() => setScreen("board")} />}
          {screen === "board" && (
            <ScreenBoard
              onShot={(n) => {
                setFocusShot(n);
                setScreen("storyboard");
              }}
            />
          )}
          {screen === "storyboard" && <ScreenStoryboard initialShot={focusShot} />}
          {screen === "export" && <ScreenExport />}
          <ProjectSettings
            open={settingsOpen}
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
