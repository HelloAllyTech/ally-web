import { useCallback } from "react";

import { useDispatch } from "react-redux";

import {
  baseAPI,
  useGetImprovementRunQuery,
  useGetImprovementRunsBySpecQuery,
  useGetRoleplayRehearsalQuery,
} from "@api";
import { useRehearsalSocket } from "@components/roleplay-studio/improvement/useRehearsalSocket";
import { TAG_TYPES } from "@constants";
import {
  RoleplayImprovementRound,
  RoleplayImprovementRun,
  RoleplayImprovementRunDetail,
  RoleplayRehearsal,
} from "@src/types/roleplayStudio";

// Round statuses where the loop is still working the round (vs DONE/FAILED).
const IN_FLIGHT_ROUND_STATUSES = ["REHEARSING", "CRITIQUING", "APPLYING"];

/** The round the loop is currently working: the non-terminal one, else the latest. */
const pickCurrentRound = (
  rounds?: RoleplayImprovementRound[] | null,
): RoleplayImprovementRound | null => {
  if (!rounds?.length) return null;
  const active = rounds.find(round => IN_FLIGHT_ROUND_STATUSES.includes(String(round.status)));
  if (active) return active;
  return rounds.reduce((best, round) => (round.roundNumber > best.roundNumber ? round : best));
};

interface ImprovementLiveProgress {
  /** The spec's currently-RUNNING improvement run, or null. */
  activeRun: RoleplayImprovementRun | null;
  /** Full run detail (rounds + proposals) for the active run. */
  detail: RoleplayImprovementRunDetail | null;
  /** The round the loop is working right now. */
  currentRound: RoleplayImprovementRound | null;
  /** Live rehearsal for the current round, present only while REHEARSING. */
  rehearsal: RoleplayRehearsal | null;
}

/**
 * Everything the auto-improve live card needs, assembled from data that already
 * flows: the runs-by-spec list and the run-detail query (both kept fresh by the
 * improvements socket the chat panel already owns), plus a dedicated rehearsals
 * socket for live per-unit sub-progress during the Rehearsing phase.
 *
 * This hook only READS the improvement queries — the chat panel's improvements
 * socket is the doorbell that invalidates them. It owns the rehearsal socket
 * itself since nothing else subscribes to it.
 */
export const useImprovementLiveProgress = (specId: string | null): ImprovementLiveProgress => {
  const dispatch = useDispatch();

  const { data: runs = [] } = useGetImprovementRunsBySpecQuery(specId as string, {
    skip: !specId,
  });
  const activeRun = runs.find(run => String(run.status) === "RUNNING") ?? null;
  const runId = activeRun?.id ?? null;

  const { data: detail } = useGetImprovementRunQuery(runId as string, { skip: !runId });
  const currentRound = pickCurrentRound(detail?.rounds);

  // A live rehearsal only exists while the current round is REHEARSING.
  const rehearsalRunId =
    currentRound && String(currentRound.status) === "REHEARSING"
      ? (currentRound.rehearsalRunId ?? null)
      : null;

  const { data: rehearsal } = useGetRoleplayRehearsalQuery(rehearsalRunId as string, {
    skip: !rehearsalRunId,
  });

  const onRehearsalUpdate = useCallback(() => {
    if (rehearsalRunId) {
      dispatch(
        baseAPI.util.invalidateTags([{ type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: rehearsalRunId }]),
      );
    }
  }, [dispatch, rehearsalRunId]);

  useRehearsalSocket({ rehearsalId: rehearsalRunId, onUpdate: onRehearsalUpdate });

  return {
    activeRun,
    detail: detail ?? null,
    currentRound,
    rehearsal: rehearsal ?? null,
  };
};
