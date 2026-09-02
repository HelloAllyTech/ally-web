import path from "path";

import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

// Regression test for a prettier/prettier formatting violation introduced in
// the row-click JSX added to NotionTable.tsx (commit 29b214ce). This must
// stay clean or `npm run lint` fails CI for anyone building on this file.
describe("NotionTable lint formatting", () => {
  it("has no prettier/prettier violations", async () => {
    const eslint = new ESLint({ cwd: path.resolve(__dirname, "../../../../../../") });
    const targetFile = path.resolve(__dirname, "../NotionTable.tsx");
    const results = await eslint.lintFiles([targetFile]);

    const prettierErrors = results.flatMap(result =>
      result.messages.filter(message => message.ruleId === "prettier/prettier"),
    );

    expect(prettierErrors).toEqual([]);
  });
});
