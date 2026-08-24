/**
 * Series builders and scales for the charts that were staged on the former
 * **Testing** tab.
 *
 * The tab is gone — its twenty charts were distributed across the Highlights
 * sub-tabs in 2026-08 — but the module keeps its name: several of these helpers
 * are already shared with skillGrowthChart.ts, OrgHealthCard and the Weak
 * performing metrics tab, and renaming a file that eight others import (plus its
 * two test files) would put churn in front of every future `git blame` here for
 * no reader-visible gain. Nothing in it is provisional any more.
 */

import {
  ActivationFunnel,
  CoachingLoopPoint,
  CompetencyMapRow,
  CompletionRatePoint,
  LanguageMixPoint,
  OrgHealthRow,
  PractisingLearnersPoint,
  QualityDistributionPoint,
  SatisfactionMixPoint,
  ScribeAdoptionPoint,
  SkillGrowthOrdinal,
  TimeToFirstPractice,
  TrackItemTypeRow,
} from "@types";

import { CONTEXT, ColorScale, PALETTE, sequentialScale, stableScale } from "./chartScales";
import { FunnelStage } from "./FunnelBars";

/**
 * Pure transforms for the Testing tab. Kept out of the component for the same
 * reason the highlights and usage-level builders are: the rules they encode are
 * honesty rules, not layout, and they should be assertable without a DOM.
 *
 * The rules that recur here:
 *  - **A null stays null.** The server sends null for a rate over a zero
 *    denominator and for a score below the sample floor. Carbon breaks a line at
 *    a null, which is exactly right — a gap reads as missing data, where a zero
 *    reads as a measurement of nothing happening.
 *  - **Shares are computed from counts, once, against a named denominator.** No
 *    chart here divides by a number that is not also on the surface.
 *  - **A residual is grey.** "Never practised", "Other", "all remaining orgs" are
 *    absences of a category, not the lowest step of one, so they take a context
 *    grey rather than the palest step of an ordered ramp.
 */

export type Datum = { group: string; key: string; value: number | null };
export type BarDatum = { group: string; value: number };
export type ScatterDatum = { group: string; x: number; y: number };

/** Series labels, kept beside the scales so data groups and colours cannot drift. */
export const TESTING_GROUPS = {
  practisingLearners: "Practising learners",
  completionRate: "Completion rate",
  medianScore: "Median",
  p25: "25th percentile",
  p75: "75th percentile",
  ratingLow: "1–2",
  ratingMid: "3",
  ratingHigh: "4–5",
  sharedSessions: "Sessions shared",
  turnaround: "Median hours to first comment",
  scribeOrgs: "Orgs using Scribe",
  scribeSessions: "Scribe sessions",
  competency: "Competency",
  neverPractised: "Never yet",
  itemCompletion: "Completed of reached",
  tagCount: "Low-rated sessions",
};

export const SCORE_DOMAIN: [number, number] = [0, 100];
export const PCT_DOMAIN: [number, number] = [0, 100];

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export const formatCount = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : n.toLocaleString();

export const formatPct = (n: number | null | undefined, decimals = 0): string =>
  n === null || n === undefined ? "—" : `${n.toFixed(decimals)}%`;

/**
 * A score from a 0–100 composite of LLM-judged rubric items. One decimal, never
 * two: the underlying metric is a mean of integer rubric scores, and a second
 * decimal claims a precision the rubric does not carry.
 */
export const formatScore = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : n.toFixed(1);

/** Turnaround in the unit a reader thinks in: hours under a day, then days. */
export const formatHours = (h: number | null | undefined): string => {
  if (h === null || h === undefined) return "—";
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
};

/** "12 Mar 2026" for a stamp that has to fit in a table cell. */
export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
};

/* -------------------------------------------------------------------------- */
/* North star — weekly practising learners                                    */
/* -------------------------------------------------------------------------- */

export const PRACTISING_SCALE: ColorScale = {
  [TESTING_GROUPS.practisingLearners]: PALETTE.blue,
};

export const buildPractisingLearnersSeries = (points: PractisingLearnersPoint[]): Datum[] =>
  points.map(p => ({
    group: TESTING_GROUPS.practisingLearners,
    key: p.bucket,
    value: p.learners,
  }));

/**
 * The finding, computed: where the series stands now and against what.
 *
 * The basis is the FIRST plotted bucket rather than the previous one — on an
 * all-time surface the reader's question is the trajectory, and a
 * bucket-over-bucket move on a weekly count is mostly noise. Returns null rather
 * than comparing a single point with itself.
 */
export const practisingTakeaway = (points: PractisingLearnersPoint[]): string | null => {
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  const head = `${latest.learners.toLocaleString()} learners completed a scored session in the latest full period`;
  if (points.length < 2) return head;
  const first = points[0];
  const diff = latest.learners - first.learners;
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  return `${head} — ${arrow} ${Math.abs(diff).toLocaleString()} vs the first period on the axis`;
};

/* -------------------------------------------------------------------------- */
/* Activation funnel and time to first practice                               */
/* -------------------------------------------------------------------------- */

/** Server-ordered stages; the last one is the success state and takes the accent. */
export const buildActivationFunnelStages = (funnel?: ActivationFunnel): FunnelStage[] => {
  if (!funnel || funnel.stages.length === 0) return [];
  return funnel.stages.map((s, i) => ({
    label: s.label,
    reached: s.reached,
    terminal: i === funnel.stages.length - 1,
  }));
};

/**
 * Days-to-first-practice as COUNTS of people, with the never-activated group as
 * a trailing residual bar.
 *
 * Counts rather than shares: they are comparable at both ends of a skewed
 * distribution, they start honestly at zero, and they leak nothing, so the
 * minimum-group-size rule never has to blank the chart itself. The shares belong
 * in the takeaway and the table.
 *
 * The residual bar is last and grey. Someone who has never practised has no
 * first-session row to bucket, so their bar is `registered − activated`: it is
 * the absence of a time-to-value, not the slowest one, and colouring it as the
 * dark end of the ramp would rank it as though it were.
 */
export const buildTimeToFirstBars = (ttf?: TimeToFirstPractice): BarDatum[] => {
  if (!ttf) return [];
  const bands = ttf.bands.map((b, i) => ({
    group: b.label,
    value: ttf.learnersByBand[i] ?? 0,
  }));
  return [...bands, { group: TESTING_GROUPS.neverPractised, value: ttf.neverPractised }];
};

/**
 * Ordered ramp over the day bands, context grey for the residual.
 *
 * The bands are ordered (sooner → later), so they get one hue at rising
 * saturation; a rainbow would imply the bands differ in kind rather than degree.
 */
export const buildTimeToFirstScale = (ttf?: TimeToFirstPractice): ColorScale => ({
  ...sequentialScale((ttf?.bands ?? []).map(b => b.label)),
  [TESTING_GROUPS.neverPractised]: CONTEXT.faint,
});

/* -------------------------------------------------------------------------- */
/* Skill growth — median with its interquartile range                         */
/* -------------------------------------------------------------------------- */

/**
 * Which population the curve is read over.
 *
 * Both come from one response computed in one pass, so switching cannot make the
 * two divide different numerators — and both are offered because the survivorship
 * question has no single right answer:
 *  - `all` — every learner's Nth session. Honest about who is in the platform,
 *    but the later ordinals are made of people who chose to keep going.
 *  - `experienced` — only learners who completed enough sessions to appear at
 *    both ends of the axis, so the curve compares the same people with
 *    themselves. Narrower, and the control for the survivorship the first view
 *    cannot rule out.
 */
export type SkillGrowthVariant = "all" | "experienced";

export const SKILL_GROWTH_VARIANTS: {
  key: SkillGrowthVariant;
  label: string;
  description: (minSessions: number) => string;
}[] = [
  {
    key: "all",
    label: "All learners",
    description: () => "every learner's Nth evaluated session, whoever they are",
  },
  {
    key: "experienced",
    label: "Learners who stayed",
    description: n =>
      `only learners with ${n}+ evaluated sessions, so the curve compares the same people with themselves`,
  },
];

export const SKILL_GROWTH_SCALE: ColorScale = {
  [TESTING_GROUPS.medianScore]: PALETTE.blue,
  [TESTING_GROUPS.p25]: CONTEXT.faint,
  [TESTING_GROUPS.p75]: CONTEXT.faint,
};

/** The x-axis tick for an ordinal: the reader thinks "1st", not "1". */
export const ordinalLabel = (ordinal: number): string => {
  const suffix =
    ordinal % 10 === 1 && ordinal % 100 !== 11
      ? "st"
      : ordinal % 10 === 2 && ordinal % 100 !== 12
        ? "nd"
        : ordinal % 10 === 3 && ordinal % 100 !== 13
          ? "rd"
          : "th";
  return `${ordinal}${suffix}`;
};

/**
 * Median, p25 and p75 per ordinal — three series, one for the finding and two for
 * the spread.
 *
 * An average without a distribution is a half-truth, and in scoring the spread is
 * always the interesting half: a median that climbs while the quartiles stay wide
 * apart is a different story from one that climbs while they converge.
 *
 * Ordinals whose median the server suppressed (n below the sample floor) are cut
 * from the plot rather than drawn as gaps. They are always the tail of the axis —
 * few learners reach a 12th session — and a line that fades into a run of gaps
 * invites the reader to extrapolate through them.
 */
export const buildSkillGrowthSeries = (
  ordinals: SkillGrowthOrdinal[],
  variant: SkillGrowthVariant,
): Datum[] => {
  const plottable = plottableOrdinals(ordinals, variant);
  return plottable.flatMap(o => {
    const stat = o[variant];
    return [
      { group: TESTING_GROUPS.p25, key: ordinalLabel(o.ordinal), value: stat.p25 },
      { group: TESTING_GROUPS.medianScore, key: ordinalLabel(o.ordinal), value: stat.median },
      { group: TESTING_GROUPS.p75, key: ordinalLabel(o.ordinal), value: stat.p75 },
    ];
  });
};

/**
 * The leading run of ordinals that have a stateable median.
 *
 * A prefix, not a filter: the sample thins monotonically along the axis, so the
 * first suppressed ordinal ends the comparable range. Keeping later ordinals that
 * happened to clear the floor would draw a line with a hole in it.
 */
export const plottableOrdinals = (
  ordinals: SkillGrowthOrdinal[],
  variant: SkillGrowthVariant,
): SkillGrowthOrdinal[] => {
  const out: SkillGrowthOrdinal[] = [];
  for (const o of [...ordinals].sort((a, b) => a.ordinal - b.ordinal)) {
    if (o[variant].median === null) break;
    out.push(o);
  }
  return out;
};

/**
 * The efficacy claim, in one sentence, or an honest refusal.
 *
 * States the movement in score points between the first and last comparable
 * ordinal. Refuses when there is only one comparable ordinal: "learners score 62
 * on their first session" is not evidence that practice works, and this chart
 * exists to answer only that question.
 */
export const skillGrowthTakeaway = (
  ordinals: SkillGrowthOrdinal[],
  variant: SkillGrowthVariant,
  minSampleSize: number,
): string | null => {
  const plottable = plottableOrdinals(ordinals, variant);
  if (plottable.length < 2) {
    return plottable.length === 1
      ? `Only the ${ordinalLabel(plottable[0].ordinal)} session clears ${minSampleSize} evaluated sessions — not enough of the curve to read a trend yet`
      : null;
  }
  const first = plottable[0];
  const last = plottable[plottable.length - 1];
  const from = first[variant].median as number;
  const to = last[variant].median as number;
  const diff = Number((to - from).toFixed(1));
  if (diff === 0) {
    return `Median score is flat at ${formatScore(to)} from the ${ordinalLabel(first.ordinal)} to the ${ordinalLabel(last.ordinal)} session`;
  }
  const direction = diff > 0 ? "higher" : "lower";
  return `By their ${ordinalLabel(last.ordinal)} session learners score ${Math.abs(diff).toFixed(1)} points ${direction} than on their ${ordinalLabel(first.ordinal)} (${formatScore(from)} → ${formatScore(to)})`;
};

/* -------------------------------------------------------------------------- */
/* Completion rate                                                            */
/* -------------------------------------------------------------------------- */

export const COMPLETION_SCALE: ColorScale = {
  [TESTING_GROUPS.completionRate]: PALETTE.blue,
};

/**
 * Completion rate per bucket, nulls preserved.
 *
 * A bucket where nothing launched has an undefined rate, not a zero one, and the
 * null is what makes the line break there. Plotting zero would draw the most
 * flattering possible version of the opposite fact.
 */
export const buildCompletionRateSeries = (points: CompletionRatePoint[]): Datum[] =>
  points.map(p => ({
    group: TESTING_GROUPS.completionRate,
    key: p.bucket,
    value: p.completionRatePct,
  }));

/** True when every plotted bucket is a gap — the chart has nothing to say. */
export const allRatesMissing = (points: CompletionRatePoint[]): boolean =>
  points.length === 0 || points.every(p => p.completionRatePct === null);

/* -------------------------------------------------------------------------- */
/* Quality distribution and satisfaction mix                                  */
/* -------------------------------------------------------------------------- */

export const buildQualityBandSeries = (points: QualityDistributionPoint[]): Datum[] =>
  points.flatMap(p => [
    { group: TESTING_GROUPS.p25, key: p.bucket, value: p.p25 },
    { group: TESTING_GROUPS.medianScore, key: p.bucket, value: p.median },
    { group: TESTING_GROUPS.p75, key: p.bucket, value: p.p75 },
  ]);

/**
 * Rating bands, ordered low → high and valenced.
 *
 * Red/gold/green is the one place on this tab where colour maps to good and bad,
 * because a rating band IS a verdict. Every consumer also names the band in the
 * legend and the table, so the meaning survives greyscale.
 */
export const RATING_BAND_SCALE: ColorScale = {
  [TESTING_GROUPS.ratingLow]: PALETTE.red,
  [TESTING_GROUPS.ratingMid]: PALETTE.gold,
  [TESTING_GROUPS.ratingHigh]: PALETTE.green,
};

/** Stack order, bottom to top: worst at the base so the good news grows upward. */
export const RATING_BAND_ORDER = [
  TESTING_GROUPS.ratingLow,
  TESTING_GROUPS.ratingMid,
  TESTING_GROUPS.ratingHigh,
];

/**
 * Buckets that carry a stateable mix — the plottable set, and the denominator
 * list the caption and table read from.
 */
export const ratedBuckets = (points: SatisfactionMixPoint[]): SatisfactionMixPoint[] =>
  points.filter(p => p.responses > 0);

/**
 * Satisfaction as a 100%-stacked mix of rating bands.
 *
 * A mean of a 1–5 ordinal hides bimodality: 3.8 from all-4s and 3.8 from
 * half-5s-and-half-2s demand opposite actions. The mix shows which one you have.
 *
 * Buckets with no responses are dropped, not drawn as an empty or full stack — a
 * share of nobody is undefined. The response COUNT per bucket travels in the
 * table and the provenance line, because a 100%-stacked chart hides its own
 * denominator and every bar is the same height over four responses or four
 * hundred.
 */
export const buildSatisfactionMixSeries = (points: SatisfactionMixPoint[]): Datum[] => {
  const plottable = ratedBuckets(points);
  const share = (n: number, d: number) => Number(((n / d) * 100).toFixed(1));
  return RATING_BAND_ORDER.flatMap(band =>
    plottable.map(p => ({
      group: band,
      key: p.bucket,
      value:
        band === TESTING_GROUPS.ratingLow
          ? share(p.low, p.responses)
          : band === TESTING_GROUPS.ratingMid
            ? share(p.mid, p.responses)
            : share(p.high, p.responses),
    })),
  );
};

/**
 * Top-2-box now, against the first bucket on the axis. Percentage POINTS, not a
 * percentage change: "4–5 ratings rose 12%" is ambiguous where "rose 12 pp" is not.
 */
export const satisfactionTakeaway = (points: SatisfactionMixPoint[]): string | null => {
  const plottable = ratedBuckets(points);
  if (plottable.length === 0) return null;
  const latest = plottable[plottable.length - 1];
  if (latest.top2BoxPct === null) return null;
  const head = `${formatPct(latest.top2BoxPct)} of ${latest.responses.toLocaleString()} ratings were 4–5 in the latest period`;
  if (plottable.length < 2) return head;
  const first = plottable[0];
  if (first.top2BoxPct === null) return head;
  const diff = Number((latest.top2BoxPct - first.top2BoxPct).toFixed(1));
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  return `${head} — ${arrow} ${Math.abs(diff).toFixed(1)} pp vs the first period on the axis`;
};

/**
 * Low-rating tags as a ranked bar list: the leader in the accent, the tail in
 * grey, so the eye lands on the thing worth fixing first.
 */
export const buildLowRatingTagBars = (tags: { tag: string; count: number }[]): BarDatum[] =>
  tags.map(t => ({ group: t.tag, value: t.count }));

export const buildRankedBarScale = (bars: BarDatum[]): ColorScale =>
  bars.reduce<ColorScale>((scale, bar, i) => {
    scale[bar.group] = i === 0 ? PALETTE.blue : CONTEXT.line;
    return scale;
  }, {});

/* -------------------------------------------------------------------------- */
/* Competency map                                                             */
/* -------------------------------------------------------------------------- */

export const COMPETENCY_SCALE: ColorScale = {
  [TESTING_GROUPS.competency]: PALETTE.blue,
};

/**
 * One point per competency: practice volume against median score.
 *
 * A single group, so every point is the same colour. One point per entity is the
 * case where colouring by identity looks informative and encodes nothing — the
 * quadrant a point sits in is the message, and the expanded table names them.
 *
 * Competencies whose score the server suppressed are absent: a point at y = 0
 * would read as "scores zero" rather than "not enough data", which is the
 * opposite of what the floor exists to prevent. The count of held-back rows goes
 * in the caption so their absence is stated rather than silent.
 */
export const buildCompetencyScatter = (rows: CompetencyMapRow[]): ScatterDatum[] =>
  rows
    .filter(r => r.medianScore !== null)
    .map(r => ({
      group: TESTING_GROUPS.competency,
      x: r.completedSessions,
      y: r.medianScore as number,
    }));

export const suppressedCompetencies = (rows: CompetencyMapRow[]): CompetencyMapRow[] =>
  rows.filter(r => r.medianScore === null);

/**
 * The quadrant read, in words: the heavily-practised competency that scores worst
 * is the teaching gap, and the barely-practised one is the coverage gap.
 */
export const competencyTakeaway = (rows: CompetencyMapRow[]): string | null => {
  const scored = rows.filter(r => r.medianScore !== null);
  if (scored.length === 0) return null;
  const weakest = scored.reduce((a, b) =>
    (b.medianScore as number) < (a.medianScore as number) ? b : a,
  );
  const strongest = scored.reduce((a, b) =>
    (b.medianScore as number) > (a.medianScore as number) ? b : a,
  );
  if (weakest.competencyId === strongest.competencyId) {
    return `Only ${weakest.name} has enough evaluated sessions to score — median ${formatScore(weakest.medianScore)}`;
  }
  return `Lowest median: ${weakest.name} at ${formatScore(weakest.medianScore)} over ${weakest.completedSessions.toLocaleString()} sessions · highest: ${strongest.name} at ${formatScore(strongest.medianScore)}`;
};

/* -------------------------------------------------------------------------- */
/* Track drop-off                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Completion rate per item format, in the server's (enum) order.
 *
 * Order is preserved rather than sorted by value: the formats are a fixed set the
 * reader knows, and a bar list that reorders itself between loads is a bar list
 * you cannot compare with last week's screenshot.
 *
 * Formats whose rate the server suppressed — too few learners to state a rate
 * over identifiable people — are dropped from the plot and listed beside it with
 * their size. Dropping the row entirely would understate the total and hide the
 * tail, which is why the count still travels.
 */
export const buildItemTypeBars = (rows: TrackItemTypeRow[]): BarDatum[] =>
  rows
    .filter(r => r.completionRatePct !== null && !r.belowFloor)
    .map(r => ({ group: itemTypeLabel(r.type), value: r.completionRatePct as number }));

export const suppressedItemTypes = (rows: TrackItemTypeRow[]): TrackItemTypeRow[] =>
  rows.filter(r => r.completionRatePct === null || r.belowFloor);

/** "ROLEPLAY" → "Roleplay". Server enums are not reader-facing labels. */
export const itemTypeLabel = (type: string): string =>
  type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

/** Ordered formats get one hue at rising saturation, never a rainbow. */
export const buildItemTypeScale = (bars: BarDatum[]): ColorScale =>
  sequentialScale(bars.map(b => b.group));

export const itemTypeTakeaway = (rows: TrackItemTypeRow[]): string | null => {
  const stateable = rows.filter(r => r.completionRatePct !== null && !r.belowFloor);
  if (stateable.length < 2) return null;
  const worst = stateable.reduce((a, b) =>
    (b.completionRatePct as number) < (a.completionRatePct as number) ? b : a,
  );
  const best = stateable.reduce((a, b) =>
    (b.completionRatePct as number) > (a.completionRatePct as number) ? b : a,
  );
  return `${itemTypeLabel(worst.type)} items are finished ${formatPct(worst.completionRatePct)} of the time they are reached, against ${formatPct(best.completionRatePct)} for ${itemTypeLabel(best.type).toLowerCase()}`;
};

/* -------------------------------------------------------------------------- */
/* Coaching loop                                                              */
/* -------------------------------------------------------------------------- */

export const SHARED_SCALE: ColorScale = {
  [TESTING_GROUPS.sharedSessions]: PALETTE.blue,
};
export const TURNAROUND_SCALE: ColorScale = {
  [TESTING_GROUPS.turnaround]: PALETTE.purple,
};

/**
 * Adoption and responsiveness as two series for two panels, deliberately not one
 * chart with two axes.
 *
 * A count of shared sessions and a median turnaround are different magnitudes and
 * different units; on one pair of axes the reader is invited to read a
 * correlation the data does not support. Side-by-side panels sharing a time axis
 * answer both questions without implying a relationship between them.
 */
export const buildSharedSessionsSeries = (points: CoachingLoopPoint[]): Datum[] =>
  points.map(p => ({
    group: TESTING_GROUPS.sharedSessions,
    key: p.bucket,
    value: p.sharedSessions,
  }));

export const buildTurnaroundSeries = (points: CoachingLoopPoint[]): Datum[] =>
  points.map(p => ({
    group: TESTING_GROUPS.turnaround,
    key: p.bucket,
    // Null below the sample floor, or where nothing was commented on — a median
    // turnaround over two reviews is a name, not a statistic.
    value: p.medianHoursToFirstComment,
  }));

/* -------------------------------------------------------------------------- */
/* Language mix                                                               */
/* -------------------------------------------------------------------------- */

/** Residual and unknown buckets are context, not languages. */
const LANGUAGE_RESIDUALS = ["Other", "Unknown"];

/**
 * Language shares per bucket, computed from the server's counts and the server's
 * per-bucket totals.
 *
 * The totals come from the response rather than being summed here: the server
 * pools the tail into "Other", and a client that re-derived the denominator from
 * the rows it received would quietly answer a different question if that pooling
 * ever changed.
 *
 * Buckets with no sessions are dropped — a mix over no sessions is undefined.
 */
export const buildLanguageMixSeries = (
  labels: string[],
  points: LanguageMixPoint[],
  bucketTotals: { bucket: string; sessions: number }[],
): Datum[] => {
  const totals = new Map(bucketTotals.map(t => [t.bucket, t.sessions]));
  const byKey = new Map(points.map(p => [`${p.bucket}|${p.label}`, p.sessions]));
  const buckets = bucketTotals.filter(t => t.sessions > 0).map(t => t.bucket);

  return labels.flatMap(label =>
    buckets.map(bucket => {
      const total = totals.get(bucket) ?? 0;
      const sessions = byKey.get(`${bucket}|${label}`) ?? 0;
      return {
        group: label,
        key: bucket,
        value: total > 0 ? Number(((sessions / total) * 100).toFixed(1)) : null,
      };
    }),
  );
};

/**
 * A stable colour per language, with the pooled and unknown series in grey.
 *
 * Stable means hashed on the NAME, not indexed into the current result set: a
 * language that changes colour when the window changes teaches the reader a
 * cohesion that is not there.
 */
export const buildLanguageMixScale = (labels: string[]): ColorScale => {
  const named = labels.filter(l => !LANGUAGE_RESIDUALS.includes(l));
  return {
    ...stableScale(named),
    ...Object.fromEntries(
      labels.filter(l => LANGUAGE_RESIDUALS.includes(l)).map(l => [l, CONTEXT.faint]),
    ),
  };
};

/* -------------------------------------------------------------------------- */
/* Scribe adoption                                                            */
/* -------------------------------------------------------------------------- */

export const SCRIBE_ORGS_SCALE: ColorScale = {
  [TESTING_GROUPS.scribeOrgs]: PALETTE.teal,
};
export const SCRIBE_SESSIONS_SCALE: ColorScale = {
  [TESTING_GROUPS.scribeSessions]: CONTEXT.line,
};

export const buildScribeOrgsSeries = (points: ScribeAdoptionPoint[]): Datum[] =>
  points.map(p => ({ group: TESTING_GROUPS.scribeOrgs, key: p.bucket, value: p.orgs }));

export const buildScribeSessionsSeries = (points: ScribeAdoptionPoint[]): Datum[] =>
  points.map(p => ({ group: TESTING_GROUPS.scribeSessions, key: p.bucket, value: p.sessions }));

/* -------------------------------------------------------------------------- */
/* Org health                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How an org is doing, as one word plus the evidence.
 *
 * Recency, not volume: a lifetime total makes an org that stopped three months
 * ago look like a top customer, which is the opposite of the question this table
 * exists to answer. Thresholds are deliberately coarse — the row is a prompt for
 * a conversation, not a score.
 */
export type OrgStatus = "growing" | "steady" | "slowing" | "dormant" | "never started";

export const orgStatus = (row: OrgHealthRow): OrgStatus => {
  if (row.completedSimulations === 0) return "never started";
  if (row.completedLast28d === 0) return "dormant";
  if (row.completedPrev28d === 0) return "growing";
  const change = (row.completedLast28d - row.completedPrev28d) / row.completedPrev28d;
  if (change > 0.2) return "growing";
  if (change < -0.2) return "slowing";
  return "steady";
};

/**
 * Status colours, always paired with the word itself at the call site — a
 * coloured dot on its own would be unreadable in greyscale and to a reader who
 * cannot separate red from green.
 */
export const ORG_STATUS_COLOR: Record<OrgStatus, string> = {
  growing: PALETTE.green,
  steady: PALETTE.blue,
  slowing: PALETTE.orange,
  dormant: PALETTE.red,
  "never started": CONTEXT.line,
};

/** Sparkline values for a row, index-aligned with the shared week axis. */
export const orgTrendValues = (row: OrgHealthRow): number[] => row.trend;

/**
 * Utilisation as a percentage, or an explicit "no limit set".
 *
 * An org with no credit ceiling is not at 0% of its ceiling; there is no ceiling
 * to be a share of. Returning the string keeps that distinction in one place
 * instead of letting each cell invent its own dash.
 */
export const creditUtilisationLabel = (row: OrgHealthRow): string => {
  if (row.creditsUnset || row.creditUtilisationPct === null) return "no limit set";
  return `${formatPct(row.creditUtilisationPct)} of ${row.creditLimit.toLocaleString()}`;
};

export const orgHealthTakeaway = (
  summary: { orgs: number; activeOrgs: number; dormantOrgs: number } | undefined,
): string | null => {
  if (!summary || summary.orgs === 0) return null;
  return `${summary.dormantOrgs.toLocaleString()} of ${summary.orgs.toLocaleString()} organisations completed no simulation in the last 28 days`;
};
