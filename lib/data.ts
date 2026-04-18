// Data + cinematic product imagery for FrameForge.
// Photorealistic SVG "photography" — gradient meshes, deep shadows, rim light.
// Not hand-drawn cartoons; layered lighting that reads as a product shot.

export type Tone =
  | "amber"
  | "matte-black"
  | "white-neon"
  | "walnut"
  | "steel"
  | "ivory"
  | "moss"
  | "rose";

export type Kind =
  | "bottle"
  | "jar"
  | "pouch"
  | "sneaker"
  | "notebook"
  | "tube"
  | "splash";

export type Aspect = "9:16" | "1:1" | "16:9" | "4:5";
export type ProjectStatus = "active" | "draft" | "rendering" | "archived";
export type ShotStatus = "pending" | "ready" | "error" | "generating";

export interface Project {
  id: string;
  name: string;
  client: string;
  aspect: Aspect;
  updated: string;
  shots: number;
  status: ProjectStatus;
  heroKind: Kind;
  heroTone: Tone;
}

export interface BoardItem {
  id: string;
  kind: Kind;
  tone: Tone;
  tag: string;
  filename: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isRef?: boolean;
  generated?: boolean;
  model?: string;
  status?: ShotStatus;
}

export interface RefLink {
  from: string;
  to: string;
  kind: "variant" | "reference" | "used-in-shot" | "manual";
}

export interface PromptEntry {
  image: string;
  video: string;
  videoModel: string;
  usedInShot?: number;
}

export interface Concept {
  id: string;
  title: string;
  hook: string;
  vibe: string[];
  palette: string[];
  length: number;
  shots: number;
}

export interface Shot {
  n: number;
  sequence: string;
  title: string;
  duration: number;
  refImageId: string;
  prompt: string;
  model: string;
  aspect: Aspect;
  motion: string;
  vo: string | null;
  status: ShotStatus;
}

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "Owner" | "Editor" | "Viewer";
  color: string;
}

// ─────────────────────────────────────────────────────────
// Product shot generator — cinematic SVG placeholders
// ─────────────────────────────────────────────────────────

interface ShotSVGOpts {
  id?: string;
  kind?: Kind;
  w?: number;
  h?: number;
  tone?: Tone;
}

export function shotSVG({
  id,
  kind = "bottle",
  w = 800,
  h = 1000,
  tone = "amber",
}: ShotSVGOpts): string {
  const palettes: Record<Tone, { bgA: string; bgB: string; body: string; hi: string; rim: string; label: string }> = {
    amber:         { bgA: "#201008", bgB: "#0b0507", body: "#8a4a1c", hi: "#f4c27a", rim: "#ffd89b", label: "#faf5ec" },
    "matte-black": { bgA: "#14120f", bgB: "#06060a", body: "#1a1a1c", hi: "#4a4a4e", rim: "#8a8a92", label: "#d4ff3a" },
    "white-neon":  { bgA: "#0a1020", bgB: "#000004", body: "#ededf2", hi: "#ffffff", rim: "#7df9ff", label: "#222" },
    walnut:        { bgA: "#14110c", bgB: "#080604", body: "#2a1a0e", hi: "#e6c893", rim: "#fbbf24", label: "#f5e9d0" },
    steel:         { bgA: "#0e1014", bgB: "#050608", body: "#3d4148", hi: "#b8bec6", rim: "#e4eaf2", label: "#eaeaef" },
    ivory:         { bgA: "#1a1812", bgB: "#0a0907", body: "#e8ddc6", hi: "#faf3e0", rim: "#ffecb3", label: "#4a3a1c" },
    moss:          { bgA: "#0e1a12", bgB: "#040806", body: "#3a5a3a", hi: "#8ac088", rim: "#c9f28f", label: "#f0f8e0" },
    rose:          { bgA: "#1a0a10", bgB: "#080306", body: "#b06878", hi: "#f0c8d0", rim: "#ffaabb", label: "#fef0f3" },
  };
  const p = palettes[tone] || palettes.amber;
  const uid = id || Math.random().toString(36).slice(2, 7);

  const common = `
    <defs>
      <radialGradient id="bg${uid}" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="${p.bgA}"/>
        <stop offset="100%" stop-color="${p.bgB}"/>
      </radialGradient>
      <linearGradient id="floor${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.04)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
      </linearGradient>
      <radialGradient id="key${uid}" cx="30%" cy="20%" r="45%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.14)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
      <linearGradient id="body${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.hi}" stop-opacity="0.95"/>
        <stop offset="45%" stop-color="${p.body}"/>
        <stop offset="100%" stop-color="${p.bgB}"/>
      </linearGradient>
      <linearGradient id="rim${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${p.rim}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${p.rim}" stop-opacity="0.0"/>
        <stop offset="92%" stop-color="${p.rim}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${p.rim}" stop-opacity="0"/>
      </linearGradient>
      <filter id="blur${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="${w * 0.01}"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg${uid})"/>
    <rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="url(#floor${uid})"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.63}" rx="${w * 0.45}" ry="${h * 0.015}" fill="rgba(255,255,255,0.04)"/>
    <rect width="${w}" height="${h}" fill="url(#key${uid})"/>
  `;

  let body = "";
  if (kind === "bottle") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.28}" ry="${h * 0.022}" fill="rgba(0,0,0,0.55)" filter="url(#blur${uid})"/>
      <rect x="${w * 0.38}" y="${h * 0.10}" width="${w * 0.24}" height="${h * 0.07}" rx="4" fill="${p.body}"/>
      <rect x="${w * 0.40}" y="${h * 0.12}" width="${w * 0.20}" height="${h * 0.02}" fill="rgba(0,0,0,0.35)"/>
      <rect x="${w * 0.43}" y="${h * 0.17}" width="${w * 0.14}" height="${h * 0.05}" fill="${p.body}" opacity="0.85"/>
      <path d="M ${w * 0.34} ${h * 0.22} Q ${w * 0.32} ${h * 0.22} ${w * 0.32} ${h * 0.28}
               L ${w * 0.32} ${h * 0.74} Q ${w * 0.32} ${h * 0.82} ${w * 0.40} ${h * 0.82}
               L ${w * 0.60} ${h * 0.82} Q ${w * 0.68} ${h * 0.82} ${w * 0.68} ${h * 0.74}
               L ${w * 0.68} ${h * 0.28} Q ${w * 0.68} ${h * 0.22} ${w * 0.66} ${h * 0.22} Z"
            fill="url(#body${uid})"/>
      <path d="M ${w * 0.37} ${h * 0.24} Q ${w * 0.36} ${h * 0.40} ${w * 0.37} ${h * 0.72}"
            stroke="rgba(255,255,255,0.22)" stroke-width="${w * 0.012}" fill="none" stroke-linecap="round"/>
      <rect x="${w * 0.32}" y="${h * 0.22}" width="${w * 0.36}" height="${h * 0.60}" fill="url(#rim${uid})"/>
      <rect x="${w * 0.38}" y="${h * 0.48}" width="${w * 0.24}" height="${h * 0.14}" rx="2" fill="${p.label}" opacity="0.9"/>
      <text x="${w * 0.5}" y="${h * 0.555}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.034}" font-weight="700" fill="${p.body}" letter-spacing="4">AURA</text>
      <text x="${w * 0.5}" y="${h * 0.6}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="${w * 0.019}" fill="${p.body}" opacity="0.7" letter-spacing="2">SERUM \u00B7 30ML</text>
    `;
  } else if (kind === "jar") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.32}" ry="${h * 0.02}" fill="rgba(0,0,0,0.55)" filter="url(#blur${uid})"/>
      <rect x="${w * 0.26}" y="${h * 0.28}" width="${w * 0.48}" height="${h * 0.10}" rx="4" fill="${p.body}"/>
      <rect x="${w * 0.26}" y="${h * 0.28}" width="${w * 0.48}" height="${h * 0.015}" fill="rgba(255,255,255,0.15)"/>
      <rect x="${w * 0.23}" y="${h * 0.38}" width="${w * 0.54}" height="${h * 0.42}" rx="6" fill="url(#body${uid})"/>
      <rect x="${w * 0.23}" y="${h * 0.38}" width="${w * 0.54}" height="${h * 0.42}" rx="6" fill="url(#rim${uid})"/>
      <rect x="${w * 0.28}" y="${h * 0.52}" width="${w * 0.44}" height="${h * 0.18}" rx="2" fill="${p.label}" opacity="0.92"/>
      <text x="${w * 0.5}" y="${h * 0.625}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.04}" font-weight="700" fill="${p.body}" letter-spacing="3">RITUAL</text>
      <text x="${w * 0.5}" y="${h * 0.67}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="${w * 0.018}" fill="${p.body}" opacity="0.7" letter-spacing="2">50ML \u00B7 NIGHT BALM</text>
    `;
  } else if (kind === "pouch") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.85}" rx="${w * 0.3}" ry="${h * 0.02}" fill="rgba(0,0,0,0.55)" filter="url(#blur${uid})"/>
      <path d="M ${w * 0.28} ${h * 0.18} L ${w * 0.72} ${h * 0.18}
               L ${w * 0.74} ${h * 0.85} L ${w * 0.26} ${h * 0.85} Z"
            fill="url(#body${uid})"/>
      <path d="M ${w * 0.28} ${h * 0.18} Q ${w * 0.35} ${h * 0.14} ${w * 0.5} ${h * 0.17} T ${w * 0.72} ${h * 0.18}"
            stroke="${p.hi}" stroke-width="${w * 0.01}" fill="none" opacity="0.7"/>
      <rect x="${w * 0.28}" y="${h * 0.18}" width="${w * 0.44}" height="${h * 0.67}" fill="url(#rim${uid})"/>
      <text x="${w * 0.5}" y="${h * 0.42}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.055}" font-weight="700" fill="${p.label}" letter-spacing="6">BREW</text>
      <text x="${w * 0.5}" y="${h * 0.47}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.055}" font-weight="700" fill="${p.label}" letter-spacing="6">CLUB</text>
      <line x1="${w * 0.34}" y1="${h * 0.53}" x2="${w * 0.66}" y2="${h * 0.53}" stroke="${p.label}" stroke-width="1" opacity="0.4"/>
      <text x="${w * 0.5}" y="${h * 0.6}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="${w * 0.02}" fill="${p.label}" opacity="0.6" letter-spacing="3">SINGLE ORIGIN \u00B7 250G</text>
    `;
  } else if (kind === "sneaker") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.78}" rx="${w * 0.36}" ry="${h * 0.02}" fill="rgba(0,0,0,0.6)" filter="url(#blur${uid})"/>
      <path d="M ${w * 0.18} ${h * 0.72} Q ${w * 0.2} ${h * 0.78} ${w * 0.3} ${h * 0.78}
               L ${w * 0.78} ${h * 0.78} Q ${w * 0.84} ${h * 0.78} ${w * 0.84} ${h * 0.72}
               L ${w * 0.82} ${h * 0.64} L ${w * 0.2} ${h * 0.64} Z"
            fill="${p.hi}" opacity="0.9"/>
      <path d="M ${w * 0.22} ${h * 0.64} Q ${w * 0.22} ${h * 0.44} ${w * 0.4} ${h * 0.42}
               L ${w * 0.56} ${h * 0.38} Q ${w * 0.72} ${h * 0.38} ${w * 0.8} ${h * 0.5}
               L ${w * 0.82} ${h * 0.64} Z"
            fill="url(#body${uid})"/>
      <g stroke="${p.hi}" stroke-width="${w * 0.008}" opacity="0.85">
        <line x1="${w * 0.44}" y1="${h * 0.48}" x2="${w * 0.6}" y2="${h * 0.5}"/>
        <line x1="${w * 0.43}" y1="${h * 0.54}" x2="${w * 0.62}" y2="${h * 0.55}"/>
        <line x1="${w * 0.42}" y1="${h * 0.60}" x2="${w * 0.63}" y2="${h * 0.61}"/>
      </g>
      <path d="M ${w * 0.3} ${h * 0.62} Q ${w * 0.5} ${h * 0.54} ${w * 0.78} ${h * 0.5}"
            stroke="${p.label}" stroke-width="${w * 0.018}" fill="none" stroke-linecap="round"/>
      <rect x="${w * 0.18}" y="${h * 0.38}" width="${w * 0.66}" height="${h * 0.4}" fill="url(#rim${uid})"/>
    `;
  } else if (kind === "notebook") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.76}" rx="${w * 0.3}" ry="${h * 0.018}" fill="rgba(0,0,0,0.45)" filter="url(#blur${uid})"/>
      <rect x="${w * 0.28}" y="${h * 0.22}" width="${w * 0.44}" height="${h * 0.54}" rx="6" fill="url(#body${uid})"/>
      <rect x="${w * 0.28}" y="${h * 0.22}" width="${w * 0.44}" height="${h * 0.54}" rx="6" fill="url(#rim${uid})"/>
      <rect x="${w * 0.58}" y="${h * 0.22}" width="${w * 0.025}" height="${h * 0.54}" fill="${p.label}" opacity="0.6"/>
      <text x="${w * 0.5}" y="${h * 0.5}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.038}" font-weight="600" fill="${p.label}" opacity="0.5" letter-spacing="3">FIELD NOTES</text>
      <line x1="${w * 0.42}" y1="${h * 0.55}" x2="${w * 0.58}" y2="${h * 0.55}" stroke="${p.label}" stroke-width="1" opacity="0.3"/>
    `;
  } else if (kind === "tube") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.24}" ry="${h * 0.02}" fill="rgba(0,0,0,0.55)" filter="url(#blur${uid})"/>
      <rect x="${w * 0.42}" y="${h * 0.10}" width="${w * 0.16}" height="${h * 0.08}" rx="3" fill="${p.body}"/>
      <path d="M ${w * 0.38} ${h * 0.18} L ${w * 0.62} ${h * 0.18} L ${w * 0.66} ${h * 0.26} L ${w * 0.34} ${h * 0.26} Z" fill="${p.body}"/>
      <rect x="${w * 0.34}" y="${h * 0.26}" width="${w * 0.32}" height="${h * 0.54}" rx="4" fill="url(#body${uid})"/>
      <rect x="${w * 0.34}" y="${h * 0.26}" width="${w * 0.32}" height="${h * 0.54}" rx="4" fill="url(#rim${uid})"/>
      <path d="M ${w * 0.34} ${h * 0.80} L ${w * 0.66} ${h * 0.80} L ${w * 0.64} ${h * 0.82} L ${w * 0.36} ${h * 0.82} Z" fill="${p.body}" opacity="0.8"/>
      <rect x="${w * 0.38}" y="${h * 0.40}" width="${w * 0.24}" height="${h * 0.22}" rx="2" fill="${p.label}" opacity="0.9"/>
      <text x="${w * 0.5}" y="${h * 0.49}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="${w * 0.036}" font-weight="700" fill="${p.body}" letter-spacing="4">AURA</text>
      <text x="${w * 0.5}" y="${h * 0.55}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="${w * 0.018}" fill="${p.body}" opacity="0.7" letter-spacing="2">HYDRO BALM</text>
    `;
  } else if (kind === "splash") {
    body = `
      <ellipse cx="${w * 0.5}" cy="${h * 0.45}" rx="${w * 0.32}" ry="${h * 0.28}" fill="url(#body${uid})" opacity="0.55"/>
      <ellipse cx="${w * 0.55}" cy="${h * 0.4}" rx="${w * 0.22}" ry="${h * 0.18}" fill="${p.hi}" opacity="0.3"/>
      <circle cx="${w * 0.38}" cy="${h * 0.3}" r="${w * 0.02}" fill="${p.rim}" opacity="0.8"/>
      <circle cx="${w * 0.62}" cy="${h * 0.55}" r="${w * 0.015}" fill="${p.rim}" opacity="0.6"/>
      <circle cx="${w * 0.48}" cy="${h * 0.62}" r="${w * 0.025}" fill="${p.rim}" opacity="0.7"/>
      <text x="${w * 0.5}" y="${h * 0.92}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="${w * 0.018}" fill="${p.label}" opacity="0.4" letter-spacing="3">MACRO \u00B7 DROPLETS</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">${common}${body}</svg>`;
}

export function svgDataUri(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export const shotURI = (opts: ShotSVGOpts) => svgDataUri(shotSVG(opts));

// ─────────────────────────────────────────────────────────
// Seed data — AURA project board
// ─────────────────────────────────────────────────────────

export const SEED_PRODUCT_IMAGES: BoardItem[] = [
  { id: "img-1", kind: "bottle", tone: "amber",       tag: "Hero",  filename: "aura-hero.png",   x:  80, y:  60, w: 200, h: 260, isRef: true },
  { id: "img-2", kind: "bottle", tone: "amber",       tag: "3/4",   filename: "aura-angle.png",  x: 340, y: 100, w: 180, h: 230, isRef: true },
  { id: "img-3", kind: "splash", tone: "amber",       tag: "Macro", filename: "aura-macro.png",  x: 580, y:  60, w: 220, h: 170, isRef: true },
  { id: "img-4", kind: "jar",    tone: "ivory",       tag: "Night", filename: "aura-jar.png",    x: 860, y: 100, w: 190, h: 230, isRef: true },
  { id: "gen-1", kind: "bottle", tone: "matte-black", tag: "Gen",   filename: "gen-01.png",      x: 120, y: 390, w: 170, h: 220, generated: true, model: "NanoBanana Pro", status: "ready" },
  { id: "gen-2", kind: "splash", tone: "white-neon",  tag: "Gen",   filename: "gen-02.png",      x: 620, y: 390, w: 170, h: 140, generated: true, model: "NanoBanana Pro", status: "ready" },
];

export const SEED_REF_LINKS: RefLink[] = [
  { from: "img-1", to: "gen-1", kind: "variant" },
  { from: "img-3", to: "gen-2", kind: "variant" },
  { from: "img-1", to: "img-2", kind: "reference" },
];

export const SEED_PROMPTS: Record<string, PromptEntry> = {
  "gen-1": {
    image: "Close-up of amber serum bottle on wet black marble, rim light from top-left, 35mm anamorphic lens, shallow depth of field, cinematic color grade, moody teal shadows, subtle steam in background.",
    video: "Slow 2s push-in toward bottle, dropper lifts 3cm, a single droplet forms and falls into frame. Subtle parallax on marble texture. End on sharp product front-facing.",
    videoModel: "Seedance 2",
    usedInShot: 2,
  },
  "gen-2": {
    image: "Extreme macro of a single translucent droplet hitting glossy black glass at 240fps. Razor-thin focus on the impact point, rim highlight from upper-left, surrounding darkness.",
    video: "0.8s slow-motion impact, concentric ripples travel outward, subtle vapor rising. Shot ends on suspended droplet mid-air.",
    videoModel: "Kling 3",
    usedInShot: 3,
  },
};

export const SEED_CONCEPTS: Concept[] = [
  { id: "c1", title: "Weightless Ritual",   hook: "The bottle floats through a dim bathroom as a single drop lands on glass. Minimal cuts, maximum presence.", vibe: ["cinematic","slow","luxe"],    palette: ["#0a0a0c","#d4ff3a","#e8e8e8"], length: 12, shots: 4 },
  { id: "c2", title: "Kinetic Unboxing",    hook: "Hands tear open the package in rapid match-cuts — product reveals in one confident beat.",                  vibe: ["fast","punchy","UGC"],        palette: ["#111","#ff5a5f","#fafafa"],    length: 8,  shots: 6 },
  { id: "c3", title: "Liquid Architecture", hook: "The product emerges from a pouring wave of its own color — camera pulls back, reveals the full bottle.",    vibe: ["surreal","high-end","vfx"],   palette: ["#080810","#7df9ff","#d9d9ff"], length: 10, shots: 3 },
  { id: "c4", title: "Morning 06:42",       hook: "A single uninterrupted shot of a countertop — product appears and disappears as light shifts night→dawn.", vibe: ["natural","one-take","emotional"], palette: ["#14110c","#e6c893","#2a241a"], length: 15, shots: 1 },
  { id: "c5", title: "Glitch Transfer",     hook: "Each angle of the product flashes for 0.3s between scan-line distortions — ends on a clean hero.",           vibe: ["digital","rave","bold"],      palette: ["#0a0a0c","#d4ff3a","#ff00aa"], length: 6,  shots: 8 },
];

export const SEED_SHOTS: Shot[] = [
  { n: 1, sequence: "SEQ 1", title: "Establishing — dim bathroom",   duration: 3,   refImageId: "img-3", prompt: "Slow push-in on a dark marble countertop. Soft rim-light from the left. Vapor drifting up slowly. Empty frame — product not yet visible. Anamorphic lens, 35mm, cinematic color grade, moody teal shadows.", model: "Seedance 2", aspect: "9:16", motion: "Slow dolly-in",            vo: null, status: "ready" },
  { n: 2, sequence: "SEQ 1", title: "Product enters frame",          duration: 2.5, refImageId: "gen-1", prompt: "The bottle floats into frame from the top-right, rotating a quarter turn. Shallow depth of field. A single droplet forms on the cap and begins to fall. Keep the label sharp and legible throughout.",               model: "Seedance 2", aspect: "9:16", motion: "Floating translate + slow rotate", vo: null, status: "ready" },
  { n: 3, sequence: "SEQ 2", title: "Macro — droplet hits glass",    duration: 2,   refImageId: "gen-2", prompt: "Extreme macro of a single translucent droplet hitting a glossy black glass surface at 240fps. Ripples travel outward. Key light at 45°. Razor-thin focus on the point of impact.",                              model: "Kling 3",    aspect: "9:16", motion: "Static macro + slow-mo",       vo: "It's not a routine — it's a ritual.", status: "generating" },
  { n: 4, sequence: "SEQ 2", title: "Hero — product on surface",     duration: 4.5, refImageId: "img-1", prompt: "Cut to a clean hero composition of the bottle centered on a reflective surface. Slow orbital camera move right to left. Warm amber practical in the background softly pulses. End on the logo crisp and centered.", model: "Seedance 2", aspect: "9:16", motion: "Orbital pan",                  vo: "AURA. Mornings, re-imagined.",        status: "ready" },
];

export const DEFAULT_PROJECTS: Project[] = [
  { id: "p1", name: "AURA — Morning Campaign", client: "Aura Skincare", aspect: "9:16", updated: "2 min ago",   shots: 4, status: "active",    heroKind: "bottle",   heroTone: "amber" },
  { id: "p2", name: "Brew Club — Spring Drop",  client: "Brew Club",     aspect: "1:1",  updated: "yesterday",  shots: 6, status: "draft",     heroKind: "pouch",    heroTone: "walnut" },
  { id: "p3", name: "Nova Sneaker Launch",      client: "Nova",          aspect: "16:9", updated: "3 days ago", shots: 8, status: "rendering", heroKind: "sneaker",  heroTone: "white-neon" },
  { id: "p4", name: "Field Notes v3",           client: "Field Notes",   aspect: "9:16", updated: "last week",  shots: 3, status: "archived",  heroKind: "notebook", heroTone: "ivory" },
  { id: "p5", name: "Ritual PM — Night Balm",   client: "Ritual",        aspect: "4:5",  updated: "2 weeks",    shots: 5, status: "active",    heroKind: "jar",      heroTone: "rose" },
  { id: "p6", name: "Verde Skincare Relaunch",  client: "Verde",         aspect: "9:16", updated: "3 weeks",    shots: 7, status: "draft",     heroKind: "tube",     heroTone: "moss" },
];

export const MODELS = [
  { id: "seedance-2", label: "Seedance 2", tag: "fast \u00B7 i2v" },
  { id: "kling-3",    label: "Kling 3",    tag: "premium \u00B7 i2v" },
];

export const ASPECTS = [
  { id: "9:16" as Aspect, label: "9:16", name: "Vertical",  sub: "TikTok \u00B7 Reels", w: 9,  h: 16 },
  { id: "1:1"  as Aspect, label: "1:1",  name: "Square",    sub: "Feed \u00B7 Grid",    w: 1,  h: 1 },
  { id: "16:9" as Aspect, label: "16:9", name: "Landscape", sub: "YT \u00B7 Web",       w: 16, h: 9 },
  { id: "4:5"  as Aspect, label: "4:5",  name: "Portrait",  sub: "IG Portrait",         w: 4,  h: 5 },
];

export const SEED_COLLABORATORS: Collaborator[] = [
  { id: "u1", name: "You",     initials: "YO", email: "you@studio.co",     role: "Owner",  color: "#d4ff3a" },
  { id: "u2", name: "Maya R.", initials: "MR", email: "maya@studio.co",    role: "Editor", color: "#7df9ff" },
  { id: "u3", name: "Dani K.", initials: "DK", email: "dani@freelance.co", role: "Viewer", color: "#ff5a5f" },
];
