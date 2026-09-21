import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const fileToCheck = path.join(repoRoot, "scripts/check-color-literals.mjs");

let eslint;

describe("root eslint config: no-console in check-color-literals.mjs", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 30000);

  it("reports no console violations in check-color-literals.mjs", async () => {
    const [result] = await eslint.lintFiles([fileToCheck]);
    const consoleViolations = result.messages
      .filter(message => message.ruleId === "no-console")
      .map(
        message => `${path.relative(repoRoot, result.filePath)}:${message.line} ${message.message}`,
      );

    expect(consoleViolations).toEqual([]);
  }, 30000);
});
