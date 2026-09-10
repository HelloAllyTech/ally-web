import { FC } from "react";

import { TrackProgressSectionSummary } from "@types";

interface SectionProgressBarProps {
  section: TrackProgressSectionSummary;
}

/**
 * One section's completed/total rollup as a slim linear bar. A local variant
 * rather than reusing SegmentedProgressRail (track-player), which expects
 * per-item `status` — a section summary only carries a completed/total ratio.
 */
export const SectionProgressBar: FC<SectionProgressBarProps> = ({ section }) => {
  const pct =
    section.totalItems > 0 ? Math.round((section.completedItems / section.totalItems) * 100) : 0;

  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-typography-900">{section.title}</span>
        <span className="whitespace-nowrap text-xs text-typography-700">
          {section.completedItems}/{section.totalItems}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={section.title}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
