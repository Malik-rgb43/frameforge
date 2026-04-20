"use client";
import {
  Wand2,
  Sparkles,
  MaximizeIcon,
  Shuffle,
  MousePointer2,
  Hand,
  Type,
  ImagePlus,
  Link,
  Lightbulb,
  Download,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/store";

interface Tool {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
}

const TOOLS: Tool[] = [
  { id: "generate", label: "Generate", hint: "Generate a new shot from prompt", icon: Wand2, shortcut: "G" },
  { id: "conceptcard", label: "Concept Card", hint: "Create an AI concept card → auto-generates a full shot workflow", icon: Lightbulb, shortcut: "C" },
  { id: "magic", label: "Magic Expand", hint: "Expand an image outward in any direction", icon: Sparkles, shortcut: "M" },
  { id: "enhance", label: "Enhance", hint: "Upscale and sharpen an existing image with AI", icon: Zap, shortcut: "E" },
  { id: "remix", label: "Remix", hint: "Generate a variation of the selected image keeping the same vibe", icon: Shuffle },
  { id: "select", label: "Select", hint: "Select and move nodes. Shift+click to multi-select, drag to box-select", icon: MousePointer2, shortcut: "V" },
  { id: "hand", label: "Pan", hint: "Pan the canvas by dragging", icon: Hand, shortcut: "Space" },
  { id: "image", label: "Add image", hint: "Upload an image from your device", icon: ImagePlus, shortcut: "U" },
  { id: "chain", label: "Next Shot", hint: "Add a continuation shot connected to the selected shot (for storyboard sequences)", icon: Link, shortcut: "⌘→" },
  { id: "download", label: "Export", hint: "Download selected images or export the board", icon: Download, shortcut: "⌘S" },
];

interface Props {
  active?: string;
  onPick?: (id: string) => void;
}

export default function ToolRail({ active = "select", onPick }: Props) {
  useI18n((s) => s.t); // keep subscribed for re-render on lang change
  return (
    <aside
      className="fixed top-1/2 -translate-y-1/2 left-3 z-20 flex flex-col items-center gap-1 p-2 rounded-2xl glass-panel"
      role="toolbar"
      aria-label="Canvas tools"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = active === tool.id;
        const label = tool.label;
        return (
          <button
            key={tool.id}
            disabled={tool.disabled}
            onClick={() => onPick?.(tool.id)}
            className={cn(
              "group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ease-spring duration-150",
              "hover:bg-white/5",
              isActive && "bg-accent-warm/10 ring-1 ring-accent-warm/40",
              tool.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
            )}
            aria-pressed={isActive}
            aria-label={label}
          >
            <Icon
              className={cn(
                "w-[18px] h-[18px]",
                isActive ? "text-accent-warm" : "text-text-secondary",
                !isActive && "group-hover:text-text-primary"
              )}
            />
            <span
              className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-panel-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity ease-spring duration-150 border border-border-subtle shadow-panel flex flex-col gap-0.5 z-50"
              style={{ minWidth: "max-content", maxWidth: 220 }}
              dir="ltr"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary whitespace-nowrap">{label}</span>
                {tool.shortcut && (
                  <span className="font-mono text-2xs text-text-muted bg-panel px-1 rounded border border-border-subtle">{tool.shortcut}</span>
                )}
              </span>
              {tool.hint && (
                <span className="text-2xs text-text-muted leading-relaxed" style={{ whiteSpace: "normal" }}>
                  {tool.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
