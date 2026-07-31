import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useEnrollTrackMutation,
  useGetLearnTrackDetailQuery,
  useLazyGetNextTrackItemQuery,
} from "@api";
import { ROUTES, buildTrackItemRoute } from "@constants";
import { TrackDetailItem, TrackItemStatus } from "@types";

import { SectionMilestone } from "./components/SectionMilestone";
import { TrackProgressHeader } from "./components/TrackProgressHeader";

/**
 * Track 2.0 overview / journey map. Assembles the sticky progress header and
 * the section milestones on a vertical connector line. Unlocked/completed
 * item nodes deep-link into the player; locked ones are inert.
 */
export const TrackOverview: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trackId = "" } = useParams<{ trackId: string }>();

  const { data: track, isLoading } = useGetLearnTrackDetailQuery({ trackId }, { skip: !trackId });

  const [enrollTrack] = useEnrollTrackMutation();
  const [getNextItem] = useLazyGetNextTrackItemQuery();
  const [isStarting, setIsStarting] = useState(false);

  /** First actionable item across the whole track (for the "Next" chip). */
  const findNextItemId = (): string | null => {
    if (!track) return null;
    const sections = [...track.sections].sort((a, b) => a.order - b.order);
    for (const section of sections) {
      const items = [...section.items].sort((a, b) => a.order - b.order);
      const inProgress = items.find(
        item => item.status === TrackItemStatus.UNLOCKED && item.startedAt,
      );
      if (inProgress) return inProgress.id;
    }
    for (const section of sections) {
      const items = [...section.items].sort((a, b) => a.order - b.order);
      const unlocked = items.find(item => item.status === TrackItemStatus.UNLOCKED);
      if (unlocked) return unlocked.id;
    }
    return null;
  };

  const nextItemId = findNextItemId();

  const handleItemClick = (item: TrackDetailItem) => {
    if (item.status === TrackItemStatus.LOCKED) return;
    navigate(buildTrackItemRoute(trackId, item.id));
  };

  const handleStartOrContinue = async () => {
    if (!track || isStarting) return;
    setIsStarting(true);
    try {
      if (!track.enrolled) {
        await enrollTrack({ trackId }).unwrap();
      }
      // Ask the server for the next unlocked-but-incomplete item.
      const nextResult = await getNextItem({ trackId }).unwrap();
      if (nextResult.trackCompleted || !nextResult.nextItem) {
        // Nothing left to do — stay on the overview.
        return;
      }
      navigate(buildTrackItemRoute(trackId, nextResult.nextItem.id));
    } catch {
      toast.error(t("common.somethingWentWrong"));
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-4 text-lg text-typography-700">{t("tracks2.notFound")}</div>
        <button
          onClick={() => navigate(`${ROUTES.LEARN}?tab=courses`)}
          className="rounded-md bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600"
        >
          {t("common.backToLearn")}
        </button>
      </div>
    );
  }

  const sortedSections = [...track.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl bg-white px-4 pb-16 font-primary sm:px-6">
      <TrackProgressHeader
        track={track}
        isStarting={isStarting}
        onStartOrContinue={handleStartOrContinue}
      />

      <div className="pt-4">
        {sortedSections.map((section, sectionIndex) => (
          <SectionMilestone
            key={section.id}
            section={section}
            sectionIndex={sectionIndex}
            nextItemId={nextItemId}
            onItemClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TrackOverview;
