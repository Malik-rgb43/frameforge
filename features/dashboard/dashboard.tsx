"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Grid3x3,
  List,
  Clock,
  Image as ImageIcon,
  Trash2,
  Copy,
  MoreHorizontal,
  Sparkles,
  Settings as SettingsIcon,
  BarChart3,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/store";
import { useAuth } from "@/features/auth/auth-provider";
import { getDataAdapter } from "@/lib/data-adapter";
import type { Project } from "@/lib/supabase/types";
import SimpleNewProject from "@/features/wizard/simple-new-project";
import SettingsPanel from "@/features/shell/settings-panel";

type ViewMode = "grid" | "list";

type ProjectCard = Project;

export default function Dashboard() {
  const t = useI18n((s) => s.t);
  const router = useRouter();
  const { workspaceId, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(!!workspaceId);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const adapter = await getDataAdapter();
      const list = await adapter.listProjects(workspaceId);
      setProjects(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) refresh();
  }, [workspaceId, refresh]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.client ?? "").toLowerCase().includes(q) ||
        (p.product ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  const onCreate = async (name: string) => {
    if (!workspaceId) throw new Error("Workspace not ready");
    const adapter = await getDataAdapter();
    const project = await adapter.createProject(workspaceId, { name });
    setWizardOpen(false);
    router.push(`/studio/${project.id}`);
  };

  const deleteProject = async (id: string) => {
    try {
      const adapter = await getDataAdapter();
      await adapter.deleteProject(id);
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setMenuFor(null);
      refresh();
    }
  };

  const duplicateProject = async (src: Project) => {
    if (!workspaceId) return;
    try {
      const adapter = await getDataAdapter();
      await adapter.createProject(workspaceId, {
        name: src.name + " (copy)",
        client: src.client ?? undefined,
        product: src.product ?? undefined,
        aspect: src.aspect,
      });
    } catch (err) {
      console.error("Failed to duplicate project:", err);
    } finally {
      setMenuFor(null);
      refresh();
    }
  };

  const renameProject = async (id: string, name: string) => {
    const adapter = await getDataAdapter();
    await adapter.updateProject(id, { name });
    refresh();
  };

  const setCover = async (id: string, coverUrl: string) => {
    const adapter = await getDataAdapter();
    await adapter.updateProject(id, { cover_image_url: coverUrl });
    refresh();
  };

  return (
    <main className="min-h-screen bg-canvas text-text-primary">
      {/* Subtle background glow */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,184,107,0.10) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Top header */}
      <header className="relative z-10 h-16 border-b border-border-subtle flex items-center px-6 gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-warm to-accent-cool flex items-center justify-center">
            <span className="text-canvas font-bold text-xs">F</span>
          </div>
          <span className="text-sm font-semibold">FrameForge</span>
          <span className="text-2xs font-mono text-text-muted px-1.5 py-0.5 rounded bg-panel border border-border-subtle">
            v2
          </span>
        </Link>

        <div className="flex-1 max-w-xl mx-auto relative">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-9 bg-panel border border-border-subtle rounded-lg pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/30 focus:border-accent-warm/40"
          />
        </div>

        <Link
          href="/usage"
          className="h-9 px-3 rounded-lg hover:bg-white/5 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          title="Usage & Costs"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Usage</span>
        </Link>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-warm to-accent-cool" />
      </header>

      {/* Content */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-text-secondary mt-1">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"} in your workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <button
              onClick={() => setWizardOpen(true)}
              disabled={authLoading || !workspaceId}
              className="h-9 px-4 rounded-lg bg-accent-warm text-canvas text-sm font-medium hover:brightness-110 shadow-[0_0_20px_rgba(255,184,107,0.25)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              <Plus className="w-4 h-4" />
              New project
            </button>
          </div>
        </div>

        {authLoading || loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState hasQuery={!!query} onCreate={() => setWizardOpen(true)} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProjectGridCard
                key={p.id}
                project={p}
                menuOpen={menuFor === p.id}
                onMenuToggle={(v) => setMenuFor(v ? p.id : null)}
                onDelete={() => deleteProject(p.id)}
                onDuplicate={() => duplicateProject(p)}
                onRename={renameProject}
                onSetCover={setCover}
              />
            ))}
          </div>
        ) : (
          <ProjectList
            projects={filtered}
            onDelete={deleteProject}
            onDuplicate={duplicateProject}
            onRename={renameProject}
          />
        )}
      </section>

      <SimpleNewProject
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={onCreate}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-9 rounded-lg bg-panel p-0.5 border border-border-subtle">
      {([
        { id: "grid" as const, icon: Grid3x3 },
        { id: "list" as const, icon: List },
      ]).map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "h-full px-3 rounded-md transition-all ease-spring flex items-center justify-center",
            value === id
              ? "bg-panel-2 text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border-subtle bg-panel overflow-hidden animate-pulse-subtle"
        >
          <div className="aspect-[4/3] bg-panel-2" />
          <div className="p-3">
            <div className="h-4 w-3/5 rounded bg-panel-2 mb-2" />
            <div className="h-3 w-2/5 rounded bg-panel-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasQuery,
  onCreate,
}: {
  hasQuery: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="py-24 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-accent-warm" />
      </div>
      <h3 className="text-lg font-semibold">
        {hasQuery ? "No projects match" : "No projects yet"}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm">
        {hasQuery
          ? "Try a different search term or clear the search."
          : "Start your first project — the AI will guide you through references, concept, and shots."}
      </p>
      {!hasQuery && (
        <button
          onClick={onCreate}
          className="mt-2 h-10 px-5 rounded-lg bg-accent-warm text-canvas text-sm font-medium hover:brightness-110 shadow-[0_0_20px_rgba(255,184,107,0.25)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create your first project
        </button>
      )}
    </div>
  );
}

function ProjectGridCard({
  project,
  menuOpen,
  onMenuToggle,
  onDelete,
  onDuplicate,
  onRename,
  onSetCover,
}: {
  project: ProjectCard;
  menuOpen: boolean;
  onMenuToggle: (v: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (id: string, name: string) => void;
  onSetCover: (id: string, coverUrl: string) => void;
}) {
  const updated = new Date(project.updated_at);
  const updatedLabel = formatRelative(updated);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const coverRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    setEditing(false);
    onRename(project.id, nameVal.trim() || project.name);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { onSetCover(project.id, reader.result as string); };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl bg-panel border border-border-subtle hover:border-border-hover transition-colors overflow-hidden"
    >
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />
      <Link href={`/studio/${project.id}`} className="block">
        <div className="relative aspect-[4/3] bg-panel-2 overflow-hidden">
          {project.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-text-muted" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <span className="text-2xs font-mono text-white/80 bg-black/40 px-1.5 py-0.5 rounded-md">
              {project.aspect}
            </span>
          </div>
        </div>
        <div className="p-3">
          {editing ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditing(false); setNameVal(project.name); }
              }}
              onClick={(e) => e.preventDefault()}
              className="w-full text-sm font-semibold text-text-primary bg-panel-2 border border-accent-warm/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-warm/50"
            />
          ) : (
            <h3
              className="text-sm font-semibold text-text-primary truncate cursor-text"
              onClick={(e) => { e.preventDefault(); setEditing(true); }}
            >
              {project.name}
            </h3>
          )}
          <div className="flex items-center gap-2 mt-1">
            {project.client && (
              <span className="text-2xs text-text-muted truncate">
                {project.client}
              </span>
            )}
            {project.client && <span className="text-text-muted">·</span>}
            <span className="text-2xs text-text-muted flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {updatedLabel}
            </span>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenuToggle(!menuOpen);
        }}
        className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white hover:bg-black/80"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-10 right-2 w-44 rounded-lg glass-panel border border-border-subtle shadow-panel overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem icon={Pencil} label="Rename" onClick={() => { onMenuToggle(false); setEditing(true); }} />
            <MenuItem icon={ImageIcon} label="Set cover" onClick={() => { onMenuToggle(false); coverRef.current?.click(); }} />
            <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
            <MenuItem
              icon={Trash2}
              label="Delete"
              onClick={onDelete}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectListRow({
  p,
  i,
  onDelete,
  onDuplicate,
  onRename,
}: {
  p: ProjectCard;
  i: number;
  onDelete: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(p.name);

  const commitRename = () => {
    setEditing(false);
    onRename(p.id, nameVal.trim() || p.name);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 hover:bg-panel-2/50 transition-colors",
        i !== 0 && "border-t border-border-subtle"
      )}
    >
      <Link href={`/studio/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-lg bg-panel-2 flex-shrink-0 overflow-hidden">
          {p.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-text-muted" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditing(false); setNameVal(p.name); }
              }}
              onClick={(e) => e.preventDefault()}
              className="w-full text-sm font-medium text-text-primary bg-panel-2 border border-accent-warm/40 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-warm/50"
            />
          ) : (
            <div
              className="text-sm font-medium text-text-primary truncate cursor-text"
              onClick={(e) => { e.preventDefault(); setEditing(true); }}
            >
              {p.name}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-2xs text-text-muted">
            {p.client && <span className="truncate">{p.client}</span>}
            {p.client && <span>·</span>}
            <span>{p.aspect}</span>
            <span>·</span>
            <span>{formatRelative(new Date(p.updated_at))}</span>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); setEditing(true); }}
        className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
        title="Rename"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDuplicate(p)}
        className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
        title="Duplicate"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(p.id)}
        className="w-8 h-8 rounded-md hover:bg-status-error/10 flex items-center justify-center text-text-muted hover:text-status-error"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ProjectList({
  projects,
  onDelete,
  onDuplicate,
  onRename,
}: {
  projects: ProjectCard[];
  onDelete: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-panel overflow-hidden">
      {projects.map((p, i) => (
        <ProjectListRow
          key={p.id}
          p={p}
          i={i}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-9 px-3 flex items-center gap-2 text-xs text-left transition-colors",
        danger
          ? "text-status-error hover:bg-status-error/10"
          : "text-text-primary hover:bg-white/5"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
