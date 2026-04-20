"use client";
import { create } from "zustand";

export interface ConceptUI {
  id: string;
  title: string;
  tagline: string;
  avatar: string;
  coreInsight: string;
  hookArchetype: string;
  visualSpine: string;
  palette: [string, string, string];
  moodKeywords: string[];
  lengthSeconds: number;
  shotCount: number;
  creativityLevel: "safe" | "distinctive" | "bold" | "breakthrough";
  moodboardUrls: string[];
  appliedBoardId: string | null;
  createdAt: string;
}

interface ConceptsState {
  open: boolean;
  items: ConceptUI[];
  generating: boolean;

  setOpen: (v: boolean) => void;
  addConcepts: (batch: ConceptUI[]) => void;
  removeConcept: (id: string) => void;
  setGenerating: (v: boolean) => void;
  markApplied: (conceptId: string, boardId: string) => void;
}

// Seed with a couple demo concepts for preview
const SEEDS: ConceptUI[] = [
  {
    id: "c_seed_1",
    title: "The 4am Ritual",
    tagline: "When the world is asleep, she's already brewing.",
    avatar: "Creator, 28, wakes at 4am to script before the kids are up",
    coreInsight:
      "Cold brew isn't coffee — it's a private ceremony before the day makes demands.",
    hookArchetype: "story",
    visualSpine:
      "A single warm light in an otherwise dark kitchen, steam-less cold brew pouring slowly, condensation beading.",
    palette: ["#2B1810", "#FFB86B", "#F7F7FA"],
    moodKeywords: ["quiet", "intentional", "warm-dark", "tactile", "patient"],
    lengthSeconds: 12,
    shotCount: 5,
    creativityLevel: "bold",
    moodboardUrls: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1522992319-0365e5f11656?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=320&h=320&fit=crop",
    ],
    appliedBoardId: null,
    createdAt: "2026-04-19T09:00:00Z",
  },
  {
    id: "c_seed_2",
    title: "Lazy Morning Upgrade",
    tagline: "You're not 'doing morning wrong' — you just need a shortcut.",
    avatar: "Side-hustle Rohan, 32, hates the 'morning person' narrative",
    coreInsight:
      "Most morning-coffee ads shame the drinker. Ours celebrates slow, unhurried mornings as their own victory.",
    hookArchetype: "pattern-interrupt",
    visualSpine:
      "Messy bed, laptop open, cold brew already half-gone — the aftermath of an easy morning, not a heroic one.",
    palette: ["#1E1E28", "#6AE3FF", "#FFB86B"],
    moodKeywords: ["unpretentious", "lazy-lit", "lived-in", "real", "soft"],
    lengthSeconds: 10,
    shotCount: 4,
    creativityLevel: "distinctive",
    moodboardUrls: [
      "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=320&h=320&fit=crop",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=320&h=320&fit=crop",
    ],
    appliedBoardId: null,
    createdAt: "2026-04-19T09:01:00Z",
  },
];

export const useConcepts = create<ConceptsState>((set) => ({
  open: false,
  items: SEEDS,
  generating: false,

  setOpen: (v) => set({ open: v }),
  addConcepts: (batch) =>
    set((s) => ({ items: [...batch, ...s.items].slice(0, 30) })),
  removeConcept: (id) =>
    set((s) => ({ items: s.items.filter((c) => c.id !== id) })),
  setGenerating: (v) => set({ generating: v }),
  markApplied: (conceptId, boardId) =>
    set((s) => ({
      items: s.items.map((c) =>
        c.id === conceptId ? { ...c, appliedBoardId: boardId } : c
      ),
    })),
}));
