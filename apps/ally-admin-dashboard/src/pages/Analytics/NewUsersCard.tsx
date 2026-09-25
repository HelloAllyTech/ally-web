import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

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
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, timeBarOpts } from "./chartKit";
import { NEW_USERS_SCALE, buildNewUsersSeries } from "./highlightsChart";

type ChartId = "newUsers";

const TITLE = "New users per period";

/**
 * No "All time": a per-period signup count collapsed to one number just
 * restates the Cumulative users figure (`CumulativeUsersCard`) beside it.
 */
const GRAINS: AnalyticsGrain[] = ["day", "week", "month", "quarter", "year"];

/**
 * Registrations per period (AAQ-018) — relocated to Highlights → Priority from
 * Platform's "Growth & reach" section, reading the same `overview` endpoint and
 * the same `userGrowth` series.
 *
 * Platform-wide and all-time by construction, like the rest of Priority (see
 * `GoalsXpCard`): on Platform this chart could be narrowed to one org via the
 * page's tenant filter; here there is no page-level filter to narrow it with.
 */
export const NewUsersCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.newUsers",
    defaultControlsFor(["newUsers"]),
  );
  const grain = controlsFor("newUsers").grain;

  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.userGrowth ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const series = useMemo(
    () => buildNewUsersSeries(withoutInProgress(points, p => p.date, inProgress)),
    [points, inProgress],
  );

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "New users",
        bottomTitle: bucketTitle(grain),
        colorScale: NEW_USERS_SCALE,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const source = buildSource({
    derivation: "users.createdAt, bucketed",
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
        caption={`Registrations in each period, platform-wide — the growth signal.${inProgressCaption(
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
            id="goals-new-users-grain"
            value={grain}
            onChange={g => setGrain("newUsers", g)}
            options={GRAINS}
          />
        }
        onExpand={() => setExpanded(true)}
        chartId="AAQ-018"
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
            columns: [bucketTitle(grain), "New users"],
            rows: points.map(p => [rowKey(p.date), p.newUsers]),
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
