import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetAnalyticsOverviewQuery } from "@api";

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
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import { CUMULATIVE_USERS_SCALE, buildCumulativeUsersSeries, formatKpi } from "./highlightsChart";

type ChartId = "cumulative";

const TITLE = "Cumulative users";

/**
 * Running total of registrations (AAQ-019) — relocated to Highlights → Priority
 * from Platform's "Growth & reach" section, reading the same `overview`
 * endpoint and `userGrowth` series.
 *
 * Platform-wide and all-time by construction, like the rest of Priority; on
 * Platform it followed the page's tenant filter. All-time swaps the line for a
 * KPI tile backed by `summary.totalUsers` — a server-side whole-window count
 * off the same response, not a fold of the bucketed points.
 */
export const CumulativeUsersCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.cumulativeUsers",
    defaultControlsFor(["cumulative"]),
  );
  const grain = controlsFor("cumulative").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.userGrowth ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const series = useMemo(
    () => buildCumulativeUsersSeries(withoutInProgress(points, p => p.date, inProgress)),
    [points, inProgress],
  );

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Users",
        bottomTitle: bucketTitle(grain),
        colorScale: CUMULATIVE_USERS_SCALE,
        legend: false,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const source = buildSource({
    derivation: "Running total of registrations",
    window: windowLabel(data?.window),
    extra: isAllTime ? "Platform-wide" : `Platform-wide · ${groupingNote(grain)}`,
    asOf: asOf(data?.window),
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={`Running total of registered accounts, platform-wide. Shown apart from New users per period because it is orders of magnitude larger — on one axis it flattens the per-period figure.${inProgressCaption(
          grain,
          inProgress,
        )}`}
        collapseMeta
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        empty={!loading && !isAllTime && series.length === 0}
        controls={
          <GroupingPicker
            id="goals-cumulative-users-grain"
            value={grain}
            onChange={g => setGrain("cumulative", g)}
            options={GROUPINGS}
          />
        }
        onExpand={() => setExpanded(true)}
        kpi={
          isAllTime
            ? {
                label: "Cumulative users",
                description:
                  "Every registered account, all time — the running total's final value.",
                value: formatKpi(data?.summary.totalUsers),
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-019"
      >
        <ScrollableChart data={series}>
          <LineChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          source={source}
          table={{
            columns: [bucketTitle(grain), "Cumulative users"],
            rows: points.map(p => [rowKey(p.date), p.cumulativeUsers]),
          }}
          exportContext={["Window: all time · platform-wide", groupingNote(grain)]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <LineChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
