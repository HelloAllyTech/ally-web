module.exports = {
  // Global coverage configuration
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  collectCoverageFrom: [
    "apps/**/src/**/*.{js,jsx,ts,tsx}",
    "libs/**/src/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/*.stories.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/coverage/**",
    "!**/*.config.{js,ts}",
    "!**/test-setup.{js,ts}",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Project-specific thresholds
    "apps/ally-web/src": {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    "apps/ally-helpline-dashboard/src": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    "libs/ui-shared/src": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
