"use client";
import { useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeRow } from "@/lib/supabase/types";
import { useCanvas } from "../store";

export default function NoteNode({
  data,
  selected,
}: NodeProps<{ row: NodeRow }>) {
  const { row } = data;
  const updateNode = useCanvas((s) => s.updateNode);
  const [text, setText] = useState(
    ((row.metadata as { text?: string } | null)?.text ?? "").toString()
  );
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
      className={`rounded-xl bg-yellow-500/10 backdrop-blur-sm border p-3 transition-all ease-spring duration-200 ${
        selected
          ? "border-accent-warm shadow-node-hover"
          : "border-yellow-500/30 shadow-node"
      }`}
      style={{ width: row.w, minHeight: row.h }}
    >
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type a note…"
        dir="auto"
        className="nodrag w-full h-full bg-transparent text-xs text-yellow-200/90 placeholder:text-yellow-200/30 resize-none focus:outline-none leading-relaxed"
        style={{ minHeight: (row.h ?? 80) - 24 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-yellow-500 !border-0 opacity-60"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-yellow-500 !border-0 opacity-60"
      />
    </div>
  );
}
