/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin";
import svgr from "vite-plugin-svgr";
import path from "path";
// Get absolute paths
const projectRoot = __dirname;

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/ally-admin-dashboard",
  server: {
    port: 8081,
    host: true,
    hmr: {
      host: "localhost",
      port: 8081,
      clientPort: 8081,
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
  preview: {
    port: 4300,
    host: "localhost",
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"]), svgr()],
  // Carbon v11 ships SCSS that triggers many Dart-Sass deprecation warnings.
  // quietDeps silences node_modules noise; silenceDeprecations keeps the
  // remaining (expected) Carbon warnings from failing the build.
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        quietDeps: true,
        silenceDeprecations: ["global-builtin", "import", "color-functions", "legacy-js-api"],
      },
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: "../../dist/apps/ally-admin-dashboard",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Add content hashes to filenames for cache busting
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  optimizeDeps: {
    include: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
  },
  test: {
    watch: false,
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/apps/ally-admin-dashboard",
      provider: "v8" as const,
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
    passWithNoTests: true,
    env: {
      VITE_API_BASE_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@src": path.resolve(projectRoot, "./src"),
      "@src/*": path.resolve(projectRoot, "./src/*"),
      "@components": path.resolve(projectRoot, "./src/components"),
      "@components/*": path.resolve(projectRoot, "./src/components/*"),
      "@icons": path.resolve(projectRoot, "./src/components/icons"),
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
}));
