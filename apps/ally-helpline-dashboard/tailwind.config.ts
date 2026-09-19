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
        /*
         * `white` is BONE, not #FFF.
         *
         * 273 call sites in this app and ui-shared say bg-white / text-white,
         * and on a warm cream ground pure white reads as a cold hole punched in
         * the page. Claude's system has no #FFF: its lightest surface is bone.
         * Overriding the core colour here retints every one of those call sites
         * at once, in both roles — a raised card ground, and the label on a
         * clay button, where bone is the correct on-accent colour anyway.
         *
         * This does not reach the admin console: it has its own
         * tailwind.config.js, so a shared ui-shared component compiled for
         * admin still resolves bg-white to #FFF there and bone here. That split
         * is the whole mechanism this migration rests on — a shared component
         * must name a token, never a hex.
         */
        white: "rgb(var(--color-background-raised) / <alpha-value>)",

        /*
         * `gray` is the WARM ramp, not Tailwind's stock cold one.
         *
         * 139 call sites in this app and 35 in ui-shared reach for bg-gray-200,
         * border-gray-200, text-gray-500 and friends alongside the token
         * scales. Those resolve to Tailwind's defaults (#e5e7eb, #f3f4f6,
         * #6b7280 …), which are blue-biased and read as cold patches on a warm
         * page — the single most common off-palette source left after the
         * literal sweeps, and invisible to the hex ratchet because they are
         * utility names, not literals.
         *
         * Redefining the scale here retints all of them at once. Steps keep
         * Tailwind's lightness rhythm so existing pairings (gray-200 border on
         * gray-50 fill) hold their contrast. The admin console has its own
         * config and keeps stock Tailwind grey, so a shared ui-shared component
         * still renders cold there and warm here.
         */
        gray: {
          50: "#FAF9F5",
          100: "#F0EEE7",
          200: "#E3DBCE",
          300: "#D6CDBE",
          400: "#BCB4A4",
          500: "#928B7C",
          600: "#6E6656",
          700: "#565045",
          800: "#3D3A34",
          900: "#29261F",
          950: "#1F1C17",
        },
        /*
         * The AI accent. Separate from `primary` on purpose: primary is Ally
         * Blue (brand, interactive), this is the warm clay that marks a surface
         * a machine wrote. Keep it rare — see index.css for the split.
         */
        ai: {
          DEFAULT: "rgb(var(--color-ai-DEFAULT) / <alpha-value>)",
          50: "rgb(var(--color-ai-50) / <alpha-value>)",
          100: "rgb(var(--color-ai-100) / <alpha-value>)",
          200: "rgb(var(--color-ai-200) / <alpha-value>)",
          300: "rgb(var(--color-ai-300) / <alpha-value>)",
          400: "rgb(var(--color-ai-400) / <alpha-value>)",
          500: "rgb(var(--color-ai-500) / <alpha-value>)",
          600: "rgb(var(--color-ai-600) / <alpha-value>)",
          700: "rgb(var(--color-ai-700) / <alpha-value>)",
          800: "rgb(var(--color-ai-800) / <alpha-value>)",
          900: "rgb(var(--color-ai-900) / <alpha-value>)",
        },
        /*
         * Semantic tones, resolved from the --color-tone-* variables that
         * /SJT1's result bands and the status chips already share. Exposed as
         * utilities so a component can reach them without re-declaring the hex.
         */
        tone: {
          sage: "rgb(var(--color-tone-sage) / <alpha-value>)",
          ochre: "rgb(var(--color-tone-ochre) / <alpha-value>)",
          alarm: "rgb(var(--color-tone-alarm) / <alpha-value>)",
        },
        /*
         * Status — a categorical palette in the warm family.
         *
         * Chips across this app encode three different things: a semantic state
         * (processing / generated / failed), and two purely categorical facts
         * (how a session arrived, which mode it ran in). Those were a scatter of
         * Material blues, purples and indigos, which on a cream ground read as
         * borrowings from three other products.
         *
         * The semantic three keep their hue — ochre for in-progress, sage for
         * done, alarm for failed — because a failure that stops looking like a
         * failure is a worse outcome than an off-palette red. The categorical
         * ones only have to stay TELLABLE APART, not carry meaning, so they take
         * warm tints instead of borrowed hues.
         *
         * Each pair is a tint plus the text colour that passes on it; never mix
         * a tint from one row with text from another.
         */
        status: {
          ochreBg: "#F3E6C9",
          ochreFg: "#6B4F22",
          ochreDot: "#C4901F",
          sageBg: "#DFE7DD",
          sageFg: "#3B5240",
          sageDot: "#4E6B54",
          alarmBg: "#F3DDD9",
          alarmFg: "#7A2E25",
          alarmDot: "#A03E33",
          sandBg: "#EAE7DE",
          sandFg: "#565045",
          sandDot: "#928B7C",
          clayBg: "#F7ECE7",
          clayFg: "#703C2C",
          mauveBg: "#EDE4E8",
          mauveFg: "#5A3F50",
        },
        /*
         * Badge — paired with the same token names in the admin console's
         * config, where they hold the literals ui-shared/lib/badge used to
         * hardcode. Same component, two identities, resolved at build time per
         * app. This is the pattern every remaining shared literal should take.
         */
        badge: {
          bg: "#FAF9F5",
          fg: "#6E6656",
          border: "#E3DBCE",
          darkFg: "#29261F",
          lightBg: "#EAE7DE",
          lightFg: "#565045",
        },
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
        /*
         * Success — the sage family, not Material green.
         *
         * These scales were kept literal so "error / success / warning stay
         * recognisable across every theme". That still holds: recognisability
         * lives in the HUE, not in the exact value. Material's green is a cold
         * green, and against cream it reads as a control from another product —
         * most visibly on the organisation-settings toggles, where seven of
         * them sat in #A5D6A7. This keeps green meaning "good" and warms it
         * onto the same sage the status chips and /SJT1 result bands use.
         */
        success: {
          DEFAULT: "#3B5240",
          50: "#EFF3EC",
          100: "#DFE7DD",
          200: "#C4D3C2",
          300: "#A3B8A1",
          400: "#7D9880",
          500: "#4E6B54",
          600: "#445D49",
          700: "#3B5240",
          800: "#2F4434",
          900: "#24352A",
          light: "#DFE7DD",
          lighter: "#C4D3C2",
          text: "#4E6B54",
          darkText: "#3B5240",
        },
        // Warning — the ochre family, same reasoning as success above: amber
        // still means caution, warmed onto the tone the status chips use.
        warning: {
          DEFAULT: "#88591B",
          50: "#FAF2E2",
          100: "#F3E6C9",
          200: "#E8D3A4",
          300: "#DBBB77",
          400: "#CFA449",
          500: "#C4901F",
          600: "#A9781A",
          700: "#88591B",
          800: "#6B4F22",
          900: "#4F3A18",
          text: "#6B4F22",
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
