const { createGlobPatternsForDependencies } = require("@nx/react/tailwind");
const { join } = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, "{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}"),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    fontFamily: {
      // Serif-only design language: every UI font resolves to IBM Plex Serif.
      // `sans`/`serif` are defined so Tailwind preflight and any `font-sans`
      // utility are serif too; `secondary`/`tertiary` are kept as aliases so the
      // existing `font-secondary` (was Replay Pro) and `font-tertiary` (was
      // Roboto, sans-serif) class usages across the app become serif with no
      // per-file edits. `mono` stays monospaced — code/IDs keep their legibility.
      sans: ["IBM Plex Serif", "serif"],
      serif: ["IBM Plex Serif", "serif"],
      mono: ["IBM Plex Mono", "monospace"],
      primary: ["IBM Plex Serif", "serif"],
      secondary: ["IBM Plex Serif", "serif"],
      tertiary: ["IBM Plex Serif", "serif"],
    },
    extend: {
      fontSize: {
        // Type scale. Kept Carbon-compatible: these px steps already line up
        // with IBM Carbon's productive type scale (12/14/16/18/24/28/32), so we
        // leave them intact rather than re-snapping every step — that would
        // reflow dense tables/labels across the app for little visual gain. The
        // Carbon look comes from the serif type family + tokens + component shapes.
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
      colors: {
        // Primary Colors — Brand Blue (#264D8E), a harmonious ramp anchored on
        // the brand navy at 500/DEFAULT (interactive); 600 is the hover shade,
        // 700 the active shade. Replaces the former Carbon Blue 60 ramp.
        primary: {
          DEFAULT: "#264D8E",
          50: "#EBF0FA", // lightest tint
          100: "#D7E2F4",
          200: "#AEC5EA",
          300: "#7EA2DD",
          400: "#4A7DCF",
          500: "#264D8E", // brand blue (interactive)
          600: "#1F3F75", // hover
          700: "#183059", // active
          800: "#10213C",
          900: "#0A1424",
        },
        // Secondary Colors — IBM Carbon Gray (secondary buttons use Gray 80).
        secondary: {
          DEFAULT: "#393939",
          50: "#f4f4f4", // gray-10
          100: "#e0e0e0", // gray-20
          200: "#c6c6c6", // gray-30
          300: "#a8a8a8", // gray-40
          400: "#8d8d8d", // gray-50
          500: "#6f6f6f", // gray-60
          600: "#525252", // gray-70
          700: "#393939", // gray-80
          800: "#262626", // gray-90
          900: "#161616", // gray-100
        },
        // Destructive/Error Colors — IBM Carbon Red (danger default Red 60).
        destructive: {
          DEFAULT: "#da1e28",
          50: "#fff1f1", // red-10
          100: "#ffd7d9", // red-20
          200: "#ffb3b8", // red-30
          300: "#ff8389", // red-40
          400: "#fa4d56", // red-50
          500: "#da1e28", // red-60 (default)
          600: "#a2191f", // red-70 (hover)
          700: "#750e13", // red-80
          800: "#520408", // red-90
          900: "#2d0709", // red-100
        },
        // Success/Active Colors — IBM Carbon Green (support-success Green 50).
        success: {
          DEFAULT: "#24a148",
          50: "#defbe6", // green-10
          100: "#a7f0ba", // green-20
          200: "#6fdc8c", // green-30
          300: "#42be65", // green-40
          400: "#24a148", // green-50
          500: "#198038", // green-60
          600: "#0e6027", // green-70
          700: "#044317", // green-80
          800: "#022d0d", // green-90
          900: "#071908", // green-100
          light: "#a7f0ba",
          lighter: "#6fdc8c",
          text: "#24a148",
          darkText: "#198038",
        },
        // Warning Colors — IBM Carbon Yellow (support-warning Yellow 30).
        warning: {
          DEFAULT: "#f1c21b",
          50: "#fcf4d6", // yellow-10
          100: "#fddc69", // yellow-20
          200: "#f1c21b", // yellow-30 (default)
          300: "#d2a106", // yellow-40
          400: "#b28600", // yellow-50
          500: "#8e6a00", // yellow-60
          600: "#684e00", // yellow-70
          700: "#483700", // yellow-80
          800: "#302400", // yellow-90
          900: "#1c1500", // yellow-100
          text: "#684e00",
        },
        // Neutral/Gray Colors — IBM Carbon Gray.
        neutral: {
          DEFAULT: "#525252",
          50: "#f4f4f4", // gray-10
          100: "#e0e0e0", // gray-20
          200: "#c6c6c6", // gray-30
          300: "#a8a8a8", // gray-40
          400: "#8d8d8d", // gray-50
          500: "#6f6f6f", // gray-60
          600: "#525252", // gray-70
          700: "#393939", // gray-80
          800: "#262626", // gray-90
          900: "#161616", // gray-100
          950: "#0d0d0d",
        },
        // Scrollbar Colors
        scrollbar: {
          track: "#F1F1F1",
          thumb: "#888888",
          thumbHover: "#555555",
        },
        // Background Colors — IBM Carbon layer tokens (White theme).
        background: {
          DEFAULT: "#ffffff", // background
          secondary: "#f4f4f4", // layer-01 (gray-10)
          tertiary: "#e0e0e0", // layer-02 (gray-20)
        },
        amber: {
          50: "#FFF8E1",
          200: "#FFE082",
        },
        // Border Colors — IBM Carbon border tokens.
        border: {
          DEFAULT: "#e0e0e0", // border-subtle (gray-20)
          light: "#e0e0e0",
          medium: "#c6c6c6", // gray-30
          dark: "#8d8d8d", // gray-50
          blue: "#264D8E", // focus / interactive (brand blue)
          amber400: "#FFCA28",
        },
        // Text Colors
        typography: {
          Default: "rgba(0, 0, 0, 0.87)",
          50: "rgba(0, 0, 0, 0.04)",
          100: "rgba(0, 0, 0, 0.08)", //"rgba(0, 0, 0, 0.08)"
          200: "rgba(0, 0, 0, 0.12)", //"rgba(0, 0, 0, 0.12)"
          300: "rgba(0, 0, 0, 0.16)", //"rgba(0, 0, 0, 0.16)" #E5E7EB
          400: "rgba(0, 0, 0, 0.24)", //"rgba(0, 0, 0, 0.24)" #D1D5DB
          500: "rgba(0, 0, 0, 0.32)", //"rgba(0, 0, 0, 0.32)"
          600: "rgba(0, 0, 0, 0.38)", //"rgba(0, 0, 0, 0.38)"
          700: "rgba(0, 0, 0, 0.54)", //"rgba(0, 0, 0, 0.54)"
          800: "rgba(0, 0, 0, 0.6)", //"rgba(0, 0, 0, 0.6)"
          900: "rgba(0, 0, 0, 0.87)", //"rgba(0, 0, 0, 0.87)"
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-in-out",
        slideInFromRight: "slideInFromRight 0.2s ease-out",
        fadeInOut: "fadeInOut 1.5s ease-in-out infinite",
        // Slow idle "on shift, nothing outstanding" pulse for AgentAvatar —
        // deliberately much slower than the existing `animate-ping` used for
        // "working", so the two presences read as different rhythms rather
        // than the same animation in a different colour.
        breathe: "breathe 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInFromRight: {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeInOut: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.1" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.15", transform: "scale(1.4)" },
        },
      },
    },
  },
  plugins: [],
};
