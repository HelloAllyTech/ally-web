/**
 * Curriculum → Scenarios as practice content (AAQ-214..216): types for the two
 * scenario endpoints and the pure helpers that turn them into rows.
 *
 *  - `GET /v1/analytics/scenarios/opportunity-coverage` (AAQ-214, AAQ-215)
 *  - `GET /v1/analytics/scenarios/repeat-improvement` (AAQ-216)
 *
 * The types mirror ally-be `src/analytics/dto/scenario-effectiveness-analytics.dto.ts`
 * one-for-one. Both endpoints are all-time by construction. The server applies
 * every floor; nothing here derives a share or an average from counts.
 */
import type { AnalyticsScoping } from "@types";

import { CONTEXT, PALETTE, STAT } from "./chartScales";
import {
  Ci,
  FhsTier,
  TIER_LABELS,
  ciText,
  pValue,
  pct,
  signed,
  skillShort,
  skillsByTier,
} from "./foundationalSkillsProgressChart";

export interface ScenarioEffectivenessProvenance {
  derivation: string;
  note: string;
}

/* -------------------------------------------------------------------------- */
/* Opportunity coverage — AAQ-214, AAQ-215                                     */
/* -------------------------------------------------------------------------- */

export interface ScenarioCoverageSkill {
  skill: string;
  name: string;
  tier: FhsTier;
}

export interface ScenarioOpportunityCell {
  skill: string;
  tagged: boolean;
  opportunities: number;
  opportunityPct: number | null;
}

export interface ScenarioOpportunityRow {
  scenarioId: number;
  title: string;
  cuts: number;
  learners: number;
  sessionsPlayed: number;
  taggedSkills: string[];
  untranslatableTags: string[];
  customTags: number;
  cells: ScenarioOpportunityCell[];
}

export interface ScenarioCoverageBelowFloor {
  scenarioId: number;
  title: string;
  cuts: number;
}

export interface ScenarioTagGap {
  scenarioId: number;
  title: string;
  skill: string;
  opportunityPct: number;
  cuts: number;
  sessionsPlayed: number;
}

export interface ScenarioOpportunityCoverageResponse {
  rubricVersion: string;
  minSampleSize: number;
  skills: ScenarioCoverageSkill[];
  scoredCuts: number;
  singleScenarioCuts: number;
  singleScenarioShare: number | null;
  scenarios: ScenarioOpportunityRow[];
  belowFloor: ScenarioCoverageBelowFloor[];
  tagGaps: ScenarioTagGap[];
  thresholds: { maxOpportunityPct: number; minCuts: number };
  provenance: ScenarioEffectivenessProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/**
 * Below this single-scenario share the rows describe a minority of practice,
 * and the card says so (the DTO's own guidance: "below ~60%").
 */
export const SINGLE_SCENARIO_SHARE_WARN = 60;

export interface CoverageColumn {
  skill: string;
  name: string;
  short: string;
  tier: FhsTier;
}

/** The 14 skills grouped by tier (the rubric itself interleaves tiers), short labels for headers. */
export const coverageColumns = (skills: ScenarioCoverageSkill[]): CoverageColumn[] =>
  skillsByTier(skills).map(s => ({
    skill: s.skill,
    name: s.name,
    short: skillShort(s.skill),
    tier: s.tier,
  }));

/** One header cell per run of same-tier columns. */
export const tierSpans = (
  columns: CoverageColumn[],
): { tier: FhsTier; label: string; span: number }[] =>
  columns.reduce<{ tier: FhsTier; label: string; span: number }[]>((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && last.tier === c.tier) last.span += 1;
    else acc.push({ tier: c.tier, label: TIER_LABELS[c.tier], span: 1 });
    return acc;
  }, []);

export interface CoverageCell {
  value: number | null;
  tagged: boolean;
  title: string;
}

/** A cell's share, tag and hover text. A cell the row does not carry reads as blank, not 0. */
export const coverageCell = (row: ScenarioOpportunityRow, column: CoverageColumn): CoverageCell => {
  const cell = row.cells.find(c => c.skill === column.skill);
  if (!cell) return { value: null, tagged: false, title: `${column.name}: no data` };
  const tag = cell.tagged ? " · the scenario is tagged with this skill" : "";
  return {
    value: cell.opportunityPct,
    tagged: cell.tagged,
    title:
      cell.opportunityPct === null
        ? `${column.name}: withheld (${cell.opportunities} of ${row.cuts} slices)${tag}`
        : `${column.name}: a chance in ${cell.opportunities} of ${row.cuts} slices (${pct(cell.opportunityPct)})${tag}`,
  };
};

/** Shading for a 0–100% opportunity share: one hue, darker = more often. */
export const opportunityCellStyle = (
  value: number | null,
): { background: string; color: string } => {
  if (value === null) return { background: "transparent", color: CONTEXT.line };
  if (value < 25) return { background: "#edf5ff", color: CONTEXT.strong };
  if (value < 50) return { background: STAT.p50, color: CONTEXT.strong };
  if (value < 75) return { background: STAT.avg, color: "#ffffff" };
  return { background: STAT.p95, color: "#ffffff" };
};

/** The legend's four bins, with a sample value inside each. */
export const OPPORTUNITY_LEGEND: { label: string; sample: number }[] = [
  { label: "under 25%", sample: 10 },
  { label: "25–49%", sample: 30 },
  { label: "50–74%", sample: 60 },
  { label: "75% and up", sample: 90 },
];

/** Outline for a tagged cell — a hue outside the blue shading ramp, so it never reads as a level. */
export const TAGGED_OUTLINE = PALETTE.orange;

/**
 * The single-scenario share, for the caption. Below
 * {@link SINGLE_SCENARIO_SHARE_WARN} it says outright that the chart covers a
 * minority of practice.
 */
export const singleScenarioNote = (r: ScenarioOpportunityCoverageResponse): string => {
  if (r.singleScenarioShare === null) {
    return `Only slices whose every session played one scenario are attributed (${r.singleScenarioCuts.toLocaleString()} of ${r.scoredCuts.toLocaleString()} scored slices; too few to state a share).`;
  }
  if (r.singleScenarioShare < SINGLE_SCENARIO_SHARE_WARN) {
    return `Restricted to single-scenario slices: only ${pct(r.singleScenarioShare)} of scored slices (${r.singleScenarioCuts.toLocaleString()} of ${r.scoredCuts.toLocaleString()}) played one scenario throughout, so these rows describe a minority of practice.`;
  }
  return `${pct(r.singleScenarioShare)} of scored slices (${r.singleScenarioCuts.toLocaleString()} of ${r.scoredCuts.toLocaleString()}) played one scenario throughout; only those are attributed to a scenario.`;
};

/** Tagged cells in the rows, and how many of them the server lists as gaps. */
export const coverageTakeaway = (r: ScenarioOpportunityCoverageResponse): string | undefined => {
  if (r.scenarios.length === 0) return undefined;
  const tagged = r.scenarios.reduce((n, s) => n + s.cells.filter(c => c.tagged).length, 0);
  const rows = `${r.scenarios.length} scenario${r.scenarios.length === 1 ? "" : "s"} with ${r.minSampleSize}+ single-scenario slices`;
  if (tagged === 0)
    return `${rows}; none is tagged with a competency that maps to a helping skill.`;
  return `${rows}: ${r.tagGaps.length} of their ${tagged} tagged skills get a chance in under ${r.thresholds.maxOpportunityPct}% of slices.`;
};

/** "Scenario A (n = 12), …" for the scenarios still under the floor. */
export const belowFloorText = (r: ScenarioOpportunityCoverageResponse, max = 6): string | null => {
  if (r.belowFloor.length === 0) return null;
  const head = r.belowFloor.slice(0, max).map(b => `${b.title} (n = ${b.cuts})`);
  const rest = r.belowFloor.length - head.length;
  return `${r.belowFloor.length} more scenario${r.belowFloor.length === 1 ? " has" : "s have"} fewer than ${r.minSampleSize} single-scenario slices: ${head.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`;
};

/** Expanded view: one row per scenario, every skill's share as a column. */
export const coverageTable = (r: ScenarioOpportunityCoverageResponse) => {
  const columns = coverageColumns(r.skills);
  return {
    columns: [
      "Scenario",
      "Slices",
      "Learners",
      "Sessions played",
      "Tagged skills",
      "Tags with no helping skill",
      "Custom tags",
      ...columns.map(c => `${c.name} %`),
    ],
    rows: r.scenarios.map(s => [
      s.title,
      s.cuts,
      s.learners,
      s.sessionsPlayed,
      s.taggedSkills.map(k => columns.find(c => c.skill === k)?.name ?? k).join(", ") || null,
      s.untranslatableTags.join(", ") || null,
      s.customTags,
      ...columns.map(c => {
        const cell = s.cells.find(x => x.skill === c.skill);
        if (!cell || cell.opportunityPct === null) return null;
        return cell.tagged ? `${cell.opportunityPct} (tagged)` : cell.opportunityPct;
      }),
    ]),
  };
};

export interface TagGapRow {
  key: string;
  scenario: string;
  skill: string;
  opportunityPct: number;
  cuts: number;
  sessionsPlayed: number;
}

/** AAQ-215: the fix list, most-played first (the server's order), with full skill names. */
export const tagGapRows = (r: ScenarioOpportunityCoverageResponse): TagGapRow[] =>
  r.tagGaps.map(g => ({
    key: `${g.scenarioId}-${g.skill}`,
    scenario: g.title,
    skill: r.skills.find(s => s.skill === g.skill)?.name ?? g.skill,
    opportunityPct: g.opportunityPct,
    cuts: g.cuts,
    sessionsPlayed: g.sessionsPlayed,
  }));

export const tagGapTakeaway = (r: ScenarioOpportunityCoverageResponse): string | undefined => {
  const top = tagGapRows(r)[0];
  if (!top) return undefined;
  return `Fix first: ${top.scenario}. It is tagged with ${top.skill}, but gives a chance at it in ${pct(
    top.opportunityPct,
  )} of ${top.cuts} slices, across ${top.sessionsPlayed.toLocaleString()} sessions played.`;
};

/* -------------------------------------------------------------------------- */
/* Repeat improvement — AAQ-216                                                */
/* -------------------------------------------------------------------------- */

export interface ScenarioRepeatImprovementQuery {
  scenarioId?: number;
  tenantId?: string;
}

export interface ScenarioRepeatRow {
  scenarioId: number;
  title: string;
  versionId: string | null;
  versionNumber: number | null;
  repeaters: number;
  pairs: number;
  firstAvg: number | null;
  latestAvg: number | null;
  change: number | null;
  changeCi: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
  /*
   * A version does not pin its scoring config (event mappings and behaviour
   * instructions are edited in place), so the server says when the scenario's
   * scoring last changed and how many pairs straddle that edit. Optional: a
   * backend from before this addition omits both.
   */
  /** ISO time of the scenario's last scoring-config edit; null when unknown. */
  scoringChangedAt?: string | null;
  /** Of `pairs`, those whose first play predates that edit and latest follows it (a floor). */
  pairsSpanningScoringChange?: number;
}

export interface ScenarioRepeatPooled {
  pairs: number;
  learners: number;
  up: number;
  down: number;
  tied: number;
  improvingPct: number | null;
  signP: number | null;
}

export interface ScenarioRepeatLearner {
  learnerId: number;
  first: number;
  latest: number;
  change: number;
  firstAt: string;
  latestAt: string;
  plays: number;
}

export interface ScenarioRepeatSelected {
  scenarioId: number;
  title: string | null;
  versionId: string | null;
  versionNumber: number | null;
  repeaters: number;
  pairs: number;
  learners: ScenarioRepeatLearner[] | null;
}

export interface ScenarioRepeatPickerItem {
  scenarioId: number;
  title: string;
  versionId: string | null;
  pairs: number;
}

export interface ScenarioRepeatImprovementResponse {
  minSampleSize: number;
  thresholds: { minSpanHours: number; pickerSize: number };
  repeatGroups: number;
  scenarios: ScenarioRepeatRow[];
  pooled: ScenarioRepeatPooled;
  selected: ScenarioRepeatSelected | null;
  picker: ScenarioRepeatPickerItem[];
  provenance: ScenarioEffectivenessProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** "v3", or "no version" for plays that predate versioning. */
export const versionLabel = (versionNumber: number | null): string =>
  versionNumber === null ? "unversioned" : `v${versionNumber}`;

/** Picker items: the dropdown wants string ids. */
export const repeatPickerItems = (
  r: ScenarioRepeatImprovementResponse,
): { id: string; label: string }[] =>
  r.picker.map(p => ({
    id: String(p.scenarioId),
    label: `${p.title} · ${p.pairs} ${p.pairs === 1 ? "pair" : "pairs"}`,
  }));

/** The per-version row behind the slope chart, for its mean line and interval. */
export const selectedRow = (r: ScenarioRepeatImprovementResponse): ScenarioRepeatRow | null => {
  const s = r.selected;
  if (!s) return null;
  return (
    r.scenarios.find(row => row.scenarioId === s.scenarioId && row.versionId === s.versionId) ??
    null
  );
};

/**
 * Round [lo, hi] out to a tick step so the slope chart's axis has whole,
 * readable ends. Session scores are raw points on the scenario's own scale,
 * so there is no fixed domain to borrow; the data sets it, with zero kept in
 * view when the scores straddle it.
 */
export const slopeAxis = (values: number[]): { domain: [number, number]; ticks: number[] } => {
  if (values.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const raw = (hi - lo) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { domain: [start, end], ticks };
};

/**
 * "6 of these 24 pairs straddle a scoring edit on 2026-09-03 — read the change
 * with care." Said beside a version's change whenever any pair may be comparing
 * two scoring configs. Null when none does, or when an older backend sent no
 * count. The count is a floor: only the last edit is knowable.
 */
export const scoringEditNote = (row: ScenarioRepeatRow): string | null => {
  const spanning = row.pairsSpanningScoringChange ?? 0;
  if (spanning === 0) return null;
  const when = row.scoringChangedAt ? ` on ${row.scoringChangedAt.slice(0, 10)}` : "";
  return `${spanning} of these ${row.pairs} pairs straddle a scoring edit${when} — read the change with care.`;
};

/** The takeaway: the pooled share improving, then the selected scenario's own change. */
export const repeatTakeaway = (r: ScenarioRepeatImprovementResponse): string | undefined => {
  const p = r.pooled;
  if (p.learners === 0) return undefined;
  const pooled =
    p.improvingPct === null
      ? `${p.learners} learner${p.learners === 1 ? " has" : "s have"} replayed a scenario a day or more apart; need ${r.minSampleSize} before a share improving is stated.`
      : `Across every scenario, ${pct(p.improvingPct)} of ${p.learners} learners who replayed one scored higher on balance (${p.up} up, ${p.down} down, ${p.tied} level, ${pValue(p.signP)}).`;
  const row = selectedRow(r);
  const sel =
    row && row.change !== null
      ? ` ${row.title} ${versionLabel(row.versionNumber)}: ${signed(row.change, 1)} points (95% CI ${ciText(
          row.changeCi,
          1,
        )}), ${row.detectable ? "a detectable change" : "no detectable change"}.`
      : "";
  return `${pooled}${sel}`;
};

/** Expanded view: every scenario version with a repeat player. */
export const repeatTable = (r: ScenarioRepeatImprovementResponse) => ({
  columns: [
    "Scenario",
    "Version",
    "Learners with 2+ plays",
    "Paired (a day+ apart)",
    "First avg",
    "Latest avg",
    "Change (pts)",
    "95% CI",
    "Up",
    "Down",
    "Level",
    "Sign test",
    "Pairs across the last scoring edit",
  ],
  rows: r.scenarios.map(s => [
    s.title,
    versionLabel(s.versionNumber),
    s.repeaters,
    s.pairs,
    s.firstAvg === null ? null : Number(s.firstAvg.toFixed(1)),
    s.latestAvg === null ? null : Number(s.latestAvg.toFixed(1)),
    s.change === null ? null : signed(s.change, 1),
    s.changeCi ? ciText(s.changeCi, 1) : null,
    s.up,
    s.down,
    s.tied,
    s.signP === null ? null : pValue(s.signP),
    s.pairsSpanningScoringChange === undefined
      ? null
      : `${s.pairsSpanningScoringChange}${s.scoringChangedAt ? ` (edit ${s.scoringChangedAt.slice(0, 10)})` : ""}`,
  ]),
});
