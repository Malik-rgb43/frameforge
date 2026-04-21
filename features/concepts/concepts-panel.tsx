"use client";
import { internalFetch } from "@/lib/api";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Plus, Loader2, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/store";
import { useConcepts, type ConceptUI } from "./store";
import { applyConceptToBoard } from "./apply-concept";
import { briefAsContext, EMPTY_BRIEF, type ProjectBrief } from "@/features/brief/brief-types";

function getProjectBriefContext(): string {
  try {
    if (typeof window === "undefined") return "";
    const raw = sessionStorage.getItem("ff.active.project");
    if (!raw) return "";
    const proj = JSON.parse(raw);
    const brief = proj?.brief as ProjectBrief | null;
    if (!brief) return "";
    return briefAsContext({ ...EMPTY_BRIEF, ...brief });
  } catch {
    return "";
  }
}

export default function ConceptsPanel() {
  const t = useI18n((s) => s.t);
  const open = useConcepts((s) => s.open);
  const setOpen = useConcepts((s) => s.setOpen);
  const items = useConcepts((s) => s.items);
  const generating = useConcepts((s) => s.generating);
  const addConcepts = useConcepts((s) => s.addConcepts);
  const setGenerating = useConcepts((s) => s.setGenerating);

  const [applyingId, setApplyingId] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const briefCtx = getProjectBriefContext();
      const systemPrompt = `You are a senior creative director producing concepts for a short-form ad. Return JSON only with this shape:
{"concepts":[{"title":"...","tagline":"...","avatar":"...","coreInsight":"...","hookArchetype":"question|overstated-claim|statistic|story|open-loop|pattern-interrupt","visualSpine":"...","palette":["#hex","#hex","#hex"],"moodKeywords":["word","word","word"],"lengthSeconds":8,"shotCount":5,"creativityLevel":"bold"}]}
No prose, no fences.${briefCtx ? `\n\n${briefCtx}` : ""}`;
      const userPrompt = `Generate 3 distinct concepts for a commercial ad.${briefCtx ? " Use the project brief above — product, audience, voice, and constraints are ground truth." : ""} Each must target a different emotional angle. Be specific, sensory, and production-ready. JSON only.`;

      const res = await internalFetch("/api/gemini", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          responseMimeType: "application/json",
          model: "gemini-3-flash",
          action: "concept.from-brief",
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data: { concepts: Array<Record<string, unknown>> };
        };
        const conceptsBatch = (data.data.concepts ?? []).map((c) => ({
          id: "c_" + Math.random().toString(36).slice(2, 9),
          title: String(c.title ?? "Untitled"),
          tagline: String(c.tagline ?? ""),
          avatar: String(c.avatar ?? ""),
          coreInsight: String(c.coreInsight ?? ""),
          hookArchetype: String(c.hookArchetype ?? "story"),
          visualSpine: String(c.visualSpine ?? ""),
          palette: (Array.isArray(c.palette)
            ? c.palette.slice(0, 3)
            : ["#1E1E28", "#FFB86B", "#6AE3FF"]) as [string, string, string],
          moodKeywords: Array.isArray(c.moodKeywords)
            ? (c.moodKeywords as string[])
            : [],
          lengthSeconds: Number(c.lengthSeconds ?? 12),
          shotCount: Number(c.shotCount ?? 5),
          creativityLevel: (c.creativityLevel as ConceptUI["creativityLevel"]) ??
            "distinctive",
          moodboardUrls: [
            "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=320&h=320&fit=crop",
            "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=320&h=320&fit=crop",
            "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=320&h=320&fit=crop",
            "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=320&h=320&fit=crop",
          ],
          appliedBoardId: null,
          createdAt: new Date().toISOString(),
        }));
        addConcepts(conceptsBatch);
      } else {
        // API not configured → fall back to mock
        await new Promise((r) => setTimeout(r, 800));
        addConcepts([makeMockConcept(), makeMockConcept()]);
      }
    } catch (err) {
      console.warn("Gemini concept gen failed, mock fallback:", err);
      addConcepts([makeMockConcept(), makeMockConcept()]);
    } finally {
      setGenerating(false);
    }
  };

  const apply = async (c: ConceptUI) => {
    setApplyingId(c.id);
    try {
      await applyConceptToBoard(c);
      setOpen(false);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-3 bottom-3 right-3 z-30 w-[min(90vw,380px)] rounded-2xl glass-panel shadow-panel overflow-hidden flex flex-col"
        >
          <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle">
            <Sparkles className="w-4 h-4 text-accent-warm" />
            <h2 className="text-sm font-semibold text-text-primary flex-1">
              Concepts
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Generate button */}
          <div className="p-4">
            <button
              onClick={generate}
              disabled={generating}
              className={cn(
                "w-full h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ease-spring",
                generating
                  ? "border-accent-warm/60 bg-accent-warm/5"
                  : "border-border-subtle hover:border-accent-warm/40 hover:bg-accent-warm/5"
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 text-accent-warm animate-spin" />
                  <span className="text-xs text-accent-warm font-medium">
                    Generating with Gemini 3 Pro...
                  </span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-accent-warm" />
                  <span className="text-xs font-medium text-text-primary">
                    Generate new concept
                  </span>
                  <span className="text-2xs text-text-muted">
                    Gemini 3 Pro → 5 fresh angles
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
            {items.map((c) => (
              <ConceptCard
                key={c.id}
                concept={c}
                applying={applyingId === c.id}
                onApply={() => apply(c)}
              />
            ))}
            {items.length === 0 && !generating && (
              <div className="py-10 text-center text-xs text-text-muted">
                No concepts yet. Generate one above.
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ConceptCard({
  concept,
  applying,
  onApply,
}: {
  concept: ConceptUI;
  applying: boolean;
  onApply: () => void;
}) {
  const isApplied = !!concept.appliedBoardId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl bg-panel-2 border overflow-hidden transition-colors",
        isApplied
          ? "border-status-success/40"
          : "border-border-subtle hover:border-border-hover"
      )}
    >
      {/* Mood collage 2x2 */}
      <div className="grid grid-cols-2 gap-px bg-canvas aspect-[2/1]">
        {concept.moodboardUrls.slice(0, 4).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            className="w-full h-full object-cover"
          />
        ))}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {concept.title}
            </h3>
            <p className="text-2xs text-text-secondary line-clamp-2 leading-relaxed mt-0.5">
              {concept.tagline}
            </p>
          </div>
          <CreativityBadge level={concept.creativityLevel} />
        </div>

        {/* Palette */}
        <div className="flex items-center gap-1">
          {concept.palette.map((hex) => (
            <div
              key={hex}
              className="w-3 h-3 rounded-full border border-white/10"
              style={{ background: hex }}
              title={hex}
            />
          ))}
          <div className="flex-1" />
          <span className="text-2xs font-mono text-text-muted">
            {concept.shotCount} shots · {concept.lengthSeconds}s
          </span>
        </div>

        {/* Avatar */}
        <div className="text-2xs text-text-muted truncate">{concept.avatar}</div>

        {/* Apply button */}
        <button
          onClick={onApply}
          disabled={applying || isApplied}
          className={cn(
            "mt-1 h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ease-spring",
            isApplied
              ? "bg-status-success/10 text-status-success border border-status-success/30"
              : applying
                ? "bg-accent-warm/20 text-accent-warm"
                : "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_16px_rgba(255,184,107,0.25)]"
          )}
        >
          {isApplied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Applied
            </>
          ) : applying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Building board...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Apply → Generate Board
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function CreativityBadge({ level }: { level: ConceptUI["creativityLevel"] }) {
  const cfg = {
    safe: { label: "safe", cls: "bg-text-muted/15 text-text-muted" },
    distinctive: {
      label: "distinctive",
      cls: "bg-accent-cool/15 text-accent-cool",
    },
    bold: { label: "bold", cls: "bg-accent-warm/15 text-accent-warm" },
    breakthrough: {
      label: "breakthrough",
      cls: "bg-accent-violet/15 text-accent-violet",
    },
  }[level];
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded-md text-2xs font-mono uppercase tracking-wider flex-shrink-0",
        cfg.cls
      )}
    >
      {cfg.label}
    </span>
  );
}

// Helper — generate a plausible mock concept until AI wiring
let counter = 0;
function makeMockConcept(): ConceptUI {
  counter++;
  const levels: ConceptUI["creativityLevel"][] = ["bold", "breakthrough", "distinctive"];
  const titles = [
    "Cold Focus",
    "The Interruption",
    "Wet Reset",
    "Dawn Static",
    "Minus Seven",
  ];
  const moods = [
    ["urgent", "lo-fi", "neon-shadow"],
    ["tactile", "patient", "warm-dark"],
    ["glossy", "athletic", "contrast-forward"],
    ["quiet", "domestic", "lived-in"],
  ];
  const t = titles[counter % titles.length];
  return {
    id: "c_" + Math.random().toString(36).slice(2, 9),
    title: t,
    tagline: `A scroll-stop built on ${t.toLowerCase()} — one frame, one feeling, one reason to replay.`,
    avatar: "Creator, 26-34, pays for quality, hates performance advertising",
    coreInsight:
      "The category defaults to polish. Our brand earns attention by feeling slightly unfinished and intensely specific.",
    hookArchetype: "pattern-interrupt",
    visualSpine:
      "A single unexpected physical action — pour, pop, crack — captured in a frame that would work as a still photo.",
    palette: ["#0E0F14", "#FFB86B", "#6AE3FF"],
    moodKeywords: moods[counter % moods.length],
    lengthSeconds: 8 + (counter % 6),
    shotCount: 4 + (counter % 3),
    creativityLevel: levels[counter % levels.length],
    moodboardUrls: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=320&h=320&fit=crop",
    ],
    appliedBoardId: null,
    createdAt: new Date().toISOString(),
  };
}
