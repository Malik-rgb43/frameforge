export const colors = {
  canvas: "#0A0A0F",
  panel: "#14141B",
  panel2: "#1E1E28",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.14)",

  textPrimary: "#F7F7FA",
  textSecondary: "#8B8D98",
  textMuted: "#5A5D6A",

  accentWarm: "#FFB86B",
  accentCool: "#6AE3FF",
  accentViolet: "#A78BFA",

  success: "#7EE787",
  warning: "#FFC857",
  error: "#FF6B7A",

  nodeSource: "#6AE3FF",
  nodeShot: "#FFB86B",
  nodeCont: "#A78BFA",
  nodeNote: "#5A5D6A",

  edgeDefault: "#3A3A44",
  edgeHover: "#FFB86B",
} as const;

export const motion = {
  spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  durations: {
    fast: 150,
    ui: 200,
    panel: 300,
    chart: 450,
  },
} as const;

export type ColorKey = keyof typeof colors;
