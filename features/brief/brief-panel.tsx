"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Package,
  Users,
  Mic,
  Target,
  Check,
  Tag,
  Ban,
  MessageSquareQuote,
  Swords,
  Loader2,
  Save,
  ImagePlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_BRIEF,
  briefCompleteness,
  type ProjectBrief,
} from "./brief-types";
import { getDataAdapter } from "@/lib/data-adapter";
import type { Project } from "@/lib/supabase/types";

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSaved?: (project: Project) => void;
}

export default function BriefPanel({ open, onClose, project, onSaved }: Props) {
  const [brief, setBrief] = useState<ProjectBrief>(EMPTY_BRIEF);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!project) return;
    const existing = (project.brief as unknown as ProjectBrief) ?? EMPTY_BRIEF;
    setBrief({ ...EMPTY_BRIEF, ...existing });
  }, [project]);

  const setField = <K extends keyof ProjectBrief>(
    key: K,
    value: ProjectBrief[K]
  ) => setBrief((b) => ({ ...b, [key]: value }));

  const setList = (key: keyof ProjectBrief, csv: string) => {
    setBrief((b) => ({
      ...b,
      [key]: csv
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  };

  const save = async () => {
    if (!project || saving) return;
    setSaving(true);
    try {
      const adapter = await getDataAdapter();
      const updated = await adapter.updateProject(project.id, {
        brief: brief as unknown as Project["brief"],
      });
      setSavedAt(Date.now());
      onSaved?.(updated);
    } catch (err) {
      console.error("brief save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadingRef.current) return;
    const files = Array.from(e.target.files ?? []).filter((f) =>
      ALLOWED_IMAGE_TYPES.includes(f.type)
    );
    if (!files.length) return;
    const existing = brief.product_images ?? [];
    const toAdd = files.slice(0, 4 - existing.length);
    uploadingRef.current = true;
    Promise.all(
      toAdd.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          })
      )
    ).then((newUrls) => {
      setField("product_images", [...existing, ...newUrls]);
      uploadingRef.current = false;
    });
    e.target.value = "";
  };

  const removeProductImage = (idx: number) => {
    const imgs = [...(brief.product_images ?? [])];
    imgs.splice(idx, 1);
    setField("product_images", imgs);
  };

  const completeness = briefCompleteness(brief);
  const completenessPct = Math.round(completeness * 100);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 w-[min(92vw,520px)] glass-panel border-l border-border-subtle shadow-panel z-50 flex flex-col"
          >
            <header className="h-14 px-5 flex items-center gap-3 border-b border-border-subtle flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
                <Target className="w-4 h-4 text-accent-warm" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-text-primary truncate">
                  Project brief
                </h2>
                <p className="text-2xs text-text-muted truncate">
                  Every AI action uses this context — fill it once.
                </p>
              </div>
              <div className="text-2xs font-mono text-text-muted">
                {completenessPct}% filled
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Completeness bar */}
            <div className="h-1 bg-panel-2 flex-shrink-0">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-warm to-accent-cool"
                initial={{ width: 0 }}
                animate={{ width: `${completenessPct}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Product */}
              <Section icon={Package} label="What you're selling">
                <Field label="Product name" required filled={!!brief.productName}>
                  <Input
                    value={brief.productName}
                    onChange={(v) => setField("productName", v)}
                    placeholder="e.g. Cold Brew Co. 330ml can"
                  />
                </Field>
                <Field label="Category">
                  <Input
                    value={brief.productCategory}
                    onChange={(v) => setField("productCategory", v)}
                    placeholder="e.g. RTD coffee, beverages, natural energy"
                  />
                </Field>
                <Field
                  label="1-3 sentence product description"
                  required
                  filled={!!brief.productDescription}
                >
                  <Textarea
                    rows={3}
                    value={brief.productDescription}
                    onChange={(v) => setField("productDescription", v)}
                    placeholder="What it is, what makes it different, the 1 thing it does best."
                  />
                </Field>
                <Field label="Product images (up to 4)">
                  <div className="flex flex-wrap gap-2">
                    {(brief.product_images ?? []).map((url, idx) => (
                      <div key={idx} className="relative group w-16 h-20 rounded-lg overflow-hidden border border-border-subtle/60 bg-canvas/40 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeProductImage(idx)}
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <XCircle className="w-4 h-4 text-white drop-shadow-md" />
                        </button>
                      </div>
                    ))}
                    {(brief.product_images ?? []).length < 4 && (
                      <label className="w-16 h-20 rounded-lg border border-dashed border-border-subtle/60 bg-canvas/30 hover:bg-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors flex-shrink-0">
                        <ImagePlus className="w-4 h-4 text-text-muted" />
                        <span className="text-[9px] text-text-muted text-center leading-tight px-1">Add photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleProductImageUpload}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[9px] text-text-muted mt-1">
                    Used as visual ref in every generation — add your hero product shots.
                  </p>
                </Field>
              </Section>

              {/* Audience */}
              <Section icon={Users} label="Who it's for">
                <Field label="Audience handle">
                  <Input
                    value={brief.audienceName}
                    onChange={(v) => setField("audienceName", v)}
                    placeholder='e.g. "Creator Moms 28-40"'
                  />
                </Field>
                <Field
                  label="Context — pain, dream, lifestyle"
                  required
                  filled={!!brief.audienceContext}
                >
                  <Textarea
                    rows={3}
                    value={brief.audienceContext}
                    onChange={(v) => setField("audienceContext", v)}
                    placeholder="Write in customer language. Specific pains. Specific moments of their day."
                  />
                </Field>
                <Field label="Awareness stage">
                  <select
                    value={brief.audienceAwareness}
                    onChange={(e) =>
                      setField(
                        "audienceAwareness",
                        e.target.value as ProjectBrief["audienceAwareness"]
                      )
                    }
                    className="w-full h-9 bg-canvas border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-warm/40"
                  >
                    <option value="unaware">
                      Unaware · hasn't named the problem
                    </option>
                    <option value="problem-aware">
                      Problem-aware · knows the pain
                    </option>
                    <option value="solution-aware">
                      Solution-aware · knows category exists
                    </option>
                    <option value="product-aware">
                      Product-aware · knows us, comparing
                    </option>
                    <option value="most-aware">Most-aware · needs a push</option>
                  </select>
                </Field>
              </Section>

              {/* Brand voice */}
              <Section icon={Mic} label="Brand voice">
                <Field label="Voice in 3-5 words">
                  <Input
                    value={brief.brandVoice}
                    onChange={(v) => setField("brandVoice", v)}
                    placeholder="e.g. calm, confident, a little bit cheeky"
                  />
                </Field>
                <Field label="Core values (comma-separated)">
                  <Input
                    value={brief.brandValues.join(", ")}
                    onChange={(v) => setList("brandValues", v)}
                    placeholder="e.g. craft, patience, intentional, warmth"
                  />
                </Field>
              </Section>

              {/* Goal */}
              <Section icon={Target} label="Campaign goal">
                <Field label="Goal" required filled={!!brief.goal}>
                  <Input
                    value={brief.goal}
                    onChange={(v) => setField("goal", v)}
                    placeholder="e.g. Summer launch — 2.5× ROAS on Meta"
                  />
                </Field>
                <Field label="Placements">
                  <Input
                    value={brief.placements.join(", ")}
                    onChange={(v) => setList("placements", v)}
                    placeholder="Reels, TikTok, FB Feed, YouTube Shorts"
                  />
                </Field>
              </Section>

              {/* Must / Avoid */}
              <Section icon={Tag} label="Creative constraints">
                <Field label="Must include (comma-separated)">
                  <Input
                    value={brief.mustInclude.join(", ")}
                    onChange={(v) => setList("mustInclude", v)}
                    placeholder="e.g. product close-up, hebrew text, hero pour shot"
                  />
                </Field>
                <Field label="Avoid (comma-separated)">
                  <Input
                    icon={Ban}
                    value={brief.mustAvoid.join(", ")}
                    onChange={(v) => setList("mustAvoid", v)}
                    placeholder="e.g. smiling at camera, marble flat-lay, corporate jargon"
                  />
                </Field>
              </Section>

              {/* VOC */}
              <Section icon={MessageSquareQuote} label="Voice of customer (optional)">
                <Field label="Paste real review snippets">
                  <Textarea
                    rows={4}
                    value={brief.productReviews ?? ""}
                    onChange={(v) => setField("productReviews", v)}
                    placeholder='e.g. "I used to hate mornings until I..." — verbatim helps AI sound human'
                  />
                </Field>
              </Section>

              {/* Competitors */}
              <Section icon={Swords} label="Differentiate from (optional)">
                <Field label="Competitor names (comma-separated)">
                  <Input
                    value={brief.competitors?.join(", ") ?? ""}
                    onChange={(v) => setList("competitors", v)}
                    placeholder="Stumptown, Liquid Death, RISE"
                  />
                </Field>
              </Section>
            </div>

            <footer className="px-5 py-4 border-t border-border-subtle flex items-center gap-2 justify-between flex-shrink-0">
              <div className="text-2xs font-mono text-text-muted">
                {savedAt && Date.now() - savedAt < 5000 && (
                  <span className="flex items-center gap-1 text-status-success">
                    <Check className="w-3 h-3" />
                    Saved
                  </span>
                )}
              </div>
              <button
                onClick={save}
                disabled={saving || !project}
                className={cn(
                  "h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ease-spring",
                  !saving && project
                    ? "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_16px_rgba(255,184,107,0.25)]"
                    : "bg-white/5 text-text-muted cursor-not-allowed"
                )}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save brief
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-2xs font-mono uppercase tracking-wider text-text-muted">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="flex flex-col gap-3 pl-5 border-l border-border-subtle">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  filled,
  children,
}: {
  label: string;
  required?: boolean;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-text-primary">{label}</span>
        {required && !filled && (
          <span className="text-2xs text-accent-warm/80">required</span>
        )}
        {required && filled && (
          <Check className="w-3 h-3 text-status-success" />
        )}
      </div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-text-muted" />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="auto"
        className={cn(
          "w-full h-9 bg-canvas border border-border-subtle rounded-md pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-warm/40",
          Icon ? "pl-9" : "pl-3"
        )}
      />
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      dir="auto"
      className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-warm/40 resize-none leading-relaxed"
    />
  );
}
