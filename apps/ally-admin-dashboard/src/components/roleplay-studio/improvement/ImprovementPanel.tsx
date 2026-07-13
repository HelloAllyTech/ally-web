import React, { useCallback, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  baseAPI,
  useCancelImprovementRunMutation,
  useGetImprovementRunQuery,
  useGetImprovementRunsBySpecQuery,
} from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { en, TAG_TYPES } from "@constants";
import { selectRoleplaySpecState } from "@reducer";
import { RoleplayCritiqueProposal, RoleplayImprovementRun } from "@src/types/roleplayStudio";

import { CumulativeDiffView } from "./CumulativeDiffView";
import { ImprovementLaunchCard } from "./ImprovementLaunchCard";
import { ImprovementReviewBar } from "./ImprovementReviewBar";
import { RoundProposalsCard } from "./RoundProposalsCard";
import { ScoreTrajectory } from "./ScoreTrajectory";
import { useImprovementSocket } from "./useImprovementSocket";

const statusStyles: Record<string, string> = {
  RUNNING: "bg-secondary-50 text-typography-900",
  AWAITING_REVIEW: "bg-primary-50 text-primary-700",
  ACCEPTED: "bg-success-50 text-success-600",
  DISCARDED: "bg-neutral-100 text-typography-600",
  FAILED: "bg-destructive-50 text-destructive-500",
  CANCELLED: "bg-neutral-100 text-typography-600",
};

/**
 * The Improve step: launch auto-improve, watch the loop's live round
 * progress, and review the result (score trajectory, per-round fixes,
 * cumulative diff) before accepting it into the draft.
 */
export const ImprovementPanel: React.FC = () => {
  const strings = en.roleplayStudio.improvement;
  const dispatch = useDispatch();
  const { specId, versionId, serverUpdatedAt } = useSelector(selectRoleplaySpecState);

  const { data: runs = [], isLoading } = useGetImprovementRunsBySpecQuery(specId as string, {
    skip: !specId,
  });
  const [cancelRun] = useCancelImprovementRunMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId ?? runs[0]?.id ?? null;

  const { data: runDetail } = useGetImprovementRunQuery(effectiveSelectedId as string, {
    skip: !effectiveSelectedId,
  });

  // Socket pushes → refetch through the cache so every consumer stays fresh.
  const onSocketUpdate = useCallback(() => {
    dispatch(
      baseAPI.util.invalidateTags([
        TAG_TYPES.ROLEPLAY_IMPROVEMENTS,
        ...(effectiveSelectedId
          ? [{ type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: effectiveSelectedId }]
          : []),
      ]),
    );
  }, [dispatch, effectiveSelectedId]);

  useImprovementSocket({
    specId,
    improvementRunId: effectiveSelectedId,
    onUpdate: onSocketUpdate,
  });

  const hasActiveRun = runs.some(run => String(run.status) === "RUNNING");

  const proposalsByRound = useMemo(() => {
    const groups = new Map<number, RoleplayCritiqueProposal[]>();
    for (const proposal of runDetail?.proposals ?? []) {
      const round = (proposal as RoleplayCritiqueProposal & { roundNumber?: number }).roundNumber;
      if (round === undefined || round === null) continue;
      groups.set(round, [...(groups.get(round) ?? []), proposal]);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [runDetail?.proposals]);

  const handleCancel = async (runId: string) => {
    try {
      await cancelRun(runId).unwrap();
    } catch {
      toast.error(strings.cancelFailed);
    }
  };

  const runLabel = (run: RoleplayImprovementRun): string => {
    const status = strings.status[run.status as keyof typeof strings.status] ?? run.status;
    const outcome = run.outcome
      ? ` — ${strings.outcome[run.outcome as keyof typeof strings.outcome] ?? run.outcome}`
      : "";
    return `${status}${outcome}`;
  };

  if (!specId || !versionId) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto custom-scrollbar pb-6">
      <ImprovementLaunchCard specId={specId} versionId={versionId} hasActiveRun={hasActiveRun} />

      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-14 rounded-lg bg-neutral-100" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState title={strings.emptyTitle} subtitle={strings.emptySubtitle} hideActionButton />
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-medium text-typography-900">{strings.title}</h3>
          {runs.map(run => (
            <div
              key={run.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(run.id)}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") setSelectedId(run.id);
              }}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                run.id === effectiveSelectedId
                  ? "border-primary-300 bg-primary-50/40"
                  : "border-border-light bg-white hover:bg-neutral-50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    statusStyles[String(run.status)] ?? statusStyles.CANCELLED
                  }`}
                >
                  {runLabel(run)}
                </span>
                <span className="text-xs text-typography-600">
                  {strings.round} {run.currentRound}/{run.config?.maxRounds ?? "?"}
                </span>
              </div>
              {String(run.status) === "RUNNING" && (
                <Button
                  variant={ButtonVariant.SECONDARY}
                  className="h-[28px] px-2.5 text-xs"
                  onClick={event => {
                    event.stopPropagation();
                    void handleCancel(run.id);
                  }}
                >
                  {strings.cancel}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {runDetail && (
        <div className="flex flex-col gap-4">
          {String(runDetail.status) === "RUNNING" && (
            <div className="rounded-lg border border-border-light bg-white p-4">
              <div className="flex flex-col gap-1.5">
                {runDetail.rounds.map(round => (
                  <div key={round.id} className="flex items-center gap-2 text-sm">
                    <span className="text-typography-800">
                      {strings.round} {round.roundNumber} (
                      {strings.kind[round.kind as keyof typeof strings.kind] ?? round.kind})
                    </span>
                    <span className="text-xs text-typography-600">
                      {strings.roundStatus[round.status as keyof typeof strings.roundStatus] ??
                        round.status}
                    </span>
                    {round.status !== "DONE" && round.status !== "FAILED" && (
                      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ScoreTrajectory run={runDetail} rounds={runDetail.rounds} />

          {String(runDetail.status) === "AWAITING_REVIEW" && (
            <>
              <CumulativeDiffView runId={runDetail.id} />
              <ImprovementReviewBar
                runId={runDetail.id}
                draftUpdatedAt={serverUpdatedAt}
                onResolved={onSocketUpdate}
              />
            </>
          )}

          {proposalsByRound.map(([roundNumber, proposals]) => (
            <RoundProposalsCard key={roundNumber} roundNumber={roundNumber} proposals={proposals} />
          ))}
        </div>
      )}
    </div>
  );
};
