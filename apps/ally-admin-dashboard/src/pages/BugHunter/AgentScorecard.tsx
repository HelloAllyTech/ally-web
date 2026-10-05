import { FC, useMemo, useState } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHuntRunsSummaryQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BugHuntRunDayPoint } from "@types";

import {
  autoMergeRate,
  formatRate,
  formatTokens,
  formatUsd,
  SPEND_WINDOW_DAYS,
  SpendWindowDays,
  successRate,
  tokensMissing,
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
 * ## The window chips change every figure, because the server does the sum
 *
 * Each chip refetches `GET /runs/summary?days=` and every tile, the token
 * line and the sparkline redraw from that one response. The first version
 * summed the newest-50 run list in the browser instead, and since that list
 * is about a week of five nightly sweeps plus fix sessions, "7 days", "30
 * days" and "All" printed the same total — see `scorecard.ts`.
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
}> = ({ label, tooltip, value, detail }) => (
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
    {detail && <p className="text-[11px] text-typography-500 mt-1">{detail}</p>}
  </div>
);

const SeriesRow: FC<{
  label: string;
  points: BugHuntRunDayPoint[];
  pick: (point: BugHuntRunDayPoint) => number;
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

/** The reader's IANA zone, so the sparkline's days are the days they saw. */
const readerTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export const AgentScorecard: FC = () => {
  const [windowDays, setWindowDays] = useState<SpendWindowDays | null>(30);
  const timeZone = useMemo(readerTimeZone, []);

  const { data, isLoading, isFetching, isError, refetch } = useGetBugHuntRunsSummaryQuery(
    { days: windowDays, timeZone },
    { pollingInterval: 30_000 },
  );

  const window = data?.window;
  const series = data?.series ?? [];

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

      {!window || (windowDays === null && window.runs === 0) ? (
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

          {/* Dimmed, not blanked, while a chip change is in flight: the old
              figures stay legible and the reader sees that they're moving. */}
          <div
            className={`flex flex-wrap gap-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}
            aria-busy={isFetching}
          >
            <ScoreTile
              label={en.bugHunter.scorecardSpendLabel}
              tooltip={en.bugHunter.scorecardSpendTooltip}
              value={formatUsd(window.costUsd)}
              detail={`${window.runs.toLocaleString()} ${window.runs === 1 ? "shift" : "shifts"}`}
            />
            <ScoreTile
              label={en.bugHunter.scorecardFoundLabel}
              tooltip={en.bugHunter.scorecardFoundTooltip}
              value={window.found.toLocaleString()}
            />
            <ScoreTile
              label={en.bugHunter.scorecardAutoMergeLabel}
              tooltip={en.bugHunter.scorecardAutoMergeTooltip}
              value={formatRate(autoMergeRate(window))}
              detail={`${window.autoMerged.toLocaleString()} merged · ${window.prOpened.toLocaleString()} as PRs`}
            />
            <ScoreTile
              label={en.bugHunter.scorecardCleanLabel}
              tooltip={en.bugHunter.scorecardCleanTooltip}
              value={formatRate(successRate(window))}
              detail={`${window.completed.toLocaleString()} clean · ${window.failed.toLocaleString()} red`}
            />
          </div>

          <div className="mt-4 border border-border-light rounded-lg bg-white px-4 py-3">
            <p className="text-xs font-medium text-typography-700 mb-2">
              {en.bugHunter.scorecardSeriesTitle}
            </p>
            {series.every(point => point.runs === 0) ? (
              <p className="text-xs text-typography-500">{en.bugHunter.scorecardSeriesEmpty}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <SeriesRow
                  label={en.bugHunter.scorecardSeriesCost}
                  points={series}
                  pick={point => point.costUsd}
                  format={formatUsd}
                  barClassName="fill-primary-500"
                />
                <SeriesRow
                  label={en.bugHunter.scorecardSeriesFound}
                  points={series}
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
                  .replace("{input}", formatTokens(window.inputTokens))
                  .replace("{output}", formatTokens(window.outputTokens))}
              </span>
            </p>
            {tokensMissing(window) > 0 && (
              <p className="text-[11px] text-typography-500">
                {en.bugHunter.scorecardTokensPartial.replace(
                  "{count}",
                  String(tokensMissing(window)),
                )}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
};
