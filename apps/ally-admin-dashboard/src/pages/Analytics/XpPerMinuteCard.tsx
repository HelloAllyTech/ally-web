import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetXpPerMinuteQuery } from "@api";

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
  allTimeDescription,
  buildXpPerMinuteStack,
  formatXpPerMinute,
  sourceScale,
  tableColumns,
  tableRow,
  visibleSources,
} from "./xpPerMinuteChart";

type ChartId = "xpPerMinute";

const TITLE = "XP per Roleplay Minute";

/**
 * For every minute of roleplay practice, how much XP is earned on average
 * (AAQ-165) — all XP awarded in the period over the roleplay minutes practised
 * in it, stacked by the XP source that paid it.
 *
 * The numerator is ALL XP and the denominator is roleplay minutes only, so this
 * is a portfolio ratio: the bottom (roleplay) band is roughly what roleplay
 * itself pays per minute, and everything stacked above it is XP from the rest of
 * the learning portfolio — track items, debriefs and peer comments, the weekly
 * consistency bonus. The headline rising while the roleplay band holds means the
 * portfolio is shifting away from roleplay; the two moving together means
 * roleplay's own pay rate changed. A single line could not tell those apart.
 *
 * The denominator is the same `user_daily_scores` minutes as `RoleplayMinutesCard`
 * directly above it on Priority, so the two reconcile. Platform-wide, like the
 * rest of the tab. Opens on All time (a KPI tile over the whole window: total
 * XP over total minutes, never a mean of per-period ratios).
 */
export const XpPerMinuteCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.xpPerMinute",
    defaultControlsFor(["xpPerMinute"], { xpPerMinute: { grain: "allTime" } }),
  );
  const grain = controlsFor("xpPerMinute").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetXpPerMinuteQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.points ?? [], [data]);
  const allSources = useMemo(() => data?.sources ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const plotted = useMemo(
    () => withoutInProgress(points, p => p.bucket, inProgress),
    [points, inProgress],
  );
  const sources = useMemo(() => visibleSources(points, allSources), [points, allSources]);
  const series = useMemo(() => buildXpPerMinuteStack(plotted, sources), [plotted, sources]);
  // Built from ALL sources so each keeps its colour whichever are on screen.
  const scale = useMemo(() => sourceScale(allSources), [allSources]);
  const overall = data?.overall;

  const opts = useMemo(() => {
    const base = stackedBarOpts({
      leftTitle: "XP per roleplay minute",
      bottomTitle: bucketTitle(grain),
      colorScale: scale,
      legend: true,
    });
    return {
      ...base,
      tooltip: { valueFormatter: (v: number) => `${formatXpPerMinute(v)} XP/min` },
    };
  }, [grain, scale]);

  const loading = hydrating || (isLoading && !data);
  const hasRatio = plotted.some(p => p.xpPerMinute !== null);

  const caption =
    "All XP earned, divided by minutes of roleplay practice. The roleplay band is what " +
    "roleplay itself pays (practice minutes, completion, depth milestones); the bands above " +
    "it are XP from other learning — so a growing top of the stack means the portfolio is " +
    "shifting away from roleplay. Periods with no roleplay minutes have no bar." +
    inProgressCaption(grain, inProgress);

  const source = buildSource({
    derivation: "Σ xp_events.xp ÷ Σ user_daily_scores.minutesPlayed",
    window: windowLabel(data?.window),
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
        empty={!loading && !isAllTime && !hasRatio}
        controls={
          <GroupingPicker
            id="goals-xp-per-minute-grain"
            value={grain}
            onChange={g => setGrain("xpPerMinute", g)}
            options={GROUPINGS}
          />
        }
        onExpand={() => setExpanded(true)}
        kpi={
          isAllTime
            ? {
                label: "XP per roleplay minute, all time",
                description: allTimeDescription(overall),
                value:
                  overall?.xpPerMinute === null || overall?.xpPerMinute === undefined
                    ? "—"
                    : `${formatXpPerMinute(overall.xpPerMinute)} XP/min`,
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-165"
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
          caption={caption}
          table={{
            columns: tableColumns(bucketTitle(grain), allSources),
            rows: points.map(p => tableRow(p, allSources, isInProgress(p.bucket, inProgress))),
          }}
          exportContext={["Window: all time · platform-wide", groupingNote(grain)]}
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
