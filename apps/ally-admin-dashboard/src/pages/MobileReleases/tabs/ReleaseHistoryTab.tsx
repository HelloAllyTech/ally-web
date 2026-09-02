import { FC } from "react";

import { MobileReleaseRun } from "@types";

import { RunsTable } from "../components/RunsTable";

interface ReleaseHistoryTabProps {
  runs: MobileReleaseRun[];
  isRunsLoading: boolean;
  isRunsFetching: boolean;
  isRunsError: boolean;
}

/** Every run from every release workflow, unfiltered — the detailed record behind the summarised platform tabs. */
export const ReleaseHistoryTab: FC<ReleaseHistoryTabProps> = ({
  runs,
  isRunsLoading,
  isRunsFetching,
  isRunsError,
}) => {
  return (
    <div>
      <p className="text-sm text-typography-700 mb-3">
        Every run of every release workflow — scheduled checks, builds, promotions, and submissions
        — across both platforms, newest first.
      </p>
      <RunsTable
        runs={runs}
        isLoading={isRunsLoading}
        isError={isRunsError}
        isFetching={isRunsFetching}
        emptyTitle="No runs yet"
        emptySubtitle="The release pipeline hasn't run yet — check back after its next scheduled pass."
      />
    </div>
  );
};
