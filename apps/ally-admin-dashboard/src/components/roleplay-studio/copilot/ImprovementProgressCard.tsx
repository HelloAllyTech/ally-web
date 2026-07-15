import React from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { en } from "@constants";
import { CopilotImprovementUpdatePayload } from "@src/types/roleplayStudio";

import { roleplayMarkdownComponents } from "../markdownComponents";

const DeltaChip: React.FC<{ delta: number | null | undefined; label: string }> = ({
  delta,
  label,
}) => {
  if (delta === null || delta === undefined || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`text-xs font-medium ${up ? "text-success-500" : "text-destructive-500"}`}
      title={label}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
};

const testsLabel = (testCounts: Record<string, number> | null | undefined): string | null => {
  if (!testCounts) return null;
  const total =
    (testCounts.passed ?? 0) + (testCounts.failed ?? 0) + (testCounts.inconclusive ?? 0);
  return total > 0 ? `${testCounts.passed ?? 0}/${total}` : null;
};

interface ImprovementProgressCardProps {
  content: string;
  payload: CopilotImprovementUpdatePayload;
}

/**
 * One auto-improve narration row in the chat feed: the markdown message the
 * loop posted, headed by a compact status strip (round chip, score + delta
 * chips, tests passed, outcome). Trajectory rows on `finished` render as a
 * small per-round list.
 */
export const ImprovementProgressCard: React.FC<ImprovementProgressCardProps> = ({
  content,
  payload,
}) => {
  const strings = en.roleplayStudio.copilot.improvement;
  const improvementStrings = en.roleplayStudio.improvement;
  const isTerminal = payload.subkind === "finished" || payload.subkind === "failed";
  const tests = testsLabel(payload.scores?.testCounts);

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[92%] w-full rounded-xl border px-4 py-3 ${
          payload.subkind === "failed"
            ? "border-destructive-200 bg-destructive-50/30"
            : "border-secondary-200 bg-secondary-50/30"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-typography-800 border border-border-light">
            {strings.loopLabel}
          </span>
          {payload.roundNumber !== undefined && (
            <span className="text-xs text-typography-600">
              {improvementStrings.round} {payload.roundNumber}
              {payload.roundKind
                ? ` · ${
                    improvementStrings.kind[
                      payload.roundKind as keyof typeof improvementStrings.kind
                    ] ?? payload.roundKind
                  }`
                : ""}
            </span>
          )}
          {payload.scores?.overall !== null && payload.scores?.overall !== undefined && (
            <span className="flex items-center gap-1 text-xs text-typography-800">
              <span className="font-semibold">{payload.scores.overall}</span>
              <DeltaChip
                delta={payload.deltas?.overallVsPrevious}
                label={strings.vsPreviousRound}
              />
            </span>
          )}
          {tests && (
            <span className="text-xs text-typography-600">{strings.testsPassing(tests)}</span>
          )}
          {isTerminal && payload.outcome && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
              {improvementStrings.outcome[
                payload.outcome as keyof typeof improvementStrings.outcome
              ] ?? payload.outcome}
            </span>
          )}
        </div>

        <div className="mt-2 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {payload.subkind === "finished" && (payload.trajectory?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-col gap-1 border-t border-border-light pt-2">
            {payload.trajectory?.map(entry => (
              <div
                key={`${payload.improvementRunId}-r${entry.roundNumber}`}
                className="flex items-center gap-2 text-xs text-typography-700"
              >
                <span className="w-24 shrink-0">
                  {improvementStrings.round} {entry.roundNumber}
                </span>
                <span className="font-medium text-typography-900">{entry.overall ?? "—"}</span>
                {testsLabel(entry.testCounts) && (
                  <span>{strings.testsPassing(testsLabel(entry.testCounts)!)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
