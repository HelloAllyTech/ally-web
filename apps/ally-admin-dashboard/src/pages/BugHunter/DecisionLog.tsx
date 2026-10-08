import { FC } from "react";

import { useGetBugFindingDecisionsQuery, useGetBugHuntRunDecisionsQuery } from "@api";
import { en } from "@constants";
import { BugHuntDecision } from "@types";
import { formatTimestamp } from "@utils";

import {
  DECISION_OWNER_LABELS,
  DECISION_POINT_LABELS,
  decisionApproach,
  decisionVetoLabel,
  formatDecisionPick,
  sortDecisions,
} from "./bugDecisionLabels";

/**
 * The decision log (OPP-0776): every orchestration choice Bug Hunter made
 * about a case or a run — which point, what it picked, who owned the pick,
 * what the other owner would have picked, and why. Read-only; the point of
 * showing both picks is that a reader can see where a rule and a model
 * disagree before the replay has enough cases to say who was right.
 */
export const DecisionLogList: FC<{ decisions: BugHuntDecision[]; emptyText?: string }> = ({
  decisions,
  emptyText,
}) => {
  const t = en.bugHunter.decisions;
  if (!decisions.length) {
    return <p className="text-xs text-typography-500">{emptyText ?? t.empty}</p>;
  }
  return (
    <ul data-testid="decision-log" className="flex flex-col gap-1.5">
      {sortDecisions(decisions).map(d => {
        const veto = decisionVetoLabel(d);
        const approach = decisionApproach(d);
        const disagreed =
          d.shadowPick !== null &&
          d.shadowPick !== undefined &&
          formatDecisionPick(d.shadowPick) !== formatDecisionPick(d.pick);
        return (
          <li
            key={d.id}
            data-testid={`decision-${d.point}`}
            className="text-xs text-typography-800 flex flex-col gap-0.5"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono font-semibold text-typography-900">{d.point}</span>
              <span className="text-typography-600">{DECISION_POINT_LABELS[d.point]}</span>
              <span className="font-mono">{formatDecisionPick(d.pick)}</span>
              <span className="text-typography-600">
                {t.byOwner.replace("{owner}", DECISION_OWNER_LABELS[d.owner])}
              </span>
              {disagreed && d.shadowOwner && (
                <span className="text-amber-700">
                  {t.shadowWouldHave
                    .replace("{owner}", DECISION_OWNER_LABELS[d.shadowOwner])
                    .replace("{pick}", formatDecisionPick(d.shadowPick))}
                </span>
              )}
              {!disagreed && d.shadowPick !== null && d.shadowPick !== undefined && (
                <span className="text-typography-500">{t.shadowAgreed}</span>
              )}
              {veto && <span className="text-red-700">{veto}</span>}
              {d.outcome && (
                <span className="text-typography-500">
                  {d.outcome === "better"
                    ? t.outcomeBetter
                    : d.outcome === "worse"
                      ? t.outcomeWorse
                      : t.outcomeSame}
                </span>
              )}
              <span className="text-typography-500 tabular-nums">
                {formatTimestamp(d.createdAt)}
              </span>
            </div>
            {approach && (
              <p className="text-typography-700">{t.approach.replace("{approach}", approach)}</p>
            )}
            {d.reason && !veto && <p className="text-typography-600">{d.reason}</p>}
          </li>
        );
      })}
    </ul>
  );
};

/** The log for one bug, fetched on its own so the drawer stays one request for everything else. */
export const FindingDecisions: FC<{ findingId: string }> = ({ findingId }) => {
  const { data, isError } = useGetBugFindingDecisionsQuery(findingId);
  if (isError || !data || data.length === 0) return null;
  return (
    <div data-testid="finding-decisions" className="flex flex-col gap-1">
      <span className="text-xs font-medium text-typography-900">
        {en.bugHunter.decisions.title}
      </span>
      <DecisionLogList decisions={data} />
    </div>
  );
};

/** The Finder's D1, D2 and every D3 for a run, under its event timeline. */
export const RunDecisions: FC<{ runId: string }> = ({ runId }) => {
  const { data, isError } = useGetBugHuntRunDecisionsQuery(runId);
  if (isError || !data || data.length === 0) return null;
  return (
    <div data-testid="run-decisions" className="mt-3 flex flex-col gap-1">
      <p className="text-xs font-semibold text-typography-700">{en.bugHunter.decisions.runTitle}</p>
      <DecisionLogList decisions={data} />
    </div>
  );
};
