import React from "react";

import { Checkmark, Idea } from "@carbon/icons-react";

import { Tile } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { CopilotIterationSummaryEvent } from "@src/types/roleplayStudio";

interface IterationSummaryCardProps {
  summary: CopilotIterationSummaryEvent;
}

/**
 * The "summary of updates made" card the copilot shows after refining the spec
 * from a piece of live-test feedback (iteration mode). Restates the feedback,
 * the reasoning for which parts changed, and lists the concrete edits — the
 * individual spec_patch flashes on the right pane are the live progress; this
 * is the recap.
 */
export const IterationSummaryCard: React.FC<IterationSummaryCardProps> = ({ summary }) => {
  const strings = en.roleplayStudio.copilot;

  return (
    <div className="flex justify-start">
      <Tile className="max-w-[92%] min-w-0 rounded-2xl rounded-bl-sm border border-secondary-100">
        <div className="flex items-center gap-2">
          <Idea size={18} className="shrink-0 text-secondary-600" />
          <span className="text-sm font-medium text-typography-900">
            {strings.iterationSummaryTitle}
          </span>
        </div>

        {summary.feedback && (
          <p className="mt-2 text-sm italic text-typography-600">“{summary.feedback}”</p>
        )}

        {summary.reasoning && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-typography-500">
              {strings.iterationSummaryReasoning}
            </p>
            <p className="mt-1 text-sm text-typography-800 whitespace-pre-wrap">
              {summary.reasoning}
            </p>
          </div>
        )}

        {summary.changes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-typography-500">
              {strings.iterationSummaryChanges}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {summary.changes.map((change, index) => (
                <li key={`${summary.id}-change-${index}`} className="flex items-start gap-2">
                  <Checkmark size={16} className="mt-0.5 shrink-0 text-success-600" />
                  <span className="text-sm text-typography-800">
                    {change.area && (
                      <span className="font-medium text-typography-900">{change.area}: </span>
                    )}
                    {change.summary}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.note && <p className="mt-3 text-sm text-typography-600">{summary.note}</p>}
      </Tile>
    </div>
  );
};
