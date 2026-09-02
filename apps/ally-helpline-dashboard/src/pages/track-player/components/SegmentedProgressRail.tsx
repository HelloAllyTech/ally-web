import { FC } from "react";

import { useTranslation } from "react-i18next";

import { TrackItemStatus } from "@types";

import { FlatTrackItem } from "../useTrackPlayerNavigation";

interface SegmentedProgressRailProps {
  /** Items of the current section (one segment each). */
  sectionItems: FlatTrackItem[];
  /** Id of the item currently open in the player. */
  currentItemId: string;
  /** Jumps the player to a completed item so it can be revisited. */
  onSegmentClick: (itemId: string) => void;
}

/**
 * A one-segment-per-item progress rail for the current section. Completed
 * items fill and are clickable to revisit; the active item is highlighted;
 * the rest are muted and inert — incomplete items can't be skipped to ahead
 * of the player's own completion gating.
 */
export const SegmentedProgressRail: FC<SegmentedProgressRailProps> = ({
  sectionItems,
  currentItemId,
  onSegmentClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex w-full items-center gap-1">
      {sectionItems.map(({ item }) => {
        const isCompleted = item.status === TrackItemStatus.COMPLETED;
        const isCurrent = item.id === currentItemId;
        const className = `h-1.5 flex-1 rounded-full transition-colors duration-300 ${
          isCompleted ? "bg-primary-500" : isCurrent ? "bg-primary-300" : "bg-neutral-200"
        }`;

        if (isCompleted) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSegmentClick(item.id)}
              aria-label={t("tracks2.player.reviewItem", { title: item.title })}
              className={className}
            />
          );
        }

        return <span key={item.id} className={className} aria-hidden />;
      })}
    </div>
  );
};
