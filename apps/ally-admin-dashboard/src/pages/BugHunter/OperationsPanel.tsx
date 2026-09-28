import { FC, ReactNode, useState } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHunterOperationsMetricsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import {
  BugFindingSource,
  BugHuntTrigger,
  BugHunterDifficulty,
  BugHunterOperationsMetrics,
  BugHunterReporter,
} from "@types";

import { BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import {
  CATEGORICAL,
  DIFFICULTY_COLORS,
  DIFFICULTY_ORDER,
  OUTCOME_COLORS,
  REPORTER_ORDER,
  SOURCE_COLORS,
  SOURCE_ORDER,
  TRIGGER_COLORS,
  TRIGGER_ORDER,
} from "./chartPalette";
import { formatDay, HorizontalBars, StackedColumns } from "./OperationsCharts";
import { formatRate, formatTokens, formatUsd } from "./scorecard";

/** The windows offered — the same two the accuracy panel beside this one offers. */
const WINDOWS = [30, 90] as const;
type Window = (typeof WINDOWS)[number];

const TRIGGER_LABELS: Record<BugHuntTrigger, string> = {
  [BugHuntTrigger.SCHEDULED]: en.bugHunter.triggerScheduled,
  [BugHuntTrigger.MANUAL]: en.bugHunter.triggerManual,
  [BugHuntTrigger.FIX_SESSION]: en.bugHunter.triggerFixSession,
};

const DIFFICULTY_LABELS: Record<BugHunterDifficulty, string> = {
  easy: en.bugHunter.operationsDifficultyEasy,
  hard: en.bugHunter.operationsDifficultyHard,
  reported: en.bugHunter.operationsDifficultyReported,
};

const REPORTER_LABELS: Record<BugHunterReporter, string> = {
  agent: en.bugHunter.operationsReporterAgent,
  staff: en.bugHunter.operationsReporterStaff,
  consumer: en.bugHunter.operationsReporterConsumer,
};

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template,
  );

const ChartHeading: FC<{ title: string; tooltip: string }> = ({ title, tooltip }) => (
  <div className="flex items-center gap-1 mb-2">
    <p className="text-xs font-medium text-typography-700">{title}</p>
    <Tooltip label={tooltip} align="top">
      <button type="button" className="cursor-pointer inline-flex items-center">
        <TooltipIcon />
      </button>
    </Tooltip>
  </div>
);

const Card: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="border border-border-light rounded-lg bg-white px-4 py-3">{children}</div>
);

/**
 * What Bug Hunter turns up, day by day — the volume view.
 *
 * ## Why this is a third panel and not more tiles on the other two
 *
 * The scorecard says what the agent cost; the accuracy panel says whether it
 * was right. Both are window totals, and neither can answer the questions an
 * operator actually asks on a Monday: did last night's sweep file anything,
 * which finder is producing the noise, is the token bill creeping, and who is
 * reporting bugs — us or the users. Those are day-shaped and source-shaped
 * questions, so they get day-shaped and source-shaped charts.
 *
 * ## The rule every chart here follows
 *
 * A volume figure is never drawn alone. "12 bugs filed" is coloured by where
 * those twelve stand today, the source table carries an accepted share, the
 * reporter bars say how many of each were accepted. Without that, the panel
 * would reward the noisiest finder exactly as much as the best one, and an
 * operator reading it would tune the agent in the wrong direction.
 *
 * ## What it deliberately does not draw
 *
 * Tokens spent on FINDING versus FIXING. In Works-solo mode one sweep does
 * both, and the runner reports one usage figure for the run, so any such
 * split would be invented. The honest cut is by trigger, and the tooltip says
 * so.
 */
export const OperationsPanel: FC = () => {
  const [windowDays, setWindowDays] = useState<Window>(30);
  const { data, isLoading, isError, refetch } = useGetBugHunterOperationsMetricsQuery({
    days: windowDays,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 mt-6" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-lg bg-neutral-100 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-3 mt-6">
        <p className="text-destructive-600 text-sm">{en.bugHunter.operationsLoadFailed}</p>
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

  const days = data.days.map(day => day.date);
  const isEmpty = data.totals.filed === 0 && data.totals.runs === 0;

  return (
    <section aria-labelledby="bug-hunter-operations-heading" className="mt-6">
      <div className="mb-3">
        <h2
          id="bug-hunter-operations-heading"
          className="text-sm font-semibold text-typography-900"
        >
          {en.bugHunter.operationsTitle}
        </h2>
        <p className="text-xs text-typography-600">{en.bugHunter.operationsSubtitle}</p>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 mb-3"
        role="group"
        aria-label={en.bugHunter.operationsTitle}
      >
        {WINDOWS.map(candidate => {
          const isSelected = candidate === windowDays;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setWindowDays(candidate)}
              className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors hover:bg-neutral-50 ${
                isSelected
                  ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500 ring-offset-1"
                  : "border-border-light bg-white text-typography-800"
              }`}
            >
              {candidate === 30 ? en.bugHunter.accuracyWindow30 : en.bugHunter.accuracyWindow90}
            </button>
          );
        })}
      </div>

      {isEmpty ? (
        <div className="border border-border-light rounded-lg py-8 text-center">
          <p className="text-sm font-medium text-typography-900">
            {en.bugHunter.operationsEmptyTitle}
          </p>
          <p className="text-xs text-typography-600 mt-1">{en.bugHunter.operationsEmptySubtitle}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FiledByDay data={data} days={days} />
          <BySource data={data} days={days} />
          <ByDifficulty data={data} days={days} />
          <ByReporter data={data} />
          <TokensByDay data={data} days={days} />
          <Breadth data={data} days={days} />
          <TokensByModel data={data} />
          <p className="text-[11px] text-typography-500">{en.bugHunter.operationsDayNote}</p>
        </div>
      )}
    </section>
  );
};

const FiledByDay: FC<{ data: BugHunterOperationsMetrics; days: string[] }> = ({ data, days }) => {
  const judged = data.totals.accepted + data.totals.declined;
  return (
    <Card>
      <ChartHeading
        title={en.bugHunter.operationsFiledTitle}
        tooltip={en.bugHunter.operationsFiledTooltip}
      />
      <StackedColumns
        days={days}
        series={[
          {
            key: "accepted",
            label: en.bugHunter.operationsFiledLegendAccepted,
            color: OUTCOME_COLORS.accepted,
            values: data.days.map(day => day.accepted),
          },
          {
            key: "declined",
            label: en.bugHunter.operationsFiledLegendDeclined,
            color: OUTCOME_COLORS.declined,
            values: data.days.map(day => day.declined),
          },
          {
            key: "undecided",
            label: en.bugHunter.operationsFiledLegendUndecided,
            color: OUTCOME_COLORS.undecided,
            values: data.days.map(day => day.undecided),
          },
        ]}
        ariaLabel={`${en.bugHunter.operationsFiledTitle}: ${data.totals.filed} over ${data.windowDays} days`}
        tooltipFor={index =>
          fill(en.bugHunter.operationsFiledDay, {
            date: formatDay(days[index]),
            filed: data.days[index].filed,
            accepted: data.days[index].accepted,
            declined: data.days[index].declined,
            undecided: data.days[index].undecided,
          })
        }
      />
      <p className="text-[11px] text-typography-600 mt-2">
        {judged === 0
          ? en.bugHunter.operationsAcceptedShareNone
          : fill(en.bugHunter.operationsAcceptedShare, {
              share: formatRate(data.totals.accepted / judged),
            })}
      </p>
    </Card>
  );
};

const BySource: FC<{ data: BugHunterOperationsMetrics; days: string[] }> = ({ data, days }) => {
  // Only sources that filed something in the window get a series — but each
  // keeps its fixed slot colour, so narrowing the window never repaints one.
  const present = new Set(data.bySource.map(row => row.source));
  const sources = SOURCE_ORDER.filter(source => present.has(source));
  return (
    <Card>
      <ChartHeading
        title={en.bugHunter.operationsBySourceTitle}
        tooltip={en.bugHunter.operationsBySourceTooltip}
      />
      <StackedColumns
        days={days}
        series={sources.map(source => ({
          key: source,
          label: BUG_FINDING_SOURCE_LABELS[source],
          color: SOURCE_COLORS[source],
          values: data.days.map(day => day.bySource[source] ?? 0),
        }))}
        ariaLabel={`${en.bugHunter.operationsBySourceTitle}: ${sources.length} sources over ${data.windowDays} days`}
        tooltipFor={index => {
          const day = data.days[index];
          const parts = sources
            .filter(source => (day.bySource[source] ?? 0) > 0)
            .map(source =>
              fill(en.bugHunter.operationsBySourceDay, {
                count: day.bySource[source] ?? 0,
                source: BUG_FINDING_SOURCE_LABELS[source],
              }),
            );
          return `${formatDay(day.date)} — ${parts.length ? parts.join(", ") : "0"}`;
        }}
      />
      <SourceTable rows={data.bySource} />
    </Card>
  );
};

const SourceTable: FC<{ rows: BugHunterOperationsMetrics["bySource"] }> = ({ rows }) => (
  <div className="overflow-x-auto mt-3">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border-light text-typography-600">
          <th className="text-left font-medium px-2 py-1.5">{en.bugHunter.operationsColSource}</th>
          <th className="text-right font-medium px-2 py-1.5">{en.bugHunter.operationsColFiled}</th>
          <th className="text-right font-medium px-2 py-1.5">
            {en.bugHunter.operationsColAccepted}
          </th>
          <th className="text-right font-medium px-2 py-1.5">
            {en.bugHunter.operationsColDeclined}
          </th>
          <th className="text-right font-medium px-2 py-1.5">
            {en.bugHunter.operationsColUndecided}
          </th>
          <th className="text-right font-medium px-2 py-1.5">
            {en.bugHunter.operationsColAcceptedShare}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const judged = row.accepted + row.declined;
          const source = row.source as BugFindingSource;
          return (
            <tr key={row.source} className="border-b border-border-light last:border-0">
              <td className="px-2 py-1.5 text-typography-900">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: SOURCE_COLORS[source] }}
                  />
                  {BUG_FINDING_SOURCE_LABELS[source] ?? row.source}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.filed}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.accepted}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.declined}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.undecided}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {/* A dash, never 0%, for a source nobody has ruled on. */}
                {judged === 0 ? (
                  <span className="text-typography-500">—</span>
                ) : (
                  formatRate(row.accepted / judged)
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const ByDifficulty: FC<{ data: BugHunterOperationsMetrics; days: string[] }> = ({ data, days }) => (
  <Card>
    <ChartHeading
      title={en.bugHunter.operationsByDifficultyTitle}
      tooltip={en.bugHunter.operationsByDifficultyTooltip}
    />
    <StackedColumns
      days={days}
      series={DIFFICULTY_ORDER.map(difficulty => ({
        key: difficulty,
        label: DIFFICULTY_LABELS[difficulty],
        color: DIFFICULTY_COLORS[difficulty],
        values: data.days.map(day => day.byDifficulty[difficulty]?.filed ?? 0),
      }))}
      ariaLabel={`${en.bugHunter.operationsByDifficultyTitle}: ${data.totals.filed} over ${data.windowDays} days`}
      tooltipFor={index => {
        const day = data.days[index];
        return fill(en.bugHunter.operationsDifficultyDay, {
          date: formatDay(day.date),
          easy: day.byDifficulty.easy?.filed ?? 0,
          hard: day.byDifficulty.hard?.filed ?? 0,
          reported: day.byDifficulty.reported?.filed ?? 0,
        });
      }}
    />
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-light text-typography-600">
            <th className="text-left font-medium px-2 py-1.5">
              {en.bugHunter.operationsColDifficulty}
            </th>
            <th className="text-right font-medium px-2 py-1.5">
              {en.bugHunter.operationsColFiled}
            </th>
            <th className="text-right font-medium px-2 py-1.5">
              {en.bugHunter.operationsColAccepted}
            </th>
            <th className="text-right font-medium px-2 py-1.5">
              {en.bugHunter.operationsColDeclined}
            </th>
            <th className="text-right font-medium px-2 py-1.5">
              {en.bugHunter.operationsColUndecided}
            </th>
            <th className="text-right font-medium px-2 py-1.5">
              {en.bugHunter.operationsColAcceptedShare}
            </th>
          </tr>
        </thead>
        <tbody>
          {DIFFICULTY_ORDER.map(difficulty => {
            const row = data.byDifficulty.find(entry => entry.difficulty === difficulty);
            const judged = (row?.accepted ?? 0) + (row?.declined ?? 0);
            return (
              <tr key={difficulty} className="border-b border-border-light last:border-0">
                <td className="px-2 py-1.5 text-typography-900">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: DIFFICULTY_COLORS[difficulty] }}
                    />
                    {DIFFICULTY_LABELS[difficulty]}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row?.filed ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row?.accepted ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row?.declined ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{row?.undecided ?? 0}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {judged === 0 ? (
                    <span className="text-typography-500">—</span>
                  ) : (
                    formatRate((row?.accepted ?? 0) / judged)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Card>
);

const Breadth: FC<{ data: BugHunterOperationsMetrics; days: string[] }> = ({ data, days }) => {
  const sweepRunsOn = (index: number): number => {
    const day = data.days[index];
    return (
      (day.tokens[BugHuntTrigger.SCHEDULED]?.runs ?? 0) +
      (day.tokens[BugHuntTrigger.MANUAL]?.runs ?? 0)
    );
  };
  // Tokens per line of code shown, over the days where both are known. A
  // sweep that reads more and spends proportionally more is covering ground;
  // one that spends more over the same lines is thinking harder — or looping.
  const measured = data.days.filter(day => day.breadth && day.breadth.linesInScope > 0);
  const measuredTokens = measured.reduce((sum, day) => {
    const sweep = day.tokens[BugHuntTrigger.SCHEDULED];
    const manual = day.tokens[BugHuntTrigger.MANUAL];
    return (
      sum +
      (sweep?.inputTokens ?? 0) +
      (sweep?.outputTokens ?? 0) +
      (manual?.inputTokens ?? 0) +
      (manual?.outputTokens ?? 0)
    );
  }, 0);
  const measuredLines = measured.reduce((sum, day) => sum + (day.breadth?.linesInScope ?? 0), 0);

  return (
    <Card>
      <ChartHeading
        title={en.bugHunter.operationsBreadthTitle}
        tooltip={en.bugHunter.operationsBreadthTooltip}
      />
      {data.breadth == null ? (
        <p className="text-xs text-typography-600">{en.bugHunter.operationsBreadthNone}</p>
      ) : (
        <>
          <StackedColumns
            days={days}
            formatValue={formatTokens}
            totalLabel={en.bugHunter.operationsColLines}
            series={[
              {
                key: "lines",
                label: en.bugHunter.operationsColLines,
                color: CATEGORICAL.blue,
                values: data.days.map(day => day.breadth?.linesInScope ?? 0),
              },
            ]}
            ariaLabel={`${en.bugHunter.operationsBreadthTitle}: ${formatTokens(data.breadth.linesInScope)} lines over ${data.windowDays} days`}
            tooltipFor={index => {
              const day = data.days[index];
              const date = formatDay(day.date);
              if (day.breadth) {
                return fill(en.bugHunter.operationsBreadthDay, {
                  date,
                  lines: day.breadth.linesInScope.toLocaleString(),
                  files: day.breadth.filesInScope.toLocaleString(),
                  commits: day.breadth.commits,
                  runs: day.breadth.runs,
                  deep:
                    day.breadth.deepRuns > 0
                      ? fill(en.bugHunter.operationsBreadthDeep, { deep: day.breadth.deepRuns })
                      : "",
                });
              }
              // A day with sweeps and no breadth predates the recording, or
              // the sweep died before Discover finished. Either way: not
              // recorded, never zero.
              return sweepRunsOn(index) > 0
                ? fill(en.bugHunter.operationsBreadthNotRecorded, { date })
                : fill(en.bugHunter.operationsBreadthNoSweep, { date });
            }}
          />
          <p className="text-[11px] text-typography-600 mt-2">
            {fill(en.bugHunter.operationsBreadthTotal, {
              lines: data.breadth.linesInScope.toLocaleString(),
              runs: data.breadth.runs,
              ratio: measuredLines === 0 ? "—" : Math.round(measuredTokens / measuredLines),
            })}
          </p>
        </>
      )}
    </Card>
  );
};

const ByReporter: FC<{ data: BugHunterOperationsMetrics }> = ({ data }) => (
  <Card>
    <ChartHeading
      title={en.bugHunter.operationsByReporterTitle}
      tooltip={en.bugHunter.operationsByReporterTooltip}
    />
    <HorizontalBars
      color={CATEGORICAL.blue}
      ariaLabel={en.bugHunter.operationsByReporterTitle}
      rows={REPORTER_ORDER.map(reporter => {
        const row = data.byReporter.find(entry => entry.reporter === reporter);
        return {
          key: reporter,
          label: REPORTER_LABELS[reporter],
          value: row?.filed ?? 0,
          detail: fill(en.bugHunter.operationsReporterDetail, {
            accepted: row?.accepted ?? 0,
            declined: row?.declined ?? 0,
          }),
        };
      })}
    />
  </Card>
);

const TokensByDay: FC<{ data: BugHunterOperationsMetrics; days: string[] }> = ({ data, days }) => {
  const total = data.totals.inputTokens + data.totals.outputTokens;
  return (
    <Card>
      <ChartHeading
        title={en.bugHunter.operationsTokensTitle}
        tooltip={en.bugHunter.operationsTokensTooltip}
      />
      <StackedColumns
        days={days}
        formatValue={formatTokens}
        totalLabel={en.bugHunter.operationsColTokens}
        series={TRIGGER_ORDER.map(trigger => ({
          key: trigger,
          label: TRIGGER_LABELS[trigger],
          color: TRIGGER_COLORS[trigger],
          values: data.days.map(day => {
            const cell = day.tokens[trigger];
            return cell ? cell.inputTokens + cell.outputTokens : 0;
          }),
        }))}
        ariaLabel={`${en.bugHunter.operationsTokensTitle}: ${formatTokens(total)} over ${data.windowDays} days`}
        tooltipFor={index => {
          const day = data.days[index];
          const lines = TRIGGER_ORDER.filter(trigger => (day.tokens[trigger]?.runs ?? 0) > 0).map(
            trigger => {
              const cell = day.tokens[trigger];
              return fill(en.bugHunter.operationsTokensDay, {
                date: formatDay(day.date),
                tokens: formatTokens(cell.inputTokens + cell.outputTokens),
                input: formatTokens(cell.inputTokens),
                output: formatTokens(cell.outputTokens),
                runs: cell.runs,
                trigger: TRIGGER_LABELS[trigger].toLowerCase(),
              });
            },
          );
          return lines.length ? lines.join("\n") : `${formatDay(day.date)} — 0`;
        }}
      />
      <p className="text-[11px] text-typography-600 mt-2">
        {fill(en.bugHunter.operationsTokensTotal, {
          tokens: formatTokens(total),
          cost: formatUsd(data.totals.costUsd),
          runs: data.totals.runs,
        })}
      </p>
    </Card>
  );
};

const TokensByModel: FC<{ data: BugHunterOperationsMetrics }> = ({ data }) => (
  <Card>
    <ChartHeading
      title={en.bugHunter.operationsByModelTitle}
      tooltip={en.bugHunter.operationsByModelTooltip}
    />
    {data.tokensByModel.length === 0 ? (
      <p className="text-xs text-typography-600">{en.bugHunter.operationsByModelEmpty}</p>
    ) : (
      <HorizontalBars
        color={CATEGORICAL.blue}
        ariaLabel={en.bugHunter.operationsByModelTitle}
        formatValue={formatTokens}
        rows={data.tokensByModel.map(row => ({
          key: row.model,
          label: row.model,
          value: row.inputTokens + row.outputTokens,
          detail: fill(en.bugHunter.operationsByModelDetail, {
            input: formatTokens(row.inputTokens),
            output: formatTokens(row.outputTokens),
            runs: row.runs,
          }),
        }))}
      />
    )}
  </Card>
);
