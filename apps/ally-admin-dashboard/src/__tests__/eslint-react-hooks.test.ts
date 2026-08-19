import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// The workspace ESLint config is shared by all three React apps and by
// libs/ui-shared, so react-hooks has to be registered there — not per app.
// This suite lints throwaway snippets through the real root config to prove
// the two hook rules actually run.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

// A path inside this app's src/ that the root config does not ignore
// (it ignores **/*.test.{ts,tsx} and **/__tests__/**, so the probe cannot
// pretend to be a test file).
const probePath = path.join(repoRoot, "apps/ally-admin-dashboard/src/eslint-hooks-probe.tsx");

let eslint: ESLint;

const lint = async (code: string) => {
  const [result] = await eslint.lintText(code, { filePath: probePath });
  return result.messages;
};

describe("root eslint config: react-hooks rules", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  });

  it("enforces react-hooks/rules-of-hooks", async () => {
    const messages = await lint(
      [
        "import { useState } from 'react';",
        "",
        "export const Broken = ({ flag }: { flag: boolean }) => {",
        "  if (flag) {",
        "    const [value] = useState(0);",
        "    return <span>{value}</span>;",
        "  }",
        "  return null;",
        "};",
        "",
      ].join("\n"),
    );

    expect(messages.map(m => m.ruleId)).toContain("react-hooks/rules-of-hooks");
  });

  it("enforces react-hooks/exhaustive-deps", async () => {
    const messages = await lint(
      [
        "import { useEffect } from 'react';",
        "",
        "export const Stale = ({ id }: { id: string }) => {",
        "  useEffect(() => {",
        "    console.info(id);",
        "  }, []);",
        "  return null;",
        "};",
        "",
      ].join("\n"),
    );

    expect(messages.map(m => m.ruleId)).toContain("react-hooks/exhaustive-deps");
  });

  // Regression: while the plugin was unregistered, every existing
  // `// eslint-disable-next-line react-hooks/exhaustive-deps` in the codebase
  // was itself a hard error — "Definition for rule ... was not found".
  it("does not report existing react-hooks suppressions as unknown rules", async () => {
    const messages = await lint(
      [
        "import { useEffect } from 'react';",
        "",
        "export const Suppressed = ({ id }: { id: string }) => {",
        "  useEffect(() => {",
        "    console.info(id);",
        "    // eslint-disable-next-line react-hooks/exhaustive-deps",
        "  }, []);",
        "  return null;",
        "};",
        "",
      ].join("\n"),
    );

    expect(messages.filter(m => m.message.includes("Definition for rule"))).toEqual([]);
    expect(messages.map(m => m.ruleId)).not.toContain("react-hooks/exhaustive-deps");
  });
});
