"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { I } from "./icons";
import { Btn, Chip, Field, Input, SlideOver, Textarea, Toggle, iconBtnStyle } from "./ui";
import { ASPECTS, MODELS, type Aspect, type Project } from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import {
  deleteProject,
  duplicateProject,
  getProject,
  updateProject,
  updateProjectBrand,
  type DBProject,
} from "@/lib/queries";
import {
  inviteCollaborator,
  isValidEmail,
  listCollaborators,
  removeCollaborator,
  type CollaboratorRow,
} from "@/lib/collab-queries";
import UploadZone from "./upload-zone";

type TabId = "general" | "brand" | "team" | "models" | "export";

// ---------------------------------------------------------------
// Root slide-over — owns the DB project fetch so every tab sees
// live values. All mutations funnel through updateProject().
// ---------------------------------------------------------------
export default function ProjectSettings({
  open,
  onClose,
  project,
  onProjectChanged,
  onProjectDeleted,
  onDuplicated,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectChanged?: (patch: Partial<Project>) => void;
  onProjectDeleted?: () => void;
  onDuplicated?: (newProject: Project) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<TabId>("general");
  const [dbProject, setDbProject] = useState<DBProject | null>(null);

  const isDbProject =
    !!project?.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id);
  const projectId = isDbProject ? project!.id : null;

  const refreshDb = useCallback(async () => {
    if (!projectId) { setDbProject(null); return; }
    try {
      const row = await getProject(supabase, projectId);
      setDbProject(row);
    } catch (err) {
      console.error("settings: getProject failed", err);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    if (!open) return;
    refreshDb();
  }, [open, refreshDb]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <I.Settings size={14} /> },
    { id: "brand",   label: "Brand",   icon: <I.Palette size={14} /> },
    { id: "team",    label: "Team",    icon: <I.Users size={14} /> },
    { id: "models",  label: "Models",  icon: <I.Sparkles size={14} /> },
    { id: "export",  label: "Export",  icon: <I.Download size={14} /> },
  ];

  return (
    <SlideOver open={open} onClose={onClose} title="Project Settings" width={520}>
      <div style={{ display: "flex", height: "100%" }}>
        <div
          style={{
            width: 140,
            flexShrink: 0,
            borderRight: "1px solid var(--iron)",
            padding: 12,
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: "100%",
                height: 32,
                background: tab === t.id ? "rgba(212,255,58,0.08)" : "transparent",
                color: tab === t.id ? "var(--lime)" : "var(--ash-gray)",
                border: "none",
                borderRadius: 6,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: 18, overflow: "auto" }}>
          {tab === "general" && (
            <GeneralTab
              project={project}
              dbProject={dbProject}
              projectId={projectId}
              onChanged={(patch) => {
                setDbProject((prev) => (prev ? { ...prev, ...patch } : prev));
                const uiPatch: Partial<Project> = {};
                if (typeof patch.name === "string") uiPatch.name = patch.name;
                if (typeof patch.client === "string") uiPatch.client = patch.client;
                if (patch.aspect) uiPatch.aspect = patch.aspect as Aspect;
                if (Object.keys(uiPatch).length) onProjectChanged?.(uiPatch);
              }}
              onDuplicated={(row) => {
                onDuplicated?.({
                  id: row.id,
                  name: row.name,
                  client: row.client ?? "",
                  aspect: row.aspect,
                  updated: "just now",
                  shots: row.shot_count ?? 0,
                  status: row.status,
                  heroKind: row.hero_kind ?? "bottle",
                  heroTone: row.hero_tone ?? "amber",
                });
                onClose();
              }}
              onDeleted={() => {
                onProjectDeleted?.();
                onClose();
              }}
            />
          )}
          {tab === "brand" && (
            <BrandTab
              projectId={projectId}
              dbProject={dbProject}
              onChanged={(patch) =>
                setDbProject((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
          )}
          {tab === "team" && <TeamTab projectId={projectId} />}
          {tab === "models" && (
            <ModelsTab
              projectId={projectId}
              dbProject={dbProject}
              onChanged={(patch) =>
                setDbProject((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
          )}
          {tab === "export" && (
            <ExportTab
              projectId={projectId}
              dbProject={dbProject}
              onChanged={(patch) =>
                setDbProject((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
          )}
        </div>
      </div>
    </SlideOver>
  );
}

// ---------------------------------------------------------------
// General
// ---------------------------------------------------------------
function GeneralTab({
  project,
  dbProject,
  projectId,
  onChanged,
  onDuplicated,
  onDeleted,
}: {
  project: Project | null;
  dbProject: DBProject | null;
  projectId: string | null;
  onChanged: (patch: Partial<DBProject>) => void;
  onDuplicated: (row: DBProject) => void;
  onDeleted: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState(dbProject?.name || project?.name || "");
  const [client, setClient] = useState(dbProject?.client ?? project?.client ?? "");
  const [description, setDescription] = useState(dbProject?.concept_hook ?? "");
  const [aspect, setAspect] = useState<Aspect>(
    (dbProject?.aspect || project?.aspect || "9:16") as Aspect
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setName(dbProject?.name || project?.name || ""); }, [dbProject?.name, project?.name]);
  useEffect(() => { setClient(dbProject?.client ?? project?.client ?? ""); }, [dbProject?.client, project?.client]);
  useEffect(() => { setDescription(dbProject?.concept_hook ?? ""); }, [dbProject?.concept_hook]);
  useEffect(() => { setAspect((dbProject?.aspect || project?.aspect || "9:16") as Aspect); }, [dbProject?.aspect, project?.aspect]);

  async function save(patch: Partial<DBProject>) {
    if (!projectId) return;
    setBusy(true); setErr(null);
    try {
      await updateProject(supabase, projectId, patch);
      onChanged(patch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    if (!projectId) return;
    setBusy(true); setErr(null);
    try {
      const row = await duplicateProject(supabase, projectId);
      onDuplicated(row);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!projectId) return;
    await save({ status: "archived" });
  }

  async function handleDelete() {
    if (!projectId) return;
    const confirm =
      typeof window !== "undefined"
        ? window.prompt(`Type the project name to confirm delete:\n"${name}"`)
        : null;
    if (confirm !== name) {
      setErr("Delete cancelled — name did not match.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      await deleteProject(supabase, projectId);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function handleBlurSave() {
    const patch: Partial<DBProject> = {};
    if (name !== (dbProject?.name ?? "")) patch.name = name;
    if (client !== (dbProject?.client ?? "")) patch.client = client || null;
    if (description !== (dbProject?.concept_hook ?? "")) patch.concept_hook = description || null;
    if (Object.keys(patch).length) save(patch);
  }

  return (
    <div
      onBlur={(e) => {
        const next = e.relatedTarget as HTMLElement | null;
        if (next && e.currentTarget.contains(next)) return;
        handleBlurSave();
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>General</div>
      <Field label="Project name">
        <Input value={name} onChange={setName} />
      </Field>
      <Field label="Client">
        <Input value={client} onChange={setClient} />
      </Field>
      <Field label="Description" hint="Used as context for every prompt in this project.">
        <Textarea rows={3} value={description} onChange={setDescription} />
      </Field>
      <Field label="Default aspect">
        <div style={{ display: "flex", gap: 6 }}>
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAspect(a.id);
                save({ aspect: a.id });
              }}
              style={{
                flex: 1,
                height: 56,
                background: a.id === aspect ? "rgba(212,255,58,0.08)" : "var(--ash)",
                border: `1px solid ${a.id === aspect ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                borderRadius: 6,
                color: a.id === aspect ? "var(--lime)" : "var(--bone)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span>{a.label}</span>
              <span style={{ fontSize: 10, color: "var(--slate-2)", fontWeight: 400 }}>{a.sub}</span>
            </button>
          ))}
        </div>
      </Field>
      {/* TODO: Tags — visual only; wire up a tags column + add/remove UI in a follow-up. */}
      <Field label="Tags">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip color="lime">skincare</Chip>
          <Chip color="cyan">Q1-2026</Chip>
          <Chip>hero</Chip>
          <button
            style={{
              height: 22,
              padding: "0 8px",
              borderRadius: 4,
              background: "transparent",
              border: "1px dashed var(--iron-2)",
              color: "var(--slate-2)",
              fontSize: 11,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <I.Plus size={10} /> Add
          </button>
        </div>
      </Field>

      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 11,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Danger zone</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="default" icon={<I.Copy size={14} />} onClick={handleDuplicate} disabled={busy || !projectId}>
          Duplicate
        </Btn>
        <Btn variant="default" icon={<I.Folder size={14} />} onClick={handleArchive} disabled={busy || !projectId}>
          Archive
        </Btn>
        <Btn variant="danger" icon={<I.Trash size={14} />} onClick={handleDelete} disabled={busy || !projectId}>
          Delete
        </Btn>
      </div>
      {!projectId && (
        <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 10 }}>
          This project hasn&apos;t been saved yet — settings light up after first save.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Brand
// ---------------------------------------------------------------
function BrandTab({
  projectId,
  dbProject,
  onChanged,
}: {
  projectId: string | null;
  dbProject: DBProject | null;
  onChanged: (patch: Partial<DBProject>) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const palette: string[] =
    Array.isArray(dbProject?.concept_palette) && dbProject!.concept_palette!.length > 0
      ? (dbProject!.concept_palette as string[])
      : ["#0a0a0c", "#f5f5f4", "#d4ff3a", "#8a4a1c", "#e6c893"];
  const logoUrl = dbProject?.brand_logo_url ?? null;

  const [err, setErr] = useState<string | null>(null);
  const [newColor, setNewColor] = useState("#d4ff3a");

  async function savePalette(next: string[]) {
    if (!projectId) return;
    try {
      await updateProjectBrand(supabase, projectId, { concept_palette: next });
      onChanged({ concept_palette: next });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addColor() {
    const next = Array.from(new Set([...palette, newColor]));
    await savePalette(next);
  }

  async function removeColor(c: string) {
    const next = palette.filter((x) => x !== c);
    await savePalette(next);
  }

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Brand reference</div>
      <Field label="Logo" hint="PNG or SVG. Used as negative mask for watermark-free renders.">
        {logoUrl ? (
          <div
            style={{
              height: 100,
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--ash)",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="brand logo" style={{ maxHeight: 80, maxWidth: "80%" }} />
            <button
              onClick={async () => {
                if (!projectId) return;
                await updateProjectBrand(supabase, projectId, { brand_logo_url: null });
                onChanged({ brand_logo_url: null });
              }}
              style={{ ...iconBtnStyle(), position: "absolute", top: 6, right: 6 }}
              title="Remove logo"
            >
              <I.Trash size={12} />
            </button>
          </div>
        ) : projectId ? (
          <UploadZone
            projectId={projectId}
            multiple={false}
            compact
            onUploaded={async (res) => {
              if (!projectId) return;
              try {
                await updateProjectBrand(supabase, projectId, { brand_logo_url: res.publicUrl });
                onChanged({ brand_logo_url: res.publicUrl });
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Failed to save logo");
              }
            }}
          />
        ) : (
          <div
            style={{
              height: 100,
              border: "1px dashed var(--iron-2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--slate-2)",
              fontSize: 12,
              background: "var(--ash)",
            }}
          >
            Save the project first to upload a logo.
          </div>
        )}
      </Field>
      <Field label="Palette">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 18 }}>
          {palette.map((c) => (
            <div
              key={c}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: c,
                border: "1px solid var(--iron)",
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() => removeColor(c)}
              title={`${c} — click to remove`}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: -16,
                  left: 0,
                  right: 0,
                  fontSize: 9,
                  color: "var(--slate-2)",
                  fontFamily: "var(--f-mono)",
                  textAlign: "center",
                }}
              >
                {c}
              </div>
            </div>
          ))}
          <label
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "transparent",
              border: "1px dashed var(--iron-2)",
              color: "var(--slate-2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
            title="Add color"
          >
            <I.Plus size={16} />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onBlur={addColor}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
              }}
            />
          </label>
        </div>
      </Field>
      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 11,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ height: 14 }} />
      {/* TODO: Typography — persist to new columns once design signs off. */}
      <Field label="Typography" hint="Overlaid in storyboards for end-card text.">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)", marginBottom: 4 }}>DISPLAY</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.3 }}>Söhne</div>
          </div>
          <div style={{ flex: 1, padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)", marginBottom: 4 }}>BODY</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--bone)", letterSpacing: -0.1 }}>Inter</div>
          </div>
        </div>
      </Field>
      {/* TODO: Voice — persist to a voice_notes column when feature ships. */}
      <Field label="Voice">
        <Textarea
          rows={3}
          value="Quiet confidence. Never shouts. Short sentences. No exclamation marks. Sensory verbs."
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------
// Team (collaborators already wired by Agent 2 — keep as-is).
// ---------------------------------------------------------------
function TeamTab({ projectId }: { projectId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const list = await listCollaborators(supabase, projectId);
      setRows(list);
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleInvite(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!projectId) {
      setSendErr("Save the project before inviting teammates.");
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setSendErr("Enter a valid email address.");
      return;
    }
    if (rows.some((r) => r.invited_email === trimmed)) {
      setSendErr("That email is already on the team.");
      return;
    }
    setSending(true);
    setSendErr(null);
    try {
      await inviteCollaborator(supabase, projectId, trimmed, role);
      setEmail("");
      await refresh();
    } catch (err) {
      setSendErr(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setSending(false);
    }
  }

  async function handleRemove(rowId: string) {
    try {
      await removeCollaborator(supabase, rowId);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : "Remove failed.");
    }
  }

  const shareLink =
    projectId && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${projectId}`
      : projectId
        ? `/invite/${projectId}`
        : "";

  function copyLink() {
    if (!shareLink || typeof navigator === "undefined") return;
    try {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore — clipboard may be unavailable
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)" }}>Team</div>
        <div style={{ flex: 1 }} />
        {loading && (
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              color: "var(--slate-2)",
              letterSpacing: 1,
            }}
          >
            LOADING…
          </div>
        )}
      </div>

      <form onSubmit={handleInvite} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1 }}>
            <Input value={email} onChange={setEmail} placeholder="teammate@studio.co" />
          </div>
          <div
            style={{
              display: "inline-flex",
              padding: 2,
              background: "var(--ash)",
              border: "1px solid var(--iron)",
              borderRadius: 6,
              gap: 2,
              height: 34,
            }}
          >
            {(["editor", "viewer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  background: role === r ? "var(--iron-2)" : "transparent",
                  color: role === r ? "var(--bone)" : "var(--ash-gray)",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <Btn
            size="md"
            variant="primary"
            icon={<I.Plus size={12} />}
            onClick={() => handleInvite()}
            disabled={sending || !projectId}
          >
            {sending ? "Sending…" : "Invite"}
          </Btn>
          <button
            type="submit"
            style={{
              width: 0,
              height: 0,
              padding: 0,
              margin: 0,
              border: 0,
              opacity: 0,
              position: "absolute",
            }}
            aria-hidden
            tabIndex={-1}
          />
        </div>
        {sendErr && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 10px",
              background: "rgba(255,90,95,0.08)",
              border: "1px solid rgba(255,90,95,0.3)",
              borderRadius: 6,
              color: "var(--coral)",
              fontSize: 11,
            }}
          >
            {sendErr}
          </div>
        )}
        {!projectId && (
          <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 6 }}>
            This project hasn&apos;t been saved yet. Team features light up after the first save.
          </div>
        )}
      </form>

      {loadErr && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 11,
          }}
        >
          {loadErr}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 && !loading && (
          <div
            style={{
              padding: 14,
              background: "var(--ash)",
              border: "1px dashed var(--iron-2)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--slate-2)",
              textAlign: "center",
            }}
          >
            No collaborators yet. Invite a teammate above.
          </div>
        )}
        {rows.map((u) => (
          <div
            key={u.id}
            style={{
              padding: 10,
              background: "var(--ash)",
              border: "1px solid var(--iron)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: u.color,
                color: "var(--obsidian)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--f-mono)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: u.accepted ? 1 : 0.7,
              }}
            >
              {u.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--bone)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.displayName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--slate-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.invited_email}
              </div>
            </div>
            <Chip color={u.accepted ? "mint" : "amber"}>{u.accepted ? "Active" : "Pending"}</Chip>
            <Chip color={u.role === "editor" ? "cyan" : "default"}>{u.role}</Chip>
            <button style={iconBtnStyle()} title="Remove collaborator" onClick={() => handleRemove(u.id)}>
              <I.Trash size={13} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 10 }}>Share link</div>
      <div
        style={{
          padding: 10,
          background: "var(--ash)",
          border: "1px solid var(--iron)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          color: "var(--ash-gray)",
        }}
      >
        <I.Link size={14} />
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {shareLink || "—"}
        </div>
        <Btn size="sm" onClick={copyLink} disabled={!shareLink}>
          {copied ? "Copied" : "Copy"}
        </Btn>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <Toggle checked={true} />
        <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>
          Recipients with an invite can <b style={{ color: "var(--bone)" }}>accept</b> after signing in
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Models
// ---------------------------------------------------------------
const IMAGE_MODELS = [
  { id: "nanobanana-pro", label: "NanoBanana Pro", price: "$0.04 / img" },
  { id: "seedream-4",     label: "Seedream 4",     price: "$0.03 / img" },
  { id: "qwen-img",       label: "Qwen-Img",       price: "$0.02 / img" },
];

function ModelsTab({
  projectId,
  dbProject,
  onChanged,
}: {
  projectId: string | null;
  dbProject: DBProject | null;
  onChanged: (patch: Partial<DBProject>) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [err, setErr] = useState<string | null>(null);
  const selectedImage = dbProject?.default_image_model ?? IMAGE_MODELS[0].id;
  const selectedVideo = dbProject?.default_model ?? MODELS[0].id;

  async function save(patch: Partial<DBProject>) {
    if (!projectId) return;
    try {
      try {
        await updateProject(supabase, projectId, patch);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/column .* does not exist/i.test(msg)) {
          console.warn("ModelsTab — skipped missing column:", msg);
        } else {
          throw e;
        }
      }
      onChanged(patch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>AI models</div>
      <Field label="Image model">
        <div style={{ display: "flex", gap: 8 }}>
          {IMAGE_MODELS.map((m) => {
            const active = m.id === selectedImage;
            return (
              <div
                key={m.id}
                onClick={() => save({ default_image_model: m.id })}
                style={{
                  flex: 1,
                  padding: 12,
                  background: active ? "rgba(212,255,58,0.06)" : "var(--ash)",
                  border: `1px solid ${active ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--lime)" : "var(--bone)" }}>{m.label}</div>
                <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
                  {m.price}
                </div>
              </div>
            );
          })}
        </div>
      </Field>
      <Field label="Video model">
        <div style={{ display: "flex", gap: 8 }}>
          {MODELS.map((m) => {
            const active = m.id === selectedVideo;
            return (
              <div
                key={m.id}
                onClick={() => save({ default_model: m.id })}
                style={{
                  flex: 1,
                  padding: 12,
                  background: active ? "rgba(212,255,58,0.06)" : "var(--ash)",
                  border: `1px solid ${active ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--lime)" : "var(--bone)" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
                  {m.tag}
                </div>
              </div>
            );
          })}
        </div>
      </Field>
      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 11,
          }}
        >
          {err}
        </div>
      )}
      {/* TODO: Consistency / character lock — visual only for now. */}
      <Field label="Consistency — character lock" hint="LoRA-style token pinned across shots.">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={true} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--bone)" }}>
              Lock to <b>AURA · bottle ref #1</b>
            </div>
            <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
              Token: auralite_v3 · 4 references pinned
            </div>
          </div>
        </div>
      </Field>
      {/* TODO: Budget — visual only; wire usage tracking when billing lands. */}
      <Field label="Monthly budget">
        <div style={{ padding: 12, background: "var(--ash)", border: "1px solid var(--iron)", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--bone)", fontFamily: "var(--f-mono)" }}>$184</div>
            <div style={{ fontSize: 11, color: "var(--slate-2)" }}>/ $500 used</div>
          </div>
          <div style={{ height: 4, background: "var(--iron)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: "37%", height: "100%", background: "var(--lime)" }} />
          </div>
        </div>
      </Field>
    </>
  );
}

// ---------------------------------------------------------------
// Export
// ---------------------------------------------------------------
const EXPORT_FORMATS = ["MP4 · H.264", "MP4 · H.265", "ProRes", "WebM"];

function ExportTab({
  projectId,
  dbProject,
  onChanged,
}: {
  projectId: string | null;
  dbProject: DBProject | null;
  onChanged: (patch: Partial<DBProject>) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [err, setErr] = useState<string | null>(null);

  const format = dbProject?.export_format ?? EXPORT_FORMATS[0];
  const burnSubs = !!dbProject?.export_burn_subtitles;
  const editorPack = dbProject?.export_editor_pack ?? true;
  const watermark = !!dbProject?.export_watermark;

  async function save(patch: Partial<DBProject>) {
    if (!projectId) return;
    try {
      try {
        await updateProject(supabase, projectId, patch);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/column .* does not exist/i.test(msg)) {
          console.warn("ExportTab — skipped missing column:", msg);
        } else {
          throw e;
        }
      }
      onChanged(patch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)", marginBottom: 14 }}>Export defaults</div>
      <Field label="Format">
        <div style={{ display: "flex", gap: 6 }}>
          {EXPORT_FORMATS.map((f) => {
            const active = f === format;
            return (
              <button
                key={f}
                onClick={() => save({ export_format: f })}
                style={{
                  flex: 1,
                  height: 38,
                  background: active ? "rgba(212,255,58,0.06)" : "var(--ash)",
                  border: `1px solid ${active ? "rgba(212,255,58,0.3)" : "var(--iron)"}`,
                  borderRadius: 6,
                  color: active ? "var(--lime)" : "var(--bone)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "var(--f-mono)",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Burn-in subtitles">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={burnSubs} onChange={(v) => save({ export_burn_subtitles: v })} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>Auto-generate from VO script</div>
        </div>
      </Field>
      <Field label="Editor pack" hint="Includes individual shots, MOGRT titles, LUT, and project .xml.">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={editorPack} onChange={(v) => save({ export_editor_pack: v })} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>
            Include Premiere / DaVinci project files
          </div>
        </div>
      </Field>
      <Field label="Watermark">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--ash)",
            border: "1px solid var(--iron)",
            borderRadius: 8,
          }}
        >
          <Toggle checked={watermark} onChange={(v) => save({ export_watermark: v })} />
          <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>FrameForge mark bottom-right (free tier)</div>
        </div>
      </Field>
      {err && (
        <div
          style={{
            marginTop: 10,
            padding: "6px 10px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 11,
          }}
        >
          {err}
        </div>
      )}
    </>
  );
}
