import { FC } from "react";

import { Timer } from "@icons";

import { InlineLoading, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import { formatDateTime } from "@utils";

interface NextCheckPanelProps {
  isVersionsLoading: boolean;
  isVersionsError: boolean;
  nextEligibleCheckAt: string | null | undefined;
  isReleaseInProgress: boolean;
}

/**
 * What the automated pipeline is doing and whether the admin needs to do
 * anything about it — the answer to "is anything currently running" and
 * "when does the automation run next", stated plainly rather than as a bare
 * timestamp with no context.
 */
export const NextCheckPanel: FC<NextCheckPanelProps> = ({
  isVersionsLoading,
  isVersionsError,
  nextEligibleCheckAt,
  isReleaseInProgress,
}) => {
  return (
    <div className="flex-1 min-w-[280px] rounded border border-border-light bg-white px-5 py-4">
      <div className="flex items-center gap-1.5">
        <Timer size={18} className="text-typography-600" />
        <p className="text-sm font-medium text-typography-900">Automated release check</p>
        <Tooltip
          label="A daily job that bumps the version and ships a build automatically — but only if there are new commits since the last release and tests are green. It never runs a second time before both platforms have finished the previous run."
          align="top"
        >
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      </div>

      {isReleaseInProgress ? (
        <div className="mt-3">
          <InlineLoading description="A release is running right now — see Release History for progress." />
        </div>
      ) : isVersionsLoading ? (
        <p className="text-typography-700 mt-3">Loading…</p>
      ) : isVersionsError ? (
        <p className="text-destructive-500 mt-3">Failed to load the next check time.</p>
      ) : (
        <>
          <p className="text-lg text-typography-900 font-secondary mt-3">
            {nextEligibleCheckAt ? formatDateTime(nextEligibleCheckAt) : "Unknown"}
          </p>
          <p className="text-xs text-typography-600 mt-1">
            Next scheduled check — only ships something if there's new code to release. Nothing to
            do in the meantime, or use "Trigger release now" below to skip the wait.
          </p>
        </>
      )}
    </div>
  );
};
