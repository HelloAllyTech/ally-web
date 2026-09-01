import { FC } from "react";

import {
  IosAppStoreReviewSubmissionEntry,
  IosTestflightHistoryEntry,
  IosTestflightStatusResponse,
  MobileReleaseRun,
} from "@types";

import { IosReleasePipeline } from "../components/IosReleasePipeline";
import { RunsTable } from "../components/RunsTable";
import { TestflightHistoryTable } from "../components/TestflightHistoryTable";

interface IosTestflightTabProps {
  testflightStatus?: IosTestflightStatusResponse;
  matchingSubmission?: IosAppStoreReviewSubmissionEntry;
  testflightHistory: IosTestflightHistoryEntry[];
  isTestflightHistoryLoading: boolean;
  isTestflightHistoryError: boolean;
  runs: MobileReleaseRun[];
  isRunsLoading: boolean;
  isRunsFetching: boolean;
  isRunsError: boolean;
}

export const IosTestflightTab: FC<IosTestflightTabProps> = ({
  testflightStatus,
  matchingSubmission,
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
        <h3 className="text-sm font-medium text-typography-900 mb-2">Current build's pipeline</h3>
        <IosReleasePipeline
          testflightStatus={testflightStatus}
          matchingSubmission={matchingSubmission}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-typography-900 mb-2">
          TestFlight submission history
        </h3>
        <TestflightHistoryTable
          history={testflightHistory}
          isLoading={isTestflightHistoryLoading}
          isError={isTestflightHistoryError}
          currentBuildId={testflightStatus?.buildId}
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
