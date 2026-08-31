import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// Regression test for an import/order violation that crept into the hooks
// barrel file (useClickOutside sorted ahead of useBuilderStream). Lints the
// actual file on disk through the real root config so this fails again if
// the imports drift out of alphabetical order.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const fileToCheck = path.join(repoRoot, "apps/ally-admin-dashboard/src/hooks/index.ts");

let eslint: ESLint;

describe("root eslint config: import/order", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 15000);

  it("reports no import/order violations in the hooks barrel file", async () => {
    const [result] = await eslint.lintFiles([fileToCheck]);
    const importOrderViolations = result.messages
      .filter(message => message.ruleId === "import/order")
      .map(
        message => `${path.relative(repoRoot, result.filePath)}:${message.line} ${message.message}`,
      );

    expect(importOrderViolations).toEqual([]);
  }, 15000);
});
