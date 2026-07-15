import React, { useState } from "react";

import { en } from "@constants";
import {
  RoleplayImprovementRound,
  RoleplayImprovementRun,
  RoleplayImprovementRunDetail,
  RoleplayRehearsal,
} from "@src/types/roleplayStudio";

const strings = en.roleplayStudio.improvement;
const live = strings.live;

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={`inline-block shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent ${className ?? "h-3.5 w-3.5"}`}
  />
);

const DeltaChip: React.FC<{ delta: number | null }> = ({ delta }) => {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-success-500" : "text-destructive-500"}`}>
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
};

const kindLabel = (kind: string | undefined): string =>
  (kind && strings.kind[kind as keyof typeof strings.kind]) || kind || "";

const overallOf = (round: RoleplayImprovementRound | undefined): number | null => {
  const value = round?.scores?.overall;
  return typeof value === "number" ? value : null;
};

const testsLabel = (round: RoleplayImprovementRound | undefined): string | null => {
  const counts = round?.scores?.test_counts;
  if (!counts) return null;
  const total = (counts.passed ?? 0) + (counts.failed ?? 0) + (counts.inconclusive ?? 0);
  return total > 0
    ? en.roleplayStudio.copilot.improvement.testsPassing(`${counts.passed ?? 0}/${total}`)
    : null;
};

// The three backend round phases, in order. "Scoring" is folded into Rehearse
// because judging happens inside the rehearsal — there is no separate event.
const PHASES = [
  { key: "REHEARSING", label: live.phaseRehearse },
  { key: "CRITIQUING", label: live.phaseCritique },
  { key: "APPLYING", label: live.phaseApply },
];

interface ImprovementLiveCardProps {
  run: RoleplayImprovementRun;
  detail: RoleplayImprovementRunDetail | null;
  currentRound: RoleplayImprovementRound | null;
  rehearsal: RoleplayRehearsal | null;
  onCancel: () => void;
  cancelling: boolean;
}

/**
 * Live, in-place progress card shown as the last item in the copilot chat feed
 * while an auto-improve run is RUNNING. Surfaces the round progress, the current
 * round's phase, live per-unit rehearsal sub-progress, best-so-far vs target,
 * and a done/doing/pending activity log. Disappears once the run resolves — the
 * append-only narration cards then stand as the settled record.
 */
export const ImprovementLiveCard: React.FC<ImprovementLiveCardProps> = ({
  run,
  detail,
  currentRound,
  rehearsal,
  onCancel,
  cancelling,
}) => {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const maxRounds = run.config?.maxRounds ?? 3;
  const targetOverall = run.config?.targets?.minOverall ?? null;
  const rounds = detail?.rounds ?? [];

  const roundByNumber = (n: number) => rounds.find(r => r.roundNumber === n);
  const maxExisting = rounds.reduce((m, r) => Math.max(m, r.roundNumber), 0);
  const totalRows = Math.max(maxRounds, maxExisting);

  const bestOverall = rounds.reduce<number | null>((best, round) => {
    const value = overallOf(round);
    if (value === null) return best;
    return best === null ? value : Math.max(best, value);
  }, null);

  const currentStatus = currentRound ? String(currentRound.status) : null;
  const isRehearsing = currentStatus === "REHEARSING";
  const progress = isRehearsing ? rehearsal?.progress : undefined;
  const rehearsalCounter =
    isRehearsing && progress && progress.total > 0
      ? `${progress.completed}/${progress.total}`
      : null;

  // Phase cursor for the current round: which of Rehearse/Critique/Apply is live.
  const phaseCursorRaw = PHASES.findIndex(p => p.key === currentStatus);
  const phaseCursor = phaseCursorRaw === -1 ? PHASES.length : phaseCursorRaw;

  const handleCancelClick = () => {
    if (confirmingCancel) {
      onCancel();
      setConfirmingCancel(false);
    } else {
      setConfirmingCancel(true);
    }
  };

  return (
    <div className="flex justify-start" data-testid="improvement-live-card">
      <div className="max-w-[92%] w-full rounded-xl border border-secondary-200 bg-secondary-50/30 px-4 py-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-typography-800 border border-border-light">
            {strings.title}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-typography-700">
            <Spinner className="h-3 w-3" />
            {live.running}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={handleCancelClick}
            onBlur={() => setConfirmingCancel(false)}
            disabled={cancelling}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              confirmingCancel
                ? "bg-destructive-50 text-destructive-600 hover:bg-destructive-100"
                : "text-typography-500 hover:text-typography-800"
            }`}
          >
            {cancelling ? live.cancelling : confirmingCancel ? live.confirmCancel : live.cancel}
          </button>
        </div>

        {/* Round progress + segmented bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-typography-700">
            <span className="font-medium text-typography-900">
              {live.roundOf(currentRound?.roundNumber ?? 1, maxRounds)}
              {currentRound?.kind ? ` · ${kindLabel(String(currentRound.kind))}` : ""}
            </span>
            {bestOverall !== null && targetOverall !== null ? (
              <span>{live.bestVsTarget(bestOverall, targetOverall)}</span>
            ) : (
              <span className="text-typography-500">{live.noScoreYet}</span>
            )}
          </div>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: maxRounds }, (_, i) => {
              const n = i + 1;
              const activeN = currentRound?.roundNumber ?? 1;
              const done = n < activeN;
              const isCurrent = n === activeN;
              return (
                <span
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${
                    done
                      ? "bg-secondary-400"
                      : isCurrent
                        ? "bg-secondary-400 animate-pulse"
                        : "bg-neutral-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Phase stepper for the current round */}
        <div className="mt-3 flex items-center gap-1.5">
          {PHASES.map((phase, i) => {
            const phaseDone = i < phaseCursor;
            const phaseActive = i === phaseCursor;
            return (
              <React.Fragment key={phase.key}>
                {i > 0 && <span className="h-px flex-1 bg-border-light" />}
                <span
                  className={`flex items-center gap-1 text-xs ${
                    phaseActive
                      ? "font-medium text-typography-900"
                      : phaseDone
                        ? "text-typography-600"
                        : "text-typography-400"
                  }`}
                >
                  {phaseActive ? (
                    <Spinner className="h-3 w-3" />
                  ) : phaseDone ? (
                    <span className="text-success-500">✓</span>
                  ) : (
                    <span className="text-typography-300">○</span>
                  )}
                  {phase.label}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Live rehearsal sub-progress (only while rehearsing) */}
        {isRehearsing && (
          <div className="mt-2">
            <div className="text-xs text-typography-600">
              {rehearsalCounter
                ? live.rehearsalsComplete(progress!.completed, progress!.total)
                : live.startingRehearsals}
            </div>
            {rehearsalCounter && (
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <span
                  className="block h-full rounded-full bg-primary-400 transition-all"
                  style={{ width: `${(progress!.completed / progress!.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Activity log: done / doing / pending */}
        <div className="mt-3 border-t border-border-light pt-2">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-typography-500">
            {live.activityLabel}
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: totalRows }, (_, i) => {
              const n = i + 1;
              const round = roundByNumber(n);
              const status = round ? String(round.status) : null;
              const overall = overallOf(round);
              const prevOverall = overallOf(roundByNumber(n - 1));
              const delta = overall !== null && prevOverall !== null ? overall - prevOverall : null;
              const roundStatusLabel =
                status && strings.roundStatus[status as keyof typeof strings.roundStatus];

              const isDone = status === "DONE";
              const isFailed = status === "FAILED";
              const isActive = status !== null && !isDone && !isFailed;
              const isPending = round === undefined;

              return (
                <div
                  key={n}
                  className={`flex items-center gap-2 text-xs ${
                    isPending ? "text-typography-400" : "text-typography-700"
                  }`}
                >
                  <span className="w-4 shrink-0 text-center">
                    {isDone ? (
                      <span className="text-success-500">✓</span>
                    ) : isFailed ? (
                      <span className="text-destructive-500">✗</span>
                    ) : isActive ? (
                      <Spinner className="h-3 w-3" />
                    ) : (
                      <span className="text-typography-300">○</span>
                    )}
                  </span>
                  <span className="w-32 shrink-0 truncate">
                    {strings.round} {n}
                    {round?.kind ? ` · ${kindLabel(String(round.kind))}` : ""}
                  </span>
                  <span className="flex flex-1 items-center gap-2 truncate">
                    {isPending ? (
                      <span>{live.pending}</span>
                    ) : isActive ? (
                      <span>
                        {roundStatusLabel || status}
                        {n === (currentRound?.roundNumber ?? -1) && rehearsalCounter
                          ? ` (${rehearsalCounter})`
                          : ""}
                      </span>
                    ) : (
                      <>
                        {overall !== null && (
                          <span className="font-medium text-typography-900">{overall}</span>
                        )}
                        <DeltaChip delta={delta} />
                        {testsLabel(round) && (
                          <span className="text-typography-500">{testsLabel(round)}</span>
                        )}
                        {round && round.proposalsAppliedCount > 0 && (
                          <span className="text-typography-500">
                            {strings.appliedProposals(round.proposalsAppliedCount)}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 text-[11px] italic text-typography-400">{live.leaveHint}</div>
      </div>
    </div>
  );
};
