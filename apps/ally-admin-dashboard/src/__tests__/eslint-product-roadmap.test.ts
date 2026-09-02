import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, beforeAll } from "vitest";

// Regression test for the Product Roadmap queue/votes/opportunity-codes feature
// (PR #532, commit dd2ecfb1) shipping without a lint pass — 95 errors (prettier
// formatting, import/order, and a couple of now-vestigial unused vars) across
// these files. Lints the actual files on disk through the real root config so
// this fails again if any of them drift out of lint compliance.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const configPath = path.join(repoRoot, "eslint.config.mjs");

const filesToCheck = [
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/RoadmapFilterBar.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/ProductRoadmap.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/MergeOpportunitiesPanel.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/RoadmapSettingsDrawer.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/RoadmapSortControl.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/SortableViewTab.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/SavedViewTabs.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/OpportunitiesListView.tsx",
  "apps/ally-admin-dashboard/src/components/icons/index.tsx",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/utils/monthBoard.ts",
  "apps/ally-admin-dashboard/src/pages/ProductRoadmap/OpportunityDrawer.tsx",
  "apps/ally-admin-dashboard/src/pages/Builder/BuilderSession.tsx",
].map(relativePath => path.join(repoRoot, relativePath));

let eslint: ESLint;

describe("root eslint config: Product Roadmap feature files", () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath });
  }, 15000);

  it("reports no lint errors across the files touched by the queue/votes/opportunity-codes feature", async () => {
    // eslint-import-resolver-typescript resolves this config's relative
    // "./tsconfig.json" project paths against process.cwd() rather than the
    // ESLint `cwd` option above, so under the Nx/Vitest runner (which sets
    // process.cwd() to this app's own directory) the @icons alias silently
    // fails to resolve and import/order misclassifies it. Run from repoRoot,
    // matching how `npm run lint` actually invokes ESLint.
    const originalCwd = process.cwd();
    process.chdir(repoRoot);
    let results;
    try {
      results = await eslint.lintFiles(filesToCheck);
    } finally {
      process.chdir(originalCwd);
    }
    const errors = results.flatMap(result =>
      result.messages
        .filter(message => message.severity === 2)
        .map(
          message =>
            `${path.relative(repoRoot, result.filePath)}:${message.line} ${message.ruleId}`,
        ),
    );

    expect(errors).toEqual([]);
  }, 15000);
});
