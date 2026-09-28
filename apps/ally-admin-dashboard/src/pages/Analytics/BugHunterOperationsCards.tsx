import { ReactNode, useMemo, useState } from "react";

import { SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { useGetBugHunterOperationsMetricsQuery } from "@api";

import { AnalyticsTabFilters } from "./analyticsFilters";
import {
  BREADTH_SCALE,
  DIFFICULTY_SCALE,
  OUTCOME_SCALE,
  OpsBar,
  OpsDatum,
  SOURCE_SCALE,
  TRIGGER_SCALE,
  breadthEmptyText,
  breadthStart,
  breadthTakeaway,
  buildBreadthSeries,
  buildBreadthTable,
  buildDifficultySeries,
  buildDifficultyTable,
  buildFiledSeries,
  buildFiledTable,
  buildModelBars,
  buildModelTable,
  buildReporterBars,
  buildReporterTable,
  buildSourceSeries,
  buildSourceTable,
  buildTokensSeries,
  buildTokensTable,
  difficultyTakeaway,
  filedEmptyText,
  filedTakeaway,
  modelEmptyText,
  modelTakeaway,
  operationsWindowLabel,
  presentSources,
  rangeToDays,
  reporterTakeaway,
  sourceTakeaway,
  tokensEmptyText,
  tokensTakeaway,
  uniformScale,
} from "./bugHunterOperationsChart";
import { ChartDetailModal, ChartTableData } from "./ChartDetailModal";
import {
  CHART_HEIGHT,
  ChartCard,
  ScrollableChart,
  buildSource,
  hBarOpts,
  integerTickValues,
  stackedBarOpts,
} from "./chartKit";
import { formatUsd } from "./tokenChart";

/**
 * Bug Hunter's volume, beside its rates.
 *
 * The five trend cards above this answer whether the agent is right, fast,
 * cheap and reliable — all rates, all week-bucketed. These seven answer the
 * operator's Monday-morning questions, which are counts and day-shaped: did
 * last night file anything, which finder is producing the noise, how hard
 * were the bugs, who is reporting them, is the token bill creeping, and how
 * much code was the sweep actually shown.
 *
 * Reads `GET /v1/bug-hunter/metrics/operations`, which is anchored on today
 * and takes a day count, so the page range is mapped to days
 * (`rangeToDays`) and the card says what window it actually covered.
 *
 * Every count is drawn beside where that cohort stands now — accepted,
 * declined, undecided — because a bar of "12 filed" on its own rewards the
 * noisiest finder exactly as much as the best one.
 */
export const BugHunterOperationsCards = ({ query }: AnalyticsTabFilters) => {
  const days = rangeToDays(query);
  const { data, isLoading, isError, refetch } = useGetBugHunterOperationsMetricsQuery({ days });

  const dayRows = useMemo(() => data?.days ?? [], [data]);
  const window = operationsWindowLabel(data);
  const source = (derivation: string) => buildSource({ derivation, window });
  const common = { loading: isLoading && !data, error: isError, onRetry: refetch };

  const filedSeries = useMemo(() => buildFiledSeries(dayRows), [dayRows]);
  const sources = useMemo(() => presentSources(data?.bySource ?? []), [data]);
  const sourceSeries = useMemo(() => buildSourceSeries(dayRows, sources), [dayRows, sources]);
  const difficultySeries = useMemo(() => buildDifficultySeries(dayRows), [dayRows]);
  const reporterBars = useMemo(() => buildReporterBars(data?.byReporter ?? []), [data]);
  const tokensSeries = useMemo(() => buildTokensSeries(dayRows), [dayRows]);
  const breadthSeries = useMemo(() => buildBreadthSeries(dayRows), [dayRows]);
  const modelBars = useMemo(() => buildModelBars(data?.tokensByModel ?? []), [data]);

  const countOpts = useMemo(
    () =>
      stackedBarOpts({ leftTitle: "Bugs", bottomTitle: "Day (UTC)", colorScale: OUTCOME_SCALE }),
    [],
  );
  const sourceOpts = useMemo(
    () => stackedBarOpts({ leftTitle: "Bugs", bottomTitle: "Day (UTC)", colorScale: SOURCE_SCALE }),
    [],
  );
  const difficultyOpts = useMemo(
    () =>
      stackedBarOpts({ leftTitle: "Bugs", bottomTitle: "Day (UTC)", colorScale: DIFFICULTY_SCALE }),
    [],
  );
  const tokensOpts = useMemo(
    () =>
      stackedBarOpts({ leftTitle: "Tokens", bottomTitle: "Day (UTC)", colorScale: TRIGGER_SCALE }),
    [],
  );
  const breadthOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Lines of code",
        bottomTitle: "Day (UTC)",
        colorScale: BREADTH_SCALE,
        legend: false,
      }),
    [],
  );
  const reporterOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Bugs",
        colorScale: uniformScale(reporterBars.map(b => b.group)),
        valueTicks: integerTickValues(Math.max(0, ...reporterBars.map(b => b.value))),
      }),
    [reporterBars],
  );
  const modelOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Tokens",
        colorScale: uniformScale(modelBars.map(b => b.group)),
      }),
    [modelBars],
  );

  const start = breadthStart(dayRows);
  const totalCost = data ? formatUsd(data.totals.costUsd) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OpsCard
          title="Bugs filed per day"
          caption="Distinct bugs Bug Hunter filed each day, from every source, coloured by where each stands today. A re-discovery touches its existing row rather than filing a new one, so nothing counts twice. Days are UTC, the clock the sweeps run on."
          source={source(
            "bug_findings, one row per bug, by createdAt day; status folded to accepted / declined / undecided",
          )}
          takeaway={filedTakeaway(data ?? emptyMetrics)}
          emptyText={filedEmptyText(data)}
          table={buildFiledTable(dayRows)}
          chartId="AAQ-158"
          {...common}
          render={height => (
            <ScrollableChart data={filedSeries}>
              <StackedBarChart data={filedSeries} options={{ ...countOpts, height }} />
            </ScrollableChart>
          )}
        />

        <OpsCard
          title="Bugs filed per day, by source"
          caption="The same bugs, split by the finder that raised them. A source that files a lot but is mostly declined is noise — the table view carries each source's accepted share."
          source={source("bug_findings by createdAt day and source")}
          takeaway={sourceTakeaway(data?.bySource ?? [])}
          emptyText={filedEmptyText(data)}
          table={buildSourceTable(data?.bySource ?? [])}
          tableCaption="Window totals per source, with the accepted share the stacked bars cannot show."
          chartId="AAQ-159"
          {...common}
          render={height => (
            <ScrollableChart data={sourceSeries}>
              <StackedBarChart data={sourceSeries} options={{ ...sourceOpts, height }} />
            </ScrollableChart>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OpsCard
          title="How hard they were to spot"
          caption="Derived, not stored. Easy to spot: a failing test, a lint error or a recurring production error proved it — the tool output is the bug. Hard to spot: Bug Hunter inferred it from reading code or telemetry and two verifiers had to agree. Reported by people: a person filed it, so the agent spotted nothing and it sits in neither bucket."
          source={source(
            "bug_findings: proven → easy; unproven agent-found → hard; source = reported_bug → reported",
          )}
          takeaway={difficultyTakeaway(data ?? emptyMetrics)}
          emptyText={filedEmptyText(data)}
          table={buildDifficultyTable(data ?? emptyMetrics)}
          tableCaption="Window totals per bucket, with the accepted share — the comparison the split exists for."
          chartId="AAQ-160"
          {...common}
          render={height => (
            <ScrollableChart data={difficultySeries}>
              <StackedBarChart data={difficultySeries} options={{ ...difficultyOpts, height }} />
            </ScrollableChart>
          )}
        />

        <OpsCard
          title="Who raises bugs"
          caption="Bug Hunter's own finders and UX signals, against bugs people filed: staff through the roadmap, consumers through the in-app “Report a problem” form. All three always listed — a zero for consumers is a fact worth seeing."
          source={source(
            "bug_findings; reported_bug rows split by the linked roadmap_opportunities.source",
          )}
          takeaway={reporterTakeaway(data?.byReporter ?? [])}
          emptyText={filedEmptyText(data)}
          table={buildReporterTable(data?.byReporter ?? [])}
          chartId="AAQ-161"
          {...common}
          render={height => (
            <SimpleBarChart data={reporterBars} options={{ ...reporterOpts, height }} />
          )}
        />
      </div>

      <OpsCard
        wide
        title="Tokens spent per day, by trigger"
        caption={`Input plus output tokens for runs that started each day, split by what started them. In Works-solo mode a nightly sweep finds, verifies AND fixes in one run, so a sweep's tokens cannot honestly be split into finding and fixing — the trigger is the split that exists.${
          totalCost ? ` ${totalCost} over the window.` : ""
        }`}
        source={source(
          "bug_hunt_runs totalInputTokens + totalOutputTokens by createdAt day and trigger; skipped runs excluded",
        )}
        takeaway={tokensTakeaway(data ?? emptyMetrics)}
        emptyText={tokensEmptyText(data)}
        table={buildTokensTable(dayRows)}
        chartId="AAQ-162"
        {...common}
        render={height => (
          <ScrollableChart data={tokensSeries}>
            <StackedBarChart data={tokensSeries} options={{ ...tokensOpts, height }} />
          </ScrollableChart>
        )}
      />

      <OpsCard
        wide
        title="Code shown to the sweeps per day"
        caption={`Lines of code in scope for the sweeps that started each day — the day's diff, or the whole tree on a deep sweep — as each sweep reports after Discover. This is the breadth proxy: tokens say how much the model read, this says how much it was given to read.${
          start
            ? ` Recording began ${start}; the plot starts there rather than showing earlier days as zero.`
            : ""
        }`}
        source={source(
          "bug_hunt_runs.metadata.breadth.linesInScope summed by createdAt day; null = not recorded",
        )}
        takeaway={data ? breadthTakeaway(data) : undefined}
        emptyText={breadthEmptyText(data)}
        table={buildBreadthTable(dayRows)}
        tableCaption="Every day in the window, including those before recording began, marked “not recorded”."
        chartId="AAQ-163"
        {...common}
        render={height => (
          <ScrollableChart data={breadthSeries}>
            <StackedBarChart data={breadthSeries} options={{ ...breadthOpts, height }} />
          </ScrollableChart>
        )}
      />

      <OpsCard
        wide
        title="Tokens by model"
        caption="Which models did the work, from the per-model usage the runner reports after each run. One run spends across several: the sweep on its default tier, hard fixes on the escalation tier. Cache reads are counted inside input tokens."
        source={source("llm_usage rows tagged bug_hunter, joined to runs in the window, by model")}
        takeaway={modelTakeaway(data?.tokensByModel ?? [])}
        emptyText={modelEmptyText(data)}
        table={buildModelTable(data?.tokensByModel ?? [])}
        chartId="AAQ-164"
        {...common}
        render={height => <SimpleBarChart data={modelBars} options={{ ...modelOpts, height }} />}
      />
    </div>
  );
};

/** A zero-valued response, so takeaway builders can run before data arrives without a null branch each. */
const emptyMetrics = {
  windowDays: 0,
  since: "",
  days: [],
  bySource: [],
  byDifficulty: [],
  breadth: null,
  byReporter: [],
  tokensByModel: [],
  totals: {
    filed: 0,
    accepted: 0,
    declined: 0,
    undecided: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    runs: 0,
  },
};

interface OpsCardProps {
  title: string;
  caption: string;
  source: string;
  takeaway?: string;
  emptyText?: string;
  table: ChartTableData;
  tableCaption?: string;
  chartId: string;
  wide?: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  render: (height: string) => ReactNode;
}

/**
 * One card plus its dense-tier modal, so each of the seven charts carries a
 * table view and an export without repeating the wiring seven times. The
 * table is the accessibility twin of the chart: every number the bars
 * encode is reachable without hovering or reading colour.
 */
const OpsCard = ({
  title,
  caption,
  source,
  takeaway,
  emptyText,
  table,
  tableCaption,
  chartId,
  wide,
  loading,
  error,
  onRetry,
  render,
}: OpsCardProps) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <ChartCard
        wide={wide}
        title={title}
        caption={caption}
        source={source}
        takeaway={takeaway}
        loading={loading}
        error={error}
        onRetry={onRetry}
        errorTitle={`Couldn't load “${title}”`}
        empty={!loading && Boolean(emptyText)}
        emptyText={emptyText}
        onExpand={() => setExpanded(true)}
        height={CHART_HEIGHT}
        chartId={chartId}
      >
        {render(CHART_HEIGHT)}
      </ChartCard>
      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={title}
          caption={tableCaption ?? caption}
          source={source}
          table={table}
          exportContext={[source]}
          render={({ height }) => render(height)}
        />
      )}
    </>
  );
};

export type { OpsBar, OpsDatum };
