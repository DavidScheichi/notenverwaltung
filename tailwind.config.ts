import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        canvas: withAlpha("--c-canvas"),
        surface: withAlpha("--c-surface"),
        sunken: withAlpha("--c-sunken"),
        line: withAlpha("--c-line"),
        "line-strong": withAlpha("--c-line-strong"),
        ink: withAlpha("--c-ink"),
        "ink-2": withAlpha("--c-ink-2"),
        "ink-3": withAlpha("--c-ink-3"),
        accent: withAlpha("--c-accent"),
        "accent-soft": withAlpha("--c-accent-soft"),
        "accent-strong": withAlpha("--c-accent-strong"),
        "accent-ring": withAlpha("--c-accent-ring"),
      },
      boxShadow: {
        panel: "0 20px 45px -25px rgba(15, 23, 42, 0.35)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -16px rgba(15, 23, 42, 0.18)",
        overlay: "0 24px 60px -20px rgba(15, 23, 42, 0.45)",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 160ms ease-out",
        "overlay-in": "overlay-in 120ms ease-out",
        "sheet-in": "sheet-in 160ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
