import { FC } from "react";

import { IosAppStoreReviewSubmissionEntry, MobileReleaseRun } from "@types";

import { AppStoreSubmissionsTable } from "../components/AppStoreSubmissionsTable";
import { RunsTable } from "../components/RunsTable";

interface AppStoreSubmissionsTabProps {
  submissions: IosAppStoreReviewSubmissionEntry[];
  isLoading: boolean;
  isError: boolean;
  currentVersionString?: string | null;
  runs: MobileReleaseRun[];
  isRunsLoading: boolean;
  isRunsFetching: boolean;
  isRunsError: boolean;
}

export const AppStoreSubmissionsTab: FC<AppStoreSubmissionsTabProps> = ({
  submissions,
  isLoading,
  isError,
  currentVersionString,
  runs,
  isRunsLoading,
  isRunsFetching,
  isRunsError,
}) => {
  const submissionRuns = runs.filter(run => run.workflowName === "App Store Review Submission");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-typography-900 mb-2">
          Full App Store review submissions
        </h3>
        <p className="text-sm text-typography-700 mb-3">
          Apple's own public-distribution review — separate from TestFlight's Beta App Review on the
          previous tab.
        </p>
        <AppStoreSubmissionsTable
          submissions={submissions}
          isLoading={isLoading}
          isError={isError}
          currentVersionString={currentVersionString}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-typography-900 mb-2">Submission dispatch runs</h3>
        <RunsTable
          runs={submissionRuns}
          isLoading={isRunsLoading}
          isError={isRunsError}
          isFetching={isRunsFetching}
          emptyTitle="No submission runs yet"
          emptySubtitle="No App Store review submission has been dispatched yet."
        />
      </div>
    </div>
  );
};
