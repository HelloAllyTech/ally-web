import { ColorScale, PALETTE } from "./chartScales";

/**
 * Types and pure transforms for the Foundational Helping Skills card (AAQ-166),
 * backed by `GET /v1/analytics/foundational-skills`.
 *
 * The x-axis is practice volume, not time: cut N is each learner's Nth 5,000
 * characters of their own roleplay speech. Two lines share it — the average at
 * each cut, and the average the SAME learners had at their first cut — because
 * later cuts hold only the learners who kept practising, and the gap between
 * the lines is the change within those learners rather than a change in who is
 * left.
 */

export interface FoundationalSkillsSkill {
  skill: string;
  name: string;
  tier: "engage" | "understand" | "support";
}

export interface FoundationalSkillsCutSkill {
  skill: string;
  learners: number;
  avgScore: number | null;
}

export interface FoundationalSkillsCut {
  cut: number;
  learners: number;
  avgScore: number | null;
  /** Learners at this cut who also have a scored cut 1 (the paired set). */
  baselineLearners: number;
  /** The paired set's average at this cut. */
  pairedAvgScore: number | null;
  /** The paired set's average at their cut 1. */
  baselineAvgScore: number | null;
  pairedChange: number | null;
  /** 95% interval of `pairedChange`; null below the sample floor. */
  pairedChangeCi?: [number, number] | null;
  unhelpfulPct: number | null;
  skills: FoundationalSkillsCutSkill[];
}

export interface FoundationalSkillsResponse {
  rubricVersion: string;
  cutSizeLearnerChars: number;
  /** The cut each learner is compared with: 1, or 2 to treat cut 1 as a warm-up. */
  baselineCut?: number;
  minSampleSize: number;
  scoreDomain: [number, number];
  skills: FoundationalSkillsSkill[];
  cuts: FoundationalSkillsCut[];
  coverage: {
    learners: number;
    cutsSealed: number;
    cutsScored: number;
    cutsFailed: number;
    cutsPending: number;
  };
  provenance: { derivation: string; note: string };
  computedAt: string;
}

/**
 * Legend names. Short on purpose: Carbon truncates legend items at ~14
 * characters, and the caption carries the full definition of each line.
 */
export const FHS_GROUPS = {
  average: "At this cut",
  baseline: "Their cut 1",
} as const;

/** The baseline line's legend name for the chosen comparison cut. */
export const baselineGroup = (baselineCut = 1): string => `Their cut ${baselineCut}`;

export const fhsScale = (baselineCut = 1): ColorScale => ({
  [FHS_GROUPS.average]: PALETTE.blue,
  [baselineGroup(baselineCut)]: PALETTE.gray,
});

export const FHS_SCALE: ColorScale = fhsScale(1);

/** The score axis is fixed, so a small wobble cannot fill the chart. */
export const FHS_DOMAIN: [number, number] = [1, 4];

export const cutLabel = (cut: number): string => `Cut ${cut}`;

export type FhsDatum = {
  group: string;
  key: string;
  /** Null where the average was withheld: a visible gap, not a joined line. */
  value: number | null;
  /** Only on the average series: the n printed beside its point. */
  learners?: number;
};

/**
 * Both lines, over every cut up to the last one whose average cleared the
 * sample floor. A withheld cut INSIDE that range stays on the axis with a null
 * value, so the line breaks there instead of silently joining its neighbours
 * (counts need not fall monotonically — a failed cut can be thinner than the
 * next). Withheld cuts after the last plotted one are trimmed; their counts
 * reach the reader through the detail table and the takeaway.
 */
export const buildFoundationalSkillsSeries = (
  cuts: FoundationalSkillsCut[],
  baselineCut = 1,
): FhsDatum[] => {
  const lastPlotted = cuts.reduce((last, c) => (c.avgScore !== null ? c.cut : last), 0);
  const shown = cuts.filter(c => c.cut <= lastPlotted);
  return [
    ...shown.map(c => ({
      group: FHS_GROUPS.average,
      key: cutLabel(c.cut),
      value: c.avgScore,
      learners: c.learners,
    })),
    ...shown.map(c => ({
      group: baselineGroup(baselineCut),
      key: cutLabel(c.cut),
      value: c.avgScore === null ? null : c.baselineAvgScore,
    })),
  ];
};

/** Whether any point will actually be drawn. */
export const hasPlottedPoint = (series: FhsDatum[]): boolean => series.some(d => d.value !== null);

export const formatScore = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : v.toFixed(2);

export const formatChange = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}`;

/**
 * One sentence, bounded by the data: the LAST cut past the first whose paired
 * change cleared the floor, stated within ONE group of learners — the paired
 * set's average at that cut against the same people's first cut, so the two
 * numbers and the change are all about the same learners. Never the last point
 * against the first point, which mixes two different groups.
 */
export const foundationalSkillsTakeaway = (
  cuts: FoundationalSkillsCut[],
  baselineCut = 1,
): string | null => {
  const comparable = cuts.filter(
    c => c.cut > baselineCut && c.pairedChange !== null && c.pairedAvgScore !== null,
  );
  const last = comparable[comparable.length - 1];
  if (!last) return null;
  const thinner = cuts.filter(c => c.cut > last.cut && c.avgScore === null);
  const tail = thinner.length
    ? ` Later cuts have fewer than the minimum learners and are in the table only.`
    : "";
  const ci = last.pairedChangeCi;
  const verdict = ci
    ? ci[0] > 0 || ci[1] < 0
      ? ` (95% CI ${formatChange(ci[0])} to ${formatChange(ci[1])}).`
      : ` (95% CI ${formatChange(ci[0])} to ${formatChange(ci[1])}): not distinguishable from noise.`
    : ".";
  return `By cut ${last.cut}, the ${last.baselineLearners.toLocaleString()} learners who got there with a scored cut ${baselineCut} average ${formatScore(
    last.pairedAvgScore,
  )}, ${formatChange(last.pairedChange)} on their own cut ${baselineCut} (${formatScore(
    last.baselineAvgScore,
  )})${verdict}${tail}`;
};

/** Why the plot is empty, in the reader's terms, given what the server reports. */
export const foundationalSkillsEmptyText = (
  data: FoundationalSkillsResponse | undefined,
): string => {
  if (!data) return "No data";
  const { coverage, minSampleSize } = data;
  if (coverage.cutsSealed === 0) {
    return `No learner has reached ${data.cutSizeLearnerChars.toLocaleString()} characters of practice speech yet`;
  }
  if (coverage.cutsScored === 0) {
    const sealed = coverage.cutsSealed.toLocaleString();
    if (coverage.cutsPending === 0 && coverage.cutsFailed > 0) {
      return `Scoring is failing: 0 of ${sealed} cuts scored, ${coverage.cutsFailed.toLocaleString()} failed`;
    }
    const failed =
      coverage.cutsFailed > 0 ? `, ${coverage.cutsFailed.toLocaleString()} failed so far` : "";
    return `Scoring in progress: 0 of ${sealed} cuts scored${failed}`;
  }
  return `Fewer than ${minSampleSize} learners have a scored first cut yet (${coverage.learners.toLocaleString()} learners so far)`;
};

/** Detail-table rows: every cut on the axis, plotted or not, with each skill. */
export const foundationalSkillsTable = (
  data: FoundationalSkillsResponse | undefined,
): { columns: string[]; rows: (string | number)[][] } => {
  const skills = data?.skills ?? [];
  const base = data?.baselineCut ?? 1;
  return {
    columns: [
      "Cut",
      "Learners",
      "Average (1–4)",
      "Paired learners",
      "Paired, this cut",
      `Paired, cut ${base}`,
      "Paired change",
      "Paired change 95% CI",
      "With an unhelpful behaviour",
      ...skills.map(s => s.name),
    ],
    rows: (data?.cuts ?? []).map(c => {
      const bySkill = new Map(c.skills.map(s => [s.skill, s]));
      return [
        cutLabel(c.cut),
        c.learners,
        formatScore(c.avgScore),
        c.baselineLearners,
        formatScore(c.pairedAvgScore),
        formatScore(c.baselineAvgScore),
        formatChange(c.pairedChange),
        c.pairedChangeCi
          ? `${formatChange(c.pairedChangeCi[0])} to ${formatChange(c.pairedChangeCi[1])}`
          : "—",
        c.unhelpfulPct === null ? "—" : `${c.unhelpfulPct.toFixed(1)}%`,
        ...skills.map(s => {
          const cell = bySkill.get(s.skill);
          if (!cell) return "—";
          return cell.avgScore === null
            ? `n=${cell.learners}`
            : `${formatScore(cell.avgScore)} (n=${cell.learners})`;
        }),
      ];
    }),
  };
};
