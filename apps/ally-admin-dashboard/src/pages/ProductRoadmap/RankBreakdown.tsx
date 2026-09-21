import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { RoadmapGoalImpactVerdict, RoadmapOpportunity } from "@types";

import { EFFORT_LABEL } from "./utils/stages";

/**
 * The four factors behind an opportunity's rank, phrased the way a reader would say them.
 *
 * This exists because the composite is only worth having if it can be argued with. A single
 * blended number that nobody can take apart is a number people learn to ignore — so the score
 * and its inputs always travel together, on the card and in the drawer alike.
 */
export const rankFactorSummary = (opportunity: RoadmapOpportunity): string[] => {
  const parts = [
    `${opportunity.priorityScore} vote${opportunity.priorityScore === 1 ? "" : "s"}`,
    `${opportunity.voterCount} admin${opportunity.voterCount === 1 ? "" : "s"}`,
    // "Unsized" rather than an omission: it scores at the neutral middle rather than at zero,
    // and a reader comparing two cards needs to know which of them was never estimated.
    opportunity.effort ? EFFORT_LABEL[opportunity.effort] : "Unsized",
  ];
  // Only mentioned once a strategy exists. With no goals defined, coverage contributes nothing
  // and "0/0 goals" would read as a failure rather than as an unasked question.
  if (opportunity.goalsTotal > 0) {
    parts.push(`${opportunity.goalsHelped}/${opportunity.goalsTotal} goals`);
  }
  return parts;
};

interface RankScoreProps {
  opportunity: RoadmapOpportunity;
}

/**
 * The compact card readout: the composite score, with its four inputs in a tooltip.
 *
 * The score is rendered as a NUMBER rather than as a bar or a hue alone — a hue cannot be read
 * by someone who cannot distinguish these hues, and cannot be compared precisely by anyone.
 */
export const RankScore: React.FC<RankScoreProps> = ({ opportunity }) => (
  <Tooltip
    label={`Rank score ${opportunity.compositeScore} — ${rankFactorSummary(opportunity).join(" · ")}`}
  >
    <span className="text-typography-secondary text-xs tabular-nums" tabIndex={0}>
      {opportunity.compositeScore} rank score
    </span>
  </Tooltip>
);

interface RankBreakdownPanelProps {
  opportunity: RoadmapOpportunity;
  verdicts: RoadmapGoalImpactVerdict[] | undefined;
  isLoadingVerdicts: boolean;
  canManage: boolean;
  isReassessing: boolean;
  onReassess: () => void;
}

/**
 * The drawer's full breakdown: every factor spelled out, then the per-goal verdicts.
 *
 * WHY THE VERDICTS ARE READ-ONLY. They are a ranking input, and a ranking input anyone can
 * hand-edit is one people edit to move their own idea up. The correction path is re-running the
 * assessment against the current description, which is what the Reassess button does — so the
 * way to change a verdict is to make the case better, not to overrule the reading.
 *
 * The reason text is shown for every verdict, positive and negative alike, because the negative
 * ones are the ones worth arguing with and hiding them would leave a lower score unexplained.
 */
export const RankBreakdownPanel: React.FC<RankBreakdownPanelProps> = ({
  opportunity,
  verdicts,
  isLoadingVerdicts,
  canManage,
  isReassessing,
  onReassess,
}) => {
  // Assessed against fewer goals than exist means the strategy grew after this was judged.
  // Coverage divides by the LIVE count either way, so this row is scoring low for a reason that
  // has nothing to do with its merit — which is worth saying rather than leaving to be noticed.
  const isStale = opportunity.goalsTotal > 0 && opportunity.goalsAssessed < opportunity.goalsTotal;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-typography-primary text-lg tabular-nums">
          {opportunity.compositeScore}
        </span>
        <span className="text-typography-secondary text-xs">rank score, out of 100</span>
      </div>

      <ul className="text-typography-secondary flex flex-col gap-1 text-xs">
        <li className="flex justify-between gap-2">
          <span>Votes</span>
          <span className="tabular-nums">{opportunity.priorityScore}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Admins backing it</span>
          <span className="tabular-nums">{opportunity.voterCount}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Effort</span>
          <span>{opportunity.effort ? EFFORT_LABEL[opportunity.effort] : "Not sized"}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Strategy goals advanced</span>
          <span className="tabular-nums">
            {opportunity.goalsTotal > 0
              ? `${opportunity.goalsHelped} of ${opportunity.goalsTotal}`
              : "No strategy set"}
          </span>
        </li>
      </ul>

      {isStale && (
        <p className="text-typography-secondary text-xs">
          Judged against {opportunity.goalsAssessed} of {opportunity.goalsTotal} goals — the
          strategy changed since. Reassess for an accurate score.
        </p>
      )}

      {opportunity.goalsTotal > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-typography-primary text-sm">Strategy goal assessment</h4>
            {canManage && (
              <button
                type="button"
                onClick={onReassess}
                disabled={isReassessing}
                className="text-typography-secondary hover:text-typography-primary cursor-pointer text-xs underline disabled:cursor-not-allowed"
              >
                {isReassessing ? "Reassessing…" : "Reassess"}
              </button>
            )}
          </div>

          {isLoadingVerdicts ? (
            <p className="text-typography-secondary text-xs">Loading…</p>
          ) : !verdicts?.length ? (
            <p className="text-typography-secondary text-xs">
              Not assessed yet. It ranks with no goal coverage until it is.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {verdicts.map(verdict => (
                <li key={verdict.goalName} className="flex gap-2 text-xs">
                  {/* A word, not a colour or a glyph alone — the verdict is the whole point of
                      the row and must survive both a monochrome render and a screen reader. */}
                  <span
                    className={
                      verdict.helped
                        ? "text-typography-primary shrink-0"
                        : "text-typography-secondary shrink-0"
                    }
                  >
                    {verdict.helped ? "Advances" : "No effect"}
                  </span>
                  <span className="text-typography-primary grow">
                    {verdict.goalName}
                    {verdict.reason && (
                      <span className="text-typography-secondary block">{verdict.reason}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
