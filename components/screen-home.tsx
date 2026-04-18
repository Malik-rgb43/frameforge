"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { Btn, Segmented, StatusDot, iconBtnStyle } from "./ui";
import { DEFAULT_PROJECTS, shotURI, type Project, type ProjectStatus } from "@/lib/data";

type FilterValue = "all" | ProjectStatus;

export default function ScreenHome({
  onOpenProject,
  onNewProject,
  projects: projectsProp,
}: {
  onOpenProject: (p: Project) => void;
  onNewProject: () => void;
  projects?: Project[];
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<FilterValue>("all");
  const source = projectsProp ?? DEFAULT_PROJECTS;
  const projects = source.filter((p) => filter === "all" || p.status === filter);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Hero / new project strip */}
      <div style={{ padding: "28px 32px 0", display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 20 }}>
        <div
          style={{
            padding: "28px 28px 24px",
            background: "linear-gradient(135deg, #121418 0%, #0c0d10 100%)",
            border: "1px solid var(--iron)",
            borderRadius: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              background: "radial-gradient(circle, rgba(212,255,58,0.12), transparent 70%)",
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 2,
              color: "var(--lime)",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            FRAMEFORGE \· v2.4
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "var(--bone)",
              letterSpacing: -0.8,
              lineHeight: 1.1,
              marginBottom: 10,
              maxWidth: 420,
            }}
          >
            Forge a film-grade ad
            <br />
            <span style={{ color: "var(--lime)" }}>in an afternoon.</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ash-gray)", lineHeight: 1.55, maxWidth: 440, marginBottom: 18 }}>
            Upload your product. Generate concepts. Direct the storyboard. Export broadcast-ready.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" size="lg" icon={<I.Plus size={16} />} onClick={onNewProject}>
              New project
            </Btn>
            <Btn size="lg" icon={<I.Upload size={16} />}>Import references</Btn>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <StatCard n="184" label="Shots generated" trend="+42 this week" color="lime" />
          <StatCard n="12h" label="Avg time saved" trend="per campaign" color="cyan" />
          <StatCard n="6" label="Active projects" trend="2 rendering" color="amber" />
          <StatCard n="$184" label="Spend this month" trend="37% of budget" color="default" />
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "24px 32px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.2 }}>Projects</div>
        <div style={{ fontSize: 12, color: "var(--slate-2)", marginLeft: 2 }}>{projects.length}</div>
        <div style={{ flex: 1 }} />
        <Segmented<FilterValue>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "rendering", label: "Rendering" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <div style={{ width: 1, height: 20, background: "var(--iron)" }} />
        <Segmented<"grid" | "list">
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "", icon: <I.Grid size={14} /> },
            { value: "list", label: "", icon: <I.List size={14} /> },
          ]}
        />
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 32px 32px" }}>
        {view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {projects.map((p, i) => (
              <ProjectCard key={p.id} p={p} onClick={() => onOpenProject(p)} index={i} />
            ))}
            <NewProjectTile onClick={onNewProject} />
          </div>
        ) : (
          <ProjectList projects={projects} onOpen={onOpenProject} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  n,
  label,
  trend,
  color = "default",
}: {
  n: string;
  label: string;
  trend: string;
  color?: "lime" | "cyan" | "amber" | "default";
}) {
  const c = { lime: "var(--lime)", cyan: "var(--cyan)", amber: "var(--amber)", default: "var(--bone)" }[color];
  return (
    <div
      style={{
        padding: 16,
        background: "var(--onyx)",
        border: "1px solid var(--iron)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: c,
          letterSpacing: -0.8,
          fontFamily: "var(--f-ui)",
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 12, color: "var(--ash-gray)", marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 4, fontFamily: "var(--f-mono)" }}>{trend}</div>
    </div>
  );
}

function ProjectCard({ p, onClick, index }: { p: Project; onClick: () => void; index: number }) {
  const [hov, setHov] = useState(false);
  const img = shotURI({ id: p.id, kind: p.heroKind, tone: p.heroTone, w: 600, h: 400 });
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--onyx)",
        border: `1px solid ${hov ? "var(--iron-2)" : "var(--iron)"}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 200ms var(--e-out)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        animation: `stagger-in 400ms ${index * 40}ms var(--e-out) both`,
      }}
    >
      <div style={{ height: 180, background: `url("${img}") center/cover`, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "3px 7px",
            borderRadius: 4,
            background: "rgba(10,10,12,0.7)",
            backdropFilter: "blur(8px)",
            fontSize: 10,
            fontFamily: "var(--f-mono)",
            color: "var(--bone)",
            letterSpacing: 1,
          }}
        >
          {p.aspect}
        </div>
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 7px",
            borderRadius: 4,
            background: "rgba(10,10,12,0.7)",
            backdropFilter: "blur(8px)",
            fontSize: 10,
            color: "var(--bone)",
            fontWeight: 500,
          }}
        >
          <StatusDot status={p.status} />
          {p.status}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.1 }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 3 }}>{p.client}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            fontSize: 11,
            color: "var(--slate-2)",
            fontFamily: "var(--f-mono)",
          }}
        >
          <span>
            <I.Film size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
            {p.shots} shots
          </span>
          <span>\·</span>
          <span>{p.updated}</span>
        </div>
      </div>
    </div>
  );
}

function NewProjectTile({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "transparent",
        border: "1px dashed var(--iron-2)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        color: "var(--slate-2)",
        minHeight: 260,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(212,255,58,0.08)",
          color: "var(--lime)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <I.Plus size={22} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bone)" }}>New project</div>
      <div style={{ fontSize: 11, color: "var(--slate-2)" }}>Start from brief or product photo</div>
    </div>
  );
}

function ProjectList({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  return (
    <div
      style={{
        background: "var(--onyx)",
        border: "1px solid var(--iron)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 80px 100px 120px 40px",
          padding: "10px 16px",
          borderBottom: "1px solid var(--iron)",
          background: "var(--ash)",
          fontSize: 10,
          fontFamily: "var(--f-mono)",
          letterSpacing: 1,
          color: "var(--slate-2)",
        }}
      >
        <div>PROJECT</div>
        <div>CLIENT</div>
        <div>ASPECT</div>
        <div>SHOTS</div>
        <div>UPDATED</div>
        <div></div>
      </div>
      {projects.map((p, i) => (
        <div
          key={p.id}
          onClick={() => onOpen(p)}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 80px 100px 120px 40px",
            padding: "12px 16px",
            alignItems: "center",
            borderBottom: i === projects.length - 1 ? "none" : "1px solid var(--iron)",
            cursor: "pointer",
            fontSize: 13,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: `url("${shotURI({ id: p.id, kind: p.heroKind, tone: p.heroTone, w: 200, h: 200 })}") center/cover`,
                border: "1px solid var(--iron)",
              }}
            />
            <div>
              <div style={{ color: "var(--bone)", fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2 }}>
                <StatusDot status={p.status} />
                {p.status}
              </div>
            </div>
          </div>
          <div style={{ color: "var(--ash-gray)" }}>{p.client}</div>
          <div style={{ color: "var(--ash-gray)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{p.aspect}</div>
          <div style={{ color: "var(--ash-gray)" }}>{p.shots}</div>
          <div style={{ color: "var(--slate-2)", fontSize: 11 }}>{p.updated}</div>
          <button style={{ ...iconBtnStyle(), width: 28, height: 28 }}>
            <I.Dots size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
