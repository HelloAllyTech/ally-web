import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// Regression test for #674/#676: scripts/check-color-literals.mjs uses
// console.* and the Node `process` global, which the ESLint config only
// allows under the "scripts/**/*.mjs" exception (see eslint.config.mjs).
// Lints the real file through the real root config so this fails again if
// that exception is ever narrowed or removed.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const fileToCheck = path.join(repoRoot, "scripts/check-color-literals.mjs");

let eslint;

describe("root eslint config: scripts/check-color-literals.mjs", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 30000);

  it("reports no no-console or no-undef violations", async () => {
    const [result] = await eslint.lintFiles([fileToCheck]);
    const violations = result.messages
      .filter(message => message.ruleId === "no-console" || message.ruleId === "no-undef")
      .map(message => `${path.relative(repoRoot, result.filePath)}:${message.line} ${message.message}`);

    expect(violations).toEqual([]);
  }, 30000);
});
