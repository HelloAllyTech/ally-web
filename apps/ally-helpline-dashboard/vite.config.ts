import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "path";
import type { PluginOption } from "vite";

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
  plugins: [react() as unknown as PluginOption, svgr() as unknown as PluginOption],
  resolve: {
    alias: {
      "@src": path.resolve(projectRoot, "./src"),
      "@src/*": path.resolve(projectRoot, "./src/*"),
      "@components": path.resolve(projectRoot, "./src/components"),
      "@components/*": path.resolve(projectRoot, "./src/components/*"),
      "@containers": path.resolve(projectRoot, "./src/containers"),
      "@containers/*": path.resolve(projectRoot, "./src/containers/*"),
      "@api": path.resolve(projectRoot, "./src/api"),
      "@api/*": path.resolve(projectRoot, "./src/api/*"),
      "@pages": path.resolve(projectRoot, "./src/pages"),
      "@pages/*": path.resolve(projectRoot, "./src/pages/*"),
      "@utils": path.resolve(projectRoot, "./src/utils"),
      "@utils/*": path.resolve(projectRoot, "./src/utils/*"),
      "@assets": path.resolve(projectRoot, "./src/assets"),
      "@assets/*": path.resolve(projectRoot, "./src/assets/*"),
      "@hooks": path.resolve(projectRoot, "./src/hooks"),
      "@hooks/*": path.resolve(projectRoot, "./src/hooks/*"),
      "@constants": path.resolve(projectRoot, "./src/constants"),
      "@constants/*": path.resolve(projectRoot, "./src/constants/*"),
      "@types": path.resolve(projectRoot, "./src/types"),
      "@types/*": path.resolve(projectRoot, "./src/types/*"),
      "@routes": path.resolve(projectRoot, "./src/routes"),
      "@routes/*": path.resolve(projectRoot, "./src/routes/*"),
      "@store": path.resolve(projectRoot, "./src/store"),
      "@store/*": path.resolve(projectRoot, "./src/store/*"),
      "@reducer": path.resolve(projectRoot, "./src/reducer"),
      "@reducer/*": path.resolve(projectRoot, "./src/reducer/*"),
      "@ally-ui-mono/ui-shared": path.resolve(projectRoot, "../../libs/ui-shared/src"),
      // Add any other aliases from tsconfig.base.json here
    },
  },
  optimizeDeps: {
    include: ["tailwindcss", "postcss", "autoprefixer"],
  },
});
