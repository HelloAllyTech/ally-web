/**
 * Practice quality (Highlights → Usage, AAQ-208 / AAQ-209): types for
 * `GET /v1/analytics/practice-quality` and the pure helpers that turn it into
 * series and sentences.
 *
 * The question is "was it practice?" — read off the transcript's shape (ruler
 * R7, deterministic, no judge): how much of the conversation the learner did,
 * how many turns they took, and whether the session held enough of their own
 * speech to count as practice at all. A roleplay is meant to be mostly doing;
 * a session where the client did nearly all the talking was mostly listening.
 *
 * The server does every percentile, share and floor (ally-be
 * `src/analytics/service/practice-quality-analytics.service.ts`). Nothing here
 * recomputes one: a null from the server is a withheld number and stays a gap
 * on the plot and a "—" in the table, never a figure rebuilt from counts.
 */
import { AnalyticsBucket, AnalyticsRange, AnalyticsScoping, AnalyticsWindow } from "@types";

import { withoutInProgress } from "./analyticsGrouping";
import { CONTEXT, ColorScale, PALETTE } from "./chartScales";

/* -------------------------------------------------------------------------- */
/* Wire types — mirror ally-be `dto/practice-quality-analytics.dto.ts`        */
/* -------------------------------------------------------------------------- */

/** The shared window params plus the session-language filter. */
export interface PracticeQualityQuery {
  range?: AnalyticsRange;
  bucket?: AnalyticsBucket;
  from?: string;
  to?: string;
  tenantId?: string;
  /** A session language value (e.g. "hi-IN"); omitted for every language. */
  language?: string;
}

/** What a session needs, all at once, to count as practice. */
export interface PracticeQualityThresholds {
  minLearnerTurns: number;
  /** Net of pauses. */
  minDurationMinutes: number;
  /** Characters of the learner's own speech. */
  minLearnerChars: number;
}

export interface PracticeQualityPoint {
  /** Bucket start (yyyy-mm-dd), by session end. */
  bucket: string;
  /** Countable sessions that ended in the bucket — a real 0 when none did. */
  sessions: number;
  /** Of those, sessions with any speech: the n behind the talk-share percentiles. */
  talkShareSessions: number;
  /** Median learner characters ÷ all characters, %; null below `minSampleSize`. */
  talkShareMedianPct: number | null;
  talkShareP25Pct: number | null;
  talkShareP75Pct: number | null;
  /** Median non-empty learner lines per session; null below the floor. */
  learnerTurnsMedian: number | null;
  practiceSessions: number;
  /** practiceSessions ÷ sessions, %; null below the floor. */
  practicePct: number | null;
  shortTurnSessions: number;
  shortTurnsPct: number | null;
}

export interface PracticeQualitySummary {
  sessions: number;
  talkShareSessions: number;
  /** Over the whole window's sessions — not a median of bucket medians. */
  talkShareMedianPct: number | null;
  talkShareP25Pct: number | null;
  talkShareP75Pct: number | null;
  learnerTurnsMedian: number | null;
  practiceSessions: number;
  practicePct: number | null;
  shortTurnSessions: number;
  /** Share of sessions with fewer than `minLearnerTurns` learner turns — the takeaway. */
  notPracticeShortTurnsPct: number | null;
}

export interface PracticeQualityResponse {
  window: AnalyticsWindow;
  /** The language filter applied, or null for every language. */
  language: string | null;
  minSampleSize: number;
  practiceThresholds: PracticeQualityThresholds;
  /** Every bucket in the window, in order; `window.inProgressBucket` is still accruing. */
  points: PracticeQualityPoint[];
  summary: PracticeQualitySummary;
  provenance: { derivation: string; note: string };
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Series                                                                     */
/* -------------------------------------------------------------------------- */

type Datum = { group: string; key: string; value: number | null };

/** Series labels, kept beside the scales so data groups and colours cannot drift. */
export const PRACTICE_QUALITY_GROUPS = {
  talkShareMedian: "Median talk share",
  talkShareP25: "25th percentile",
  talkShareP75: "75th percentile",
  learnerTurns: "Median learner turns",
  practiceShare: "Counts as practice",
} as const;

/** A share of a whole, on its full scale — 50% must sit halfway up. */
export const PCT_DOMAIN: [number, number] = [0, 100];

/**
 * The median in the accent and the quartiles in context grey: the band is the
 * spread around the finding, not two more findings. Same encoding as the Skill
 * growth curve and the Quality & sentiment spread chart.
 */
export const TALK_SHARE_SCALE: ColorScale = {
  [PRACTICE_QUALITY_GROUPS.talkShareMedian]: PALETTE.blue,
  [PRACTICE_QUALITY_GROUPS.talkShareP25]: CONTEXT.faint,
  [PRACTICE_QUALITY_GROUPS.talkShareP75]: CONTEXT.faint,
};

export const LEARNER_TURNS_SCALE: ColorScale = {
  [PRACTICE_QUALITY_GROUPS.learnerTurns]: PALETTE.teal,
};

export const PRACTICE_SHARE_SCALE: ColorScale = {
  [PRACTICE_QUALITY_GROUPS.practiceShare]: PALETTE.blue,
};

/**
 * The buckets that go on a plot: every bucket but the one still accruing. An
 * unfinished period's median and share can still move either way, and drawn
 * beside finished ones it reads as a real change. It stays in the table.
 */
export const plottedPoints = (
  points: PracticeQualityPoint[],
  inProgressBucket?: string | null,
): PracticeQualityPoint[] => withoutInProgress(points, p => p.bucket, inProgressBucket);

/**
 * Median talk share with its interquartile band — p25, median, p75 per bucket.
 *
 * A withheld bucket (below the sample floor) keeps its key with null values,
 * so all three lines break there rather than joining across a period nobody
 * could state.
 */
export const buildTalkShareSeries = (points: PracticeQualityPoint[]): Datum[] =>
  points.flatMap(p => [
    { group: PRACTICE_QUALITY_GROUPS.talkShareP25, key: p.bucket, value: p.talkShareP25Pct },
    {
      group: PRACTICE_QUALITY_GROUPS.talkShareMedian,
      key: p.bucket,
      value: p.talkShareMedianPct,
    },
    { group: PRACTICE_QUALITY_GROUPS.talkShareP75, key: p.bucket, value: p.talkShareP75Pct },
  ]);

/**
 * Median learner turns per bucket, for the small chart under the talk share.
 *
 * Its own chart rather than a second axis on the talk-share chart: the two are
 * different units (a share and a count) that can move independently, and a
 * dual axis would let the reader see a crossing where none exists.
 */
export const buildLearnerTurnsSeries = (points: PracticeQualityPoint[]): Datum[] =>
  points.map(p => ({
    group: PRACTICE_QUALITY_GROUPS.learnerTurns,
    key: p.bucket,
    value: p.learnerTurnsMedian,
  }));

/** Share of sessions that count as practice, one bar per bucket; withheld = no bar. */
export const buildPracticeShareBars = (points: PracticeQualityPoint[]): Datum[] =>
  points.map(p => ({
    group: PRACTICE_QUALITY_GROUPS.practiceShare,
    key: p.bucket,
    value: p.practicePct,
  }));

/** True when at least one plotted value exists — otherwise the card shows its thin/empty state. */
export const hasAnyValue = (series: Datum[]): boolean => series.some(d => d.value !== null);

/* -------------------------------------------------------------------------- */
/* Words                                                                      */
/* -------------------------------------------------------------------------- */

/** "42.5%" or "—" for a withheld share. The server sends 1 dp. */
export const formatPctValue = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${n}%`;

/** The practice rule, from the server's own constants. */
export const practiceThresholdsText = (t: PracticeQualityThresholds): string =>
  `at least ${t.minLearnerTurns} learner turns, ${t.minDurationMinutes} minutes net of pauses and ${t.minLearnerChars.toLocaleString()} characters of the learner's own speech`;

/**
 * AAQ-208 in one sentence: where the typical session sits and how wide the
 * middle half is, plus the typical number of turns. Refuses below the floor.
 */
export const talkShareTakeaway = (
  summary: PracticeQualitySummary,
  minSampleSize: number,
): string | undefined => {
  if (summary.talkShareSessions === 0) return undefined;
  if (summary.talkShareMedianPct === null) {
    return `Too few sessions with speech to state a median (n = ${summary.talkShareSessions.toLocaleString()} · need ${minSampleSize})`;
  }
  const band =
    summary.talkShareP25Pct !== null && summary.talkShareP75Pct !== null
      ? ` (middle half ${summary.talkShareP25Pct}–${summary.talkShareP75Pct}%)`
      : "";
  const turns =
    summary.learnerTurnsMedian !== null
      ? ` · a median of ${summary.learnerTurnsMedian} learner turns per session`
      : "";
  return `In the typical session the learner did ${summary.talkShareMedianPct}% of the talking${band}${turns}`;
};

/**
 * AAQ-209's takeaway is the failure mode, not the success rate: the share of
 * sessions with too few learner turns to be practice. That is the number a
 * content owner can act on (an opener that never hands the learner the floor,
 * a session closed after one line), where "62% counted" says nothing about why
 * the rest did not.
 */
export const practiceShareTakeaway = (
  summary: PracticeQualitySummary,
  thresholds: PracticeQualityThresholds,
  minSampleSize: number,
): string | undefined => {
  if (summary.sessions === 0) return undefined;
  if (summary.notPracticeShortTurnsPct === null) {
    return `Too few sessions to state a share (n = ${summary.sessions.toLocaleString()} · need ${minSampleSize})`;
  }
  return `${summary.notPracticeShortTurnsPct}% of sessions had fewer than ${thresholds.minLearnerTurns} learner turns — not practice`;
};

/** Rows for the expanded table / CSV, every bucket including the one still accruing. */
export const practiceQualityTableRows = (
  points: PracticeQualityPoint[],
  inProgressBucket?: string | null,
): (string | number | null)[][] =>
  points.map(p => [
    p.bucket,
    p.sessions,
    p.talkShareMedianPct,
    p.talkShareP25Pct,
    p.talkShareP75Pct,
    p.learnerTurnsMedian,
    p.practicePct,
    p.shortTurnsPct,
    p.bucket === inProgressBucket ? "still accruing" : "",
  ]);

/** Column headers for {@link practiceQualityTableRows}; the turn rule comes from the server. */
export const practiceQualityTableColumns = (thresholds?: PracticeQualityThresholds): string[] => [
  "Period",
  "Sessions",
  "Median talk share %",
  "p25 %",
  "p75 %",
  "Median learner turns",
  "Counts as practice %",
  thresholds ? `Fewer than ${thresholds.minLearnerTurns} turns %` : "Too few turns %",
  "Provisional",
];
