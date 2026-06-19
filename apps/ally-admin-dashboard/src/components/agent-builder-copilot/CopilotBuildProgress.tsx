import { FC, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { en } from "@constants";

import { Button } from "../button";
import { ButtonVariant } from "../types";
import type { CopilotRun, CopilotRunStatus } from "@api";

interface CopilotBuildProgressProps {
  run: CopilotRun;
  onOpenDraft: () => void;
  onCancel: () => void;
  isCancelling?: boolean;
}

const copy = en.simulation.agentBuilder;

const IN_PROGRESS_STATUSES: CopilotRunStatus[] = [
  "STARTED",
  "GENERATING",
  "EVALUATING",
  "REFINING",
];

const scoreColor = (value: number): string => {
  if (value < 33) return "#FE6F64";
  if (value < 66) return "#FFB74D";
  return "#81C784";
};

const stepLabel = (status: CopilotRunStatus): string | null => {
  switch (status) {
    case "STARTED":
    case "GENERATING":
      return copy.stepGenerating;
    case "EVALUATING":
      return copy.stepEvaluating;
    case "REFINING":
      return copy.stepRefining;
    default:
      return null;
  }
};

export const CopilotBuildProgress: FC<CopilotBuildProgressProps> = ({
  run,
  onOpenDraft,
  onCancel,
  isCancelling = false,
}) => {
  const inProgress = IN_PROGRESS_STATUSES.includes(run.status);
  const succeeded = run.status === "SUCCEEDED";
  const failed = run.status === "FAILED" || run.status === "CANCELLED";

  const history = run.roundHistory ?? [];
  // Default the open round to the latest scored round.
  const [openRound, setOpenRound] = useState<number | null>(null);
  const selectedRound =
    openRound != null
      ? history.find(h => h.round === openRound)
      : history[history.length - 1];

  // Chips: one per round attempted. While a round is mid-flight it has no
  // history entry yet — show it as a pending chip.
  const roundNumbers = Array.from(
    new Set([...history.map(h => h.round), ...(inProgress ? [run.round] : [])]),
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-5">
      {/* Status + current step */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border-light bg-neutral-50 p-4">
        <div className="flex items-center gap-3">
          {inProgress && (
            <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-typography-900">
              {inProgress
                ? copy.building
                : succeeded
                  ? copy.runSucceededTitle
                  : copy.runFailedTitle}
            </span>
            {inProgress && stepLabel(run.status) && (
              <span className="text-xs text-typography-600">
                {copy.roundLabel(run.round)} — {stepLabel(run.status)}
              </span>
            )}
          </div>
        </div>
        {inProgress && (
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={onCancel}
            disabled={isCancelling}
            className="h-[36px] px-3"
          >
            {copy.cancel}
          </Button>
        )}
      </div>

      {/* Round chips */}
      {roundNumbers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {roundNumbers.map(roundNo => {
            const entry = history.find(h => h.round === roundNo);
            const score = entry?.score ?? null;
            const isOpen = (selectedRound?.round ?? null) === roundNo;
            return (
              <button
                key={roundNo}
                type="button"
                onClick={() => entry && setOpenRound(roundNo)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                  isOpen
                    ? "border-primary-300 bg-primary-50 text-typography-900"
                    : "border-border-light bg-white text-typography-700 hover:bg-neutral-100"
                }`}
              >
                <span>{copy.roundLabel(roundNo)}</span>
                {score != null ? (
                  <span
                    className="inline-flex h-5 min-w-[28px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: scoreColor(score) }}
                  >
                    {score}
                  </span>
                ) : (
                  <span className="inline-flex h-5 items-center text-[11px] text-typography-500">
                    …
                  </span>
                )}
              </button>
            );
          })}
          {run.bestScore != null && (
            <span className="ml-1 text-xs text-typography-600">
              {copy.bestScoreLabel}: <strong>{run.bestScore}</strong>
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-typography-500">{copy.noRoundsYet}</span>
      )}

      {/* Terminal result banner */}
      {succeeded && (
        <div className="flex flex-col gap-3 rounded-md border border-success-200 bg-success-50 p-4">
          <span className="text-sm font-medium text-typography-900">
            {copy.scoredSuccess(run.bestScore ?? 0)}
          </span>
          {run.draftScenarioId != null && (
            <div>
              <Button variant={ButtonVariant.PRIMARY} onClick={onOpenDraft} className="h-[40px] px-4">
                {copy.openInBasicSettings}
              </Button>
            </div>
          )}
        </div>
      )}
      {failed && (
        <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <span className="text-sm font-medium text-typography-900">
            {run.status === "CANCELLED"
              ? copy.cancelled
              : (run.errorMessage ?? copy.scoredFailure(run.bestScore ?? 0))}
          </span>
          {run.status !== "CANCELLED" && run.bestScore != null && (
            <span className="text-xs text-typography-600">
              {copy.bestScoreLabel}: {run.bestScore}/100
            </span>
          )}
          {run.draftScenarioId != null && (
            <div>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={onOpenDraft}
                className="h-[40px] px-4"
              >
                {copy.openInBasicSettings}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Selected round's evaluation + recommendations */}
      {selectedRound?.reportMarkdown && (
        <details className="rounded-md border border-border-light bg-white p-4" open>
          <summary className="cursor-pointer select-none text-sm font-medium text-typography-800">
            {copy.recommendationsLabel} — {copy.roundLabel(selectedRound.round)}
            {selectedRound.score != null ? ` (${selectedRound.score}/100)` : ""}
          </summary>
          <div className="prose prose-sm mt-3 max-w-none text-typography-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedRound.reportMarkdown}
            </ReactMarkdown>
          </div>
        </details>
      )}
    </div>
  );
};
