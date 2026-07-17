import { FC } from "react";

import { useTranslation } from "react-i18next";

import { Close } from "@assets";

import { FlatTrackItem } from "../useTrackPlayerNavigation";
import { SegmentedProgressRail } from "./SegmentedProgressRail";

interface PlayerTopBarProps {
  sectionTitle: string;
  sectionItems: FlatTrackItem[];
  currentItemId: string;
  overallPct: number;
  onExit: () => void;
}

/**
 * Full-screen player header: exit button, current section title, the
 * segmented progress rail for the section and the overall completion %.
 */
export const PlayerTopBar: FC<PlayerTopBarProps> = ({
  sectionTitle,
  sectionItems,
  currentItemId,
  overallPct,
  onExit,
}) => {
  const { t } = useTranslation();

  return (
    <header className="flex-shrink-0 border-b border-border-light bg-white px-4 pb-3 pt-3 sm:px-6">
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label={t("tracks2.player.exit")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-typography-700 transition-colors hover:bg-neutral-100"
        >
          <Close className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-medium text-typography-900">
          {sectionTitle}
        </h1>
        <span className="flex-shrink-0 text-xs text-typography-700">
          {t("tracks2.player.overallProgress", { pct: overallPct })}
        </span>
      </div>
      <SegmentedProgressRail sectionItems={sectionItems} currentItemId={currentItemId} />
    </header>
  );
};
