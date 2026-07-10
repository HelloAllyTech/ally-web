import { FC } from "react";

import { TrackItemStatus } from "@types";

import { FlatTrackItem } from "../useTrackPlayerNavigation";

interface SegmentedProgressRailProps {
  /** Items of the current section (one segment each). */
  sectionItems: FlatTrackItem[];
  /** Id of the item currently open in the player. */
  currentItemId: string;
}

/**
 * A one-segment-per-item progress rail for the current section. Completed
 * items fill; the active item is highlighted; the rest are muted.
 */
export const SegmentedProgressRail: FC<SegmentedProgressRailProps> = ({
  sectionItems,
  currentItemId,
}) => {
  return (
    <div className="flex w-full items-center gap-1" aria-hidden>
      {sectionItems.map(({ item }) => {
        const isCompleted = item.status === TrackItemStatus.COMPLETED;
        const isCurrent = item.id === currentItemId;
        return (
          <span
            key={item.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              isCompleted ? "bg-primary-500" : isCurrent ? "bg-primary-300" : "bg-neutral-200"
            }`}
          />
        );
      })}
    </div>
  );
};
