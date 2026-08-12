import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useGetScenariosQuery, useGetSimulationLogsQuery } from "@api";
import { SimulationSummary } from "@types";
import { getNextChallenge, NextChallengeRecommendation, readTrackContext } from "@utils";

import { useUser } from "./useUser";

const SCORE_HISTORY_LIMIT = 100;

/**
 * Recommends the next scenario to attempt after a standalone role play,
 * based on the finished session's score and the learner's score history.
 * Gated by NEXT_CHALLENGE_FLAG; pathway/case sessions and track-launched
 * sessions already have their own "up next"/continue flow, so they're
 * excluded — a track session should stay inside its course, not get pulled
 * into an unrelated recommendation.
 */
export const useNextChallenge = (
  summary?: SimulationSummary,
): NextChallengeRecommendation | null => {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useUser();

  const enabled =
    FEATURE_FLAGS_MAP.NEXT_CHALLENGE_FLAG &&
    !!summary &&
    !summary.scenarioPathSessionItemId &&
    !summary.caseSessionItemId &&
    !readTrackContext();

  const { data: scenariosData } = useGetScenariosQuery(
    { isPrivate: isAuthenticated, languageCode: i18n.language },
    { skip: !enabled },
  );
  // The endpoint returns only ENDED (completed) sessions by default.
  const { data: logsData } = useGetSimulationLogsQuery(
    {
      limit: SCORE_HISTORY_LIMIT,
      sortBy: "createdAt",
      order: "DESC",
      languageCode: i18n.language,
    },
    { skip: !enabled },
  );

  return useMemo(() => {
    if (!enabled || !summary || !scenariosData?.data?.length) return null;
    return getNextChallenge(summary, scenariosData.data, logsData?.data ?? []);
  }, [enabled, summary, scenariosData, logsData]);
};
