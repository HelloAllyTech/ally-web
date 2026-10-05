import { useMemo } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetBugAgentPerformanceQuery } from "@api";

import { AnalyticsTabFilters, asOf, windowLabel } from "./analyticsFilters";
import {
  buildCostTrend,
  buildFoundTrend,
  buildPrecisionTrend,
  buildReliabilityTrend,
  buildSourceAccuracyBreakdown,
  buildSpeedTrend,
  buildThroughputTrend,
  COST_SCALE,
  FOUND_SCALE,
  foundTakeaway,
  PRECISION_SCALE,
  RELIABILITY_SCALE,
  SPEED_SCALE,
  THROUGHPUT_SCALE,
} from "./bugAgentPerformanceChart";
import { BugHunterOperationsCards } from "./BugHunterOperationsCards";
import {
  CHART_HEIGHT,
  ChartCard,
  ScrollableChart,
  barOpts,
  buildSource,
  lineOpts,
} from "./chartKit";
import { buildColorScale, formatPercent, formatUsd } from "./tokenChart";
import { AccuracyPanel } from "../BugHunter/AccuracyPanel";
import { AgentScorecard } from "../BugHunter/AgentScorecard";
import { RunHistoryTable } from "../BugHunter/RunHistoryTable";

/**
 * Bug Hunter's five headline performance trends, week over week: is it
 * finding real bugs (precision), does it finish what it starts (throughput),
 * how fast (speed), at what cost, and does it stay healthy while doing it
 * (reliability).
 *
 * Deliberately week-bucketed regardless of the tab-wide range picker's
 * `range` — the backend (`BugAgentPerformanceAnalyticsService`) always
 * truncs to calendar week, since day-by-day would be too noisy for rates
 * this thin and month-by-month too coarse to catch a drift early. The range
 * picker still controls how FAR BACK the trend goes.
 *
 * Reuses the exact funnel arithmetic `AccuracyPanel.tsx`'s single-window
 * figures already use, applied per week server-side — this tab does not
 * recompute anything the accuracy panel didn't already define correctly.
 *
 * Since OPP-0749 (2026-10-05) this tab is also the home of the three panels
 * that used to make up the Bug Hunter page's Performance tab: the scorecard
 * and the accuracy panel open the tab as "right now" figures, and the shift
 * log closes it as the per-run ledger everything above aggregates. The Bug
 * Hunter page keeps Work, Notebook and About; its old `?section=performance`
 * redirects here. The shift log's "N found" links jump back to that page's
 * table — see `RunHistoryTable`.
 */
export const BugAgentPerformance = (filters: AnalyticsTabFilters) => {
  const { query } = filters;
  const { data, isLoading, isError, refetch } = useGetBugAgentPerformanceQuery(query);

  const precisionWeekly = useMemo(() => data?.precision.weekly ?? [], [data]);
  const bySource = useMemo(() => data?.precision.bySource ?? [], [data]);
  const throughputWeekly = useMemo(() => data?.throughput ?? [], [data]);
  const speedWeekly = useMemo(() => data?.speed ?? [], [data]);
  const costWeekly = useMemo(() => data?.cost ?? [], [data]);
  const reliabilityWeekly = useMemo(() => data?.reliability ?? [], [data]);
  const foundDaily = useMemo(() => data?.found ?? [], [data]);

  const precisionTrend = useMemo(() => buildPrecisionTrend(precisionWeekly), [precisionWeekly]);
  const sourceAccuracy = useMemo(() => buildSourceAccuracyBreakdown(bySource), [bySource]);
  const throughputTrend = useMemo(() => buildThroughputTrend(throughputWeekly), [throughputWeekly]);
  const speedTrend = useMemo(() => buildSpeedTrend(speedWeekly), [speedWeekly]);
  const costTrend = useMemo(() => buildCostTrend(costWeekly), [costWeekly]);
  const foundTrend = useMemo(() => buildFoundTrend(foundDaily), [foundDaily]);
  const reliabilityTrend = useMemo(
    () => buildReliabilityTrend(reliabilityWeekly),
    [reliabilityWeekly],
  );

  // `extra` on the chartKit factories replaces a whole top-level key rather
  // than deep-merging it, so a percentage tick formatter has to be added by
  // hand onto the built options' own `axes.left`, same pattern
  // `CodingAgentCost.tsx`'s `withUsdTicks` already established for currency.
  const withPercentTicks = <T extends { axes: { left: Record<string, unknown> } }>(
    options: T,
  ): T => ({
    ...options,
    axes: {
      ...options.axes,
      left: {
        ...options.axes.left,
        ticks: { formatter: (tick: number | Date) => formatPercent(Number(tick)) },
      },
    },
  });

  const precisionOptions = useMemo(
    () => withPercentTicks(lineOpts({ leftTitle: "Rate", colorScale: PRECISION_SCALE })),
    [],
  );
  const sourceAccuracyOptions = useMemo(
    () =>
      withPercentTicks(
        barOpts({
          leftTitle: "Accuracy",
          colorScale: buildColorScale(sourceAccuracy.map(d => d.group)),
        }),
      ),
    [sourceAccuracy],
  );
  const throughputOptions = useMemo(
    () => withPercentTicks(lineOpts({ leftTitle: "Rate", colorScale: THROUGHPUT_SCALE })),
    [],
  );
  const speedOptions = useMemo(
    () => lineOpts({ leftTitle: "Median hours", colorScale: SPEED_SCALE }),
    [],
  );
  const costOptions = useMemo(() => lineOpts({ leftTitle: "USD", colorScale: COST_SCALE }), []);
  const foundOptions = useMemo(
    () => lineOpts({ leftTitle: "Bugs found", colorScale: FOUND_SCALE }),
    [],
  );
  const reliabilityOptions = useMemo(
    () => withPercentTicks(lineOpts({ leftTitle: "Rate", colorScale: RELIABILITY_SCALE })),
    [],
  );

  const window = windowLabel(data?.window);
  const source = (derivation: string) =>
    buildSource({ derivation, window, asOf: asOf(data?.window) });

  const latestCost = costWeekly.at(-1);
  const latestReliability = reliabilityWeekly.at(-1);

  return (
    <div className="flex flex-col gap-6">
      {/* Right now, before the trends: what it has cost and whether it was
          right over the current window. Their own data hooks and their own
          window controls, as they had on the Bug Hunter page. */}
      <div data-chart-id="AAQ-198">
        <AgentScorecard />
      </div>
      <div data-chart-id="AAQ-199">
        <AccuracyPanel />
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-typography-900">Week over week</h3>
        <p className="text-xs text-typography-600">
          The same five questions as the panels above, asked per calendar week so a drift shows
          before the monthly figure moves.
        </p>
      </div>

      {/* The headline the governor asked for, ahead of the weekly rates: is
          the agent finding FEWER bugs as the codebases get cleaner? Daily,
          not weekly like everything below it, because the sweeps are nightly
          and a week would hide a change for seven days. */}
      <ChartCard
        title="Bugs found per day"
        caption="Distinct bugs Bug Hunter filed each day across every repo and source, with the trailing seven-day average as the line to read the trend from. A quiet night is a real zero. Days are UTC, the clock the sweeps run on."
        source={source(
          "bug_findings top-level rows by createdAt day; the average is the mean of that day and the six before it",
        )}
        takeaway={foundTakeaway(foundDaily)}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load bugs found per day"
        empty={foundTrend.length === 0}
        emptyText="No days in this window"
        height={CHART_HEIGHT}
        chartId="AAQ-201"
      >
        <ScrollableChart data={foundTrend}>
          <LineChart data={foundTrend} options={foundOptions} />
        </ScrollableChart>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Precision"
          caption="Is Bug Hunter finding real bugs? Accuracy and reversal rate, for findings filed that week."
          source={source(
            "bug_findings, folded per week the same way AccuracyPanel folds a whole window",
          )}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load precision"
          empty={precisionTrend.length === 0}
          emptyText="Nothing judged yet in this window"
          height={CHART_HEIGHT}
          chartId="AAQ-130"
        >
          <ScrollableChart data={precisionTrend}>
            <LineChart data={precisionTrend} options={precisionOptions} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Precision by finder"
          caption="Whole-window accuracy per finder type — worst first. code_review has no external ground truth, so it's structurally the one most likely to trail."
          source={source("bug_findings, whole window (not bucketed)")}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load the finder breakdown"
          empty={sourceAccuracy.length === 0}
          emptyText="No finder has a judged finding yet in this window"
          height={CHART_HEIGHT}
          chartId="AAQ-131"
        >
          <ScrollableChart data={sourceAccuracy} on="group">
            <SimpleBarChart data={sourceAccuracy} options={sourceAccuracyOptions} />
          </ScrollableChart>
        </ChartCard>
      </div>

      <ChartCard
        title="Fix throughput"
        caption="Does an approved fix actually land? Approved→merged rate, escalation rate, and Gemini-to-Claude fallback rate, per week."
        source={source("bug_findings + bug_hunt_runs + bug_hunt_events, per week")}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load fix throughput"
        empty={throughputTrend.length === 0}
        emptyText="No fix-session activity recorded yet in this window"
        wide
        height={CHART_HEIGHT}
        chartId="AAQ-132"
      >
        <ScrollableChart data={throughputTrend}>
          <LineChart data={throughputTrend} options={throughputOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Speed"
        caption="Median hours from filed to decided/merged, merged to released, and dispatch to first activity (isolates runner queue delay from actual fix time)."
        source={source("bug_findings + bug_hunt_events, per week")}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load speed"
        empty={speedTrend.length === 0}
        emptyText="No stage transitions recorded yet in this window"
        wide
        height={CHART_HEIGHT}
        chartId="AAQ-133"
      >
        <ScrollableChart data={speedTrend}>
          <LineChart data={speedTrend} options={speedOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Cost"
        caption="All Bug Hunter spend (sweeps + fix sessions), per week."
        takeaway={
          latestCost
            ? `Most recent week: ${formatUsd(latestCost.totalUsd)} total${
                latestCost.costPerMergedFixUsd != null
                  ? `, ${formatUsd(latestCost.costPerMergedFixUsd)} per merged fix`
                  : ""
              }`
            : undefined
        }
        source={source("bug_hunt_runs, per week")}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load cost"
        empty={costTrend.length === 0}
        emptyText="No Bug Hunter spend recorded yet in this window"
        wide
        height={CHART_HEIGHT}
        chartId="AAQ-134"
      >
        <ScrollableChart data={costTrend}>
          <LineChart data={costTrend} options={costOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Reliability"
        caption="Run completion rate, fallback rate, and regression rate — does Bug Hunter finish cleanly and do its fixes hold?"
        takeaway={
          latestReliability?.completionRate != null
            ? `Most recent week: ${formatPercent(latestReliability.completionRate)} of runs completed`
            : undefined
        }
        source={source("bug_hunt_runs + bug_hunt_events + bug_findings, per week")}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load reliability"
        empty={reliabilityTrend.length === 0}
        emptyText="No runs recorded yet in this window"
        wide
        height={CHART_HEIGHT}
        chartId="AAQ-135"
      >
        <ScrollableChart data={reliabilityTrend}>
          <LineChart data={reliabilityTrend} options={reliabilityOptions} />
        </ScrollableChart>
      </ChartCard>

      {/* The rates above say whether Bug Hunter is any good; the counts below
          say what it actually turned up, day by day. Separate cards rather
          than more lines on the trends: volumes and rates share no axis. */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-typography-900">What it turns up, day by day</h3>
        <p className="text-xs text-typography-600">
          Volume beside its acceptance share — how many bugs get filed, from where, how hard they
          were to spot, who raises them, and what the models cost. Day-bucketed and UTC, from the
          same page range mapped to a day count.
        </p>
      </div>
      <BugHunterOperationsCards {...filters} />

      {/* The per-run ledger every number above aggregates: status, trigger,
          cost and the GitHub run for each sweep and fix session. The only view
          of that, so it stays reachable here after leaving the agent's page. */}
      <div data-chart-id="AAQ-200" className="pt-2">
        <RunHistoryTable />
      </div>
    </div>
  );
};
