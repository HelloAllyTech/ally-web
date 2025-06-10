import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "path";
import { join } from 'path';

// Get absolute paths
const projectRoot = __dirname;

// https://vitejs.dev/config/
export default defineConfig({
  root: projectRoot,
  publicDir: "public",
  base: "/",
  build: {
    outDir: "../../dist/apps/ally-helpline-dashboard",
    emptyOutDir: true,
    cssCodeSplit: true,
  },
  server: {
    port: 8080,
    strictPort: true,
    host: true,
  },
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },
  optimizeDeps: {
    include: ['tailwindcss', 'postcss', 'autoprefixer'],
  },
});
