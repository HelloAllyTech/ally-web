/**
 * Curriculum → Scenarios as practice content, part two (AAQ-227, AAQ-228):
 * types for the two scenario-calibration endpoints and the pure helpers that
 * turn them into rows and series.
 *
 *  - `GET /v1/analytics/scenarios/calibration` (AAQ-227) — where session
 *    scores land against what each scenario version lets a learner earn. All
 *    time.
 *  - `GET /v1/analytics/scenarios/progression` (AAQ-228) — what share of
 *    sessions reach the scenario's last state. Calendar window.
 *
 * The types mirror ally-be `src/analytics/dto/scenario-calibration-analytics.dto.ts`
 * one-for-one. The server applies every floor; nothing here derives a share
 * from counts.
 */
import type { AnalyticsScoping, AnalyticsWindow } from "@types";

import { withoutInProgress } from "./analyticsGrouping";
import { CONTEXT, ColorScale, PALETTE, sequentialScale } from "./chartScales";
import { pct } from "./foundationalSkillsProgressChart";
import { versionLabel } from "./scenarioEffectivenessChart";

export interface ScenarioCalibrationProvenance {
  derivation: string;
  note: string;
}

/* -------------------------------------------------------------------------- */
/* Calibration — AAQ-227                                                       */
/* -------------------------------------------------------------------------- */

export type ScenarioDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface ScenarioScoreBand {
  key: string;
  label: string;
  count: number;
  pct: number | null;
}

export interface ScenarioCalibrationRow {
  scenarioId: number;
  versionId: string | null;
  versionNumber: number | null;
  title: string;
  difficultyLevel: ScenarioDifficulty | null;
  sessions: number;
  bandedSessions: number;
  rangeSource: "derived" | "raw";
  rangeReason: "noScoredContributors" | "tooFewSinceConfigChange" | null;
  attainableMax: number | null;
  attainableMin: number | null;
  ceilingIsHard: boolean | null;
  uncappedContributors: number;
  configStableSince: string | null;
  bands: ScenarioScoreBand[];
  medianScore: number | null;
  flag: "tooEasy" | "tooHard" | null;
  rangeSuspect: boolean;
}

export interface ScenarioCalibrationBelowFloor {
  scenarioId: number;
  versionId: string | null;
  versionNumber: number | null;
  title: string;
  sessions: number;
}

export interface ScenarioCalibrationResponse {
  minSampleSize: number;
  rows: ScenarioCalibrationRow[];
  belowFloor: ScenarioCalibrationBelowFloor[];
  totals: {
    sessions: number;
    unresolvedExcluded: number;
    rows: number;
    derivedRows: number;
    tooEasy: number;
    tooHard: number;
  };
  bandDefinitions: {
    derived: { key: string; label: string }[];
    raw: { key: string; label: string }[];
  };
  thresholds: { tooEasyTopBandPct: number; tooHardBelowZeroPct: number };
  provenance: ScenarioCalibrationProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

export const DIFFICULTY_LABELS: Record<ScenarioDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const BELOW_ZERO = "below0";
const OVER_CEILING = "over100";

/**
 * Band colours. The bands inside the range are ordered, so one hue light →
 * dark (higher = darker). The two out-of-range bands get their own hues so
 * they never read as a step on that ramp: below zero warm, above the ceiling
 * purple (impossible under a hard ceiling, expected under a nominal one).
 */
export const bandScale = (definitions: { key: string }[]): ColorScale => {
  const inRange = definitions.map(d => d.key).filter(k => k !== BELOW_ZERO && k !== OVER_CEILING);
  return {
    ...sequentialScale(inRange),
    [BELOW_ZERO]: PALETTE.orange,
    [OVER_CEILING]: PALETTE.purple,
  };
};

export interface CalibrationSegment {
  key: string;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface CalibrationRowView {
  key: string;
  label: string;
  sublabel: string;
  difficulty: string | null;
  segments: CalibrationSegment[];
  n: number;
  notes: string[];
}

/** "range 0–80 points" / "raw points: …" — what the row's bands are shares of. */
const rangeText = (r: ScenarioCalibrationRow): string => {
  if (r.rangeSource === "raw") {
    return r.rangeReason === "tooFewSinceConfigChange"
      ? "raw points: scoring changed too recently to use its range"
      : "raw points: nothing in its scoring adds points";
  }
  const num = (v: number) => (v < 0 ? `−${Math.abs(v)}` : `${v}`);
  return `share of its ${num(r.attainableMin ?? 0)} to ${num(r.attainableMax ?? 0)} point range`;
};

/** The calibration flag, in words. Null when the row is inside both thresholds. */
export const calibrationFlagText = (
  r: Pick<ScenarioCalibrationRow, "flag" | "bands" | "rangeSource">,
): string | null => {
  if (r.flag === "tooEasy") {
    // The DTO's own definition of the top band: 75–100% derived, 100+ raw.
    const top = r.bands.find(
      b => b.key === (r.rangeSource === "derived" ? "pct75to100" : "raw100plus"),
    );
    return `too easy: ${pct(top?.pct)} of sessions in the top band`;
  }
  if (r.flag === "tooHard") {
    const below = r.bands.find(b => b.key === BELOW_ZERO);
    return `too hard: ${pct(below?.pct)} of sessions below 0`;
  }
  return null;
};

/**
 * One 100%-stacked row per scenario version, most sessions first (the server's
 * order). Each row stacks its own band set — a row with a usable scoring range
 * is banded on shares of it, one without on raw points — so the colours come
 * from that row's definitions. Empty bands are dropped from the stack, kept in
 * the table.
 */
export const calibrationRows = (r: ScenarioCalibrationResponse): CalibrationRowView[] => {
  const derived = bandScale(r.bandDefinitions.derived);
  const raw = bandScale(r.bandDefinitions.raw);
  return r.rows.map(row => {
    const scale = row.rangeSource === "derived" ? derived : raw;
    const notes = [
      calibrationFlagText(row),
      row.rangeSuspect
        ? "scores above a hard ceiling: the scoring changed under these sessions, or the range misses something"
        : null,
      row.rangeSource === "derived" && row.uncappedContributors > 0
        ? `nominal ceiling: ${row.uncappedContributors} uncapped scoring item${row.uncappedContributors === 1 ? "" : "s"} counted once, so scores above 100% are expected`
        : null,
    ].filter((n): n is string => Boolean(n));
    return {
      key: `${row.scenarioId}-${row.versionId ?? "none"}`,
      label: `${row.title} ${versionLabel(row.versionNumber)}`,
      sublabel: [
        `${row.bandedSessions.toLocaleString()} sessions`,
        rangeText(row),
        row.medianScore !== null ? `median ${row.medianScore} points` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      difficulty: row.difficultyLevel ? DIFFICULTY_LABELS[row.difficultyLevel] : null,
      segments: row.bands
        .filter(b => b.pct !== null && b.pct > 0)
        .map(b => ({
          key: b.key,
          label: b.label,
          count: b.count,
          pct: b.pct as number,
          color: scale[b.key] ?? CONTEXT.line,
        })),
      n: row.bandedSessions,
      notes,
    };
  });
};

/** Names the flagged versions with their authored label, which is the mismatch worth seeing. */
export const calibrationTakeaway = (r: ScenarioCalibrationResponse): string | undefined => {
  if (r.rows.length === 0) return undefined;
  const flagged = r.rows.filter(row => row.flag !== null);
  const of = `${r.rows.length} scenario version${r.rows.length === 1 ? "" : "s"} with ${r.minSampleSize}+ scored sessions`;
  if (flagged.length === 0) return `None of ${of} lands as too easy or too hard.`;
  const named = flagged
    .slice(0, 4)
    .map(
      row =>
        `${row.title} ${versionLabel(row.versionNumber)}${
          row.difficultyLevel
            ? `, labelled ${DIFFICULTY_LABELS[row.difficultyLevel].toLowerCase()}`
            : ""
        } (${row.flag === "tooEasy" ? "too easy" : "too hard"})`,
    )
    .join("; ");
  const more = flagged.length > 4 ? `; and ${flagged.length - 4} more` : "";
  return `${flagged.length} of ${of} to check: ${named}${more}.`;
};

/** "Scenario A v2 (n = 12), …" for the versions under the floor. */
export const calibrationBelowFloor = (r: ScenarioCalibrationResponse, max = 6): string | null => {
  if (r.belowFloor.length === 0) return null;
  const head = r.belowFloor
    .slice(0, max)
    .map(b => `${b.title} ${versionLabel(b.versionNumber)} (n = ${b.sessions})`);
  const rest = r.belowFloor.length - head.length;
  return `${head.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}`;
};

export const calibrationTable = (r: ScenarioCalibrationResponse) => ({
  columns: [
    "Scenario",
    "Version",
    "Authored difficulty",
    "Sessions",
    "Sessions banded",
    "Bands",
    "Attainable range",
    "Ceiling",
    "Scoring stable since",
    "Median score",
    "Bands (share, count)",
    "Flag",
    "Range suspect",
  ],
  rows: r.rows.map(row => [
    row.title,
    versionLabel(row.versionNumber),
    row.difficultyLevel ? DIFFICULTY_LABELS[row.difficultyLevel] : null,
    row.sessions,
    row.bandedSessions,
    row.rangeSource === "derived"
      ? "share of range"
      : `raw points (${row.rangeReason ?? "no range"})`,
    row.attainableMax === null ? null : `${row.attainableMin ?? 0} to ${row.attainableMax}`,
    row.ceilingIsHard === null
      ? null
      : row.ceilingIsHard
        ? "hard"
        : `nominal (${row.uncappedContributors} uncapped)`,
    row.configStableSince ? row.configStableSince.slice(0, 10) : null,
    row.medianScore,
    row.bands.map(b => `${b.label}: ${pct(b.pct)} (${b.count})`).join("; "),
    row.flag === "tooEasy" ? "too easy" : row.flag === "tooHard" ? "too hard" : null,
    row.rangeSuspect ? "yes" : "no",
  ]),
});

/* -------------------------------------------------------------------------- */
/* Progression — AAQ-228                                                       */
/* -------------------------------------------------------------------------- */

export interface ScenarioProgressionCounts {
  sessions: number;
  reachedTerminal: number;
  advanced: number;
  neverAdvanced: number;
  reachedTerminalPct: number | null;
  advancedPct: number | null;
  neverAdvancedPct: number | null;
  fellBackOnly: number;
  untracked: number;
}

export interface ScenarioProgressionPoint extends ScenarioProgressionCounts {
  bucket: string;
}

export interface ScenarioProgressionResponse {
  minSampleSize: number;
  window: AnalyticsWindow;
  points: ScenarioProgressionPoint[];
  totals: ScenarioProgressionCounts & {
    untrackedByReason: { noStateMetadata: number; branchingMode: number; noRoomToAdvance: number };
  };
  byScenario: (ScenarioProgressionCounts & { scenarioId: number; title: string })[];
  provenance: ScenarioCalibrationProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** The three classes, furthest first — the order they stack from the axis up. */
export const PROGRESSION_SERIES = [
  "Reached the last state",
  "Advanced, not to the end",
  "Never past the opening",
] as const;

/** Ordered outcomes, so one hue: darker = further through the scenario. */
export const PROGRESSION_SCALE: ColorScale = sequentialScale([...PROGRESSION_SERIES].reverse());

/**
 * Stacked shares per bucket, the still-accruing bucket left off (it would draw
 * as a fall). A bucket whose shares the server withheld contributes no bar
 * rather than bars recomputed from its counts.
 */
export const progressionSeries = (
  r: ScenarioProgressionResponse,
): { group: string; key: string; value: number }[] =>
  withoutInProgress(r.points, p => p.bucket, r.window.inProgressBucket).flatMap(p => {
    const values: [string, number | null][] = [
      [PROGRESSION_SERIES[0], p.reachedTerminalPct],
      [PROGRESSION_SERIES[1], p.advancedPct],
      [PROGRESSION_SERIES[2], p.neverAdvancedPct],
    ];
    return values
      .filter((v): v is [string, number] => v[1] !== null)
      .map(([group, value]) => ({ group, key: p.bucket, value }));
  });

/** Buckets with sessions but too few to state shares — said under the chart. */
export const thinBuckets = (r: ScenarioProgressionResponse): number =>
  withoutInProgress(r.points, p => p.bucket, r.window.inProgressBucket).filter(
    p => p.sessions > 0 && p.reachedTerminalPct === null,
  ).length;

export const progressionTakeaway = (r: ScenarioProgressionResponse): string | undefined => {
  const t = r.totals;
  if (t.sessions === 0) return undefined;
  if (t.reachedTerminalPct === null || t.neverAdvancedPct === null) {
    return `${t.sessions} tracked session${t.sessions === 1 ? "" : "s"}: too few to state shares (need ${r.minSampleSize}).`;
  }
  return `${pct(t.reachedTerminalPct)} of ${t.sessions.toLocaleString()} tracked sessions reached the scenario's last state; ${pct(
    t.neverAdvancedPct,
  )} never got past the opening state.`;
};

/** The sessions that carry no state, by reason. Counted, never plotted. */
export const untrackedNote = (r: ScenarioProgressionResponse): string | null => {
  const t = r.totals;
  if (t.untracked === 0) return null;
  const why = t.untrackedByReason;
  const parts = [
    why.noStateMetadata
      ? `${why.noStateMetadata} carry no state (older builds or stateless scenarios)`
      : null,
    why.branchingMode ? `${why.branchingMode} ran in branching mode` : null,
    why.noRoomToAdvance ? `${why.noRoomToAdvance} had nowhere to advance to` : null,
  ].filter(Boolean);
  return `${t.untracked.toLocaleString()} session${t.untracked === 1 ? "" : "s"} not plotted${
    parts.length ? `: ${parts.join(", ")}` : ""
  }.`;
};

export const progressionTable = (r: ScenarioProgressionResponse) => ({
  columns: [
    "Scenario",
    "Tracked sessions",
    "Reached the last state",
    "Reached %",
    "Advanced, not to the end",
    "Advanced %",
    "Never past the opening",
    "Never %",
    "Of which only fell back",
    "Not tracked",
  ],
  rows: r.byScenario.map(s => [
    s.title,
    s.sessions,
    s.reachedTerminal,
    s.reachedTerminalPct,
    s.advanced,
    s.advancedPct,
    s.neverAdvanced,
    s.neverAdvancedPct,
    s.fellBackOnly,
    s.untracked,
  ]),
});
