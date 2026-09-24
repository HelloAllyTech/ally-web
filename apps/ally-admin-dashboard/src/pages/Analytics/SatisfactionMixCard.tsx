import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

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
import {
  ChartCard,
  GroupingPicker,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  buildSource,
  stackedBarOpts,
} from "./chartKit";
import {
  PCT_DOMAIN,
  RATING_BAND_SCALE,
  buildSatisfactionMixSeries,
  formatPct,
  ratedBuckets,
  satisfactionTakeaway,
} from "./testingChart";

type ChartId = "satisfaction";

const TITLE = "Satisfaction Mix";

/**
 * The breakdown of post-session ratings, 1–2 / 3 / 4–5, as a share of each
 * period's ratings — Quality & sentiment's "Satisfaction mix" (AAQ-061),
 * brought to this tab in place of the proxy-NPS line that used to hold this
 * slot. A proxy NPS folds the ratings into one number; the mix shows what
 * people actually gave, which is the question this slot is meant to answer.
 *
 * Built to this tab's conventions rather than copied as-is: the whole history
 * always (no window picker — only the grouping control), and the description,
 * the finding and the provenance folded into the title's help tooltip so the
 * card face is just the plot. All-time swaps the bars for a KPI tile backed by
 * the endpoint's whole-window `summary`, never a fold of the per-period shares.
 *
 * Its own `useChartControls` entry, so the grain here is independent of the
 * Quality & sentiment copy.
 */
export const SatisfactionMixCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.satisfaction",
    // A mix needs a handful of ratings per bar to be stable, so it opens monthly.
    defaultControlsFor(["satisfaction"], { satisfaction: { grain: "month" } }),
  );
  const grain = controlsFor("satisfaction").grain;
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
  const series = useMemo(() => buildSatisfactionMixSeries(points), [points]);
  // A 100%-stacked chart hides its own base, so the help says how many bars are real.
  const rated = useMemo(() => ratedBuckets(points), [points]);
  const takeaway = isAllTime ? null : satisfactionTakeaway(points);

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of ratings (%)",
        bottomTitle: bucketTitle(grain),
        colorScale: RATING_BAND_SCALE,
        domain: PCT_DOMAIN,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const caption = `Post-session ratings split into 1–2 / 3 / 4–5 rather than averaged: a mean of 3.8 from all-4s and a mean of 3.8 from half-5s-and-half-2s call for opposite responses. ${
    rated.length
  } period${rated.length === 1 ? "" : "s"} carry ratings; periods with none are absent, because a mix over nobody is undefined.${
    isAllTime ? "" : inProgressCaption(grain, inProgress)
  }`;

  const source = buildSource({
    derivation: "Post-session ratings grouped into bands, share per period",
    window: windowLabel(data?.window),
    n: data?.summary.responses,
    nUnit: "ratings",
    extra: `${isAllTime ? "Platform-wide" : groupingNote(grain)} · ${formatPct(
      data?.summary.responseRatePct,
    )} of completed sessions were rated`,
    asOf: data?.computedAt ? new Date(data.computedAt).toLocaleDateString() : undefined,
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

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
            id="goals-satisfaction-grain"
            value={grain}
            onChange={g => setGrain("satisfaction", g)}
            options={GROUPINGS}
          />
        }
        kpi={
          isAllTime
            ? {
                label: "Rated 4–5, all time",
                value: formatPct(data?.summary.top2BoxPct),
                n: data?.summary.responses,
                nUnit: "ratings",
                minN: MIN_N_FOR_SCORE,
                description: data
                  ? `${data.summary.low.toLocaleString()} rated 1–2, ${data.summary.mid.toLocaleString()} rated 3, ` +
                    `${data.summary.high.toLocaleString()} rated 4–5 · ${formatPct(
                      data.summary.responseRatePct,
                    )} of completed sessions were rated.`
                  : undefined,
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-005"
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
          caption="The counts behind the shares, plus the response rate the shares are silent about."
          source={source}
          table={{
            columns: [
              bucketTitle(grain),
              "1–2",
              "3",
              "4–5",
              "Ratings",
              "4–5 %",
              "Completed sessions",
              "Response rate %",
            ],
            rows: (data?.satisfaction ?? []).map(p => [
              rowKey(p.bucket),
              p.low,
              p.mid,
              p.high,
              p.responses,
              p.top2BoxPct,
              p.completedSessions,
              p.responseRatePct,
            ]),
          }}
          exportContext={[
            `Window: ${windowLabel(data?.window)}`,
            groupingNote(grain),
            "Rating is optional: the response rate is the share of completed sessions that were rated",
          ]}
          exportFilename="satisfaction-mix"
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
