import { useCallback } from "react";

import { useDispatch } from "react-redux";

import { baseAPI, useGetImprovementRunsBySpecQuery } from "@api";
import { useImprovementSocket } from "@components/roleplay-studio/improvement/useImprovementSocket";
import { TAG_TYPES } from "@constants";
import { RoleplayImprovementRun } from "@src/types/roleplayStudio";

/**
 * Live view of a spec's auto-improve runs: the runs-by-spec query kept fresh
 * by the improvements socket. Drives the chat-screen editing lock and the
 * autosave pause while a loop is rewriting versions in the background.
 */
export const useActiveImprovementRun = (specId: string | null) => {
  const dispatch = useDispatch();
  const { data: runs = [] } = useGetImprovementRunsBySpecQuery(specId as string, {
    skip: !specId,
  });

  const onUpdate = useCallback(() => {
    dispatch(baseAPI.util.invalidateTags([TAG_TYPES.ROLEPLAY_IMPROVEMENTS]));
  }, [dispatch]);

  useImprovementSocket({ specId, onUpdate });

  const activeRun: RoleplayImprovementRun | null =
    runs.find(run => String(run.status) === "RUNNING") ?? null;
  const latestAwaitingReview: RoleplayImprovementRun | null =
    runs.find(run => String(run.status) === "AWAITING_REVIEW") ?? null;

  return { runs, activeRun, latestAwaitingReview, improvementRunning: Boolean(activeRun) };
};
