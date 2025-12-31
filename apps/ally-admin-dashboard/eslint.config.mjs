import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  ...nx.configs["flat/react"],
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"],
    ignores: ["dist/**", "build/**", "coverage/**", "**/*.config.*"],
    // Override or add rules here
    rules: {},
  },
];
