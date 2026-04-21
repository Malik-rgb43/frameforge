"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const SECTIONS: { heading: string; items: { keys: string[]; label: string }[] }[] = [
  {
    heading: "Canvas",
    items: [
      { keys: ["Space", "drag"], label: "Pan canvas" },
      { keys: ["⌘", "scroll"], label: "Zoom" },
      { keys: ["V"], label: "Select tool" },
      { keys: ["H"], label: "Hand tool" },
      { keys: ["0"], label: "Fit to view" },
      { keys: ["1"], label: "Zoom 100%" },
    ],
  },
  {
    heading: "Generate",
    items: [
      { keys: ["G"], label: "Focus chat bar" },
      { keys: ["⌘", "↵"], label: "Generate" },
      { keys: ["⌘", "K"], label: "Command palette" },
      { keys: ["⇧", "click"], label: "Toggle as reference" },
      { keys: ["M"], label: "Magic Expand" },
      { keys: ["C"], label: "Concepts panel" },
    ],
  },
  {
    heading: "Node",
    items: [
      { keys: ["Dbl-click"], label: "Inspect" },
      { keys: ["Del"], label: "Delete" },
      { keys: ["⌘", "D"], label: "Duplicate" },
      { keys: ["⌘", "B"], label: "Toggle Board ⇄ Storyboard" },
      { keys: ["?"], label: "This panel" },
    ],
  },
];

export default function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-[min(92vw,680px)] glass-panel shadow-panel rounded-2xl border border-border-subtle overflow-hidden"
          >
            <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle">
              <div className="w-7 h-7 rounded-lg bg-accent-warm/10 border border-accent-warm/30 flex items-center justify-center">
                <Keyboard className="w-3.5 h-3.5 text-accent-warm" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary flex-1">
                Keyboard shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </header>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {SECTIONS.map((s) => (
                <section key={s.heading} className="flex flex-col gap-2">
                  <h3 className="text-2xs font-mono uppercase tracking-wider text-text-muted">
                    {s.heading}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {s.items.map((it, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 text-xs text-text-secondary"
                      >
                        <span>{it.label}</span>
                        <span className="flex gap-1">
                          {it.keys.map((k, j) => (
                            <kbd key={j}>{k}</kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <footer className="px-4 py-2.5 border-t border-border-subtle text-2xs font-mono text-text-muted flex items-center justify-between">
              <span>press ? to toggle</span>
              <span>Esc to close</span>
            </footer>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
