import { FC } from "react";

import { IosTestflightHistoryEntry, MobileReleaseRun } from "@types";

import { RunsTable } from "../components/RunsTable";
import { TestflightHistoryTable } from "../components/TestflightHistoryTable";

interface IosTestflightTabProps {
  currentBuildId?: string | null;
  testflightHistory: IosTestflightHistoryEntry[];
  isTestflightHistoryLoading: boolean;
  isTestflightHistoryError: boolean;
  runs: MobileReleaseRun[];
  isRunsLoading: boolean;
  isRunsFetching: boolean;
  isRunsError: boolean;
}

/**
 * The current build's own pipeline (Auto Build → Submit for Distribution →
 * Update Minimum Version) already lives in the always-visible Release
 * Overview above the tabs — repeating it here would just be the same
 * component twice on one page. This tab is for what's genuinely specific to
 * it: the full TestFlight submission history and the raw iOS build runs.
 */
export const IosTestflightTab: FC<IosTestflightTabProps> = ({
  currentBuildId,
  testflightHistory,
  isTestflightHistoryLoading,
  isTestflightHistoryError,
  runs,
  isRunsLoading,
  isRunsFetching,
  isRunsError,
}) => {
  const iosBuildRuns = runs.filter(run => run.workflowName === "iOS Build");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-typography-900 mb-2">
          TestFlight submission history
        </h3>
        <TestflightHistoryTable
          history={testflightHistory}
          isLoading={isTestflightHistoryLoading}
          isError={isTestflightHistoryError}
          currentBuildId={currentBuildId}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-typography-900 mb-2">iOS build runs</h3>
        <RunsTable
          runs={iosBuildRuns}
          isLoading={isRunsLoading}
          isError={isRunsError}
          isFetching={isRunsFetching}
          emptyTitle="No iOS build runs yet"
          emptySubtitle="No iOS build has run yet — check back after the next automated build."
        />
      </div>
    </div>
  );
};
