"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Crown, Edit, Eye, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  online: boolean;
  avatarUrl?: string;
  color?: string;
}

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "m_ori",
    name: "Ori M.",
    email: "orimalik19@gmail.com",
    role: "owner",
    online: true,
    color: "#FFB86B",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TeamPanel({ open, onClose }: Props) {
  const [members] = useState<TeamMember[]>(MOCK_MEMBERS);

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
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 right-3 z-50 w-[min(90vw,340px)] rounded-2xl glass-panel shadow-panel overflow-hidden border border-border-subtle"
          >
            <header className="h-12 px-4 flex items-center gap-3 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-text-primary flex-1">
                Team
              </h2>
              <span className="text-2xs font-mono text-text-muted">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="p-3 flex flex-col gap-1">
              {members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>

            <div className="px-4 py-3 border-t border-border-subtle bg-panel-2/40">
              <p className="text-2xs text-text-muted text-center font-mono">
                Single-user workspace
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const ROLE_ICON = {
  owner: Crown,
  admin: Crown,
  editor: Edit,
  viewer: Eye,
} as const;

const ROLE_COLOR = {
  owner: "text-accent-warm",
  admin: "text-accent-cool",
  editor: "text-text-secondary",
  viewer: "text-text-muted",
} as const;

function MemberRow({ member }: { member: TeamMember }) {
  const Icon = ROLE_ICON[member.role];
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/3 transition-colors">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-canvas font-semibold text-xs"
          style={{ background: member.color ?? "#8B8D98" }}
        >
          {member.name.charAt(0)}
        </div>
        {member.online && (
          <Circle
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-status-success text-canvas"
            strokeWidth={3}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary truncate">{member.name}</div>
        <div className="text-2xs text-text-muted truncate">{member.email}</div>
      </div>
      <span
        className={cn(
          "flex items-center gap-1 text-2xs font-mono uppercase tracking-wider",
          ROLE_COLOR[member.role]
        )}
      >
        <Icon className="w-3 h-3" />
        {member.role}
      </span>
    </div>
  );
}
