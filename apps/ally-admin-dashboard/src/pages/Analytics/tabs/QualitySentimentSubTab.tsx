import { useMemo, useState } from "react";

import { ComboChart, LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { useGetQualityDistributionQuery, useGetQualitySentimentQuery } from "@api";

import { AnalyticsTabFilters, windowLabel } from "../analyticsFilters";
import {
  bucketTitle,
  groupingNote,
  inProgressCaption,
  isInProgress,
  withoutInProgress,
} from "../analyticsGrouping";
import { defaultControlsFor, RANGE_SHORT, RangePicker, useChartControls } from "../chartControls";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTile,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  hBarOpts,
  lineOpts,
  stackedAreaLineOpts,
  stackedBarOpts,
} from "../chartKit";
import {
  PCT_DOMAIN,
  RATING_BAND_SCALE,
  SCORE_DOMAIN,
  SKILL_GROWTH_SCALE,
  buildLowRatingTagBars,
  buildQualityBandSeries,
  buildRankedBarScale,
  buildSatisfactionMixSeries,
  formatPct,
  formatScore,
  ratedBuckets,
  satisfactionTakeaway,
} from "../testingChart";
import {
  PROXY_NPS_DOMAIN,
  PROXY_NPS_LABEL,
  PROXY_NPS_SCALE,
  QUALITY_INDEX_DIMENSIONS,
  QUALITY_INDEX_DIMENSION_LABELS,
  QUALITY_INDEX_DOMAIN,
  QUALITY_INDEX_LABEL,
  QUALITY_INDEX_SCALE,
  buildProxyNpsSeries,
  buildQualityIndexAreaSeries,
  buildQualityIndexSeries,
  correlationNote,
  isIndexFullyCalibrated,
  qualityIndexCoverageNotes,
} from "../unitCostChart";

/**
 * Three windowed series, each with its own saved window and grain.
 *
 * The distribution and the satisfaction mix are separate entries even though one
 * response feeds both: they are read at different resolutions by different
 * readers — a spread wants enough sessions per bucket to have quartiles, a
 * rating mix wants enough ratings — and one shared control would force the
 * coarser of the two on whoever wanted the other.
 */
type ChartId = "qualitySentiment" | "distribution" | "satisfaction";

const CHARTS: readonly ChartId[] = ["qualitySentiment", "distribution", "satisfaction"];

/**
 * Does the platform agree with the learner?
 *
 * Two measures of the same sessions, plotted separately and compared. The pairing
 * is the point: each number alone can be moved in the wrong direction without
 * anyone noticing. A simulator tuned to score well can be joyless to talk to; one
 * learners love can be letting them pass without stretching them. Divergence is
 * the finding.
 *
 * ## The quality card plots an INDEX, not a raw judge score
 *
 * "Roleplay quality" used to be `avgCompositeScore` — the actor-goal judge's
 * mean, alone. It is now the Roleplay Quality Index: a weighted blend of four
 * dimensions (actor-goal score, in-character rate, language quality, response
 * latency), each normalised 0-100 against anchors measured from production
 * traffic. The stacked area is the four weighted contributions; the line
 * riding over it is their sum, so the two always agree — the stack is the
 * "what's it made of" answer to the line's "how much."
 *
 * A missing dimension in a given period contributes NOTHING and its weight is
 * removed from the denominator, rather than scoring it zero — otherwise the
 * index would read as a quality collapse in exactly the months a judge backlog
 * hadn't reached yet, which is a backfill-ordering artefact, not a product
 * regression. `indexCoverage` is what makes that visible: each dimension states
 * what fraction of periods it actually covers and whether its anchors are
 * measured or still the shipped placeholder.
 *
 * ## The sentiment series is NOT an NPS
 *
 * Ally has never asked the 0–10 "would you recommend" question. This is derived
 * from the 1–5 post-session rating by cutting it the way NPS cuts 0–10 (5 =
 * promoter, 4 = passive, ≤3 = detractor). It behaves like NPS — same ±100 axis,
 * same sensitivity to the middle emptying out — and it is not NPS.
 *
 * So the qualifier is carried in three places, deliberately redundantly: the
 * series LABEL (which is what survives into a screenshot), the card caption, and
 * the server's own `proxyNote` rendered verbatim under the plot. A reader who
 * sees only one of the three still cannot mistake it for a published NPS.
 *
 * ## Two axes, two cards
 *
 * A 0–100 index and a −100..+100 proxy NPS do not belong on one value axis: a
 * shared axis would either crush the index into the top half or imply that an
 * index of 40 and a proxy NPS of 40 are the same altitude. They get a card
 * each, on the same x-axis and the same grain, so the reader compares SHAPES
 * rather than heights — which is the only honest comparison between two
 * different units.
 */
export const QualitySentimentSubTab = ({ query }: AnalyticsTabFilters) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { controlsFor, setRange, setBucket, hydrating } = useChartControls<ChartId>(
    "highlights.quality",
    // Both series need a sample per bucket to be stable, so this opens monthly
    // rather than at the tab's finest grain.
    defaultControlsFor(CHARTS, { qualitySentiment: { bucket: "month" } }),
  );

  const controls = controlsFor("qualitySentiment");
  const { data, isLoading, error, refetch } = useGetQualitySentimentQuery(
    { ...query, range: controls.range, bucket: controls.bucket },
    { skip: hydrating },
  );

  // The distribution behind the averages above. Two requests to one endpoint
  // rather than one: the two charts carry independent windows and grains, and
  // RTK Query keys its cache on the argument object, so each gets exactly the
  // response it is drawing.
  const distControls = controlsFor("distribution");
  const distQ = useGetQualityDistributionQuery(
    { ...query, range: distControls.range, bucket: distControls.bucket },
    { skip: hydrating },
  );
  const satControls = controlsFor("satisfaction");
  const satQ = useGetQualityDistributionQuery(
    { ...query, range: satControls.range, bucket: satControls.bucket },
    { skip: hydrating },
  );

  const dist = distQ.data;
  const sat = satQ.data;
  const distLoading = hydrating || (distQ.isLoading && !dist);
  const satLoading = hydrating || (satQ.isLoading && !sat);

  const distInProgress = dist?.window.inProgressBucket;
  const distPoints = useMemo(
    () => withoutInProgress(dist?.quality ?? [], p => p.bucket, distInProgress),
    [dist, distInProgress],
  );
  const distSeries = useMemo(() => buildQualityBandSeries(distPoints), [distPoints]);

  const satInProgress = sat?.window.inProgressBucket;
  const satPoints = useMemo(
    () => withoutInProgress(sat?.satisfaction ?? [], p => p.bucket, satInProgress),
    [sat, satInProgress],
  );
  const satSeries = useMemo(() => buildSatisfactionMixSeries(satPoints), [satPoints]);
  // How many periods actually carry a stateable mix — a 100%-stacked chart hides
  // its own base, so the caption says how many bars are real.
  const satRated = useMemo(() => ratedBuckets(satPoints), [satPoints]);

  const tagBars = useMemo(() => buildLowRatingTagBars(dist?.lowRatingTags ?? []), [dist]);
  const tagScale = useMemo(() => buildRankedBarScale(tagBars), [tagBars]);

  const distOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle(distControls.bucket),
        colorScale: SKILL_GROWTH_SCALE,
        domain: SCORE_DOMAIN,
      }),
    [distControls.bucket],
  );
  const distZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle(distControls.bucket),
        colorScale: SKILL_GROWTH_SCALE,
      }),
    [distControls.bucket],
  );
  const satOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of ratings (%)",
        bottomTitle: bucketTitle(satControls.bucket),
        colorScale: RATING_BAND_SCALE,
        domain: PCT_DOMAIN,
      }),
    [satControls.bucket],
  );
  const tagOpts = useMemo(
    () => hBarOpts({ bottomTitle: "Low-rated sessions", colorScale: tagScale }),
    [tagScale],
  );

  /** Bucket label for a table row, flagged while the period is still accruing. */
  const rowKey = (bucket: string, inProgress?: string | null) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  // Both series keep every period, nulls included: a mean has no meaningful
  // zero, so a quiet period must break the line rather than be dropped (which
  // would collapse the axis) or zeroed (which would draw a collapse). The
  // index's stack layers are the one deliberate exception — see
  // buildQualityIndexAreaSeries for why a missing dimension there is a real 0,
  // not a gap.
  //
  // Memoised on `data?.points` rather than on a `?? []` fallback: the fallback
  // is a fresh array every render, which would defeat the memo entirely.
  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const qualityAreas = useMemo(() => buildQualityIndexAreaSeries(points), [points]);
  const qualityLine = useMemo(() => buildQualityIndexSeries(points), [points]);
  const quality = useMemo(() => [...qualityAreas, ...qualityLine], [qualityAreas, qualityLine]);
  const sentiment = useMemo(() => buildProxyNpsSeries(points), [points]);

  const coverage = data?.indexCoverage ?? [];
  const fullyCalibrated = isIndexFullyCalibrated(coverage);
  const coverageNotes = useMemo(() => qualityIndexCoverageNotes(coverage), [coverage]);

  const loading = hydrating || (isLoading && !data);
  const asOf = data?.computedAt ? new Date(data.computedAt).toLocaleDateString() : undefined;
  const windowNote = `${RANGE_SHORT[controls.range]}, ${groupingNote(controls.bucket)}`;

  const pickers = (
    <div className="flex items-center gap-2">
      <RangePicker
        id="quality-sentiment-range"
        value={controls.range}
        onChange={range => setRange("qualitySentiment", range)}
      />
      <GroupingPicker
        id="quality-sentiment-grouping"
        value={controls.bucket}
        onChange={bucket => setBucket("qualitySentiment", bucket)}
      />
    </div>
  );

  const chartPickers = (chart: ChartId) => (
    <div className="flex items-center gap-2">
      <RangePicker
        id={`${chart}-range`}
        value={controlsFor(chart).range}
        onChange={range => setRange(chart, range)}
      />
      <GroupingPicker
        id={`${chart}-grouping`}
        value={controlsFor(chart).bucket}
        onChange={bucket => setBucket(chart, bucket)}
      />
    </div>
  );

  // Checked against the LINE, not the combined `quality` array: the area
  // layers are zero-filled (never null — see buildQualityIndexAreaSeries), so
  // testing the combined array would never report "empty" even when no
  // dimension had any data.
  const noQuality = !qualityLine.some(d => d.value !== null);
  const noSentiment = !sentiment.some(d => d.value !== null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Actor goal score"
          value={
            data?.overallCompositeScore === null || !data ? "—" : `${data.overallCompositeScore}`
          }
          n={data?.totalEvaluatedSessions}
          nUnit="evaluated sessions"
          minN={MIN_N_FOR_SCORE}
          loading={loading}
          description="Mean LLM-judge composite over the window, 0–100. One of the four inputs to the Quality index chart below — not the same figure."
        />

        <KpiTile
          label="Proxy NPS"
          value={data?.overallProxyNps === null || !data ? "—" : `${data.overallProxyNps}`}
          n={data?.totalResponses}
          nUnit="ratings"
          loading={loading}
          description="NOT an NPS — derived from the 1–5 rating. See the note below."
        />

        <KpiTile
          label="Do they move together?"
          value={data?.correlation === null || !data ? "—" : data.correlation.toFixed(2)}
          n={data?.pairedBuckets}
          nUnit="paired periods"
          loading={loading}
          description="Pearson r across periods that have both. Co-movement, not cause."
        />

        {/* The median beside the mean, and the top-2-box beside the proxy NPS.
            Both are deliberately shown next to their mean-based neighbours: a
            mean over a small sample and a mean of an ordinal scale each hide
            the thing a reader would act on, and the pairing is what makes that
            visible rather than asserted. */}
        <KpiTile
          label="Median quality score"
          description={`Median composite score of evaluated sessions, ${SCORE_DOMAIN[0]}–${SCORE_DOMAIN[1]}, judged by an LLM against the scenario rubric. Median, not mean: one outlying session moves a mean and not a median.`}
          value={formatScore(dist?.summary.medianScore)}
          n={dist?.summary.evaluatedSessions}
          nUnit="evaluated sessions"
          minN={MIN_N_FOR_SCORE}
          loading={distLoading}
        />
        <KpiTile
          label="Rated 4–5"
          description="Share of post-session ratings that were 4 or 5. Rating is optional, so this covers only sessions that were rated."
          value={formatPct(dist?.summary.top2BoxPct)}
          n={dist?.summary.responses}
          nUnit="ratings"
          minN={MIN_N_FOR_SCORE}
          loading={distLoading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Roleplay quality"
          caption={
            `Weighted blend of four dimensions per ${bucketTitle(controls.bucket).toLowerCase()} — ` +
            `the stack is what it's made of, the line is their sum. ` +
            `${boundedDomainNote(QUALITY_INDEX_DOMAIN)} A period with no data in ANY ` +
            `dimension breaks the line rather than dropping to zero.` +
            (fullyCalibrated
              ? ""
              : " Some dimensions are still on PLACEHOLDER anchors, not yet " +
                "measured from production traffic — see the note below.")
          }
          source={buildSource({
            derivation:
              "Weighted blend of actor-goal score, in-character rate, language " +
              "quality and response latency; each normalised 0-100 and re-weighted " +
              "over whichever dimensions had data" +
              (data?.indexVersion ? ` (index v${data.indexVersion})` : ""),
            window: windowNote,
            n: data?.totalEvaluatedSessions,
            nUnit: "evaluated sessions",
            asOf,
            extra: windowLabel(data?.window),
          })}
          loading={loading}
          error={Boolean(error)}
          empty={!isLoading && noQuality}
          emptyText="No session in this window has been evaluated"
          errorSubtitle="There was a problem fetching quality scores."
          onRetry={() => void refetch()}
          controls={pickers}
          onExpand={() => setExpanded("compare")}
        >
          <ScrollableChart data={quality}>
            <ComboChart
              data={quality}
              options={stackedAreaLineOpts({
                // Fixed stack order, not derived from the data present: the
                // order is part of the chart's contract (see
                // QUALITY_INDEX_DIMENSIONS in unitCostChart.ts), so it must not
                // reshuffle depending on which dimensions this window happens
                // to cover.
                areaGroups: QUALITY_INDEX_DIMENSIONS.map(d => QUALITY_INDEX_DIMENSION_LABELS[d]),
                lineGroup: QUALITY_INDEX_LABEL,
                colorScale: QUALITY_INDEX_SCALE,
                leftTitle: "Quality index",
                bottomTitle: bucketTitle(controls.bucket),
                domain: QUALITY_INDEX_DOMAIN,
              })}
            />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Learner sentiment (proxy NPS)"
          caption={
            `%promoters − %detractors from the 1–5 post-session rating, on the ` +
            `NPS ±100 scale. ${boundedDomainNote(PROXY_NPS_DOMAIN)} Suppressed ` +
            `in any period with fewer than ${data?.minResponses ?? 5} responses, ` +
            `where a single rating moves it by tens of points.`
          }
          source={buildSource({
            derivation: "scenario_session_feedbacks.rating, cut 5 / 4 / <=3",
            window: windowNote,
            n: data?.totalResponses,
            nUnit: "ratings",
            asOf,
            extra: windowLabel(data?.window),
          })}
          loading={loading}
          error={Boolean(error)}
          empty={!isLoading && noSentiment}
          emptyText="Not enough ratings in this window to state a figure"
          errorSubtitle="There was a problem fetching learner sentiment."
          onRetry={() => void refetch()}
          onExpand={() => setExpanded("compare")}
        >
          <ScrollableChart data={sentiment}>
            <LineChart
              data={sentiment}
              options={lineOpts({
                colorScale: PROXY_NPS_SCALE,
                leftTitle: "Proxy NPS",
                bottomTitle: bucketTitle(controls.bucket),
                domain: PROXY_NPS_DOMAIN,
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* The distribution and the raw ratings behind the two summary series
          above. Same sessions, read three more ways: the spread the median
          hides, the rating mix an average flattens, and what learners said was
          wrong when they rated low. */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Roleplay quality — median and spread"
          caption={`The distribution behind the quality average: the median with its interquartile range. A median that climbs while the quartiles stay wide is a different story from one that climbs while they converge. Periods with fewer than ${
            dist?.minSampleSize ?? MIN_N_FOR_SCORE
          } evaluated sessions carry no percentiles. ${boundedDomainNote(SCORE_DOMAIN)}${inProgressCaption(
            distControls.bucket,
            distInProgress,
          )}`}
          source={buildSource({
            derivation: "LLM-judged composite score per session, percentiles per period",
            window: windowLabel(dist?.window),
            n: dist?.summary.evaluatedSessions,
            nUnit: "evaluated sessions",
            extra: groupingNote(distControls.bucket),
            asOf: dist?.computedAt ? new Date(dist.computedAt).toLocaleDateString() : undefined,
          })}
          loading={distLoading}
          error={distQ.isError}
          onRetry={distQ.refetch}
          empty={!distLoading && distSeries.length === 0}
          controls={chartPickers("distribution")}
          onExpand={() => setExpanded("distribution")}
        >
          <ScrollableChart data={distSeries}>
            <LineChart data={distSeries} options={distOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Satisfaction mix"
          caption={`Ratings split into 1–2 / 3 / 4–5 rather than averaged: a mean of 3.8 from all-4s and a mean of 3.8 from half-5s-and-half-2s call for opposite responses. ${satRated.length} period${
            satRated.length === 1 ? "" : "s"
          } carry ratings; periods with none are absent, because a mix over nobody is undefined.${inProgressCaption(
            satControls.bucket,
            satInProgress,
          )}`}
          source={buildSource({
            derivation: "Post-session ratings grouped into bands, share per period",
            window: windowLabel(sat?.window),
            n: sat?.summary.responses,
            nUnit: "ratings",
            extra: `${groupingNote(satControls.bucket)} · ${formatPct(
              sat?.summary.responseRatePct,
            )} of completed sessions were rated`,
            asOf: sat?.computedAt ? new Date(sat.computedAt).toLocaleDateString() : undefined,
          })}
          takeaway={satisfactionTakeaway(satPoints)}
          loading={satLoading}
          error={satQ.isError}
          onRetry={satQ.refetch}
          empty={!satLoading && satSeries.length === 0}
          emptyText="No ratings in any period on this axis"
          controls={chartPickers("satisfaction")}
          onExpand={() => setExpanded("satisfaction")}
        >
          <ScrollableChart data={satSeries}>
            <StackedBarChart data={satSeries} options={satOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          wide
          title="What low-rated sessions were tagged with"
          caption="Tags on sessions rated 3 or below, ranked. Counts, not shares: tagging is optional, so the denominator is the tagged low ratings and not all sessions. The leader is in the accent colour and the tail in grey — the order is the point. Reads the window set on the quality panel above."
          source={buildSource({
            derivation: "Tags on post-session ratings <= 3",
            window: windowLabel(dist?.window),
            n: dist?.summary.taggedLowRatings,
            nUnit: "tagged low ratings",
            asOf: dist?.computedAt ? new Date(dist.computedAt).toLocaleDateString() : undefined,
          })}
          loading={distLoading}
          error={distQ.isError}
          onRetry={distQ.refetch}
          empty={!distLoading && tagBars.length === 0}
          emptyText="No tags on low-rated sessions yet"
          onExpand={() => setExpanded("tags")}
        >
          <ScrollableChart data={tagBars} on="group">
            <SimpleBarChart data={tagBars} options={tagOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* Per-dimension coverage/calibration, one line each. Not a paraphrase of
          a server string (the index has no single `note` field to render
          verbatim) — built from `indexCoverage`, the same array the card's
          caption checks via `fullyCalibrated`, so the two can't disagree. */}
      {coverageNotes.length > 0 && (
        <div className="mt-4 max-w-3xl text-xs leading-relaxed text-typography-500">
          <strong>On the quality index:</strong> each dimension is normalised against anchors
          measured from production traffic, pinned to one judge version, and re-weighted whenever a
          dimension has no data in a period.
          <ul className="mt-1 list-disc pl-5">
            {coverageNotes.map((note, i) => (
              <li key={QUALITY_INDEX_DIMENSIONS[i]}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The server's own caveat, rendered verbatim. Paraphrasing it here would
          create a second wording that can drift from the one the API guarantees. */}
      {data?.proxyNote && (
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-typography-500">
          <strong>On the proxy NPS:</strong> {data.proxyNote}
        </p>
      )}

      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-typography-500">
        {correlationNote(data)}
      </p>

      <ChartDetailModal
        open={expanded === "compare"}
        onClose={() => setExpanded(null)}
        title="Quality index against learner sentiment"
        caption={
          "Both series per period with the counts behind them. The sentiment " +
          "column is a PROXY derived from the 1–5 rating, not an NPS. " +
          '"Actor goal score" is one of the index\'s four inputs, kept here ' +
          "for audit — it is not the plotted quality series."
        }
        render={({ height }) => (
          <ComboChart
            data={quality}
            options={stackedAreaLineOpts({
              areaGroups: QUALITY_INDEX_DIMENSIONS.map(d => QUALITY_INDEX_DIMENSION_LABELS[d]),
              lineGroup: QUALITY_INDEX_LABEL,
              colorScale: QUALITY_INDEX_SCALE,
              leftTitle: "Quality index",
              bottomTitle: bucketTitle(controls.bucket),
              domain: QUALITY_INDEX_DOMAIN,
              height,
            })}
          />
        )}
        table={{
          columns: [
            bucketTitle(controls.bucket),
            QUALITY_INDEX_LABEL,
            "Actor goal score",
            "Evaluated sessions",
            PROXY_NPS_LABEL,
            "Mean rating",
            "Ratings",
            "Promoters",
            "Passives",
            "Detractors",
          ],
          rows: (data?.points ?? []).map(p => [
            p.bucket,
            p.qualityIndex ?? "—",
            p.avgCompositeScore ?? "—",
            p.evaluatedSessions,
            p.proxyNps ?? "—",
            p.avgRating ?? "—",
            p.responses,
            p.promoters,
            p.passives,
            p.detractors,
          ]),
        }}
        exportContext={[
          data?.proxyNote ?? "",
          ...coverageNotes,
          `Window: ${windowLabel(data?.window) ?? windowNote}`,
        ].filter(Boolean)}
        exportFilename="quality-index-vs-sentiment"
      />

      <ChartDetailModal
        open={expanded === "distribution"}
        onClose={() => setExpanded(null)}
        title="Roleplay quality — median and spread"
        caption="Percentiles are blank for periods below the sample floor."
        source={buildSource({
          derivation: "LLM-judged composite score, percentiles per period",
          window: windowLabel(dist?.window),
          extra: groupingNote(distControls.bucket),
          asOf: dist?.computedAt ? new Date(dist.computedAt).toLocaleDateString() : undefined,
        })}
        zoomable
        zoomNote="Axis zoomed to the data range — the tile shows the full 0–100 scale."
        render={({ height, zoomed }) => (
          <LineChart
            data={distSeries}
            options={{ ...(zoomed ? distZoomedOpts : distOpts), height }}
          />
        )}
        table={{
          columns: [
            bucketTitle(distControls.bucket),
            "Median",
            "25th pct",
            "75th pct",
            "Evaluated",
          ],
          rows: (dist?.quality ?? []).map(p => [
            rowKey(p.bucket, distInProgress),
            p.median,
            p.p25,
            p.p75,
            p.evaluatedSessions,
          ]),
        }}
        exportContext={[
          `Window: ${windowLabel(dist?.window)}`,
          `Grouping: ${bucketTitle(distControls.bucket)}`,
          ...(distInProgress
            ? [`${distInProgress} is still accruing — provisional, and omitted from the chart`]
            : []),
          `Percentiles are blank below ${dist?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions`,
        ]}
        exportFilename="roleplay-quality-distribution"
      />

      <ChartDetailModal
        open={expanded === "satisfaction"}
        onClose={() => setExpanded(null)}
        title="Satisfaction mix"
        caption="The counts behind the shares, plus the response rate the shares are silent about."
        source={buildSource({
          derivation: "Post-session ratings grouped into bands",
          window: windowLabel(sat?.window),
          extra: groupingNote(satControls.bucket),
          asOf: sat?.computedAt ? new Date(sat.computedAt).toLocaleDateString() : undefined,
        })}
        render={({ height }) => (
          <StackedBarChart data={satSeries} options={{ ...satOpts, height }} />
        )}
        table={{
          columns: [
            bucketTitle(satControls.bucket),
            "1–2",
            "3",
            "4–5",
            "Ratings",
            "4–5 %",
            "Completed sessions",
            "Response rate %",
          ],
          rows: (sat?.satisfaction ?? []).map(p => [
            rowKey(p.bucket, satInProgress),
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
          `Window: ${windowLabel(sat?.window)}`,
          `Grouping: ${bucketTitle(satControls.bucket)}`,
          ...(satInProgress
            ? [`${satInProgress} is still accruing — provisional, and omitted from the chart`]
            : []),
          "Rating is optional: the response rate is the share of completed sessions that were rated",
        ]}
        exportFilename="satisfaction-mix"
      />

      <ChartDetailModal
        open={expanded === "tags"}
        onClose={() => setExpanded(null)}
        title="What low-rated sessions were tagged with"
        caption="Tags on ratings of 3 or below. Optional, so counts — not shares of all sessions."
        source={buildSource({
          derivation: "Tags on post-session ratings <= 3",
          window: windowLabel(dist?.window),
          n: dist?.summary.taggedLowRatings,
          nUnit: "tagged low ratings",
          asOf: dist?.computedAt ? new Date(dist.computedAt).toLocaleDateString() : undefined,
        })}
        render={({ height }) => <SimpleBarChart data={tagBars} options={{ ...tagOpts, height }} />}
        table={{
          columns: ["Tag", "Low-rated sessions"],
          rows: (dist?.lowRatingTags ?? []).map(t => [t.tag, t.count]),
        }}
        exportContext={[
          `Window: ${windowLabel(dist?.window)}`,
          "Tags on post-session ratings of 3 or below; tagging is optional",
        ]}
        exportFilename="low-rating-tags"
      />
    </>
  );
};
