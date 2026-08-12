import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Lock, TickGreenBackground } from "@assets";
import { TrackTypeIcon, getTrackItemMeta } from "@components";
import { TrackDetailItem, TrackItemStatus } from "@types";

interface TrackItemNodeProps {
  item: TrackDetailItem;
  index: number;
  isNext: boolean;
  onClick: (item: TrackDetailItem) => void;
}

const nodeCircleStyles: Record<TrackItemStatus, string> = {
  [TrackItemStatus.COMPLETED]: "bg-primary-500 text-white border-primary-500",
  [TrackItemStatus.UNLOCKED]: "bg-white text-primary-600 border-primary-500",
  [TrackItemStatus.LOCKED]: "bg-neutral-100 text-typography-400 border-border-light",
};

const StateChip: FC<{ item: TrackDetailItem; isNext: boolean }> = ({ item, isNext }) => {
  const { t } = useTranslation();

  if (item.status === TrackItemStatus.COMPLETED) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-800">
        <TickGreenBackground className="w-4 h-4" />
        {t("tracks2.status.completed")}
      </span>
    );
  }
  if (item.status === TrackItemStatus.UNLOCKED && item.startedAt) {
    return (
      <span className="px-2 py-[2px] text-xs font-semibold rounded-full bg-warning-50 text-warning-800">
        {t("tracks2.status.inProgress")}
      </span>
    );
  }
  if (item.status === TrackItemStatus.UNLOCKED && isNext) {
    return (
      <span className="px-2 py-[2px] text-xs font-semibold rounded-full bg-primary-100 text-primary-700">
        {t("common.next")}
      </span>
    );
  }
  return null;
};

/**
 * A single item node row on the journey map. Locked nodes are dimmed with a
 * lock icon and an always-visible reason line; the current/next item gets a
 * ring highlight; unlocked/completed nodes open the player.
 */
export const TrackItemNode: FC<TrackItemNodeProps> = ({ item, index, isNext, onClick }) => {
  const { t } = useTranslation();
  const isLocked = item.status === TrackItemStatus.LOCKED;
  const isCurrent = isNext || (item.status === TrackItemStatus.UNLOCKED && Boolean(item.startedAt));

  const handleClick = () => {
    if (!isLocked) onClick(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className={`relative flex ${index % 2 === 1 ? "sm:pl-8" : "sm:pl-0"}`}
    >
      <button
        onClick={handleClick}
        disabled={isLocked}
        aria-disabled={isLocked}
        aria-label={item.title}
        className={`relative flex w-full items-center gap-3 sm:gap-4 rounded-[14px] border p-3 text-left transition-all duration-200 ${
          isLocked
            ? "border-border-light bg-neutral-50 opacity-60 cursor-not-allowed"
            : isCurrent
              ? "border-primary-400 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-2 ring-primary-100 hover:border-primary-500 cursor-pointer"
              : "border-border-light bg-white hover:border-primary-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer"
        }`}
      >
        {/* Node circle with the type icon */}
        <span
          className={`flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-full border-2 ${nodeCircleStyles[item.status]}`}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <TrackTypeIcon type={item.type} />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-medium text-typography-900">{item.title}</span>
            <StateChip item={item} isNext={isNext} />
          </span>
          <span className="text-xs text-typography-700">{getTrackItemMeta(item, t)}</span>
          {/* Always-visible reason, not hover-only, so it reaches touch and screen-reader users too. */}
          {isLocked && (
            <span className="mt-0.5 text-xs text-typography-400">{t("tracks2.lockedTooltip")}</span>
          )}
        </span>
      </button>
    </motion.div>
  );
};
