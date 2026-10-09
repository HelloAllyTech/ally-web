import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";

export default [
  // 1️⃣ Ignore patterns
  {
    ignores: [
      ".github/**",
      ".claude/**",
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".nx/**",
      ".nx/cache/**",
      ".nx/workspace-data/**",
      "apps/ally-web/.next/**",
      "apps/ally-helpline-dashboard/dist/**",
      "apps/ally-web/dist/**",
      "libs/ui-shared/dist/**",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "**/next.config.js",
      "**/vite.config.ts",
      "**/jest.config.js",
      "**/jest.setup.js",
      "**/test-setup.ts",
      "**/*.test.{ts,tsx}",
      "**/__tests__/**",
      "**/__test__/**",
    ],
  },

  // 2️⃣ TypeScript config
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: false,
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: globals.browser,
    },
  },

  // 3️⃣ JavaScript config
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },

  // 4️⃣ Base & recommended rules
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  // 5️⃣ Prettier last to disable style conflicts
  prettier,

  // 6️⃣ Custom project rules
  {
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: [
            "./tsconfig.json",
            "./apps/ally-helpline-dashboard/tsconfig.json",
            "./apps/ally-web/tsconfig.json",
            "./libs/ui-shared/tsconfig.lib.json",
          ],
        },
      },
    },
    rules: {
      // Formatting handled by Prettier
      "prettier/prettier": "error",

      // Import ordering
      "import/order": [
        "error",
        {
          groups: [
            ["builtin", "external"],
            ["internal"],
            ["parent", "sibling", "index"],
            ["object"],
            ["type"],
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "@mui/**", group: "external" },
            { pattern: "@ally-ui-mono/**", group: "internal" },
            { pattern: "@api", group: "internal" },
            { pattern: "@api/**", group: "internal" },
            { pattern: "@assets", group: "internal" },
            { pattern: "@assets/**", group: "internal" },
            { pattern: "@components", group: "internal" },
            { pattern: "@components/**", group: "internal" },
            { pattern: "@constants", group: "internal" },
            { pattern: "@constants/**", group: "internal" },
            { pattern: "@containers", group: "internal" },
            { pattern: "@containers/**", group: "internal" },
            { pattern: "@hooks", group: "internal" },
            { pattern: "@hooks/**", group: "internal" },
            { pattern: "@pages", group: "internal" },
            { pattern: "@pages/**", group: "internal" },
            { pattern: "@reducer", group: "internal" },
            { pattern: "@reducer/**", group: "internal" },
            { pattern: "@routes", group: "internal" },
            { pattern: "@routes/**", group: "internal" },
            { pattern: "@store", group: "internal" },
            { pattern: "@store/**", group: "internal" },
            { pattern: "@types", group: "internal" },
            { pattern: "@types/**", group: "internal" },
            { pattern: "@utils", group: "internal" },
            { pattern: "@utils/**", group: "internal" },
            { pattern: "@src/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // Hook correctness. Only the two classic rules, at the severities the
      // React team ships them at — the plugin's own `recommended` also turns on
      // ~16 React Compiler rules, which is a separate decision. Without these
      // two registered, the `eslint-disable-next-line react-hooks/exhaustive-deps`
      // comments already in the codebase were hard errors for an unknown rule.
      "react-hooks/rules-of-hooks": "error",
      // Stays a warning because the codebase carries a large legacy backlog of
      // these, and most of them are deliberate (mount-only effects,
      // notify-on-change effects) rather than defects. The backlog is instead
      // held in place by the `--max-warnings` ceiling in the root `lint`
      // script: every warning in this repo is this rule, so that number IS the
      // count of unreviewed dependency arrays. Adding one fails the build.
      // Lower the ceiling when you remove one; never raise it.
      //
      // The ceiling is a ratchet, NOT a budget: it must equal the current count
      // exactly. Any slack is a hole, not headroom — it had drifted to 209 while
      // the real count was 124, so 85 new unreviewed dependency arrays could have
      // landed without CI noticing. If `npm run lint` passes with warnings to
      // spare, the number is stale: lower it in the same PR that removed them.
      //
      // Suppressing is not removing. A file-level
      // `/* eslint-disable react-hooks/exhaustive-deps */` takes the file out of
      // the count entirely and hides every future mistake in it, which is how
      // useLiveKitRoom.ts went unchecked. Prefer a line-level disable on the one
      // deliberate dependency array, so the rest of the file stays covered.
      "react-hooks/exhaustive-deps": "warn",

      // Project-specific overrides
      "no-multiple-empty-lines": "error",
      "prefer-arrow-callback": "error",
      "func-names": "off",
      "space-before-function-paren": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "error",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
      "no-console": "error",

      // Central design system: MUI/Emotion are removed, and Carbon components
      // must be consumed through the single source of truth
      // (@ally-ui-mono/ui-shared), never imported from @carbon/react directly.
      // @carbon/icons-react and @carbon/charts(-react) are allowed directly.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui", "@mui/*", "@emotion/*"],
              message:
                "MUI/Emotion are removed. Import UI primitives from @ally-ui-mono/ui-shared instead.",
            },
            {
              group: ["@carbon/react", "@carbon/react/*"],
              message:
                "Import Carbon primitives from @ally-ui-mono/ui-shared (the central design system), not @carbon/react directly.",
            },
          ],
        },
      ],
    },
  },

  // 7️⃣ Exception for logger utility (allows console.log)
  {
    files: ["**/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // Exception for scripts (allows Node.js globals and console.log)
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },

  // 8️⃣ libs/ui-shared is the design-system package itself: it is the ONLY
  // place allowed to import @carbon/react directly. MUI/Emotion stay banned.
  {
    files: ["libs/ui-shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui", "@mui/*", "@emotion/*"],
              message: "MUI/Emotion are removed from the design system.",
            },
          ],
        },
      ],
    },
  },
];
