"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  Lightbulb,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/store";

type Step = "refs" | "concept" | "shots" | "done";
type RefMode = "with-refs" | "without-refs";
type ConceptMode = "ai" | "manual";
type ShotMode = "ai" | "manual";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (choices: {
    refMode: RefMode;
    conceptMode: ConceptMode;
    shotMode: ShotMode;
    brief: string;
  }) => void;
}

export default function EntryWizard({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>("refs");
  const [refMode, setRefMode] = useState<RefMode | null>(null);
  const [conceptMode, setConceptMode] = useState<ConceptMode | null>(null);
  const [shotMode, setShotMode] = useState<ShotMode | null>(null);
  const [brief, setBrief] = useState("");

  const reset = () => {
    setStep("refs");
    setRefMode(null);
    setConceptMode(null);
    setShotMode(null);
    setBrief("");
  };

  const finish = () => {
    if (!refMode || !conceptMode || !shotMode) return;
    onComplete({ refMode, conceptMode, shotMode, brief });
    setTimeout(reset, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-[min(94vw,720px)] max-h-[92vh] overflow-y-auto glass-panel shadow-panel rounded-2xl border border-border-subtle"
          >
            <header className="h-14 px-5 flex items-center gap-3 border-b border-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-warm" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-text-primary">
                  New project
                </h2>
                <p className="text-2xs text-text-muted">
                  Pick how you want to start — you can always change later.
                </p>
              </div>
              <StepBadge step={step} />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-6 min-h-[320px]">
              {step === "refs" && (
                <ChoiceStep
                  heading="Starting from references?"
                  sub="References shape the visual DNA but aren't required."
                  options={[
                    {
                      value: "with-refs" as const,
                      icon: ImageIcon,
                      label: "Yes — I'll upload refs",
                      hint: "Product shots, mood images, or competitor ads",
                    },
                    {
                      value: "without-refs" as const,
                      icon: Sparkles,
                      label: "No — start from scratch",
                      hint: "AI will invent the visual world from the brief",
                    },
                  ]}
                  value={refMode}
                  onChange={setRefMode}
                  onNext={() => setStep("concept")}
                />
              )}

              {step === "concept" && (
                <ChoiceStep
                  heading="Who picks the concept?"
                  sub="A concept = the angle, avatar, and visual spine."
                  options={[
                    {
                      value: "ai" as const,
                      icon: Lightbulb,
                      label: "AI — propose 5 concepts",
                      hint: "Gemini 3 Pro will generate options to choose from",
                    },
                    {
                      value: "manual" as const,
                      icon: FileText,
                      label: "Me — I'll write the brief",
                      hint: "Start with your own angle and creative direction",
                    },
                  ]}
                  value={conceptMode}
                  onChange={setConceptMode}
                  onNext={() => setStep("shots")}
                  onBack={() => setStep("refs")}
                />
              )}

              {step === "shots" && (
                <ChoiceStep
                  heading="Who builds the shots?"
                  sub="Shots = the individual frames that make up the ad."
                  options={[
                    {
                      value: "ai" as const,
                      icon: Sparkles,
                      label: "AI — auto-generate full board",
                      hint: "One click, fully populated storyboard + connections",
                    },
                    {
                      value: "manual" as const,
                      icon: FileText,
                      label: "Me — I'll prompt shot by shot",
                      hint: "Start with empty canvas, build at your own pace",
                    },
                  ]}
                  value={shotMode}
                  onChange={setShotMode}
                  onNext={() => setStep("done")}
                  onBack={() => setStep("concept")}
                />
              )}

              {step === "done" && (
                <FinishStep
                  brief={brief}
                  setBrief={setBrief}
                  onBack={() => setStep("shots")}
                  onFinish={finish}
                />
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function StepBadge({ step }: { step: Step }) {
  const steps: Step[] = ["refs", "concept", "shots", "done"];
  const idx = steps.indexOf(step) + 1;
  return (
    <span className="px-2 py-1 rounded-md bg-panel-2 border border-border-subtle text-2xs font-mono text-text-muted">
      {idx} / 4
    </span>
  );
}

interface ChoiceOpt<T extends string> {
  value: T;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}

function ChoiceStep<T extends string>({
  heading,
  sub,
  options,
  value,
  onChange,
  onNext,
  onBack,
}: {
  heading: string;
  sub: string;
  options: ChoiceOpt<T>[];
  value: T | null;
  onChange: (v: T) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{heading}</h3>
        <p className="text-xs text-text-secondary mt-1">{sub}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const Icon = o.icon;
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={cn(
                "group text-start p-4 rounded-xl border transition-all ease-spring",
                active
                  ? "border-accent-warm bg-accent-warm/5 ring-1 ring-accent-warm/30"
                  : "border-border-subtle hover:border-border-hover hover:bg-white/3"
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    active ? "bg-accent-warm/15" : "bg-panel-2"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      active ? "text-accent-warm" : "text-text-secondary"
                    )}
                  />
                </div>
                {active && (
                  <Check className="w-4 h-4 text-accent-warm flex-shrink-0" />
                )}
              </div>
              <div className="text-sm font-medium text-text-primary">
                {o.label}
              </div>
              <div className="text-xs text-text-muted mt-1 leading-relaxed">
                {o.hint}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="h-9 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onNext}
          disabled={!value}
          className={cn(
            "h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ease-spring",
            value
              ? "bg-accent-warm text-canvas hover:brightness-110"
              : "bg-white/5 text-text-muted cursor-not-allowed"
          )}
        >
          Next
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function FinishStep({
  brief,
  setBrief,
  onBack,
  onFinish,
}: {
  brief: string;
  setBrief: (v: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Quick brief</h3>
        <p className="text-xs text-text-secondary mt-1">
          Optional — a few lines help the AI (or you) land faster.
        </p>
      </div>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={6}
        placeholder="Product: premium cold brew 330ml can.&#10;Goal: summer launch, 2.5× ROAS on Meta.&#10;Audience: creators 25-40, morning ritual seekers.&#10;Tone: calm, confident, a little bit cheeky."
        className="w-full bg-canvas border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/40 focus:border-accent-warm/30 resize-none leading-relaxed"
      />

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={onBack}
          className="h-9 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5"
        >
          ← Back
        </button>
        <button
          onClick={onFinish}
          className="h-10 px-5 rounded-lg text-sm font-medium bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_20px_rgba(255,184,107,0.25)] flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Create project
        </button>
      </div>
    </div>
  );
}
