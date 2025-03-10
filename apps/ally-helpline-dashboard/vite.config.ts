import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// import svgr from "vite-plugin-svgr";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: true,
    allowedHosts: [
      "web.dev.lifeline.kvsandbox.link",
      // Add any other domains
    ],
  },
  plugins: [
    react(),
    // svgr(),
    mode === "development" &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
