import { FC } from "react";

import { MobileReleaseRun } from "@types";

import { RunsTable } from "../components/RunsTable";

interface AndroidReleasesTabProps {
  runs: MobileReleaseRun[];
  isRunsLoading: boolean;
  isRunsFetching: boolean;
  isRunsError: boolean;
}

const ANDROID_WORKFLOW_NAMES = new Set(["Android Build", "Promote Android"]);

export const AndroidReleasesTab: FC<AndroidReleasesTabProps> = ({
  runs,
  isRunsLoading,
  isRunsFetching,
  isRunsError,
}) => {
  const androidRuns = runs.filter(run => ANDROID_WORKFLOW_NAMES.has(run.workflowName));

  return (
    <div>
      <p className="text-sm text-typography-700 mb-3">
        Every Android build upload (internal track) and every production-promotion run, newest
        first.
      </p>
      <RunsTable
        runs={androidRuns}
        isLoading={isRunsLoading}
        isError={isRunsError}
        isFetching={isRunsFetching}
        emptyTitle="No Android runs yet"
        emptySubtitle="No Android build or promotion has run yet — check back after the next automated build."
      />
    </div>
  );
};
