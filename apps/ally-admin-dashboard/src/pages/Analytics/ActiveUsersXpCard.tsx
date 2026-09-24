import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { useGetActiveUsersXpQuery } from "@api";
import { AnalyticsBucket } from "@types";

import {
  ACTIVE_USERS_XP_SCALE,
  ACTIVE_USER_XP_THRESHOLD,
  activeUsersXpEmptyText,
  activeUsersXpTakeaway,
  buildActiveUsersXpSeries,
  buildActiveUsersXpTable,
} from "./activeUsersXpChart";
import { bucketTitle, withoutInProgress } from "./analyticsGrouping";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  integerTickValues,
  timeBarOpts,
} from "./chartKit";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** Grains this chart offers — day/week/month/year, matching the ally-be
 *  endpoint's accepted `bucket` values (no `quarter` — this endpoint extends
 *  the shared `AnalyticsWindowQueryDto`, which doesn't offer it). No "All
 *  time": a single lifetime count would not answer "how many people are
 *  active THIS period". */
const GRAIN_OPTIONS: AnalyticsBucket[] = ["day", "week", "month", "year"];

const TITLE = "Active learners (XP)";

/**
 * Distinct learners clearing the {@link ACTIVE_USER_XP_THRESHOLD}-XP bar
 * within each period — "how many people are actually engaging enough to
 * count", as distinct from a login or session-start count that rewards
 * showing up without doing anything.
 *
 * A brand-new chartId (`goals.activeUsers` once mounted). Grain-only control,
 * matching the sibling Goals cards, which carry no separate window picker —
 * see `GoalsXpCard`'s doc for why the grain lives on the chart rather than a
 * page-level range.
 */
export const ActiveUsersXpCard = () => {
  const [grain, setGrain] = useState<AnalyticsBucket>("month");
  const { data, isLoading, isError, refetch } = useGetActiveUsersXpQuery({ bucket: grain });
  const [expanded, setExpanded] = useState(false);

  const allPoints = data?.points ?? [];
  const inProgressBucket = data?.window.inProgressBucket;
  const plottedPoints = useMemo(
    () => withoutInProgress(allPoints, p => p.bucket, inProgressBucket),
    [allPoints, inProgressBucket],
  );

  const series = useMemo(() => buildActiveUsersXpSeries(plottedPoints), [plottedPoints]);
  const table = useMemo(
    () => buildActiveUsersXpTable(allPoints, inProgressBucket),
    [allPoints, inProgressBucket],
  );
  const emptyText = activeUsersXpEmptyText(plottedPoints);
  const takeaway = activeUsersXpTakeaway(
    allPoints,
    inProgressBucket,
    bucketTitle(grain).toLowerCase(),
  );

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Active learners",
        bottomTitle: bucketTitle(grain),
        colorScale: ACTIVE_USERS_XP_SCALE,
        valueTicks: integerTickValues(Math.max(0, ...series.map(d => d.value ?? 0))),
      }),
    [grain, series],
  );

  const caption =
    `Distinct learners whose XP earned WITHIN each period reached at least ` +
    `${ACTIVE_USER_XP_THRESHOLD} — not a lifetime total, a per-period bar. A period ` +
    `where nobody cleared it is a real zero, not missing data. Platform-wide, no ` +
    `tenant filter. The current ${bucketTitle(grain).toLowerCase()} is still accruing ` +
    `and is left off the plot.`;

  const source = buildSource({
    derivation: `Distinct learners earning >= ${ACTIVE_USER_XP_THRESHOLD} XP within the bucket, from xp_events`,
    window: data?.window.label,
    n: plottedPoints.length,
    nUnit: "periods shown",
    extra: "Platform-wide — no tenant scope",
    asOf: asOfStamp(data?.computedAt),
  });

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && Boolean(emptyText)}
        emptyText={emptyText}
        controls={
          <GroupingPicker
            id="active-users-xp-grain"
            value={grain}
            onChange={g => setGrain(g as AnalyticsBucket)}
            options={GRAIN_OPTIONS}
          />
        }
        onExpand={() => setExpanded(true)}
        chartId="AAQ-006"
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
          caption={`Exact per-period counts, including the current ${bucketTitle(grain).toLowerCase()}, flagged as still accruing.`}
          source={source}
          table={table}
          exportContext={[
            `Grouped by ${bucketTitle(grain).toLowerCase()}`,
            `Threshold: >= ${ACTIVE_USER_XP_THRESHOLD} XP earned within the bucket`,
          ]}
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
