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
      primary: ["IBM Plex Serif", "serif"],
      secondary: ["Replay Pro", "sans-serif"],
      tertiary: ["Roboto", "sans-serif"],
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
          DEFAULT: "#0957D0",
          50: "#E3F2FD",
          100: "#BBDEFB",
          200: "#90CAF9",
          300: "#64B5F6",
          400: "#42A5F5",
          500: "#0957D0",
          600: "#0847B0",
          700: "#063890",
          800: "#052970",
          900: "#031A50",
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
          DEFAULT: "#1B5E20",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50",
          600: "#43A047",
          700: "#388E3C",
          800: "#2E7D32",
          900: "#1B5E20",
          light: "#D0F0C0",
          lighter: "#B9EFC8",
          text: "#174F1B",
          darkText: "#18441B",
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
          DEFAULT: "#C8C5D0",
          light: "#E5E7EB",
          medium: "#D1D5DB",
          dark: "#9CA3AF",
        },
        // Text Colors
        typography: {
          Default: "#0D0D0D",
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#1A1A1A",
          800: "#1F2937",
          900: "#0D0D0D",
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
