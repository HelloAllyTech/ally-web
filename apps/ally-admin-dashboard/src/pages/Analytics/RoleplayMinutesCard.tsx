import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { useGetAnalyticsHighlightsQuery } from "@api";

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
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, timeBarOpts } from "./chartKit";
import {
  PRACTICE_SCALE,
  buildPracticeMinutesSeries,
  formatKpi,
  peakActiveLearners,
} from "./highlightsChart";

type ChartId = "minutes";

const TITLE = "Roleplay Minutes";

/**
 * Total minutes learners spent practising, per period — relocated here from
 * Platform (Highlights → Platform's former "Practice minutes" chart), reading
 * the same `highlights` endpoint and the same `practiceMinutes` trend.
 *
 * Platform-wide and all-time by construction: Goals carries no page-level
 * tenant or range filter, matching the rest of this tab (see `GoalsXpCard`).
 * That is the one behavioural difference from its old home — on Platform this
 * chart could be narrowed to one org via the page's tenant filter; here it
 * cannot, because there is no page-level filter to narrow it with.
 *
 * Unlike its old mechanism-B home, this chart owns a full {@link AnalyticsGrain}
 * (Day/Week/Month/Quarter/Year/All-time) — All-time swaps the trend for a KPI
 * tile backed by `practiceMinutesOverall`, a genuine whole-window aggregate
 * (its `activeLearners` is NOT a sum of the per-bucket figures — see that
 * field's own doc for why summing would double-count).
 */
export const RoleplayMinutesCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.minutes",
    defaultControlsFor(["minutes"]),
  );
  const grain = controlsFor("minutes").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetAnalyticsHighlightsQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = data?.practiceMinutes ?? [];
  const inProgress = data?.window.inProgressBucket;
  const plotted = useMemo(
    () => withoutInProgress(points, p => p.bucket, inProgress),
    [points, inProgress],
  );
  const series = useMemo(() => buildPracticeMinutesSeries(plotted), [plotted]);
  const learners = useMemo(() => peakActiveLearners(points), [points]);
  const overall = data?.practiceMinutesOverall;

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Minutes",
        bottomTitle: bucketTitle(grain),
        colorScale: PRACTICE_SCALE,
        legend: false,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const caption = `Total minutes learners spent practising, platform-wide. Zero periods are real zeros, not missing data.${inProgressCaption(
    grain,
    inProgress,
  )}`;

  const source = buildSource({
    derivation: "Sum of user_daily_scores.minutesPlayed",
    window: windowLabel(data?.window),
    n: isAllTime ? overall?.activeLearners : learners,
    nUnit: "learners at peak",
    extra: isAllTime ? "Platform-wide" : `Platform-wide · ${groupingNote(grain)}`,
    asOf: asOf(data?.window),
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

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
            id="goals-minutes-grain"
            value={grain}
            onChange={g => setGrain("minutes", g)}
            options={GROUPINGS}
          />
        }
        onExpand={() => setExpanded(true)}
        kpi={
          isAllTime
            ? {
                label: "Practice minutes, all time",
                description:
                  "Total minutes learners spent practising, whole window, platform-wide.",
                value: formatKpi(overall?.minutes),
                n: overall?.activeLearners,
                nUnit: "learners at peak",
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-002"
      >
        <ScrollableChart data={series}>
          <SimpleBarChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          source={source}
          table={{
            columns: [bucketTitle(grain), "Minutes", "Active learners"],
            rows: points.map(p => [rowKey(p.bucket), p.minutes, p.activeLearners]),
          }}
          exportContext={["Window: all time · platform-wide", groupingNote(grain)]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <SimpleBarChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
