import { useMemo, useState } from "react";

import { LineChart, ScatterChart } from "@carbon/charts-react";

import { useGetFoundationalSkillsSelfEfficacyQuery } from "@api";
import { QualityDistributionResponse } from "@types";

import { asOfStamp } from "./analyticsFilters";
import { ChangeWhiskers } from "./ChangeWhiskers";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, boundedDomainNote, buildSource, lineOpts, scatterOpts } from "./chartKit";
import {
  CALIBRATION_SCALE,
  ORDINAL_SCALE,
  SELF_EFFICACY_NOT_MEASURED,
  SELF_RATING_CAVEAT,
  SelfEfficacyResponse,
  calibrationPoints,
  calibrationTable,
  calibrationTakeaway,
  confidenceRows,
  confidenceTable,
  confidenceTakeaway,
  hasOrdinalValues,
  ordinalSeries,
  ordinalTable,
  ordinalTakeaway,
  safetyFlagText,
  selfEfficacyNotMeasured,
  withheldOrdinalCount,
} from "./perceptionChart";

type Expanded = "ordinal" | "confidence" | "calibration" | null;

const NOT_DEPLOYED = "endpoint did not respond — it may not be deployed yet.";

/** The tab's own quality-distribution query, handed down so this section never fetches it twice. */
export interface QualityDistributionState {
  data?: QualityDistributionResponse;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Response to THESE arguments only — never the previous org's while the new one loads. */
const stateOf = <T,>(q: {
  currentData?: T;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}) => {
  const data = q.currentData;
  return {
    data,
    loading: !data && (q.isLoading || q.isFetching),
    error: !data && q.isError && !q.isFetching,
    onRetry: q.refetch,
  };
};

/** The scatter's own tooltip: the answer as given, not the jittered position. */
const calibrationTooltip =
  (names: Map<string, string>) =>
  (data: unknown): string => {
    const d = (Array.isArray(data) ? data[0] : data) as
      | { selfRating?: number; level?: number; skill?: string }
      | undefined;
    if (!d || d.selfRating === undefined) return "";
    const skill = names.get(d.skill ?? "") ?? d.skill ?? "";
    return `<div class="text-xs" style="padding:4px 8px">${skill}: self-rated ${d.selfRating}/10 · judged level ${d.level}</div>`;
  };

/** "Internal" marker for safety numbers from unaudited judge coding. */
const InternalTag = () => (
  <span className="rounded border border-[#a2191f] px-1 text-[10px] font-semibold uppercase tracking-wide text-[#a2191f]">
    Internal
  </span>
);

/**
 * Quality & sentiment → "Perception": how learners feel about their practice
 * and about their own skill, each read beside something that is not their
 * own opinion.
 *
 *  - AAQ-229 Satisfaction by practice ordinal — from the tab's own
 *    quality-distribution response (`byOrdinal`), never fetched twice.
 *  - AAQ-230 Confidence start → now, per tier, and AAQ-231 Confidence against
 *    competence — the self-efficacy instrument, always beside the AI judge.
 *    Learners are poor, often over-confident self-assessors, so a self-rating
 *    is never shown as an outcome on its own (Stacks: "Include Self-Assessment
 *    Despite Known Accuracy Limitations" — collect it, but always triangulate).
 *
 * All three are all-time by construction and follow the page's org filter.
 */
export const PerceptionSection = ({
  tenantId,
  distribution,
}: {
  tenantId?: string;
  distribution: QualityDistributionState;
}) => {
  const [expanded, setExpanded] = useState<Expanded>(null);
  const efficacy = stateOf(useGetFoundationalSkillsSelfEfficacyQuery(tenantId ? { tenantId } : {}));

  const b = distribution.data?.byOrdinal;
  // The response came back without the block: a backend from before AAQ-229.
  const ordinalMissing = !!distribution.data && !b;
  const se: SelfEfficacyResponse | undefined = efficacy.data;
  const notMeasured = !!se && selfEfficacyNotMeasured(se);

  const series = useMemo(() => (b ? ordinalSeries(b) : []), [b]);
  const ordinalOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Mean rating (1–5)",
        bottomTitle: "Learner's Nth rated session",
        colorScale: ORDINAL_SCALE,
        domain: distribution.data?.ratingDomain ?? [1, 5],
        extra: { points: { enabled: true, radius: 3 } },
      }),
    [distribution.data?.ratingDomain],
  );

  const rows = useMemo(() => (se ? confidenceRows(se) : { self: [], judge: [] }), [se]);
  const points = useMemo(() => (se ? calibrationPoints(se) : []), [se]);
  const skillNames = useMemo(
    () => new Map((se?.calibration.skills ?? []).map(s => [s.skill, s.name])),
    [se],
  );
  const scatterOptions = (height?: string) =>
    scatterOpts({
      leftTitle: "Judged level (1–4)",
      bottomTitle: "Self-rated confidence (0–10)",
      colorScale: CALIBRATION_SCALE,
      // Half a step of room on each side so jittered dots at the ends stay on the plot.
      domain: [0.5, 4.5],
      xDomain: [-0.5, 10.5],
      ...(height ? { height } : {}),
      extra: { tooltip: { customHTML: calibrationTooltip(skillNames) } },
    });

  const withheld = b ? withheldOrdinalCount(b) : 0;
  const ordinalSource = buildSource({
    derivation: "Post-session ratings by the learner's Nth rated session",
    window: "All time",
    n: b?.ratedLearners,
    nUnit: "learners with a rating",
    extra:
      b && b.ratingsBeyondLastOrdinal > 0
        ? `${b.ratingsBeyondLastOrdinal} ratings past the ${b.maxOrdinal}th not plotted`
        : undefined,
    asOf: asOfStamp(distribution.data?.computedAt),
  });
  const efficacySource = buildSource({
    derivation: "Learner self-ratings (0–10) beside the AI judge's levels, same learners",
    window: "All time",
    n: se?.coverage.learnersAnswered,
    nUnit: "learners who answered",
    extra: se ? `instrument ${se.instrumentVersion} · rubric ${se.rubricVersion}` : undefined,
    asOf: asOfStamp(se?.computedAt),
  });
  const notMeasuredText = se
    ? `${SELF_EFFICACY_NOT_MEASURED} ${se.coverage.learnersAsked} learner${
        se.coverage.learnersAsked === 1 ? " has" : "s have"
      } been asked so far.`
    : SELF_EFFICACY_NOT_MEASURED;
  const flag = se?.calibration.safetyFlag;

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-typography-900">Perception</h3>
        <p className="max-w-4xl text-xs leading-relaxed text-typography-500">
          How learners feel about their practice as they gain experience, and how confident they are
          in their own helping skills — each read beside something that is not their own opinion.
          All time, whatever the windows above.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          wide
          title="Satisfaction by practice ordinal"
          caption={
            b
              ? `All time, whatever the window above: the mean 1–5 rating at each learner's 1st, 2nd … ${b.maxOrdinal}th rated session (sessions they did not rate are not counted). Two lines: every learner who reached that rating, and a fixed panel of the ${b.experiencedLearners} learners with ${b.experiencedMinRatings}+ ratings — learners who keep rating may be the satisfied ones, so if only the all-learners line rises, what moved is who still answers. Points with fewer than ${b.minSampleSize} ratings are left out${
                  withheld > 0 ? ` (${withheld} on the all-learners line)` : ""
                }. ${boundedDomainNote(distribution.data?.ratingDomain ?? [1, 5])}`
              : "All time: the mean rating at each learner's Nth rated session."
          }
          source={ordinalSource}
          takeaway={b ? ordinalTakeaway(b) : undefined}
          loading={distribution.loading}
          error={distribution.error || ordinalMissing}
          onRetry={distribution.onRetry}
          errorSubtitle={`The satisfaction-by-ordinal ${NOT_DEPLOYED}`}
          n={b?.ratedLearners}
          nUnit="learners with a rating"
          minN={b?.minSampleSize}
          empty={!!b && !hasOrdinalValues(b)}
          emptyText="No rated session has enough ratings to state a mean yet"
          onExpand={b ? () => setExpanded("ordinal") : undefined}
          chartId="AAQ-229"
        >
          <LineChart data={series} options={ordinalOpts} />
        </ChartCard>

        <ChartCard
          title="Confidence start → now, per tier"
          caption={`Each learner's self-rated confidence on their first and latest answer (0–10, the same questions revisited), per tier, ± 95% interval — and below it, in grey, the AI judge's level (1–4) for the same learners at the slices nearest those two answers. Different scales, so they never share an axis. ${SELF_RATING_CAVEAT}`}
          source={efficacySource}
          takeaway={se && !notMeasured ? confidenceTakeaway(se) : undefined}
          loading={efficacy.loading}
          error={efficacy.error}
          onRetry={efficacy.onRetry}
          errorSubtitle={`The self-efficacy ${NOT_DEPLOYED}`}
          n={notMeasured ? undefined : se?.confidence.learnersWithTwoOrMore}
          nUnit="learners with two or more answers"
          minN={notMeasured ? undefined : se?.minSampleSize}
          empty={notMeasured}
          emptyText={notMeasuredText}
          onExpand={se && !notMeasured ? () => setExpanded("confidence") : undefined}
          chartId="AAQ-230"
        >
          {se && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-typography-900">
                  Self-rated confidence (0–10 points)
                </span>
                <ChangeWhiskers rows={rows.self} decimals={1} unit=" pts" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-typography-500">
                  AI judge, same learners (level 1–4)
                </span>
                <ChangeWhiskers rows={rows.judge} emptyLabel="too few judged" />
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Confidence against competence"
          caption={
            se
              ? `Each dot is one self-rating (0–10) against the level the AI judge gave that skill in the learner's nearest scored slice (within ${se.calibration.thresholds.matchWindowDays} days), nudged slightly so equal answers do not stack. Self-ratings are put on the 1–4 scale as ${se.calibration.thresholds.rescale}; more than ${se.calibration.thresholds.band} levels above the judge counts as over-confident, more than ${se.calibration.thresholds.band} below as under-confident. Counts use each learner's latest matched answer; dots are drawn only for skills with ${se.minSampleSize}+ learners.${
                  se.calibration.pointsTruncated
                    ? ` Showing the latest ${se.calibration.pointCap.toLocaleString()} of ${se.calibration.pointsTotal.toLocaleString()} answers.`
                    : ""
                } ${SELF_RATING_CAVEAT}`
              : `Each learner's self-rating against the AI judge's level. ${SELF_RATING_CAVEAT}`
          }
          source={efficacySource}
          takeaway={se && !notMeasured ? calibrationTakeaway(se) : undefined}
          loading={efficacy.loading}
          error={efficacy.error}
          onRetry={efficacy.onRetry}
          errorSubtitle={`The self-efficacy ${NOT_DEPLOYED}`}
          n={notMeasured ? undefined : se?.calibration.overall.learners}
          nUnit="learners matched to a judged slice"
          minN={notMeasured ? undefined : se?.minSampleSize}
          empty={notMeasured}
          emptyText={notMeasuredText}
          onExpand={se && !notMeasured ? () => setExpanded("calibration") : undefined}
          chartId="AAQ-231"
        >
          {se && (
            <div className="flex flex-col gap-2">
              {points.length > 0 ? (
                <ScatterChart data={points} options={scatterOptions()} />
              ) : (
                <p className="text-xs text-typography-500">
                  No single skill has {se.minSampleSize} matched learners yet, so no dots are drawn;
                  the counts above pool every skill.
                </p>
              )}
              {flag && (
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] leading-snug text-typography-700">
                  <InternalTag />
                  <span>
                    {safetyFlagText(flag)} {flag.note}
                  </span>
                </p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {b && expanded === "ordinal" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Satisfaction by practice ordinal"
          caption="Mean rating and the share rated 4–5 at each rated session, every learner and the fixed panel. Blank = fewer ratings than the floor."
          source={ordinalSource}
          render={({ height }) => <LineChart data={series} options={{ ...ordinalOpts, height }} />}
          table={ordinalTable(b)}
          exportContext={[b.provenance.derivation, b.provenance.note]}
          exportFilename="satisfaction-by-ordinal"
        />
      )}
      {se && expanded === "confidence" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Confidence start → now"
          caption={`Per tier and per skill: self-rating first → latest (0–10), the same for only the learners the judge covers, and the judge's level (1–4). ${SELF_RATING_CAVEAT}`}
          source={efficacySource}
          render={() => (
            <div className="flex flex-col gap-4">
              <ChangeWhiskers rows={rows.self} decimals={1} unit=" pts" />
              <ChangeWhiskers rows={rows.judge} emptyLabel="too few judged" />
            </div>
          )}
          table={confidenceTable(se)}
          exportContext={[se.provenance.derivation, se.caveat]}
          exportFilename="confidence-start-now"
        />
      )}
      {se && expanded === "calibration" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Confidence against competence"
          caption={`Per skill: learners over-confident, calibrated and under-confident, the mean gap (self − judge, in levels) and the rank correlation. ${SELF_RATING_CAVEAT}`}
          source={efficacySource}
          render={({ height }) =>
            points.length > 0 ? (
              <ScatterChart data={points} options={scatterOptions(height)} />
            ) : null
          }
          table={calibrationTable(se)}
          exportContext={[se.provenance.derivation, se.caveat, flag?.note ?? ""]}
          exportFilename="confidence-against-competence"
        />
      )}
    </section>
  );
};
