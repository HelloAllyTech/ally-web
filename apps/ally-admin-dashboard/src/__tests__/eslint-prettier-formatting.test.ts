import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// Regression test for a batch of prettier/prettier lint errors that had
// crept into these files (formatting only, no behavior change). Lints the
// actual files on disk through the real root config so this fails again if
// any of them drift out of prettier formatting.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const filesToCheck = [
  "apps/ally-admin-dashboard/src/pages/AILab/EvaluatorsTab.tsx",
  "apps/ally-admin-dashboard/src/pages/AILab/SkillsTab.tsx",
  "apps/ally-admin-dashboard/src/pages/AILab/ValuesTab.tsx",
  "apps/ally-admin-dashboard/src/pages/AILab/VariablesTab.tsx",
  "apps/ally-admin-dashboard/src/components/file-upload/FileUpload.tsx",
  "apps/ally-admin-dashboard/src/constants/en.ts",
  "apps/ally-admin-dashboard/src/hooks/useCopilotStream.ts",
  "apps/ally-admin-dashboard/src/pages/BugHunter/BugFindingDrawer.tsx",
  "apps/ally-admin-dashboard/src/routes/PrivateLayout.tsx",
  "apps/ally-helpline-dashboard/src/components/error-boundary/ErrorBoundary.tsx",
  "apps/ally-helpline-dashboard/src/hooks/useLiveKitRoom.ts",
  "apps/ally-helpline-dashboard/src/pages/calls/components/SimulationSummarySidebar.tsx",
  "libs/ui-shared/src/lib/simulation/SimulationInterface.tsx",
].map(relativePath => path.join(repoRoot, relativePath));

let eslint: ESLint;

describe("root eslint config: prettier formatting", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 15000);

  it("reports no prettier/prettier violations across the codebase", async () => {
    const results = await eslint.lintFiles(filesToCheck);
    const prettierViolations = results.flatMap(result =>
      result.messages
        .filter(message => message.ruleId === "prettier/prettier")
        .map(message => `${path.relative(repoRoot, result.filePath)}:${message.line}`),
    );

    expect(prettierViolations).toEqual([]);
  }, 15000);
});
