import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { join } from 'path';

const projectRoot = __dirname;

export default {
  darkMode: ["class"],
  content: [
    join(projectRoot, "./src/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./index.html"),
    join(projectRoot, "./src/components/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./src/pages/**/*.{js,jsx,ts,tsx}"),
    join(projectRoot, "./src/layouts/**/*.{js,jsx,ts,tsx}"),
  ],
  prefix: "",
  important: true,
  theme: {
    fontFamily: {
      replay: ["ReplayPro", "sans-serif"],
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        chat: {
          incoming: "#F3F4F6",
          outgoing: "#EBF3FE",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
      },
      animation: {
        "message-in": "message-in 0.3s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-in-out",
        expand: "expand 0.5s ease-out forwards",
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
    optimizeUniversalDefaults: true
  }
} satisfies Config;

// TODO: Add .env.example for env field confirmation
