import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  {
    ignores: [
      ".next",
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".nx",
      ".nx/cache",
      ".nx/workspace-data",
      "apps/ally-web/.next",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "**/next.config.js",
      "**/vite.config.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: false, // set to './tsconfig.json' for type-aware linting
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: Object.fromEntries(Object.entries(globals.browser).map(([k, v]) => [k.trim(), v])),
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: Object.fromEntries(Object.entries(globals.browser).map(([k, v]) => [k.trim(), v])),
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "max-len": "off",
      "no-multiple-empty-lines": "error",
      "prefer-arrow-callback": "error",
      "func-names": "off",
      "space-before-function-paren": "off",
      "prettier/prettier": "error",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];
