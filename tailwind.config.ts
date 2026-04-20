import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0F",
        panel: "#14141B",
        "panel-2": "#1E1E28",
        border: {
          subtle: "rgba(255,255,255,0.06)",
          hover: "rgba(255,255,255,0.14)",
        },
        text: {
          primary: "#F7F7FA",
          secondary: "#8B8D98",
          muted: "#5A5D6A",
        },
        accent: {
          warm: "#FFB86B",
          cool: "#6AE3FF",
          violet: "#A78BFA",
        },
        status: {
          success: "#7EE787",
          warning: "#FFC857",
          error: "#FF6B7A",
        },
        node: {
          source: "#6AE3FF",
          shot: "#FFB86B",
          cont: "#A78BFA",
          note: "#5A5D6A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-heebo)", "system-ui"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
      boxShadow: {
        chat: "0 -20px 60px rgba(0,0,0,0.4)",
        node: "0 4px 20px rgba(0,0,0,0.3)",
        "node-hover": "0 6px 30px rgba(0,0,0,0.45)",
        panel: "0 16px 48px rgba(0,0,0,0.5)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "dash-flow": "dash-flow 1.5s linear infinite",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-20" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
