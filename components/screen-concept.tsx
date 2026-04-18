"use client";
import React, { useEffect, useMemo, useState } from "react";
import { I } from "./icons";
import { Btn, Chip, Field, Input, Textarea } from "./ui";
import {
  SEED_CONCEPTS,
  SEED_PRODUCT_IMAGES,
  shotURI,
  type Concept,
} from "@/lib/data";
import { createClient } from "@/lib/supabase-client";
import {
  createConcept,
  listConcepts,
  setSelectedConcept,
  type DBConceptUI,
} from "@/lib/queries-concepts";
import { listBoardItems, type DBBoardItemUI } from "@/lib/queries-board";
import { updateProject } from "@/lib/queries";
import { generateConcepts } from "@/lib/ai-queries";
import type { Brief } from "@/lib/prompts";

interface Props {
  onNext: () => void;
  projectId?: string | null;
}

const DEFAULT_BRIEF = {
  goal: "Launch of AURA's signature serum. Reposition as a quiet luxury ritual, not skincare.",
  audience: "Women, 28–44, premium beauty, urban",
  placements: ["Reels", "TikTok", "YouTube pre-roll", "OOH"],
  mustInclude: ["Logo visible 2+ seconds", "Product close-up", "End card with CTA"],
};

export default function ScreenConcept({ onNext, projectId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [concepts, setConcepts] = useState<DBConceptUI[] | null>(null);
  const [refs, setRefs] = useState<DBBoardItemUI[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savingNext, setSavingNext] = useState(false);

  const [goal, setGoal] = useState(DEFAULT_BRIEF.goal);
  const [audience, setAudience] = useState(DEFAULT_BRIEF.audience);
  const [placementsText, setPlacementsText] = useState(DEFAULT_BRIEF.placements.join(", "));
  const [mustIncludeText, setMustIncludeText] = useState(DEFAULT_BRIEF.mustInclude.join("\n"));

  const [writeOpen, setWriteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newHook, setNewHook] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) {
        if (!active) return;
        setConcepts(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [rows, items] = await Promise.all([
          listConcepts(supabase, projectId),
          listBoardItems(supabase, projectId),
        ]);
        if (!active) return;
        setConcepts(rows);
        setRefs(items.filter((i) => i.isRef));
        const pre = rows.find((c) => c.isSelected) ?? rows[0];
        setSelected(pre?.dbId ?? null);
      } catch (error) {
        console.error("load concepts", error);
        if (!active) return;
        setConcepts([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, projectId]);

  async function reloadConcepts() {
    if (!projectId) return;
    const rows = await listConcepts(supabase, projectId);
    setConcepts(rows);
    const pre = rows.find((c) => c.isSelected) ?? rows[0];
    setSelected(pre?.dbId ?? null);
  }

  async function handleSelect(conceptId: string) {
    setSelected(conceptId);
    if (!projectId) return;
    try {
      await setSelectedConcept(supabase, projectId, conceptId);
      setConcepts((prev) =>
        prev
          ? prev.map((c) => ({ ...c, isSelected: c.dbId === conceptId }))
          : prev
      );
    } catch (error) {
      console.error("setSelectedConcept", error);
      setErr(error instanceof Error ? error.message : "Failed to select concept");
    }
  }

  function buildBrief(): Brief {
    return {
      projectName: "FrameForge Project",
      client: "",
      goal,
      audience,
      placements: placementsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      mustInclude: mustIncludeText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      aspect: "9:16",
    };
  }

  async function handleRegenerate() {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setErr(null);
    try {
      await generateConcepts(projectId, buildBrief());
      await reloadConcepts();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to regenerate concepts");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleUseThis() {
    if (!projectId || savingNext) return;
    const target = (concepts || []).find((c) => c.dbId === selected);
    if (!target) {
      onNext();
      return;
    }
    setSavingNext(true);
    setErr(null);
    try {
      await updateProject(supabase, projectId, {
        concept_title: target.title,
        concept_hook: target.hook ?? "",
        concept_palette: target.palette ?? [],
      });
      onNext();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save concept");
    } finally {
      setSavingNext(false);
    }
  }

  async function handleSaveNewConcept() {
    if (!projectId || savingNew) return;
    if (!newTitle.trim()) {
      setErr("Title is required");
      return;
    }
    setSavingNew(true);
    setErr(null);
    try {
      await createConcept(supabase, projectId, {
        title: newTitle.trim(),
        hook: newHook.trim(),
        vibe: [],
        palette: ["#d4ff3a", "#1a1a1d", "#f7f4ee"],
        length_seconds: 10,
        shot_count: 4,
        is_ai_generated: false,
      });
      setNewTitle("");
      setNewHook("");
      setWriteOpen(false);
      await reloadConcepts();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to create concept");
    } finally {
      setSavingNew(false);
    }
  }

  const viewConcepts: DBConceptUI[] | Concept[] =
    concepts && concepts.length > 0
      ? concepts
      : !projectId
      ? SEED_CONCEPTS.map((c, i) => ({
          ...c,
          dbId: c.id,
          isSelected: i === 0,
        }))
      : [];

  const viewRefs =
    refs.length > 0 ? refs : !projectId ? SEED_PRODUCT_IMAGES.filter((i) => i.isRef).slice(0, 3) : [];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 340,
          flexShrink: 0,
          borderRight: "1px solid var(--iron)",
          padding: 22,
          overflow: "auto",
          background: "var(--onyx)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--f-mono)",
            letterSpacing: 1.5,
            color: "var(--slate-2)",
            marginBottom: 4,
          }}
        >
          BRIEF
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--bone)",
            marginBottom: 14,
            letterSpacing: -0.2,
          }}
        >
          AURA · Morning Campaign
        </div>
        <Field label="Goal">
          <Textarea rows={3} value={goal} onChange={setGoal} />
        </Field>
        <Field label="Audience">
          <Input value={audience} onChange={setAudience} />
        </Field>
        <Field label="Placements" hint="Comma-separated">
          <Input value={placementsText} onChange={setPlacementsText} />
        </Field>
        <Field label="Must include" hint="One per line">
          <Textarea rows={3} value={mustIncludeText} onChange={setMustIncludeText} />
        </Field>
        <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
        <div
          style={{
            fontSize: 11,
            color: "var(--slate-2)",
            marginBottom: 8,
            fontFamily: "var(--f-mono)",
            letterSpacing: 1,
          }}
        >
          REFERENCES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {viewRefs.slice(0, 3).map((i) => (
            <div
              key={i.id}
              style={{
                aspectRatio: "1",
                background: `url("${shotURI({ id: i.id, kind: i.kind, tone: i.tone, w: 300, h: 300 })}") center/cover`,
                border: "1px solid var(--iron)",
                borderRadius: 6,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1.5,
              color: "var(--lime)",
            }}
          >
            STEP 2 · PICK A DIRECTION
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.4 }}>
            {regenerating ? "Thinking…" : "Five concepts from your brief"}
          </div>
          <div style={{ flex: 1 }} />
          <Btn
            size="sm"
            icon={<I.Refresh size={14} />}
            onClick={handleRegenerate}
            disabled={regenerating || !projectId}
          >
            {regenerating ? "Thinking…" : "Regenerate"}
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon={<I.ArrowRight size={14} />}
            onClick={handleUseThis}
            disabled={savingNext || !selected}
            style={{ marginLeft: 8 }}
          >
            {savingNext ? "Saving…" : "Use this concept"}
          </Btn>
        </div>

        {err && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              border: "1px solid rgba(255,90,95,0.3)",
              background: "rgba(255,90,95,0.08)",
              color: "var(--coral)",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {err}
          </div>
        )}

        {loading && projectId ? (
          <ConceptSkeletons />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {viewConcepts.map((c, i) => {
              const id = (c as DBConceptUI).dbId ?? c.id;
              return (
                <ConceptCard
                  key={id}
                  c={c}
                  idx={i}
                  selected={selected === id}
                  onClick={() => handleSelect(id)}
                />
              );
            })}
            {writeOpen ? (
              <div
                style={{
                  padding: 18,
                  border: "1px dashed rgba(212,255,58,0.5)",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 260,
                  background: "var(--onyx)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--f-mono)",
                    letterSpacing: 1.5,
                    color: "var(--lime)",
                  }}
                >
                  NEW CONCEPT
                </div>
                <Field label="Title">
                  <Input value={newTitle} onChange={setNewTitle} placeholder="e.g. Weightless Ritual" />
                </Field>
                <Field label="Hook">
                  <Textarea
                    rows={3}
                    value={newHook}
                    onChange={setNewHook}
                    placeholder="1–2 sentence visual spine"
                  />
                </Field>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    size="sm"
                    onClick={() => {
                      setWriteOpen(false);
                      setNewTitle("");
                      setNewHook("");
                    }}
                    disabled={savingNew}
                  >
                    Cancel
                  </Btn>
                  <div style={{ flex: 1 }} />
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={handleSaveNewConcept}
                    disabled={savingNew || !newTitle.trim()}
                  >
                    {savingNew ? "Saving…" : "Save"}
                  </Btn>
                </div>
              </div>
            ) : (
              <div
                onClick={() => projectId && setWriteOpen(true)}
                style={{
                  padding: 20,
                  border: "1px dashed var(--iron-2)",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  minHeight: 260,
                  cursor: projectId ? "pointer" : "default",
                  opacity: projectId ? 1 : 0.5,
                }}
              >
                <div style={{ color: "var(--lime)" }}>
                  <I.Edit size={22} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bone)" }}>Write your own</div>
                <div style={{ fontSize: 11, color: "var(--slate-2)", textAlign: "center" }}>
                  Add a custom concept
                  <br />
                  with your own title + hook.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConceptSkeletons() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            minHeight: 260,
            borderRadius: 12,
            border: "1px solid var(--iron)",
            background: "var(--onyx)",
            animation: "lime-pulse 1.4s ease-in-out infinite",
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

function ConceptCard({
  c,
  selected,
  onClick,
  idx,
}: {
  c: Concept | DBConceptUI;
  selected: boolean;
  onClick: () => void;
  idx: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 18,
        background: selected
          ? "linear-gradient(160deg, rgba(212,255,58,0.06), transparent 70%), var(--onyx)"
          : "var(--onyx)",
        border: `1px solid ${selected ? "rgba(212,255,58,0.4)" : "var(--iron)"}`,
        borderRadius: 12,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 200ms var(--e-out)",
        animation: `stagger-in 300ms ${idx * 60}ms var(--e-out) both`,
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--lime)",
            color: "var(--lime-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Check size={14} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 0,
          height: 6,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 12,
          width: "fit-content",
        }}
      >
        {c.palette.map((p, i) => (
          <div key={i} style={{ width: 36, height: 6, background: p }} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--f-mono)",
          letterSpacing: 1.5,
          color: "var(--slate-2)",
          marginBottom: 4,
        }}
      >
        CONCEPT · {String(idx + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 600,
          color: "var(--bone)",
          letterSpacing: -0.3,
          marginBottom: 8,
        }}
      >
        {c.title}
      </div>
      <div style={{ fontSize: 13, color: "var(--ash-gray)", lineHeight: 1.55, marginBottom: 14 }}>{c.hook}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {c.vibe.map((v) => (
          <Chip key={v}>{v}</Chip>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: "var(--slate-2)",
          fontFamily: "var(--f-mono)",
        }}
      >
        <span>
          <I.Clock size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
          {c.length}s
        </span>
        <span>
          <I.Film size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
          {c.shots} shots
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: selected ? "var(--lime)" : "var(--slate-2)" }}>
          {selected ? "Selected" : "Tap to select"}
        </span>
      </div>
    </div>
  );
}
