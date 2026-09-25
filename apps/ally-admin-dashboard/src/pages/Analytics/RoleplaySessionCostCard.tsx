import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetRoleplaySessionCostQuery } from "@api";

import { asOf, windowLabel } from "./analyticsFilters";
import {
  GROUPINGS,
  bucketTitle,
  grainAsBucket,
  groupingNote,
  inProgressCaption,
  isInProgress,
  withoutInProgress,
} from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  stackedBarOpts,
} from "./chartKit";
import {
  buildPerMinuteStack,
  componentScale,
  coverageCaption,
  formatPerMinute,
  sessionUnpricedNote,
  tableColumns,
  tableRow,
} from "./sessionCostChart";
import { formatUsd } from "./unitCostChart";

type ChartId = "sessionCost";

const TITLE = "Roleplay Cost per Minute";

/**
 * What one minute of roleplay costs in AI to deliver (AAQ-157), per period,
 * stacked by what the money bought.
 *
 * The unit is the roleplay SESSION: every model call tagged to it — the
 * character's replies, speech-to-text, text-to-speech, fillers and holding
 * lines, event and rule detectors, live coaching, the debrief evaluation, the
 * debrief chat and the memory folds — summed for the sessions started in the
 * period and divided by the minutes they ran. Studio authoring and the analysis
 * we run for ourselves (actor evaluation, judges) are out; the server defines
 * which is which (`session-cost.constants.ts`), not this card.
 *
 * Not a duplicate of Unit economics' "cost per 10 minutes": that chart buckets
 * each call by when it ran, so a debrief landing after midnight splits one
 * session across two periods. This one keeps a session whole.
 *
 * Periods that began before full per-session logging are UNDERSTATED — the calls
 * that went unrecorded cannot be backfilled — so their axis labels carry an
 * asterisk and the caption says why. All time swaps the stack for a KPI tile over
 * the whole window's totals (total cost over total minutes, never a mean of the
 * per-period ratios).
 */
export const RoleplaySessionCostCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.sessionCost",
    defaultControlsFor(["sessionCost"], { sessionCost: { grain: "month" } }),
  );
  const grain = controlsFor("sessionCost").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetRoleplaySessionCostQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.points ?? [], [data]);
  const components = useMemo(() => data?.components ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const plotted = useMemo(
    () => withoutInProgress(points, p => p.bucket, inProgress),
    [points, inProgress],
  );
  const series = useMemo(() => buildPerMinuteStack(plotted, components), [plotted, components]);
  const scale = useMemo(() => componentScale(components), [components]);
  const overall = data?.overall;

  const opts = useMemo(() => {
    const base = stackedBarOpts({
      leftTitle: "USD per minute",
      bottomTitle: bucketTitle(grain),
      colorScale: scale,
      legend: true,
    });
    // Per-minute figures are fractions of a cent: Carbon's default formatting
    // rounds whole components to "0", so both the axis and the tooltip use the
    // tiered formatter the rest of the cost charts use.
    return {
      ...base,
      axes: {
        ...base.axes,
        left: {
          ...base.axes.left,
          ticks: { formatter: (v: number | Date) => formatUsd(Number(v)) },
        },
      },
      tooltip: { valueFormatter: (v: number) => formatUsd(v) },
    };
  }, [grain, scale]);

  const loading = hydrating || (isLoading && !data);

  const caption =
    "AI cost to deliver roleplay, per minute of practice: every model call from the opening " +
    "line to the debrief chat, for the sessions started in each period, divided by the " +
    "minutes they ran. Studio authoring and quality analysis are excluded. Estimates, USD." +
    coverageCaption(data, isAllTime ? points : plotted) +
    sessionUnpricedNote(data) +
    inProgressCaption(grain, inProgress);

  const source = buildSource({
    derivation: "Σ llm_usage priced per session ÷ Σ session minutes",
    window: windowLabel(data?.window),
    n: overall?.sessions,
    nUnit: "sessions",
    extra: isAllTime ? "Platform-wide" : `Platform-wide · ${groupingNote(grain)}`,
    asOf: asOf(data?.window),
  });

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        collapseMeta
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        empty={!loading && !isAllTime && series.length === 0}
        controls={
          <GroupingPicker
            id="goals-session-cost-grain"
            value={grain}
            onChange={g => setGrain("sessionCost", g)}
            options={GROUPINGS}
          />
        }
        onExpand={() => setExpanded(true)}
        kpi={
          isAllTime
            ? {
                label: "Cost per minute, all time",
                description:
                  `Total AI cost to deliver every roleplay session ÷ the minutes they ran. ` +
                  `${formatUsd(overall?.costUsd)} across ${(overall?.sessions ?? 0).toLocaleString()} ` +
                  `sessions — ${formatUsd(overall?.costPerSessionUsd)} per session.`,
                value: formatPerMinute(overall?.costPerMinuteUsd),
                n: overall?.sessions,
                nUnit: "sessions",
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-157"
      >
        <ScrollableChart data={series}>
          <StackedBarChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          source={source}
          caption={data?.coverageNote}
          table={{
            columns: tableColumns(bucketTitle(grain), components),
            rows: points.map(p => tableRow(p, components, isInProgress(p.bucket, inProgress))),
          }}
          exportContext={[
            "Window: all time · platform-wide",
            groupingNote(grain),
            data?.estimateNote ?? "",
          ]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <StackedBarChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
