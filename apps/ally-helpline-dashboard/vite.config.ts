/// <reference types="vitest" />
import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

import { buildGtmHeadSnippet } from "./src/analytics/gtmSnippet";
import { testResourceLimits } from "../../vitest.resource-limits";
// Get absolute paths
const projectRoot = __dirname;

/**
 * Injects the Google Tag Manager head snippet into index.html at build time.
 * Only active when VITE_GTM_ID is set (and looks like a valid container id), so
 * environments without the variable ship no GTM code at all.
 *
 * The snippet skips the anonymous talker page (`/talk/*`) at load time — see
 * src/analytics/talkPrivacy.ts. There is no `<noscript>` iframe: this SPA
 * renders nothing without JavaScript, so the iframe only ever measured blank
 * pages, and it can't be kept off `/talk` (no script means no path check).
 */
function gtm(gtmId: string | undefined): PluginOption {
  if (!gtmId || !/^GTM-[A-Z0-9]+$/.test(gtmId)) {
    return false;
  }
  return {
    name: "gtm-inject",
    transformIndexHtml() {
      return [{ tag: "script", injectTo: "head", children: buildGtmHeadSnippet(gtmId) }];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot);
  return {
    root: projectRoot,
    publicDir: "public",
    base: "/",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      cssCodeSplit: true,
      assetsDir: "assets",
      rollupOptions: {
        output: {
          // Add content hashes to filenames for cache busting
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@carbon/react", "@carbon/icons-react"],
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          quietDeps: true,
          silenceDeprecations: [
            "global-builtin",
            "import",
            "color-functions",
            "legacy-js-api",
            "mixed-decls",
          ],
        },
      },
    },
    server: {
      port: 8080,
      strictPort: true,
      host: true,
      hmr: {
        host: "localhost",
        port: 8080,
        clientPort: 8080,
      },
      watch: {
        usePolling: true,
        interval: 300,
      },
      fs: {
        // allow accessing the monorepo root (e.g., ../../libs) inside container
        allow: ["..", "/app"],
      },
    },
    plugins: [react(), svgr(), gtm(env.VITE_GTM_ID)] as PluginOption[],
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
        "@theme": path.resolve(projectRoot, "./src/theme"),
        "@theme/*": path.resolve(projectRoot, "./src/theme/*"),
        "@ally-ui-mono/ui-shared": path.resolve(projectRoot, "../../libs/ui-shared/src"),
        // Add any other aliases from tsconfig.base.json here
      },
    },
    optimizeDeps: {
      include: ["tailwindcss", "postcss", "autoprefixer"],
    },
    test: {
      // Bounded worker pool — see vitest.resource-limits.ts.
      ...testResourceLimits,
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      exclude: ["node_modules", "dist", ".next", ".nx"],
      snapshotFormat: {
        escapeString: true,
        printBasicPrototype: false,
      },
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "node_modules/",
          "src/test-setup.ts",
          "**/*.d.ts",
          "**/*.config.{js,ts}",
          "**/coverage/**",
          "**/dist/**",
          "**/.{idea,git,cache,output,temp}/**",
          "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        ],
      },
    },
  };
});
