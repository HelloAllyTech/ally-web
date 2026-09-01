import { FC } from "react";

import { DoubleArrowRight } from "@icons";

import { Tag } from "@ally-ui-mono/ui-shared";
import { IosAppStoreReviewSubmissionEntry, IosTestflightStatusResponse } from "@types";

import {
  getAppStoreReviewSubmissionStatusDisplay,
  getTestflightStatusDisplay,
  MobileReleaseStatusDisplay,
} from "../mobileReleaseStatus";

interface IosReleasePipelineProps {
  testflightStatus?: IosTestflightStatusResponse;
  matchingSubmission?: IosAppStoreReviewSubmissionEntry;
}

interface Step {
  label: string;
  value: string;
  tag: MobileReleaseStatusDisplay;
}

/**
 * The current iOS build's path from upload through to Apple's decision, as
 * one connected sequence — Build → TestFlight → App Store Review — instead
 * of the two disconnected tables this used to require cross-referencing by
 * eye. Only ever describes the *current* build; full history stays in the
 * iOS / TestFlight and App Store Submissions tabs.
 */
export const IosReleasePipeline: FC<IosReleasePipelineProps> = ({
  testflightStatus,
  matchingSubmission,
}) => {
  if (!testflightStatus?.buildVersion) {
    return (
      <p className="text-sm text-typography-700">
        No processed iOS build yet — this fills in once the next build finishes uploading.
      </p>
    );
  }

  const steps: Step[] = [
    {
      label: "Build",
      value: testflightStatus.buildVersion,
      tag: { type: "cool-gray", label: "Uploaded" },
    },
    {
      label: "TestFlight",
      value: testflightStatus.buildVersion,
      tag: getTestflightStatusDisplay(testflightStatus),
    },
    {
      label: "App Store Review",
      value: testflightStatus.buildVersion,
      tag: matchingSubmission
        ? getAppStoreReviewSubmissionStatusDisplay(matchingSubmission.state)
        : { type: "cool-gray", label: "Not submitted yet" },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="rounded border border-border-light bg-white px-3 py-2 min-w-[150px]">
            <p className="text-xs text-typography-600">{step.label}</p>
            <div className="mt-1">
              <Tag type={step.tag.type} size="sm">
                {step.tag.label}
              </Tag>
            </div>
          </div>
          {index < steps.length - 1 && (
            <DoubleArrowRight size={16} className="text-typography-500 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};
