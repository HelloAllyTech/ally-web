import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "path";
import type { PluginOption } from "vite";

// Get absolute paths
const projectRoot = __dirname;
const isDocker = process.env.DOCKER_BUILD === "true";

// https://vitejs.dev/config/
export default defineConfig({
  root: projectRoot,
  publicDir: "public",
  base: "/",
  build: {
    outDir: isDocker ? "dist" : "../../dist/apps/ally-helpline-dashboard",
    emptyOutDir: true,
    cssCodeSplit: true,
  },
  server: {
    port: 8080,
    strictPort: true,
    host: true,
  },
  plugins: [
    react() as unknown as PluginOption,
    svgr() as unknown as PluginOption
  ],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
      "@ally-ui-mono/ui-shared": isDocker 
        ? path.resolve(projectRoot, "./libs/ui-shared/src")
        : path.resolve(projectRoot, "../../libs/ui-shared/src"),
      // Add any other aliases from tsconfig.base.json here
    },
  },
  optimizeDeps: {
    include: ["tailwindcss", "postcss", "autoprefixer"],
  },
});
