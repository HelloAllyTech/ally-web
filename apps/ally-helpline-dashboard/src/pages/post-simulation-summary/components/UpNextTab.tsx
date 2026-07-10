import { FC, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useLazyGetNextTrackItemQuery, useLazyGetUpComingSimulationQuery } from "@api";
import { UpNextSimulationCard } from "@components";
import { buildTrackItemRoute, buildTrackRoute } from "@constants";
import { ACTIVE_TRACK_CONTEXT_KEY, ActiveTrackContext } from "@types";

interface UpNextTabProps {
  sessionId: string;
  pageType: string;
  metaData: {
    languageId?: number;
  };
}

/** Reads and clears the return-to-track context stashed before launch. */
const readTrackContext = (): ActiveTrackContext | null => {
  try {
    const raw = sessionStorage.getItem(ACTIVE_TRACK_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTrackContext;
    if (parsed?.trackId && parsed?.itemId) return parsed;
    return null;
  } catch {
    return null;
  }
};

const EVENT_STATUS = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
};

export const UpNextTab: FC<UpNextTabProps> = ({ sessionId, pageType, metaData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [getUpComingSimulation, { data: upComingSimulation }] = useLazyGetUpComingSimulationQuery();

  // Track 2.0: if this simulation/case was launched from a track, offer a
  // "Continue track" card instead of the generic path up-next.
  const [trackContext] = useState<ActiveTrackContext | null>(() => readTrackContext());
  const [getNextTrackItem] = useLazyGetNextTrackItemQuery();

  const handleContinueTrack = async () => {
    if (!trackContext) return;
    try {
      const result = await getNextTrackItem({ trackId: trackContext.trackId }).unwrap();
      sessionStorage.removeItem(ACTIVE_TRACK_CONTEXT_KEY);
      if (result.trackCompleted || !result.nextItem) {
        navigate(buildTrackRoute(trackContext.trackId));
      } else {
        navigate(buildTrackItemRoute(trackContext.trackId, result.nextItem.id));
      }
    } catch {
      sessionStorage.removeItem(ACTIVE_TRACK_CONTEXT_KEY);
      navigate(buildTrackRoute(trackContext.trackId));
    }
  };

  useEffect(() => {
    // A track-launched session returns to the player, not the path up-next.
    if (trackContext) return undefined;
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let upcomingPollCount = 0;
    const maxPolls = 5;

    const pollUpComingSimulation = async () => {
      try {
        const { data } = await getUpComingSimulation({ sessionId, type: pageType });
        if (
          data?.currentSession?.eventStatus !== EVENT_STATUS.COMPLETED &&
          upcomingPollCount < maxPolls &&
          isMounted
        ) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      } catch {
        logger.error("Polling error in upcoming simulation");
        if (isMounted && upcomingPollCount < maxPolls) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      }
    };
    if (sessionId) pollUpComingSimulation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId, trackContext]);

  if (trackContext) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-lg border border-border-light pb-20">
        <div className="mx-3 mb-2 border-b border-border-light p-3 font-primary text-base font-medium text-typography-900">
          {t("tracks2.player.next")}
        </div>
        <div className="mx-3 rounded-[16px] border border-border-light bg-primary-50 p-4">
          <div className="mb-3 text-base font-medium text-typography-900">
            {t("tracks2.continueLearning.label")}
          </div>
          <button
            onClick={handleContinueTrack}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            {t("common.continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-lg border border-border-light pb-20">
      {upComingSimulation?.currentSession?.eventStatus === EVENT_STATUS.COMPLETED && (
        <div className="text-typography-900 text-base font-medium mb-2 border-b border-border-light p-3 font-primary mx-3">
          Up Next
        </div>
      )}
      <UpNextSimulationCard data={upComingSimulation} metaData={metaData} />
    </div>
  );
};
