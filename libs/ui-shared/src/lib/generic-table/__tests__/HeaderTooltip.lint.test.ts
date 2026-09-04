import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// Regression test for an import/order violation in the new HeaderTooltip.tsx
// (blank line inside the import group, @carbon/icons-react sorted after
// react-dom). Lints the actual file on disk through the real root config so
// this fails again if the imports drift out of order.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const fileToCheck = path.join(
  repoRoot,
  "libs/ui-shared/src/lib/generic-table/HeaderTooltip.tsx",
);

let eslint: ESLint;

describe("root eslint config: import/order", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 15000);

  it("reports no import/order violations in HeaderTooltip.tsx", async () => {
    const [result] = await eslint.lintFiles([fileToCheck]);
    const importOrderViolations = result.messages
      .filter(message => message.ruleId === "import/order")
      .map(
        message => `${path.relative(repoRoot, result.filePath)}:${message.line} ${message.message}`,
      );

    expect(importOrderViolations).toEqual([]);
  }, 15000);
});
