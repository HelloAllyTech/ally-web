import { FC, useMemo } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetNextTrackItemQuery } from "@api";
import { CircularProgress } from "@components";
import { buildTrackItemRoute, buildTrackRoute } from "@constants";
import { TrackListItem } from "@types";

interface ContinueLearningCardProps {
  tracks: TrackListItem[];
}

/**
 * Picks the enrolled, incomplete track with the most recent activity.
 * Exported for reuse/testing.
 */
export const pickContinueTrack = (tracks: TrackListItem[]): TrackListItem | null => {
  const candidates = tracks.filter(track => track.enrolled && !track.completedAt);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  })[0];
};

/**
 * "Continue learning" banner above the Courses grid — deep links into the
 * next item of the learner's most recently touched incomplete track.
 */
export const ContinueLearningCard: FC<ContinueLearningCardProps> = ({ tracks }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const track = useMemo(() => pickContinueTrack(tracks), [tracks]);

  const { data: nextItemData } = useGetNextTrackItemQuery(
    { trackId: track?.id ?? "" },
    { skip: !track },
  );

  if (!track) return null;

  const progressPct =
    track.totalItems > 0 ? Math.round((track.completedItems / track.totalItems) * 100) : 0;

  const handleContinue = () => {
    const nextItem = nextItemData?.nextItem;
    if (nextItem) {
      navigate(buildTrackItemRoute(track.id, nextItem.id));
    } else {
      navigate(buildTrackRoute(track.id));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 rounded-[16px] border border-border-light bg-primary-50 p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
      data-testid="continue-learning-card"
    >
      {track.coverImageUrl && (
        <CustomImage
          src={track.coverImageUrl}
          alt={track.title}
          className="hidden sm:block w-[88px] h-[56px] rounded-[10px] object-cover flex-shrink-0 bg-background-secondary"
        />
      )}
      <div className="flex-shrink-0">
        <CircularProgress
          current={track.completedItems}
          total={track.totalItems}
          size={44}
          strokeWidth={3}
          textColor="text-typography-800"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-typography-700 font-primary">
          {t("tracks2.continueLearning.label")}
        </div>
        <div className="text-base font-medium text-typography-900 truncate font-primary">
          {track.title}
        </div>
        <div className="text-xs text-typography-700 font-primary">
          {t("tracks2.progress", {
            completed: track.completedItems,
            total: track.totalItems,
          })}{" "}
          · {progressPct}%
        </div>
      </div>
      <button
        onClick={handleContinue}
        className="flex-shrink-0 px-4 sm:px-6 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 transition-colors font-primary"
      >
        {t("common.continue")}
      </button>
    </motion.div>
  );
};
