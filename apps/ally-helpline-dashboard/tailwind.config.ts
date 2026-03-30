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
      primary: ["IBM Plex Serif", "serif"],
      secondary: ["Replay Pro", "serif"],
      tertiary: ["Roboto", "sans-serif"],
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
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "#10264C",
          50: "#E2F2FF",
          100: "#B7D7FF",
          200: "#86B8FF",
          300: "#5F99FC",
          400: "#6188C9",
          500: "#0957D0",
          600: "#0957D0",
          700: "#0143A8",
          800: "#123268",
          900: "#10264C",
        },
        // Secondary/Accent Colors
        secondary: {
          DEFAULT: "#C8C5D0",
          50: "#F5F5F7",
          100: "#EBEAEF",
          200: "#D7D5DF",
          300: "#C8C5D0",
          400: "#B0ADC0",
          500: "#9895A8",
          600: "#7A7788",
          700: "#5C5968",
          800: "#3E3B48",
          900: "#201D28",
        },
        // Destructive/Error Colors
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
        // Success/Active Colors
        success: {
          DEFAULT: "#18441B",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "bgCAF50",
          600: "#43A047",
          700: "#388E3C",
          800: "#2E7D32",
          900: "#18441B",
          light: "#B9F6CA",
          lighter: "#69F0AE",
          text: "#00E676",
          darkText: "#00C853",
        },
        // Warning Colors
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
          DEFAULT: "#424242",
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EEEEEE",
          300: "#E0E0E0",
          400: "#BDBDBD",
          500: "#9E9E9E",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#333333",
        },
        // Scrollbar Colors
        scrollbar: {
          track: "#F1F1F1",
          thumb: "#888888",
          thumbHover: "#555555",
        },
        // Background Colors
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F9FAFB",
          tertiary: "#F3F4F6",
        },
        // Border Colors
        border: {
          DEFAULT: "#D2D2D2",
          light: "#E5E7EB",
          medium: "#D1D5DB",
          dark: "#9CA3AF",
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
          600: "rgba(0, 0, 0, 0.38)", //"rgba(0, 0, 0, 0.38)"   //placeholder
          700: "rgba(0, 0, 0, 0.54)", //"rgba(0, 0, 0, 0.54)"
          800: "rgba(0, 0, 0, 0.6)", //"rgba(0, 0, 0, 0.6)"
          900: "rgba(0, 0, 0, 0.87)", //"rgba(0, 0, 0, 0.87)"
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
      },
      animation: {
        "message-in": "message-in 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-in-out",
        expand: "expand 0.5s ease-out forwards",
        shine: "shine 5s linear infinite",
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
