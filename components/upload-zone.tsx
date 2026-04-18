"use client";
import React, { useCallback, useRef, useState } from "react";
import { I } from "./icons";
import { uploadProductShot, type UploadResult } from "@/lib/upload";

interface Props {
  projectId: string;
  onUploaded?: (result: UploadResult & { file: File }) => void;
  multiple?: boolean;
  compact?: boolean;
}

interface UploadStatus {
  id: string;
  name: string;
  progress: number;
  error?: string;
  done?: boolean;
}

export default function UploadZone({ projectId, onUploaded, multiple = true, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);
  const [items, setItems] = useState<UploadStatus[]>([]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        setItems((prev) => [...prev, { id, name: file.name, progress: 10 }]);
        try {
          const result = await uploadProductShot(file, projectId);
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, progress: 100, done: true } : i)));
          onUploaded?.({ ...result, file });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, error: msg } : i)));
        }
      }
    },
    [projectId, onUploaded],
  );

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `1.5px dashed ${hover ? "var(--lime)" : "var(--iron-2)"}`,
          borderRadius: 10,
          padding: compact ? 14 : 26,
          background: hover ? "rgba(212,255,58,0.06)" : "var(--ash)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          transition: "all 160ms var(--e-out)",
        }}
      >
        <div
          style={{
            width: compact ? 36 : 48,
            height: compact ? 36 : 48,
            borderRadius: "50%",
            background: "rgba(212,255,58,0.08)",
            color: "var(--lime)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Upload size={compact ? 16 : 22} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bone)" }}>
          Drop images or click to browse
        </div>
        <div style={{ fontSize: 10, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>
          PNG · JPG · WebP · up to 20MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                padding: "8px 10px",
                background: "var(--ash)",
                border: `1px solid ${it.error ? "rgba(255,90,95,0.3)" : "var(--iron)"}`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
              }}
            >
              <div style={{ flex: 1, color: it.error ? "var(--coral)" : "var(--bone)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.name}
              </div>
              {it.error ? (
                <span style={{ color: "var(--coral)", fontSize: 10 }}>{it.error}</span>
              ) : it.done ? (
                <I.Check size={14} style={{ color: "var(--lime)" }} />
              ) : (
                <div style={{ width: 60, height: 3, background: "var(--iron-2)", borderRadius: 2 }}>
                  <div
                    style={{
                      width: `${it.progress}%`,
                      height: "100%",
                      background: "var(--lime)",
                      borderRadius: 2,
                      transition: "width 200ms var(--e-out)",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
