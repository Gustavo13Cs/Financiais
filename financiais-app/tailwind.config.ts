import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface tokens
        "surface-base": "#0B0F17",
        "surface-card": "#151C28",
        "surface-card-elevated": "#1E2738",
        "surface-table-row-alt": "#121822",
        "surface-container-lowest": "#0a0e16",
        "surface-container-low": "#181c24",
        "surface-container": "#1c2028",
        "surface-container-high": "#262a33",
        "surface-container-highest": "#31353e",
        "surface-bright": "#353942",
        surface: "#0f131c",
        "surface-dim": "#0f131c",
        "surface-variant": "#31353e",

        // Semantic Colors
        "income-emerald": "#10B981",
        "income-emerald-hover": "#059669",
        "expense-rose": "#F43F5E",
        "expense-rose-hover": "#E11D48",
        "extra-violet": "#8B5CF6",
        "extra-violet-hover": "#7C3AED",
        "extra-violet-muted": "rgba(139, 92, 246, 0.14)",
        "goal-sky": "#0EA5E9",
        "goal-sky-muted": "rgba(14, 165, 233, 0.15)",
        "warning-amber": "#F59E0B",
        "warning-amber-muted": "rgba(245, 158, 11, 0.15)",

        // Primary / accent
        primary: "#4edea3",
        "primary-container": "#10b981",
        "on-primary": "#003824",
        "on-primary-container": "#00422b",
        "primary-fixed": "#6ffbbe",
        "primary-fixed-dim": "#4edea3",
        "on-primary-fixed": "#002113",
        "on-primary-fixed-variant": "#005236",
        "inverse-primary": "#006c49",
        "surface-tint": "#4edea3",

        // Secondary (violet)
        secondary: "#d0bcff",
        "secondary-container": "#571bc1",
        "on-secondary": "#3c0091",
        "on-secondary-container": "#c4abff",
        "secondary-fixed": "#e9ddff",
        "secondary-fixed-dim": "#d0bcff",
        "on-secondary-fixed": "#23005c",
        "on-secondary-fixed-variant": "#5516be",

        // Tertiary (sky/cyan)
        tertiary: "#89ceff",
        "tertiary-container": "#23acf1",
        "on-tertiary": "#00344d",
        "on-tertiary-container": "#003d59",
        "tertiary-fixed": "#c9e6ff",
        "tertiary-fixed-dim": "#89ceff",
        "on-tertiary-fixed": "#001e2f",
        "on-tertiary-fixed-variant": "#004c6e",

        // Error
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        // Neutral / on-surface
        "on-surface": "#dfe2ee",
        "on-surface-variant": "#bbcabf",
        "inverse-surface": "#dfe2ee",
        "inverse-on-surface": "#2c3039",
        outline: "#86948a",
        "outline-variant": "#3c4a42",
        background: "#0f131c",
        "on-background": "#dfe2ee",

        // Text tokens
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        "text-muted": "#64748B",

        // Border tokens
        "border-subtle": "rgba(255, 255, 255, 0.08)",
        "border-focus": "rgba(16, 185, 129, 0.5)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        "display-currency": [
          "40px",
          { lineHeight: "48px", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        "display-currency-mobile": [
          "30px",
          { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "800" },
        ],
        "headline-lg": [
          "28px",
          { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-lg-mobile": [
          "22px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "headline-md": [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-sm": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "kpi-value": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "body-lg": ["15px", { lineHeight: "22px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" },
        ],
        "label-sm": [
          "11px",
          { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600" },
        ],
        "table-data": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "table-data-currency": [
          "13px",
          { lineHeight: "18px", fontWeight: "600" },
        ],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      spacing: {
        gutter: "1.25rem",
        "gutter-mobile": "0.75rem",
        margin: "2rem",
        "margin-mobile": "1rem",
        "space-2xs": "0.125rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "space-2xl": "3rem",
      },
      boxShadow: {
        glow: "0 0 16px rgba(16, 185, 129, 0.25)",
        "glow-violet": "0 0 16px rgba(139, 92, 246, 0.4)",
        "glow-sm": "0 0 12px rgba(139, 92, 246, 0.3)",
        card: "0 8px 24px rgba(0, 0, 0, 0.45)",
        modal: "0 20px 40px rgba(0, 0, 0, 0.6)",
      },
      backdropBlur: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
