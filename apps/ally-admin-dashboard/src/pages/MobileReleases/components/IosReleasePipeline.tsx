import { FC, ReactNode } from "react";

import { Button, Tag } from "@ally-ui-mono/ui-shared";
import { IosAppStoreReviewSubmissionEntry, IosTestflightStatusResponse } from "@types";
import { formatDateTime } from "@utils";

import {
  getAppStoreReviewSubmissionStatusDisplay,
  getTestflightStatusDisplay,
  MobileReleaseStatusDisplay,
} from "../mobileReleaseStatus";

interface IosReleasePipelineProps {
  testflightStatus?: IosTestflightStatusResponse;
  matchingSubmission?: IosAppStoreReviewSubmissionEntry;
  /** From the TestFlight history entry matching the current build, if found. */
  buildUploadedDate?: string | null;
  currentMinIosVersion?: string | null;
  isMinIosVersionLoading: boolean;
  onUpdateMinVersion: () => void;
}

interface Stage {
  title: string;
  tag: MobileReleaseStatusDisplay;
  date?: string | null;
  description: ReactNode;
  action?: ReactNode;
}

/**
 * The current iOS build's whole lifecycle as one connected sequence — Auto
 * Build, Submit for Distribution, Update Minimum Version — instead of
 * separate tables an admin had to cross-reference by version number
 * themselves. Only ever describes the *current* build; full history stays in
 * the iOS / TestFlight and App Store Submissions tabs. Android doesn't get
 * this yet — there's no equivalent "has this been promoted" signal available
 * for it the way TestFlight/reviewSubmissions give iOS one.
 *
 * Stage 3 never auto-applies anything: its button opens the same
 * force-update confirmation dialog used everywhere else on this page, with
 * the same safety copy — this view only ever makes the *decision* easier to
 * see, never the safety check optional.
 */
export const IosReleasePipeline: FC<IosReleasePipelineProps> = ({
  testflightStatus,
  matchingSubmission,
  buildUploadedDate,
  currentMinIosVersion,
  isMinIosVersionLoading,
  onUpdateMinVersion,
}) => {
  if (!testflightStatus?.buildVersion) {
    return (
      <p className="text-sm text-typography-700">
        No processed iOS build yet — this fills in once the next build finishes uploading.
      </p>
    );
  }

  const buildVersion = testflightStatus.buildVersion;
  const testflightDisplay = getTestflightStatusDisplay(testflightStatus);
  const isReviewComplete = matchingSubmission?.state === "COMPLETE";
  const isMinVersionCurrent = currentMinIosVersion === buildVersion;

  const stages: Stage[] = [
    {
      title: "Auto Build",
      tag: { type: "cool-gray", label: "Uploaded" },
      date: buildUploadedDate,
      description: (
        <>
          Build {buildVersion} finished uploading to TestFlight. Beta review:{" "}
          <Tag type={testflightDisplay.type} size="sm">
            {testflightDisplay.label}
          </Tag>
        </>
      ),
    },
    {
      title: "Submit for Distribution",
      tag: matchingSubmission
        ? getAppStoreReviewSubmissionStatusDisplay(matchingSubmission.state)
        : { type: "cool-gray", label: "Not submitted yet" },
      date: matchingSubmission?.submittedDate,
      description: matchingSubmission
        ? "Apple's full App Store review — real public distribution, not TestFlight."
        : "Not yet submitted for Apple's full App Store review.",
    },
    {
      title: "Update Minimum Version",
      tag: isMinVersionCurrent
        ? { type: "green", label: "Up to date" }
        : isReviewComplete
          ? { type: "blue", label: "Ready" }
          : { type: "cool-gray", label: "Not yet" },
      description: isMinIosVersionLoading ? (
        "Loading current threshold…"
      ) : isMinVersionCurrent ? (
        `The force-update minimum is already ${currentMinIosVersion}.`
      ) : isReviewComplete ? (
        <>
          Apple approved {buildVersion} — release is automatic, so it's going live on its own, no
          click needed for that part. The minimum version raises itself once that's confirmed
          (usually within 30 minutes); use this button only if you want it sooner.
        </>
      ) : (
        `Current minimum is ${currentMinIosVersion ?? "unknown"} — raising it to ${buildVersion} only makes sense once that version is live.`
      ),
      action: !isMinVersionCurrent ? (
        <Button kind="tertiary" size="sm" onClick={onUpdateMinVersion}>
          Update Minimum Version
        </Button>
      ) : undefined,
    },
  ];

  return (
    <div className="flex flex-col">
      {stages.map((stage, index) => (
        <div key={stage.title} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 shrink-0 rounded-full border-2 border-primary-300 bg-white flex items-center justify-center text-xs text-primary-500 font-medium">
              {index + 1}
            </div>
            {index < stages.length - 1 && <div className="w-px flex-1 bg-border-light my-1" />}
          </div>
          <div className={`flex-1 ${index < stages.length - 1 ? "pb-4" : ""}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-typography-900">{stage.title}</p>
                <Tag type={stage.tag.type} size="sm">
                  {stage.tag.label}
                </Tag>
              </div>
              {stage.date && (
                <span className="text-xs text-typography-600 whitespace-nowrap">
                  {formatDateTime(stage.date)}
                </span>
              )}
            </div>
            <p className="text-sm text-typography-700 mt-1">{stage.description}</p>
            {stage.action && <div className="mt-2">{stage.action}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
