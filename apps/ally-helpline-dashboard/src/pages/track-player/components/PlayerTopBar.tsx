import { FC } from "react";

import { useTranslation } from "react-i18next";

import { Close } from "@assets";

import { FlatTrackItem } from "../useTrackPlayerNavigation";
import { SegmentedProgressRail } from "./SegmentedProgressRail";

interface PlayerTopBarProps {
  sectionTitle: string;
  /** The component's own title — the heading; the section title is its eyebrow. */
  itemTitle: string;
  /** The author's description of the component, when they wrote one. */
  itemDescription: string | null;
  sectionItems: FlatTrackItem[];
  currentItemId: string;
  overallPct: number;
  onExit: () => void;
  onSegmentClick: (itemId: string) => void;
}

/**
 * Full-screen player header: exit button, section eyebrow + current item
 * title, the item's description, the segmented progress rail for the
 * section and the overall completion %. The item title and description live
 * here rather than inside the players so every component type shows them
 * and the players keep their full-height layout and bottom bars.
 */
export const PlayerTopBar: FC<PlayerTopBarProps> = ({
  sectionTitle,
  itemTitle,
  itemDescription,
  sectionItems,
  currentItemId,
  overallPct,
  onExit,
  onSegmentClick,
}) => {
  const { t } = useTranslation();

  return (
    <header className="flex-shrink-0 border-b border-border-light bg-white px-4 pb-3 pt-3 sm:px-6">
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label={t("tracks2.player.exit")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-typography-700 transition-colors hover:bg-neutral-100 max-md:h-11 max-md:w-11"
        >
          <Close className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-typography-700">{sectionTitle}</p>
          <h1 className="truncate text-base font-medium text-typography-900">{itemTitle}</h1>
        </div>
        <span className="flex-shrink-0 text-xs text-typography-700">
          {t("tracks2.player.overallProgress", { pct: overallPct })}
        </span>
      </div>
      {itemDescription && (
        <p className="mb-2 line-clamp-2 text-sm text-typography-700">{itemDescription}</p>
      )}
      <SegmentedProgressRail
        sectionItems={sectionItems}
        currentItemId={currentItemId}
        onSegmentClick={onSegmentClick}
      />
    </header>
  );
};
