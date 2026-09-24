import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetQualityDistributionQuery } from "@api";

import { windowLabel } from "./analyticsFilters";
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
import { PointCountLabels } from "./PointCountLabels";
import {
  AVG_RATING_SCALE,
  RATING_DOMAIN,
  averageRatingTakeaway,
  buildAverageRatingSeries,
  formatRating,
} from "./testingChart";

type ChartId = "avgRating";

const TITLE = "Average Rating";

/** A label above a point near the top of the 1–5 axis would run into the legend. */
const LABEL_BELOW_FROM = 4.6;

const nLabel = (datum: Record<string, unknown>): string | null =>
  typeof datum.responses === "number" ? `n=${datum.responses.toLocaleString()}` : null;

const labelAbove = (datum: Record<string, unknown>): boolean =>
  typeof datum.value !== "number" || datum.value < LABEL_BELOW_FROM;

/**
 * The mean post-session rating (1–5) per period, beside the Satisfaction Mix
 * (AAQ-005) and off the very same `quality-distribution` response — the same
 * `scenario_session_feedbacks` rows, the same buckets, the same in-progress
 * handling — so the two cards can never disagree about what was rated.
 *
 * Where the mix shows how the ratings split, this folds them into one number;
 * the mix stays alongside precisely because a mean cannot tell all-4s from a
 * split of 5s and 2s. Each point carries the count of ratings it averages,
 * printed beside it as `n=…` rather than drawn as a second series, so a 5.00
 * over one rating reads as the anecdote it is.
 *
 * All-time swaps the line for a KPI tile backed by the endpoint's whole-window
 * `summary.avgRating` — a mean over every rating, never a mean of the period means.
 */
export const AverageRatingCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.avgRating",
    // Same opening grain as the mix beside it, so the two read period-for-period.
    defaultControlsFor(["avgRating"], { avgRating: { grain: "month" } }),
  );
  const grain = controlsFor("avgRating").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetQualityDistributionQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const inProgress = data?.window.inProgressBucket;
  const points = useMemo(
    () => withoutInProgress(data?.satisfaction ?? [], p => p.bucket, inProgress),
    [data, inProgress],
  );
  const series = useMemo(() => buildAverageRatingSeries(points), [points]);
  const takeaway = isAllTime ? null : averageRatingTakeaway(points);

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Average rating (1–5)",
        bottomTitle: bucketTitle(grain),
        colorScale: AVG_RATING_SCALE,
        domain: RATING_DOMAIN,
        legend: false,
        extra: {
          // PointCountLabels reads the dots' positions; mid-transition they are stale.
          animations: false,
          points: { enabled: true, radius: 4 },
          tooltip: {
            valueFormatter: (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v)),
          },
        },
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const caption = `The mean of every 1–5 post-session rating given in the period; the n beside each point is how many ratings it averages. Periods nobody rated are absent rather than drawn at zero. Read it with the Satisfaction Mix: a mean hides whether a 3.8 is all-4s or a split of 5s and 2s.${
    isAllTime ? "" : inProgressCaption(grain, inProgress)
  }`;

  const source = buildSource({
    derivation: "Mean of post-session ratings per period",
    window: windowLabel(data?.window),
    n: data?.summary.responses,
    nUnit: "ratings",
    extra: isAllTime ? "Platform-wide" : groupingNote(grain),
    asOf: data?.computedAt ? new Date(data.computedAt).toLocaleDateString() : undefined,
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  const chart = (height?: string) => (
    <ScrollableChart data={series}>
      <PointCountLabels countOf={nLabel} above={labelAbove}>
        <LineChart data={series} options={height ? { ...opts, height } : opts} />
      </PointCountLabels>
    </ScrollableChart>
  );

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        collapseMeta
        metaExtra={takeaway ?? undefined}
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        errorSubtitle="There was a problem fetching learner ratings."
        empty={!loading && !isAllTime && series.length === 0}
        emptyText="No ratings in any period on this axis"
        onExpand={() => setExpanded(true)}
        controls={
          <GroupingPicker
            id="goals-avg-rating-grain"
            value={grain}
            onChange={g => setGrain("avgRating", g)}
            options={GROUPINGS}
          />
        }
        kpi={
          isAllTime
            ? {
                label: "Average rating, all time",
                value: formatRating(data?.summary.avgRating),
                n: data?.summary.responses,
                nUnit: "ratings",
                description:
                  "Mean of every 1–5 post-session rating, not a mean of the period averages.",
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-156"
      >
        {chart()}
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="The mean rating per period and the number of ratings behind each."
          source={source}
          table={{
            columns: [bucketTitle(grain), "Average rating", "Ratings"],
            rows: (data?.satisfaction ?? []).map(p => [rowKey(p.bucket), p.avgRating, p.responses]),
          }}
          exportContext={[`Window: ${windowLabel(data?.window)}`, groupingNote(grain)]}
          exportFilename="average-rating"
          render={({ height }) => chart(height)}
        />
      )}
    </>
  );
};
