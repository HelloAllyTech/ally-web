import { FC, ReactNode } from "react";

import { Button, Tag } from "@ally-ui-mono/ui-shared";
import { MobileReleaseRun } from "@types";
import { formatDateTime } from "@utils";

import {
  getMobileReleaseRunStatusDisplay,
  MobileReleaseStatusDisplay,
} from "../mobileReleaseStatus";

interface AndroidReleasePipelineProps {
  androidVersionName?: string | null;
  androidVersionCode?: number | null;
  /** Most recent SUCCESSFUL "Android Build" run — the current build's own upload. */
  lastBuildRun?: MobileReleaseRun | null;
  /** Most recent "Promote Android" run, any outcome — a still-running or failed attempt matters too. */
  lastPromoteRun?: MobileReleaseRun | null;
  currentMinAndroidVersion?: string | null;
  isMinAndroidVersionLoading: boolean;
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
 * Android's release lifecycle as a timeline, same idea as IosReleasePipeline — but honest about
 * a real gap: unlike iOS, nothing here reads Google's actual Play Console state. There's no
 * Play Developer API call in this codebase yet that checks whether Google's own review has
 * cleared, or (this app has Managed Publishing on) whether someone has actually clicked Publish
 * afterward. What's shown for "Promote to Production" is only whether *our own* dispatch to
 * Google succeeded, inferred by comparing run timestamps — not Google's review outcome, and
 * "Publish" is plainly marked as untracked rather than guessed at. Building real status reads is
 * a distinct, larger piece of work, deliberately deferred.
 */
export const AndroidReleasePipeline: FC<AndroidReleasePipelineProps> = ({
  androidVersionName,
  androidVersionCode,
  lastBuildRun,
  lastPromoteRun,
  currentMinAndroidVersion,
  isMinAndroidVersionLoading,
  onUpdateMinVersion,
}) => {
  if (!androidVersionName || !lastBuildRun) {
    return (
      <p className="text-sm text-typography-700">
        No successful Android build yet — this fills in once the next build finishes uploading.
      </p>
    );
  }

  // A promote run only counts as being "for" the current build if it happened after that build's
  // own upload finished — otherwise it's a promotion of some earlier version, not this one. This
  // is a timestamp-ordering approximation, not a real per-version link (Android runs don't carry
  // a version string the way iOS's App Store Connect resources do).
  const isPromoteForCurrentBuild =
    !!lastPromoteRun &&
    new Date(lastPromoteRun.createdAt).getTime() > new Date(lastBuildRun.createdAt).getTime();

  const isMinVersionCurrent = currentMinAndroidVersion === androidVersionName;

  const promoteStage: Stage =
    lastPromoteRun && isPromoteForCurrentBuild
      ? {
          title: "Promote to Production",
          tag: getMobileReleaseRunStatusDisplay(lastPromoteRun.status, lastPromoteRun.conclusion),
          date: lastPromoteRun.runStartedAt,
          description:
            lastPromoteRun.conclusion === "success"
              ? "Submitted to Google for review. Google's own review state isn't tracked here yet — check Play Console."
              : lastPromoteRun.status === "completed"
                ? "The last promotion attempt didn't succeed — see Release History for details."
                : "Promotion is running now.",
        }
      : {
          title: "Promote to Production",
          tag: { type: "cool-gray", label: "Not yet promoted" },
          description: lastPromoteRun
            ? "The last promotion predates this build — it hasn't been promoted to production yet."
            : "This build hasn't been promoted to the production track yet.",
        };

  const stages: Stage[] = [
    {
      title: "Auto Build",
      tag: { type: "cool-gray", label: "Uploaded" },
      date: lastBuildRun.runStartedAt,
      description: `Build ${androidVersionName}${
        androidVersionCode ? ` (${androidVersionCode})` : ""
      } finished uploading to the Play Store internal track.`,
    },
    promoteStage,
    {
      title: "Publish",
      tag: { type: "cool-gray", label: "Not tracked" },
      description:
        "This app has Managed Publishing on in Play Console — Google's review passing does not auto-publish. Someone still needs to click Publish there. Not automated or tracked here yet.",
    },
    {
      title: "Update Minimum Version",
      tag: isMinVersionCurrent
        ? { type: "green", label: "Up to date" }
        : { type: "cool-gray", label: "Not yet" },
      description: isMinAndroidVersionLoading
        ? "Loading current threshold…"
        : isMinVersionCurrent
          ? `The force-update minimum is already ${currentMinAndroidVersion}.`
          : `Current minimum is ${currentMinAndroidVersion ?? "unknown"} — raise it to ${androidVersionName} only once you've confirmed that version is actually published and live on the Play Store.`,
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
