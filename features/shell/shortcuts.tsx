"use client";
import { useEffect } from "react";
import { useCanvas } from "@/features/canvas/store";
import {
  downloadNodeImage,
  pickFiles,
  uploadImagesAsSources,
} from "@/features/upload/upload-utils";
import { getDataAdapter } from "@/lib/data-adapter";
import { createConceptCard } from "@/features/concept-card/concept-card-logic";
import type { NodeRow, NodeInput } from "@/lib/supabase/types";

interface Props {
  onMagicFill?: () => void;
  onConcepts?: () => void;
  onSettings?: () => void;
}

export default function ShortcutsHandler({
  onMagicFill,
  onConcepts,
  onSettings,
}: Props) {
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const meta = e.metaKey || e.ctrlKey;
      const state = useCanvas.getState();
      const selected = state.selectedNodeIds[0]
        ? state.nodes.find((n) => n.id === state.selectedNodeIds[0])
        : null;

      // Global (work even when typing)
      if (meta && e.key === "Enter") return; // chat bar handles this

      // Typing-sensitive
      if (typing) return;

      // ⌘+B → toggle Board ⇄ Storyboard
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        state.setViewMode(state.viewMode === "board" ? "storyboard" : "board");
        return;
      }
      // ⌘+D → duplicate selected
      if (meta && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        await duplicateNode(selected);
        return;
      }
      // ⌘+S → download selected image
      if (meta && e.key.toLowerCase() === "s" && selected?.image_url) {
        e.preventDefault();
        downloadNodeImage(selected).catch(console.error);
        return;
      }

      // Single letters (tool shortcuts)
      switch (e.key) {
        case "0":
          // Zoom to fit — React Flow exposes this via fitView; dispatch custom event
          window.dispatchEvent(new CustomEvent("ff:fit-view"));
          break;
        case "1":
          window.dispatchEvent(new CustomEvent("ff:zoom-100"));
          break;
        case "m":
        case "M":
          e.preventDefault();
          onMagicFill?.();
          break;
        case "c":
        case "C":
          e.preventDefault();
          createConceptCard().catch(console.error);
          break;
        case ",":
          if (meta) {
            e.preventDefault();
            onSettings?.();
          }
          break;
        case "g":
        case "G": {
          e.preventDefault();
          const ta = document.querySelector<HTMLTextAreaElement>(
            "textarea[placeholder]"
          );
          ta?.focus();
          break;
        }
        case "u":
        case "U": {
          e.preventDefault();
          const files = await pickFiles();
          if (files.length > 0) uploadImagesAsSources(files).catch(console.error);
          break;
        }
        case "Delete":
        case "Backspace":
          if (selected) {
            e.preventDefault();
            await deleteNode(selected);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMagicFill, onConcepts, onSettings]);

  return null;
}

async function duplicateNode(src: NodeRow) {
  const state = useCanvas.getState();
  const adapter = await getDataAdapter();
  const input: NodeInput = {
    ...src,
    x: src.x + 40,
    y: src.y + 40,
    order_index: state.nodes.length,
    title: (src.title ?? "Copy") + " (copy)",
  } as NodeInput;
  try {
    const saved = await adapter.createNode(input);
    state.upsertNode(saved);
  } catch (err) {
    console.error("duplicate failed", err);
  }
}

async function deleteNode(n: NodeRow) {
  const state = useCanvas.getState();
  const adapter = await getDataAdapter();
  try {
    await adapter.deleteNode(n.id);
  } catch {
    /* ignore */
  }
  state.removeNode(n.id);
}
