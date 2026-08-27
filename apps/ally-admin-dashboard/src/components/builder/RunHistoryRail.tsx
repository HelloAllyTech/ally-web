import React from "react";

import { Tag } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderBuildRun } from "@types";

import { formatCostUsd, formatRunDuration } from "./runFormat";
import { BUILDER_RUN_STATUS_TAG_TYPE } from "../../pages/Builder/builderMotion";

interface RunHistoryRailProps {
  runs: BuilderBuildRun[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

/**
 * The session's runs as a selectable strip, so a resume or a retry does not
 * make an earlier run's transcript unreachable — {@link BuildView} keeps a
 * per-run event cache, and this is what switches which run's cache is on
 * screen. The live run keeps updating in the background regardless of which
 * one is selected here.
 *
 * A single-run session shows nothing: there is no history to switch between
 * yet, and a rail with one disabled-looking item would just be clutter above
 * the feed.
 *
 * Horizontal rather than a sidebar list — BuildView's column is already
 * narrow next to the PRD panel — and scrolls inside its own row once the
 * strip doesn't fit, never the page body.
 */
export const RunHistoryRail: React.FC<RunHistoryRailProps> = ({
  runs,
  selectedRunId,
  onSelect,
}) => {
  const strings = en.builder.build;

  if (runs.length <= 1) return null;

  return (
    <div className="border-b border-neutral-200 px-4 py-2">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-typography-500">
        {strings.runHistoryHeading}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {runs.map(run => {
          const isSelected = run.id === selectedRunId;
          const duration = run.completedAt
            ? (formatRunDuration(run.dispatchedAt, run.completedAt) ?? strings.runDurationUnknown)
            : strings.runDurationLive;
          const cost = formatCostUsd(run.costUsd);

          return (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelect(run.id)}
              aria-current={isSelected}
              className={[
                "flex shrink-0 flex-col items-start gap-1 rounded border px-3 py-1.5 text-left transition-colors",
                isSelected
                  ? "border-primary-400 bg-primary-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-xs font-medium text-typography-900">
                  {strings.runLabel(run.sequence, run.mode)}
                </span>
                <Tag type={BUILDER_RUN_STATUS_TAG_TYPE[run.status]} size="sm" className="shrink-0">
                  {strings.runStatusLabels[run.status] ?? run.status}
                </Tag>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-typography-500">
                <span>{duration}</span>
                {cost && <span>{cost}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
