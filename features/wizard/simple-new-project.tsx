"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
}

export default function SimpleNewProject({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim());
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-[min(92vw,480px)] glass-panel shadow-panel rounded-2xl border border-border-subtle overflow-hidden"
            >
              <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle">
                <div className="w-7 h-7 rounded-lg bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-accent-warm" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary flex-1">
                  New project
                </h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </header>

              <div className="p-5 flex flex-col gap-3">
                <label className="text-xs font-medium text-text-primary">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  autoFocus
                  dir="auto"
                  placeholder="e.g. Summer Launch — Cold Brew"
                  className="w-full h-10 bg-canvas border border-border-subtle rounded-lg px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/40 focus:border-accent-warm/30"
                />
                {error && (
                  <p className="text-2xs text-status-error bg-status-error/10 border border-status-error/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <p className="text-2xs text-text-muted leading-relaxed">
                  A blank board will be created. Drop Concept Cards, upload
                  references, and generate shots right on the canvas.
                </p>
              </div>

              <footer className="px-5 py-4 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="h-9 px-3 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className={cn(
                    "h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ease-spring",
                    canSubmit
                      ? "bg-accent-warm text-canvas hover:brightness-110 shadow-[0_0_16px_rgba(255,184,107,0.25)]"
                      : "bg-white/5 text-text-muted cursor-not-allowed"
                  )}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Create project
                </button>
              </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
