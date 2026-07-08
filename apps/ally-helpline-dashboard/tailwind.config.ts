import { join } from "path";
import tailwindcssAnimate from "tailwindcss-animate";

import type { Config } from "tailwindcss";

const projectRoot = __dirname;

export default {
  darkMode: ["class"],
  content: [
    join(projectRoot, "./src/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./index.html"),
    join(projectRoot, "./src/components/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./src/pages/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./src/layouts/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "../../libs/ui-shared/src/**/*.{js,jsx,ts,tsx}"),
  ],
  prefix: "",
  theme: {
    fontFamily: {
      // Font families resolve per design system from CSS variables defined in
      // index.css (--font-*). The "current" system's values reproduce the
      // original stacks (IBM Plex Serif / Replay Pro) exactly, so there is zero
      // regression; claude/carbon override them via [data-design-system].
      sans: "var(--font-sans)",
      primary: "var(--font-primary)",
      secondary: "var(--font-secondary)",
      tertiary: "var(--font-tertiary)",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        // Custom font sizes used throughout the application
        xs: ["12px", { lineHeight: "16px" }], // Extra small - labels, captions
        sm: ["13px", { lineHeight: "20px" }], // Small - table text, secondary content
        base: ["14px", { lineHeight: "24px" }], // Base - body text, form fields
        md: ["15px", { lineHeight: "24px" }], // Medium - tabs, emphasized text
        lg: ["16px", { lineHeight: "28px" }], // Large - section headers, card titles
        xl: ["18px", { lineHeight: "32px" }], // Extra large - page section titles
        "2xl": ["24px", { lineHeight: "36px" }], // 2X large - page titles, modal headers
        "3xl": ["28px", { lineHeight: "40px" }], // 3X large - large OTP inputs
        "4xl": ["32px", { lineHeight: "44px" }], // 4X large - hero titles, main headers
      },
      // Themeable scales (primary, secondary, neutral, background, border,
      // scrollbar, typography) resolve from CSS variables defined per theme in
      // index.css. Opaque scales use `rgb(var(--...) / <alpha-value>)` so
      // Tailwind opacity utilities (e.g. bg-primary-500/50) keep working; the
      // alpha-based typography scale uses a bare `var()` because its alpha is
      // baked into the value. The default (daylight) values in index.css
      // reproduce the original palette exactly, so there is zero regression.
      // Semantic status scales (destructive, success, warning) stay literal so
      // error/success/warning colours remain recognisable across every theme.
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "rgb(var(--color-primary-DEFAULT) / <alpha-value>)",
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
        },
        // Secondary/Accent Colors
        secondary: {
          DEFAULT: "rgb(var(--color-secondary-DEFAULT) / <alpha-value>)",
          50: "rgb(var(--color-secondary-50) / <alpha-value>)",
          100: "rgb(var(--color-secondary-100) / <alpha-value>)",
          200: "rgb(var(--color-secondary-200) / <alpha-value>)",
          300: "rgb(var(--color-secondary-300) / <alpha-value>)",
          400: "rgb(var(--color-secondary-400) / <alpha-value>)",
          500: "rgb(var(--color-secondary-500) / <alpha-value>)",
          600: "rgb(var(--color-secondary-600) / <alpha-value>)",
          700: "rgb(var(--color-secondary-700) / <alpha-value>)",
          800: "rgb(var(--color-secondary-800) / <alpha-value>)",
          900: "rgb(var(--color-secondary-900) / <alpha-value>)",
        },
        // Destructive/Error Colors (semantic — constant across themes)
        destructive: {
          DEFAULT: "#F93535",
          50: "#FFCDD2",
          100: "#FFBABA",
          200: "#FF8A8A",
          300: "#FF5A5A",
          400: "#F93535",
          500: "#E02020",
          600: "#C71818",
          700: "#AE1010",
          800: "#950808",
          900: "#5C0A0A",
        },
        // Success/Active Colors (semantic — constant across themes)
        success: {
          DEFAULT: "#18441B",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50", // Material Green 500 (fixed from invalid "bgCAF50" typo)
          600: "#43A047",
          700: "#388E3C",
          800: "#2E7D32",
          900: "#18441B",
          light: "#B9F6CA",
          lighter: "#69F0AE",
          text: "#00E676",
          darkText: "#00C853",
        },
        // Warning Colors (semantic — constant across themes)
        warning: {
          DEFAULT: "#F57C00",
          50: "#FFF3E0",
          100: "#FFE0B2",
          200: "#FFCC80",
          300: "#FFB74D",
          400: "#FFA726",
          500: "#FF9800",
          600: "#FB8C00",
          700: "#F57C00",
          800: "#EF6C00",
          900: "#E65100",
          text: "#662400",
        },
        // Neutral/Gray Colors
        neutral: {
          DEFAULT: "rgb(var(--color-neutral-DEFAULT) / <alpha-value>)",
          50: "rgb(var(--color-neutral-50) / <alpha-value>)",
          100: "rgb(var(--color-neutral-100) / <alpha-value>)",
          200: "rgb(var(--color-neutral-200) / <alpha-value>)",
          300: "rgb(var(--color-neutral-300) / <alpha-value>)",
          400: "rgb(var(--color-neutral-400) / <alpha-value>)",
          500: "rgb(var(--color-neutral-500) / <alpha-value>)",
          600: "rgb(var(--color-neutral-600) / <alpha-value>)",
          700: "rgb(var(--color-neutral-700) / <alpha-value>)",
          800: "rgb(var(--color-neutral-800) / <alpha-value>)",
          900: "rgb(var(--color-neutral-900) / <alpha-value>)",
        },
        // Scrollbar Colors
        scrollbar: {
          track: "rgb(var(--color-scrollbar-track) / <alpha-value>)",
          thumb: "rgb(var(--color-scrollbar-thumb) / <alpha-value>)",
          thumbHover: "rgb(var(--color-scrollbar-thumbHover) / <alpha-value>)",
        },
        // Background Colors
        background: {
          DEFAULT: "rgb(var(--color-background-DEFAULT) / <alpha-value>)",
          secondary: "rgb(var(--color-background-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--color-background-tertiary) / <alpha-value>)",
        },
        // Border Colors
        border: {
          DEFAULT: "rgb(var(--color-border-DEFAULT) / <alpha-value>)",
          light: "rgb(var(--color-border-light) / <alpha-value>)",
          medium: "rgb(var(--color-border-medium) / <alpha-value>)",
          dark: "rgb(var(--color-border-dark) / <alpha-value>)",
        },
        // Text Colors (alpha baked into the value → bare var(), no <alpha-value>)
        typography: {
          Default: "var(--color-typography-Default)",
          50: "var(--color-typography-50)",
          100: "var(--color-typography-100)",
          200: "var(--color-typography-200)",
          300: "var(--color-typography-300)",
          400: "var(--color-typography-400)",
          500: "var(--color-typography-500)",
          600: "var(--color-typography-600)",
          700: "var(--color-typography-700)",
          800: "var(--color-typography-800)",
          900: "var(--color-typography-900)",
        },
      },
      keyframes: {
        "message-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        expand: {
          "0%": { width: "35%" },
          "100%": { width: "788px" },
        },
        shine: {
          "0%": { "background-position": "100%" },
          "100%": { "background-position": "-100%" },
        },
        "expand-in": {
          "0%": { opacity: "0", maxHeight: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", maxHeight: "200px", transform: "translateY(0)" },
        },
      },
      animation: {
        "message-in": "message-in 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-in-out",
        expand: "expand 0.5s ease-out forwards",
        shine: "shine 5s linear infinite",
        "expand-in": "expand-in 0.25s ease-out forwards",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
  future: {
    hoverOnlyWhenSupported: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
} satisfies Config;
