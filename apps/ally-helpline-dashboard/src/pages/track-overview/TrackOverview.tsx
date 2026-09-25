import { FC, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useEnrollTrackMutation,
  useGetLearnTrackDetailQuery,
  useGetTrackLanguagesQuery,
  useLazyGetNextTrackItemQuery,
  useSetTrackLanguageMutation,
} from "@api";
import { ROUTES, buildTrackItemRoute } from "@constants";
import { TrackDetailItem, TrackItemStatus } from "@types";

import { CourseLanguagePicker } from "./components/CourseLanguagePicker";
import { SectionMilestone } from "./components/SectionMilestone";
import { TrackProgressDrawer } from "./components/TrackProgressDrawer";
import { TrackProgressHeader } from "./components/TrackProgressHeader";

/**
 * Track 2.0 overview / journey map. Assembles the progress header and
 * the section milestones on a vertical connector line. Unlocked/completed
 * item nodes deep-link into the player; locked ones are inert.
 */
export const TrackOverview: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { trackId = "" } = useParams<{ trackId: string }>();

  // A language picked before enrolling. There is no enrollment row to persist
  // it on yet, so it rides along on the detail query and then seeds enroll;
  // once enrolled, the server's saved choice wins and this is ignored.
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const languageCode = preferredLanguage ?? i18n.language;

  const { data: track, isLoading } = useGetLearnTrackDetailQuery(
    { trackId, languageCode },
    { skip: !trackId },
  );

  const [enrollTrack] = useEnrollTrackMutation();
  const [getNextItem] = useLazyGetNextTrackItemQuery();
  const [setTrackLanguage] = useSetTrackLanguageMutation();

  // Enrollments created before the web sent a language have none saved, so
  // the overview reads in the app language while the player — which only
  // knows the saved choice — serves English. Adopt the app language once,
  // when the course is published in it, so both agree.
  const { data: languagesData } = useGetTrackLanguagesQuery(
    { trackId },
    { skip: !trackId || !track?.enrolled },
  );
  useEffect(() => {
    if (!track?.enrolled || !languagesData || languagesData.selectedLanguageCode) return;
    const reading = track.languageCode;
    if (!reading || reading === "en") return;
    void setTrackLanguage({ trackId, languageCode: reading });
  }, [track?.enrolled, track?.languageCode, languagesData, setTrackLanguage, trackId]);
  const [isStarting, setIsStarting] = useState(false);
  const [isProgressDrawerOpen, setIsProgressDrawerOpen] = useState(false);

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
        // Seeds the course language from what they are reading it in now, so
        // a Hindi-UI learner opening a Hindi-published course starts in Hindi.
        await enrollTrack({ trackId, languageCode }).unwrap();
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
        onProgressClick={track.enrolled ? () => setIsProgressDrawerOpen(true) : undefined}
      />

      <CourseLanguagePicker
        trackId={trackId}
        options={track.availableLanguages ?? []}
        currentLanguageCode={track.languageCode ?? "en"}
        enrolled={track.enrolled}
        onPreferredLanguageChange={setPreferredLanguage}
      />

      {isProgressDrawerOpen && (
        <TrackProgressDrawer
          trackId={trackId}
          onClose={() => setIsProgressDrawerOpen(false)}
          onContinuePress={() => {
            setIsProgressDrawerOpen(false);
            void handleStartOrContinue();
          }}
        />
      )}

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
