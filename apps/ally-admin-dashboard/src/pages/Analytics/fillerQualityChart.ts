import { FillerQualityPoint } from "@types";

import { ColorScale, CONTEXT, PALETTE } from "./chartScales";

/**
 * Series builders for the thinking-filler quality charts.
 *
 * These sit beside the latency charts on purpose. Time-to-first-voice improves
 * both when the pipeline gets faster AND when more turns are fronted by a
 * filler, because the filler IS the character's first words — so the latency
 * tab already tells the reader what share of turns were masked. What it cannot
 * tell them is whether that masking was any good. That is what these are for.
 *
 * Every rate here is per 100 PLAYED FILLERS. Not per session, not per turn: a
 * session that played forty fillers and one that played two are not comparable
 * units, and a single turn plays two whenever a continuation fires.
 */

export type FillerDatum = { group: string; key: string; value: number | null };

export const FILLER_FINDING_GROUPS = {
  character: "Didn't fit the character",
  context: "Didn't fit the moment",
  safety: "Committed to something",
} as const;

/**
 * Warm ramp, worst at the top. These are three kinds of the same thing — a
 * finding against a played filler — so they share a hue family rather than
 * reading as three unrelated measures.
 *
 * `safety` is the darkest because it is the one that can contradict the real
 * reply that follows it, which the learner then hears as the character
 * changing its mind.
 */
export const FILLER_FINDING_SCALE: ColorScale = {
  [FILLER_FINDING_GROUPS.character]: PALETTE.gold,
  [FILLER_FINDING_GROUPS.context]: PALETTE.orange,
  [FILLER_FINDING_GROUPS.safety]: PALETTE.darkRed,
};

export const FILLER_DIVERSITY_GROUPS = {
  distinct: "Distinct phrases",
  repeated: "Repeated a recent phrase",
} as const;

export const FILLER_DIVERSITY_SCALE: ColorScale = {
  [FILLER_DIVERSITY_GROUPS.distinct]: PALETTE.teal,
  [FILLER_DIVERSITY_GROUPS.repeated]: PALETTE.magenta,
};

export const FILLER_CONFIG_GROUP = "No character voice configured";

export const FILLER_CONFIG_SCALE: ColorScale = {
  [FILLER_CONFIG_GROUP]: CONTEXT.strong,
};

/** Buckets that actually judged a filler — the only ones with a rate to state. */
const judgedBuckets = (points: FillerQualityPoint[]) =>
  points.filter(point => point.fillersJudged > 0);

/**
 * Total played fillers behind a window. This is the `n` every one of these
 * charts quotes, and it is deliberately not the session count: the sessions
 * number would be smaller and would flatter a window where a few sessions
 * played a great many fillers.
 */
export function countJudgedFillers(points: FillerQualityPoint[] | undefined): number {
  return (points ?? []).reduce((sum, point) => sum + point.fillersJudged, 0);
}

/**
 * Finding rates per 100 played fillers, one line per dimension.
 *
 * A bucket with no rate for a dimension is emitted as `null` rather than 0 and
 * rather than being dropped: 0 means "judged, and clean", which is a real and
 * different claim from "nothing judged here". Nulls break the line, so a gap
 * in judging reads as a gap instead of a plunge to zero.
 */
export function buildFillerFindingSeries(points: FillerQualityPoint[] | undefined): FillerDatum[] {
  const buckets = judgedBuckets(points ?? []);
  return (
    [
      [FILLER_FINDING_GROUPS.character, (p: FillerQualityPoint) => p.characterFitPer100],
      [FILLER_FINDING_GROUPS.context, (p: FillerQualityPoint) => p.contextFitPer100],
      [FILLER_FINDING_GROUPS.safety, (p: FillerQualityPoint) => p.safetyPer100],
    ] as const
  ).flatMap(([group, pick]) =>
    buckets.map(point => ({ group, key: point.bucket, value: pick(point) })),
  );
}

/**
 * The diversity half: what share of played fillers repeated a recent phrase.
 *
 * Separate from the finding chart because it is measured, not judged — it comes
 * from counting phrases, with no LLM in the path. Mixing a counted rate into a
 * chart of judged ones would invite the reader to trust them equally.
 *
 * `distinctPhraseRatio` rides along as a second series because a session can
 * mask every gap perfectly, never repeat inside the repeat window, and still
 * draw on a pool of four phrases all day. Only the ratio shows that.
 */
export function buildFillerDiversitySeries(
  points: FillerQualityPoint[] | undefined,
): FillerDatum[] {
  const buckets = judgedBuckets(points ?? []);
  return [
    ...buckets.map(point => ({
      group: FILLER_DIVERSITY_GROUPS.repeated,
      key: point.bucket,
      value: point.repeatedPct,
    })),
    ...buckets.map(point => ({
      group: FILLER_DIVERSITY_GROUPS.distinct,
      key: point.bucket,
      // Stored 0–1, shown as a percentage so it shares an axis with the repeat
      // rate. Both answer "out of the fillers that played", so one axis is
      // honest here.
      value:
        point.distinctPhraseRatio === null
          ? null
          : Math.round(1000 * point.distinctPhraseRatio) / 10,
    })),
  ];
}

/**
 * Findings set aside because the scenario configured no character voice.
 *
 * Its own chart, greyed, because it is not a model failure: the judge cannot
 * call a filler generic for a character it was never told anything about. It is
 * kept visible rather than dropped so the configuration gap stays legible —
 * and kept OUT of the finding chart so that configuring more scenarios cannot
 * read there as a quality regression.
 */
export function buildFillerUnconfiguredSeries(
  points: FillerQualityPoint[] | undefined,
): FillerDatum[] {
  return judgedBuckets(points ?? []).map(point => ({
    group: FILLER_CONFIG_GROUP,
    key: point.bucket,
    value: point.unconfiguredStylePer100,
  }));
}

/**
 * Conditioned-out findings per 100 played fillers, over the whole window.
 *
 * A RATE, not a share: it counts findings the judge set aside because the
 * scenario configured no character voice, per 100 fillers played. It is not
 * "the percentage of fillers that could not be judged" — a filler on an
 * unconfigured character that drew no finding at all contributes nothing here,
 * so the two numbers are different and the smaller one would understate the
 * gap.
 *
 * Buckets are weighted by their own played-filler count. A mean of per-bucket
 * rates would let a bucket with two fillers count as much as one with two
 * hundred.
 *
 * The finding chart's caption quotes it, because a low character-fit rate over
 * a window where most scenarios configured no voice is not the good news it
 * looks like.
 */
export function unconfiguredPer100(points: FillerQualityPoint[] | undefined): number | null {
  const buckets = judgedBuckets(points ?? []);
  const total = buckets.reduce((sum, p) => sum + p.fillersJudged, 0);
  if (total === 0) return null;
  const findings = buckets.reduce(
    (sum, p) => sum + ((p.unconfiguredStylePer100 ?? 0) * p.fillersJudged) / 100,
    0,
  );
  return Math.round((1000 * findings) / total) / 10;
}
