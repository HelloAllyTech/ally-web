import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
      "no-restricted-syntax": "warn",
      "no-use-before-define": "off",
      "no-param-reassign": "warn",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "max-len": ["warn", 125],
      "no-useless-escape": "warn",
      "func-names": "off",
      "prefer-spread": "warn",
      "space-before-function-paren": "off",
      "no-multiple-empty-lines": "error",
      "prefer-arrow-callback": "error",
      strict: "error",
      "no-underscore-dangle": "off",
      "no-shadow": "off",
      "symbol-description": "error",
      "react/react-in-jsx-scope": "off", // Since we are using react 16+ (react 18 to be specific)
      "react/prop-types": "off", // Disable prop-types in TypeScript (already covered by TS)
      "@typescript-eslint/no-explicit-any": "warn", // Warning for using 'any' type
      // Disable requirement for return types in function signatures
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" }, // Warn about unused vars except params starting with '_'
      ],
      "no-console": "warn", // Warn on console.logs
      "react/jsx-uses-react": "off", // No need to import React in JSX files (React 17+)
      "react/jsx-uses-vars": "error", // Ensure variables used in JSX are used properly
      "jsx-a11y/anchor-is-valid": "off", // Disable anchor tag validation rules (can be more specific if needed)
      "react/jsx-key": "error", // Enforce key prop for list items
      "react/no-array-index-key": "warn", // Warn on using array index as key
      "react/jsx-no-duplicate-props": "error" // Disallow duplicate props in JSX
    },
  },
];
