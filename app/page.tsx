"use client";
import React, { useEffect, useState } from "react";
import { WindowShell, AppHeader, LeftRail, type ScreenId } from "@/components/chrome";
import ScreenHome from "@/components/screen-home";
import ScreenConcept from "@/components/screen-concept";
import ScreenBoard from "@/components/screen-board";
import ScreenStoryboard from "@/components/screen-storyboard";
import ScreenExport from "@/components/screen-export";
import NewProjectModal from "@/components/new-project-modal";
import ProjectSettings from "@/components/settings";
import { DEFAULT_PROJECTS, type Project } from "@/lib/data";

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [project, setProject] = useState<Project>(DEFAULT_PROJECTS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [focusShot, setFocusShot] = useState<number | null>(null);

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
        onCreate={() => {
          setNewProjectOpen(false);
          setScreen("concept");
        }}
      />
    </WindowShell>
  );
}
