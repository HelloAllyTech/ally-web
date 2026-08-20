import {
  SkillGrowthKnowledgeAttempt,
  SkillGrowthLearnerSession,
  SkillTrendClass,
  SkillTrendLearnerRow,
  SkillTrendMix,
  SkillTrendMixMonth,
} from "@types";

import { CONTEXT, ColorScale, PALETTE } from "./chartScales";

/**
 * Series builders for the Skill growth sub-tab.
 *
 * Kept out of the component for the reason the sibling `testingChart.ts` and
 * `highlightsChart.ts` exist: a Carbon options object is opaque to the
 * typechecker, so the only way these transforms get tested is if they are
 * plain functions over server-shaped data.
 *
 * One rule runs through the whole file: **self against self, never learner
 * against learner.** Nothing here ranks people. The mix counts how many
 * learners moved relative to their OWN baseline, and the per-learner panel
 * plots one person's history. That was a scoping decision, not an omission —
 * a mastery-oriented view sustains practice where a peer ranking discourages
 * exactly the learners who most need to keep going.
 */

type Datum = { group: string; key: string; value: number | null };

/* -------------------------------------------------------------------------- */
/* Trend classes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Labels for the three movement classes plus the honest fourth.
 *
 * "Not enough sessions" rather than "unclassified" or "N/A": it names the
 * reason, and the reason is a fact about how much this learner has practised,
 * which is itself the actionable part for a leader reading the strip.
 */
export const TREND_LABELS: Record<SkillTrendClass, string> = {
  improving: "Improving",
  flat: "Holding steady",
  declining: "Declining",
  insufficient: "Not enough sessions",
};

/**
 * Green / grey / red, and grey again for the unclassified.
 *
 * "Holding steady" is deliberately CONTEXT grey rather than a third hue: flat
 * is the absence of movement, and giving it its own colour would make a
 * stacked bar read as three competing outcomes rather than two movements
 * around a neutral middle. Direction is always paired with its label and an
 * arrow elsewhere, so nothing here is carried by colour alone.
 */
export const TREND_SCALE: ColorScale = {
  [TREND_LABELS.improving]: PALETTE.green,
  [TREND_LABELS.flat]: CONTEXT.faint,
  [TREND_LABELS.declining]: PALETTE.red,
  [TREND_LABELS.insufficient]: CONTEXT.faint,
};

/** 'YYYY-MM' → "Aug 2026". Short: a Carbon labels-axis tick truncates past 14. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS[m - 1] ?? month} ${y}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The improvement mix as a stacked bar per month.
 *
 * Counts, not percentages: the monthly cohorts here are small enough that a
 * 100% stack would turn "2 of 3 learners" into a confident-looking 67%. The
 * absolute height also carries how many learners became classifiable that
 * month, which is the second thing a reader wants and a normalised stack
 * destroys.
 *
 * A month is included even when a class is zero, so the three colours stay in
 * the same order across bars — a stack whose segments reorder between months
 * cannot be scanned left to right.
 */
export const buildTrendMixSeries = (months: SkillTrendMixMonth[]): Datum[] =>
  [...months]
    .sort((a, b) => a.month.localeCompare(b.month))
    .flatMap(m => [
      { group: TREND_LABELS.improving, key: monthLabel(m.month), value: m.improving },
      { group: TREND_LABELS.flat, key: monthLabel(m.month), value: m.flat },
      { group: TREND_LABELS.declining, key: monthLabel(m.month), value: m.declining },
    ]);

/**
 * The mix in one sentence, or an honest refusal.
 *
 * Refuses below a handful of classified learners rather than printing a
 * percentage: "100% of learners are improving" over two people is the kind of
 * number that gets screenshotted into a board deck and then cannot be walked
 * back.
 */
export const MIN_LEARNERS_FOR_SHARE = 5;

export const trendMixTakeaway = (mix: SkillTrendMix): string | null => {
  if (mix.classifiedLearners === 0) {
    return mix.insufficientLearners > 0
      ? `No learner has reached ${mix.thresholds.minSessions} evaluated sessions yet — not enough history to classify anyone`
      : null;
  }
  if (mix.classifiedLearners < MIN_LEARNERS_FOR_SHARE) {
    return `Only ${mix.classifiedLearners} learner${mix.classifiedLearners === 1 ? "" : "s"} have ${mix.thresholds.minSessions}+ evaluated sessions — too few to state a share`;
  }
  const pct = Math.round((mix.improving / mix.classifiedLearners) * 100);
  return `${pct}% of the ${mix.classifiedLearners} learners with enough history score higher than they started (${mix.improving} improving · ${mix.flat} steady · ${mix.declining} declining)`;
};

/** "n of m learners" for the KPI tile, where m is everyone with any session. */
export const classifiedShareValue = (mix: SkillTrendMix): string => {
  if (mix.classifiedLearners < MIN_LEARNERS_FOR_SHARE) return "—";
  return `${Math.round((mix.improving / mix.classifiedLearners) * 100)}%`;
};

/* -------------------------------------------------------------------------- */
/* One learner's timeline                                                     */
/* -------------------------------------------------------------------------- */

export const LEARNER_GROUPS = {
  composite: "Session score",
} as const;

export const LEARNER_SCALE: ColorScale = {
  [LEARNER_GROUPS.composite]: PALETTE.blue,
};

/**
 * The x tick for one session on a learner's own timeline.
 *
 * Ordinal first, date second: the ordinal is the axis (this person's 1st, 2nd,
 * 3rd judged session) and the date is context. Kept under Carbon's 14-char
 * tick truncation — "#3 · 12 Feb" fits, "3rd session, 12 February" does not.
 */
export const sessionTick = (session: SkillGrowthLearnerSession): string => {
  const d = session.occurredAt ? new Date(session.occurredAt) : null;
  const when = d && !Number.isNaN(d.getTime()) ? ` · ${d.getDate()} ${MONTHS[d.getMonth()]}` : "";
  return `#${session.ordinal}${when}`;
};

/** The composite score line: one point per evaluated session, oldest first. */
export const buildLearnerCompositeSeries = (sessions: SkillGrowthLearnerSession[]): Datum[] =>
  sessions.map(s => ({
    group: LEARNER_GROUPS.composite,
    key: sessionTick(s),
    value: s.compositeScore,
  }));

/**
 * The per-skill lines, one series per category actually present.
 *
 * Categories are discovered from the data rather than declared, because two
 * label generations exist in the backing payloads and a hardcoded set would
 * silently drop whichever one it did not list. A session with no payload
 * contributes a null at its tick, so the line shows a real gap instead of
 * closing over a session that was never scored that way.
 */
export const buildSkillCoverageSeries = (sessions: SkillGrowthLearnerSession[]): Datum[] => {
  const categories = skillCoverageCategories(sessions);
  if (!categories.length) return [];
  return sessions.flatMap(s => {
    const byCategory = new Map(
      (s.skillCoverage ?? []).map(c => [c.category, c.percentage] as const),
    );
    return categories.map(category => ({
      group: category,
      key: sessionTick(s),
      value: byCategory.has(category) ? (byCategory.get(category) as number) : null,
    }));
  });
};

/** Every category the learner's sessions mention, in first-seen order. */
export const skillCoverageCategories = (sessions: SkillGrowthLearnerSession[]): string[] => {
  const seen: string[] = [];
  for (const s of sessions) {
    for (const c of s.skillCoverage ?? []) {
      if (!seen.includes(c.category)) seen.push(c.category);
    }
  }
  return seen;
};

/**
 * A colour per discovered skill category.
 *
 * Assigned by position from a fixed list so the same category keeps its colour
 * within a session's panel. It is NOT stable across learners with different
 * category sets — which is why the legend is always on for this chart.
 */
export const skillCoverageScale = (categories: string[]): ColorScale => {
  const hues = [PALETTE.blue, PALETTE.teal, PALETTE.purple, PALETTE.orange, PALETTE.gold];
  return Object.fromEntries(categories.map((c, i) => [c, hues[i % hues.length]]));
};

/**
 * Quiz and annotation attempts as two series over submission date.
 *
 * Separate groups rather than one "knowledge" line because the two are graded
 * differently — annotation grading is deterministic set comparison, quiz
 * grading runs through an LLM — so a single line would average a stable ruler
 * with a drifting one.
 */
export const KNOWLEDGE_GROUPS = {
  quiz: "Quiz",
  annotation: "Annotation",
} as const;

export const KNOWLEDGE_SCALE: ColorScale = {
  [KNOWLEDGE_GROUPS.quiz]: PALETTE.indigo,
  [KNOWLEDGE_GROUPS.annotation]: PALETTE.teal,
};

export const buildKnowledgeSeries = (attempts: SkillGrowthKnowledgeAttempt[]): Datum[] =>
  [...attempts]
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    .map(a => ({
      group: a.kind === "quiz" ? KNOWLEDGE_GROUPS.quiz : KNOWLEDGE_GROUPS.annotation,
      key: shortDate(a.submittedAt),
      value: a.scorePct,
    }));

/** "12 Feb" — short enough to survive the Carbon tick truncation. */
export const shortDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/**
 * The learner's movement in one sentence.
 *
 * Names the two windows it compared rather than just the delta, because "+30
 * points" invites the reader to imagine a single before-and-after session pair
 * when it is actually a mean of two at each end.
 */
export const learnerTakeaway = (
  learner: {
    trend: SkillTrendClass;
    delta: number | null;
    firstWindowMean: number | null;
    lastWindowMean: number | null;
    evaluatedSessions: number;
  },
  thresholds: { minSessions: number; window: number; flatBand: number },
): string => {
  if (learner.trend === "insufficient") {
    return `${learner.evaluatedSessions} evaluated session${learner.evaluatedSessions === 1 ? "" : "s"} — needs ${thresholds.minSessions} before a trend can be read`;
  }
  const first = learner.firstWindowMean ?? 0;
  const last = learner.lastWindowMean ?? 0;
  const delta = learner.delta ?? 0;
  const window = thresholds.window;
  if (learner.trend === "flat") {
    return `Holding steady: last ${window} sessions average ${last}, within ${thresholds.flatBand} points of their first ${window} (${first})`;
  }
  const direction = delta > 0 ? "higher" : "lower";
  return `Last ${window} sessions average ${last} — ${Math.abs(delta)} points ${direction} than their first ${window} (${first})`;
};

/** "+12.5" / "−7" / "—" — signed, with a real minus sign, for the table. */
export const formatDelta = (delta: number | null): string => {
  if (delta === null) return "—";
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
};

/** The learner's display name, falling back through email to the id. */
export const learnerName = (row: {
  name: string | null;
  email: string | null;
  learnerId?: number;
  id?: number;
}): string => row.name || row.email || `Learner ${row.learnerId ?? row.id ?? ""}`.trim();

/** Rows for the expanded table / CSV export of the learner list. */
export const learnerTableRows = (rows: SkillTrendLearnerRow[]): (string | number | null)[][] =>
  rows.map(r => [
    learnerName(r),
    r.evaluatedSessions,
    r.firstWindowMean,
    r.lastWindowMean,
    formatDelta(r.delta),
    TREND_LABELS[r.trend],
    r.lastSessionAt ? r.lastSessionAt.slice(0, 10) : null,
  ]);
