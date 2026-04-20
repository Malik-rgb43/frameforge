"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeRow } from "@/lib/supabase/types";

export default function NoteNode({
  data,
  selected,
}: NodeProps<{ row: NodeRow }>) {
  const { row } = data;
  const text = ((row.metadata as { text?: string } | null)?.text ?? "").toString();

  return (
    <div
      className={`rounded-xl bg-yellow-500/10 backdrop-blur-sm border p-3 transition-all ease-spring duration-200 ${
        selected
          ? "border-accent-warm shadow-node-hover"
          : "border-yellow-500/30 shadow-node"
      }`}
      style={{ width: row.w, minHeight: row.h }}
    >
      <div className="text-xs text-yellow-200/90 whitespace-pre-wrap" dir="auto">
        {text || "הקלד הערה..."}
      </div>
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
