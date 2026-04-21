"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { uploadImagesAsSources } from "./upload-utils";

export default function DropZone() {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    dragCounter.current++;
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;
      // Dispatch with screen coords so canvas can convert to flow coords
      window.dispatchEvent(
        new CustomEvent("ff:drop-files", {
          detail: { files, clientX: e.clientX, clientY: e.clientY },
        })
      );
    },
    []
  );

  useEffect(() => {
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [onDragEnter, onDragLeave, onDragOver, onDrop]);

  return (
    <AnimatePresence>
      {dragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-4 z-40 pointer-events-none flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-2xl bg-accent-warm/10 backdrop-blur-sm border-2 border-dashed border-accent-warm" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-accent-warm/20 border border-accent-warm/40 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-accent-warm" />
            </div>
            <div className="text-lg font-semibold text-text-primary">
              Drop to add as source images
            </div>
            <div className="text-xs text-text-secondary">
              JPG, PNG, WebP — any size
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
