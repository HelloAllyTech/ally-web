import { CONTEXT, STAT } from "./chartScales";

/**
 * Types and pure helpers for the Habits views on Highlights → Helping skills,
 * backed by `GET /v1/analytics/foundational-skills/behaviours`.
 *
 * Why habits lead the tab: on production data the 1–4 skill level carries
 * almost no person signal (ICC ≈ 0.03 — most levels are 2, and one ticked
 * behaviour flips a level), while the rubric behaviours under it are steady
 * personal habits (ICC up to ~0.46). A habit's rate — how often a learner does
 * it where they had the chance — is the measure that can actually follow a
 * person. The server owns every rule (rates, ICC, CIs, the multiple-test
 * correction, Fisher calls); this file only shapes and words them.
 */

export interface FhsBehaviourCount {
  hits: number;
  chances: number;
}

export interface FhsBehaviourRate {
  code: string;
  skill: string;
  kind: "unhelpful" | "basic" | "advanced";
  text: string;
  learnersWithChance: number;
  ratePct: number | null;
  icc: number | null;
  trackable: boolean;
  change: {
    n: number;
    startPct: number | null;
    nowPct: number | null;
    changePts: number | null;
    ciPts: [number, number] | null;
    up: number;
    down: number;
    signP: number | null;
    q: number | null;
    credible: boolean;
    learnersAdopted: number;
    learnersDropped: number;
  };
}

export interface FhsLearnerBehaviour {
  code: string;
  all: FhsBehaviourCount;
  start: FhsBehaviourCount | null;
  now: FhsBehaviourCount | null;
  p: number | null;
  clear: "adopted" | "dropped" | null;
}

export interface FoundationalSkillsBehavioursResponse {
  rubricVersion: string;
  minSampleSize: number;
  thresholds: {
    minCuts: number;
    trackableIcc: number;
    groupQ: number;
    learnerP: number;
    gridBehaviours: number;
  };
  measuredLearners: number;
  comparableLearners: number;
  behaviours: FhsBehaviourRate[];
  gridCodes: string[];
  learners: {
    id: number;
    name: string | null;
    tenantId: string | null;
    cuts: number;
    comparable: boolean;
    behaviours: FhsLearnerBehaviour[];
  }[];
  provenance: { derivation: string; note: string };
  computedAt: string;
}

export type HabitFilter = "trackable" | "helpful" | "unhelpful" | "all";

export const HABIT_FILTER_LABELS: Record<HabitFilter, string> = {
  trackable: "Trackable habits",
  helpful: "All helpful behaviours",
  unhelpful: "Unhelpful behaviours",
  all: "Every behaviour",
};

/**
 * Rows for "Habits adopted and dropped": filtered, with a measurable change,
 * biggest move first. Behaviours with no group figure (below the floor) are
 * left out and counted by the caller.
 */
export const habitRows = (
  behaviours: FhsBehaviourRate[],
  filter: HabitFilter,
): FhsBehaviourRate[] =>
  behaviours
    .filter(b => {
      if (filter === "trackable") return b.trackable && b.kind !== "unhelpful";
      if (filter === "helpful") return b.kind !== "unhelpful";
      if (filter === "unhelpful") return b.kind === "unhelpful";
      return true;
    })
    .filter(b => b.change.changePts !== null)
    .sort(
      (a, b) =>
        Math.abs(b.change.changePts ?? 0) - Math.abs(a.change.changePts ?? 0) ||
        a.code.localeCompare(b.code),
    );

/** "ICC 0.46 · trackable" / "ICC 0.03 · not person-specific" / "too few repeat chances". */
export const trackabilityLabel = (b: Pick<FhsBehaviourRate, "icc" | "trackable">): string =>
  b.icc === null
    ? "too few repeat chances to tell"
    : `ICC ${b.icc.toFixed(2)} · ${b.trackable ? "a personal habit" : "not person-specific"}`;

/**
 * Short column headers for the habit grid. Behaviour texts run to a sentence;
 * the grid needs a few words, and the full text travels in the header's title
 * and the legend under the grid.
 */
const SHORT: Record<string, string> = {
  "rapport.b1": "Introduces self",
  "rapport.b3": "Asks client's name",
  "rapport.a2": "Checks comfort",
  "hope.b1": "Explains hope",
  "hope.b2": "Praises help-seeking",
  "family.b1": "Asks about family",
  "coping.b1": "Asks about coping",
  "coping.b2": "Praises coping",
  "psychoeducation.a2": "Checks understanding",
  "feedback.b1": "Asks for feedback",
  "feedback.b2": "Adapts to feedback",
  "explanation.b2": "Asks others' view",
  "feelings.a1": "Explores hesitance",
  "feelings.b2": "Normalises",
  "empathy.b3": "Asks about emotions",
  "verbal.a1": "Says 'tell me more'",
  "functioning.b2": "Links to daily life",
  "goals.b2": "Agrees goals",
};

export const behaviourShort = (code: string, text: string): string =>
  SHORT[code] ?? (text.length > 22 ? `${text.slice(0, 21).trimEnd()}…` : text);

/** Rate shading for a grid cell: one hue, light → dark with the rate. */
export const rateCellStyle = (rate: number | null): { background: string; color: string } => {
  if (rate === null) return { background: "transparent", color: CONTEXT.line };
  if (rate < 0.25) return { background: "#edf5ff", color: CONTEXT.strong };
  if (rate < 0.5) return { background: STAT.p50, color: CONTEXT.strong };
  if (rate < 0.75) return { background: STAT.avg, color: "#ffffff" };
  return { background: STAT.p95, color: "#ffffff" };
};

export const countText = (c: FhsBehaviourCount | null): string =>
  c && c.chances > 0 ? `${c.hits}/${c.chances}` : "—";

export const countRate = (c: FhsBehaviourCount | null): number | null =>
  c && c.chances > 0 ? c.hits / c.chances : null;

/** One sentence on the group result, honest when nothing cleared the correction. */
export const habitsTakeaway = (data: FoundationalSkillsBehavioursResponse): string | undefined => {
  const tested = data.behaviours.filter(b => b.change.signP !== null).length;
  if (tested === 0) return undefined;
  const credible = data.behaviours.filter(b => b.change.credible);
  const trackable = data.behaviours.filter(b => b.trackable).length;
  if (credible.length === 0) {
    return `No behaviour changed beyond chance across ${data.comparableLearners} learners (${tested} tested, corrected). ${trackable} behaviours are personal habits worth tracking.`;
  }
  const up = credible.filter(b => (b.change.changePts ?? 0) > 0).length;
  return `${credible.length} behaviour(s) changed beyond chance (${up} up, ${credible.length - up} down) across ${data.comparableLearners} learners.`;
};
