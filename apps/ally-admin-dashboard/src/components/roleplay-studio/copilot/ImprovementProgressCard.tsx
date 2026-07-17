import React from "react";

import { ArrowDown, ArrowUp } from "@carbon/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ProgressBar, Tag, Tile } from "@ally-ui-mono/ui-shared";
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
    <span title={label}>
      <Tag type={up ? "green" : "red"} size="sm" renderIcon={up ? ArrowUp : ArrowDown}>
        {Math.abs(delta)}
      </Tag>
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
      <Tile className="max-w-[92%] w-full">
        <div className="flex flex-wrap items-center gap-2">
          <Tag type="cool-gray" size="sm">
            {strings.loopLabel}
          </Tag>
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
            <span className="flex items-center gap-2 text-xs text-typography-800">
              <div className="w-28">
                <ProgressBar
                  label={strings.loopLabel}
                  hideLabel
                  size="small"
                  max={100}
                  value={payload.scores.overall}
                  helperText={String(payload.scores.overall)}
                />
              </div>
              <DeltaChip
                delta={payload.deltas?.overallVsPrevious}
                label={strings.vsPreviousRound}
              />
            </span>
          )}
          {tests && (
            <Tag type="cool-gray" size="sm">
              {strings.testsPassing(tests)}
            </Tag>
          )}
          {isTerminal && payload.outcome && (
            <Tag type={payload.subkind === "failed" ? "red" : "green"} size="sm">
              {improvementStrings.outcome[
                payload.outcome as keyof typeof improvementStrings.outcome
              ] ?? payload.outcome}
            </Tag>
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
      </Tile>
    </div>
  );
};
