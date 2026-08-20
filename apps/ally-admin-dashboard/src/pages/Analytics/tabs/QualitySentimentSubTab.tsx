import { useMemo, useState } from "react";

import { ComboChart, LineChart } from "@carbon/charts-react";

import { useGetQualitySentimentQuery } from "@api";

import { AnalyticsTabFilters, windowLabel } from "../analyticsFilters";
import { bucketTitle, groupingNote } from "../analyticsGrouping";
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
  lineOpts,
  stackedAreaLineOpts,
} from "../chartKit";
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

type ChartId = "qualitySentiment";

const CHARTS: readonly ChartId[] = ["qualitySentiment"];

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

  // Checked against the LINE, not the combined `quality` array: the area
  // layers are zero-filled (never null — see buildQualityIndexAreaSeries), so
  // testing the combined array would never report "empty" even when no
  // dimension had any data.
  const noQuality = !qualityLine.some(d => d.value !== null);
  const noSentiment = !sentiment.some(d => d.value !== null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
    </>
  );
};
