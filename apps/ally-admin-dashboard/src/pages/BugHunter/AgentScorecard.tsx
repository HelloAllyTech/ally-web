import { FC, useMemo, useState } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHuntRunsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BugHuntRun } from "@types";

import {
  buildAgentScorecard,
  formatRate,
  formatTokens,
  formatUsd,
  SeriesPoint,
  SPEND_WINDOW_DAYS,
  SpendWindow,
  SpendWindowDays,
} from "./scorecard";
import { Sparkbars, SparkbarDatum } from "./Sparkbars";

/**
 * Bug Hunter's scorecard: what it has cost, what it has turned up, and how
 * often its shifts finish clean.
 *
 * ## Which reader this is for
 *
 * Everything above it on the tab serves a *reviewer* — someone working a queue,
 * deciding bug by bug. This serves a *governor*: the person who decides whether
 * an agent that merges its own code overnight should keep doing that. Stacks'
 * *Interface patterns for evolving human roles in agent systems* separates those
 * two readers explicitly and says the second one needs system-wide
 * observability, which this tab did not have. Spend existed only as a
 * four-decimal per-row column in the shift log; nothing anywhere added it up.
 *
 * ## Why it sits below the bugs table
 *
 * The page is ordered by whose move it is, and this is nobody's move — it is
 * the question you come to deliberately, roughly monthly, not the thing you act
 * on at 9am. Putting it at the top would have pushed the first actionable bug
 * below the fold, which is the exact regression the previous redesign of this
 * tab existed to fix. So it goes directly above the shift log, whose raw
 * per-run rows are what these figures aggregate — the analytical view next to
 * the ledger it summarises.
 *
 * ## Every figure states its own denominator
 *
 * The run window is the newest 50, so a 30-day total can be a floor rather than
 * a total. `SpendWindow.complete` carries that fact and the tile prints it
 * instead of a confident number. See `scorecard.ts` for why that matters
 * more here than anywhere else on the page: an under-reported spend figure
 * reads as reassuring precisely when the agent has been busiest.
 */

/** Chip labels for the spend window. Read in a function — never a module-scope Record off `@constants`. */
const spendWindowLabel = (days: SpendWindowDays | null): string => {
  if (days === 7) return en.bugHunter.scorecardSpendWindow7;
  if (days === 30) return en.bugHunter.scorecardSpendWindow30;
  return en.bugHunter.scorecardSpendWindowAll;
};

/** "18 Aug" — short enough for a native tooltip, unambiguous without a year. */
const formatSeriesDate = (isoDay: string): string => {
  const [year, month, day] = isoDay.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : isoDay;
};

const ScoreTile: FC<{
  label: string;
  tooltip: string;
  value: string;
  /** The smaller line under the number — the count behind a rate, or the shifts behind a total. */
  detail?: string;
  /** Stated instead of `detail` when the figure is known to be incomplete. */
  floorNotice?: string;
}> = ({ label, tooltip, value, detail, floorNotice }) => (
  <div className="flex-1 min-w-[10rem] border border-border-light rounded-lg bg-white px-4 py-3">
    <div className="flex items-center gap-1">
      <span className="text-xs text-typography-600">{label}</span>
      <Tooltip label={tooltip} align="top">
        <button type="button" className="cursor-pointer inline-flex items-center">
          <TooltipIcon />
        </button>
      </Tooltip>
    </div>
    <p className="text-2xl text-typography-900 font-secondary tabular-nums mt-0.5">{value}</p>
    {floorNotice ? (
      // Amber rather than grey: this is not a footnote, it is the difference
      // between a total and a lower bound, and a reader who skims it draws the
      // wrong conclusion from the number directly above it.
      <p className="text-[11px] text-amber-700 mt-1 leading-snug">{floorNotice}</p>
    ) : (
      detail && <p className="text-[11px] text-typography-500 mt-1">{detail}</p>
    )}
  </div>
);

const SeriesRow: FC<{
  label: string;
  points: SeriesPoint[];
  pick: (point: SeriesPoint) => number;
  format: (value: number) => string;
  barClassName: string;
}> = ({ label, points, pick, format, barClassName }) => {
  const data: SparkbarDatum[] = points.map(point => {
    const date = formatSeriesDate(point.date);
    return {
      value: pick(point),
      tooltip:
        point.runs === 0
          ? en.bugHunter.scorecardSeriesDayQuiet.replace("{date}", date)
          : en.bugHunter.scorecardSeriesDay
              .replace("{date}", date)
              .replace("{cost}", formatUsd(point.costUsd))
              .replace("{found}", String(point.found))
              .replace("{runs}", String(point.runs)),
    };
  });

  const total = points.reduce((sum, point) => sum + pick(point), 0);

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[11px] text-typography-600">{label}</span>
      <div className="flex-1 min-w-0">
        <Sparkbars
          data={data}
          barClassName={barClassName}
          // The shape is the point, and a screen reader cannot see a shape — so
          // the label carries the total and the span instead of fourteen values.
          ariaLabel={`${label}: ${format(total)} over ${points.length} days`}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] text-typography-700 tabular-nums">
        {format(total)}
      </span>
    </div>
  );
};

export const AgentScorecard: FC = () => {
  // Same args as AgentProfileCard's and RunHistoryTable's, so this shares their
  // RTK Query cache entry rather than opening a third request for the same rows.
  const { data, isLoading, isError, refetch } = useGetBugHuntRunsQuery(undefined, {
    pollingInterval: 10_000,
  });

  const [windowDays, setWindowDays] = useState<SpendWindowDays | null>(30);

  const runs = useMemo<BugHuntRun[]>(() => data?.items ?? [], [data]);
  const scorecard = useMemo(() => buildAgentScorecard({ runs }), [runs]);

  const spend: SpendWindow =
    scorecard.spend.find(entry => entry.days === windowDays) ?? scorecard.spend[0];

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 min-w-[10rem] h-[5.5rem] rounded-lg bg-neutral-100 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-destructive-600 text-sm">{en.bugHunter.scorecardLoadFailed}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-primary-600 underline"
        >
          {en.bugHunter.retry}
        </button>
      </div>
    );
  }

  return (
    <section aria-labelledby="bug-hunter-scorecard-heading">
      <div className="mb-3">
        <h2 id="bug-hunter-scorecard-heading" className="text-sm font-semibold text-typography-900">
          {en.bugHunter.scorecardTitle}
        </h2>
        <p className="text-xs text-typography-600">{en.bugHunter.scorecardSubtitle}</p>
      </div>

      {runs.length === 0 ? (
        <div className="border border-border-light rounded-lg py-8 text-center">
          <p className="text-sm font-medium text-typography-900">
            {en.bugHunter.scorecardEmptyTitle}
          </p>
          <p className="text-xs text-typography-600 mt-1">{en.bugHunter.scorecardEmptySubtitle}</p>
        </div>
      ) : (
        <>
          {/* Chips rather than a ContentSwitcher, for the reason recorded on the
              working-style switcher: Carbon divides a switcher's width evenly
              across its segments and clips every label that doesn't fit the
              narrowest one. Three short labels would probably survive it; a row
              of chips definitely does. */}
          <div
            className="flex flex-wrap items-center gap-2 mb-3"
            role="group"
            aria-label={en.bugHunter.scorecardSpendLabel}
          >
            {[...SPEND_WINDOW_DAYS, null].map(days => {
              const isSelected = days === windowDays;
              return (
                <button
                  key={days ?? "all"}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setWindowDays(days)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors hover:bg-neutral-50 ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500 ring-offset-1"
                      : "border-border-light bg-white text-typography-800"
                  }`}
                >
                  {spendWindowLabel(days)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <ScoreTile
              label={en.bugHunter.scorecardSpendLabel}
              tooltip={en.bugHunter.scorecardSpendTooltip}
              value={formatUsd(spend.costUsd)}
              detail={`${spend.runs} ${spend.runs === 1 ? "shift" : "shifts"}`}
              floorNotice={
                spend.complete
                  ? undefined
                  : en.bugHunter.scorecardSpendFloor.replace("{runs}", String(runs.length))
              }
            />
            <ScoreTile
              label={en.bugHunter.scorecardFoundLabel}
              tooltip={en.bugHunter.scorecardFoundTooltip}
              value={scorecard.pipeline.found.toLocaleString()}
            />
            <ScoreTile
              label={en.bugHunter.scorecardAutoMergeLabel}
              tooltip={en.bugHunter.scorecardAutoMergeTooltip}
              value={formatRate(scorecard.pipeline.autoMergeRate)}
              detail={`${scorecard.pipeline.autoMerged.toLocaleString()} merged · ${scorecard.pipeline.prOpened.toLocaleString()} as PRs`}
            />
            <ScoreTile
              label={en.bugHunter.scorecardCleanLabel}
              tooltip={en.bugHunter.scorecardCleanTooltip}
              value={formatRate(scorecard.runs.successRate)}
              detail={`${scorecard.runs.completed} clean · ${scorecard.runs.failed} red`}
            />
          </div>

          <div className="mt-4 border border-border-light rounded-lg bg-white px-4 py-3">
            <p className="text-xs font-medium text-typography-700 mb-2">
              {en.bugHunter.scorecardSeriesTitle}
            </p>
            {scorecard.series.every(point => point.runs === 0) ? (
              <p className="text-xs text-typography-500">{en.bugHunter.scorecardSeriesEmpty}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <SeriesRow
                  label={en.bugHunter.scorecardSeriesCost}
                  points={scorecard.series}
                  pick={point => point.costUsd}
                  format={formatUsd}
                  barClassName="fill-primary-500"
                />
                <SeriesRow
                  label={en.bugHunter.scorecardSeriesFound}
                  points={scorecard.series}
                  pick={point => point.found}
                  format={value => value.toLocaleString()}
                  barClassName="fill-amber-500"
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-xs text-typography-600">
              {en.bugHunter.scorecardTokensLabel}:{" "}
              <span className="tabular-nums text-typography-800">
                {en.bugHunter.scorecardTokensValue
                  .replace("{input}", formatTokens(scorecard.tokens.input))
                  .replace("{output}", formatTokens(scorecard.tokens.output))}
              </span>
            </p>
            {scorecard.tokens.missing > 0 && (
              <p className="text-[11px] text-typography-500">
                {en.bugHunter.scorecardTokensPartial.replace(
                  "{count}",
                  String(scorecard.tokens.missing),
                )}
              </p>
            )}
          </div>

          {/* Only when the server actually capped us. On a young install that
              holds every run it has ever made, saying "from my 12 most recent
              shifts" would imply a limit that isn't biting. */}
          {scorecard.runWindowTruncated && (
            <p className="text-xs text-typography-500 mt-1">
              {en.bugHunter.scorecardWindowNotice.replace("{count}", String(runs.length))}
            </p>
          )}
        </>
      )}
    </section>
  );
};
