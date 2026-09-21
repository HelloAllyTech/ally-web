import path from "path";

import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

// Regression test for an import/order violation introduced when the
// `./level-indicator` export was added out of alphabetical order in
// components/index.ts. This must stay clean or `npm run lint` fails CI
// for anyone building on this barrel file.
describe("components barrel lint ordering", () => {
  // The first lintFiles() call pays ESLint's one-time flat-config and plugin
  // resolution (~3s locally, more on a loaded CI runner), which overruns
  // Vitest's 5000ms default. Constructing ESLint itself is ~1ms, so the budget
  // belongs here rather than in a beforeAll.
  it("has no import/order violations", async () => {
    const eslint = new ESLint({ cwd: path.resolve(__dirname, "../../../../../") });
    const targetFile = path.resolve(__dirname, "../index.ts");
    const results = await eslint.lintFiles([targetFile]);

    const importOrderErrors = results.flatMap(result =>
      result.messages.filter(message => message.ruleId === "import/order"),
    );

    expect(importOrderErrors).toEqual([]);
  }, 30000);
});
