import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetAnalyticsOverviewQuery } from "@api";
import { AnalyticsGrain } from "@types";

import { asOf, windowLabel } from "./analyticsFilters";
import {
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
import { RETENTION_SCALE, buildRetentionSeries } from "./highlightsChart";

type ChartId = "retention";

const TITLE = "Active users — new vs returning";

/**
 * No "All time": "new" means created in the same period as the activity, so
 * over one whole-history bucket every active user would read as new — a
 * different question, not a coarser answer to this one.
 */
const GRAINS: AnalyticsGrain[] = ["day", "week", "month", "quarter", "year"];

/**
 * Active users per period split by account age (AAQ-020) — relocated to
 * Highlights → Priority from Platform's "Growth & reach" section, reading the
 * same `overview` endpoint and `retention` series.
 *
 * Platform-wide and all-time by construction, like the rest of Priority; on
 * Platform it followed the page's tenant filter. Its cohort companion (Cohort
 * retention) stays on Platform.
 */
export const NewVsReturningUsersCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.newVsReturning",
    defaultControlsFor(["retention"]),
  );
  const grain = controlsFor("retention").grain;

  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.retention ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const series = useMemo(
    () => buildRetentionSeries(withoutInProgress(points, p => p.bucket, inProgress)),
    [points, inProgress],
  );

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Active users",
        bottomTitle: bucketTitle(grain),
        colorScale: RETENTION_SCALE,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const source = buildSource({
    derivation: "Distinct active users per period, split by account age",
    window: windowLabel(data?.window),
    extra: `Platform-wide · ${groupingNote(grain)}`,
    asOf: asOf(data?.window),
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={`Stacked because the two partition the period's active users. "New" means the account was created in that same period, so the split moves with the grouping — read yearly, most of a year's actives count as returning.${inProgressCaption(
          grain,
          inProgress,
        )}`}
        collapseMeta
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        empty={!loading && series.length === 0}
        controls={
          <GroupingPicker
            id="goals-new-vs-returning-grain"
            value={grain}
            onChange={g => setGrain("retention", g)}
            options={GRAINS}
          />
        }
        onExpand={() => setExpanded(true)}
        chartId="AAQ-020"
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
          caption='"New" is relative to the grouping: an account created in the same period as the activity. Re-grouping this chart genuinely changes the question, not just the resolution.'
          source={source}
          table={{
            columns: [bucketTitle(grain), "New", "Returning"],
            rows: points.map(p => [rowKey(p.bucket), p.newUsers, p.returningUsers]),
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
