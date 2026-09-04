import path from "node:path";

import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

/**
 * Regression test for an import/order violation in the icons barrel: a new
 * icon import (`progress-ladder.svg?react`) was appended after
 * `redirect-icon.svg?react` instead of being inserted alphabetically, which
 * fails the repo's ESLint gate for the whole team even though it has no
 * effect on what a user sees.
 */
describe("icons barrel import order", () => {
  it("keeps ./index.ts imports alphabetically sorted (eslint import/order)", async () => {
    const eslint = new ESLint({
      cwd: path.resolve(__dirname, "../../../../../.."),
    });
    const targetFile = path.resolve(__dirname, "../index.ts");
    const [result] = await eslint.lintFiles([targetFile]);

    const importOrderErrors = result.messages.filter((message) => message.ruleId === "import/order");
    expect(importOrderErrors).toEqual([]);
  });
});
