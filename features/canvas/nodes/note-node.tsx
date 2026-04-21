"use client";
import { useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { FileText } from "lucide-react";
import type { NodeRow } from "@/lib/supabase/types";
import { useCanvas } from "../store";

export default function NoteNode({
  data,
  selected,
}: NodeProps<{ row: NodeRow }>) {
  const { row } = data;
  const updateNode = useCanvas((s) => s.updateNode);
  const meta = (row.metadata ?? {}) as { text?: string; note_type?: string };
  const isEditorialBrief = meta.note_type === "editorial_brief";
  const [text, setText] = useState(meta.text ?? "");
  const [editing, setEditing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (val: string) => {
    setText(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const latestMeta = (useCanvas.getState().nodes.find((n) => n.id === row.id)?.metadata ?? {}) as Record<string, unknown>;
      updateNode(row.id, {
        metadata: { ...latestMeta, text: val } as import("@/lib/supabase/types").Json,
        updated_at: new Date().toISOString(),
      });
    }, 600);
  };

  return (
    <div
      className={`relative rounded-xl backdrop-blur-sm border transition-all ease-spring duration-200 overflow-hidden ${
        isEditorialBrief
          ? selected
            ? "bg-panel border-accent-violet/50 shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-panel border-accent-violet/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : selected
            ? "bg-yellow-500/10 border-accent-warm shadow-node-hover"
            : "bg-yellow-500/10 border-yellow-500/30 shadow-node"
      }`}
      style={{ width: row.w, minHeight: row.h }}
    >
      {isEditorialBrief && (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent-violet to-transparent" />
      )}

      {isEditorialBrief && !editing ? (
        /* Read-only styled view for editorial briefs */
        <div
          className="nodrag p-3 overflow-y-auto cursor-text"
          style={{ maxHeight: row.h ?? 480 }}
          onDoubleClick={() => setEditing(true)}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3 h-3 text-accent-violet" />
            <span className="text-[9px] font-mono text-accent-violet uppercase tracking-wider">Editorial Brief</span>
          </div>
          <div className="text-[9.5px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            {text || <span className="text-text-muted/40 italic">No content yet</span>}
          </div>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => { if (isEditorialBrief) setEditing(false); }}
          autoFocus={editing}
          placeholder={isEditorialBrief ? "Editorial brief…" : "Type a note…"}
          dir="auto"
          className={`nodrag w-full h-full bg-transparent resize-none focus:outline-none leading-relaxed p-3 ${
            isEditorialBrief
              ? "text-[9.5px] text-text-secondary"
              : "text-xs text-yellow-200/90 placeholder:text-yellow-200/30"
          }`}
          style={{ minHeight: (row.h ?? 80) - 24 }}
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        className={`!w-2 !h-2 !border-0 opacity-60 ${isEditorialBrief ? "!bg-accent-violet" : "!bg-yellow-500"}`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-2 !h-2 !border-0 opacity-60 ${isEditorialBrief ? "!bg-accent-violet" : "!bg-yellow-500"}`}
      />
    </div>
  );
}
