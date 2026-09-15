import path from "path";

import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

// Regression test for a prettier/prettier formatting violation introduced in
// the row-click JSX added to NotionTable.tsx (commit 29b214ce). This must
// stay clean or `npm run lint` fails CI for anyone building on this file.
describe("NotionTable lint formatting", () => {
  // The first lintFiles() call pays ESLint's one-time flat-config and plugin
  // resolution (~3s locally, more on a loaded CI runner), which overruns
  // Vitest's 5000ms default. Constructing ESLint itself is ~1ms, so the budget
  // belongs here rather than in a beforeAll.
  it("has no prettier/prettier violations", async () => {
    const eslint = new ESLint({ cwd: path.resolve(__dirname, "../../../../../../") });
    const targetFile = path.resolve(__dirname, "../NotionTable.tsx");
    const results = await eslint.lintFiles([targetFile]);

    const prettierErrors = results.flatMap(result =>
      result.messages.filter(message => message.ruleId === "prettier/prettier"),
    );

    expect(prettierErrors).toEqual([]);
  }, 30000);
});
