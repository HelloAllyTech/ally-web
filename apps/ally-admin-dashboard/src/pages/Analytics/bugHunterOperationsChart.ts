import { AnalyticsWindowQuery } from "@api";
import {
  BugFindingSource,
  BugHuntTrigger,
  BugHunterDifficulty,
  BugHunterOperationsDay,
  BugHunterOperationsMetrics,
  BugHunterOperationsModel,
  BugHunterOperationsReporter,
  BugHunterOperationsSource,
  BugHunterReporter,
} from "@types";

import { ColorScale, PALETTE } from "./chartScales";
import { BUG_FINDING_SOURCE_LABELS } from "../BugHunter/bugFindingLabels";
import { formatRate, formatTokens } from "../BugHunter/scorecard";

/**
 * Pure transforms for the Bug Agent tab's volume cards — what Bug Hunter
 * turns up day by day, where it comes from, how hard it was to spot, who
 * raised it, what the models cost, and how much code the sweeps were shown.
 *
 * Fed by `GET /v1/bug-hunter/metrics/operations`, which returns every
 * calendar day in the window (dense, zeros included) with each day's filed
 * count already paired with where that cohort stands now. The rule these
 * builders keep is the endpoint's own: a volume figure is never drawn
 * without its acceptance share beside it, because a bar of "12 filed" on its
 * own rewards a noisy finder exactly as much as a good one.
 *
 * ## Colour follows the entity
 *
 * Every scale here is a fixed lookup keyed by the enum, never an index into
 * the current response. A source that files nothing for a month keeps its
 * colour when it returns, and narrowing the range never repaints the
 * survivors — the same reason `chartScales.stableScale` exists, applied to
 * dimensions small enough to pin by hand.
 */

/** The endpoint's own ceiling on `days` (BUG_HUNTER_METRICS_MAX_DAYS). */
export const OPERATIONS_MAX_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The page-level range, as the day count the operations endpoint takes.
 *
 * That endpoint is anchored on "now" and windows backwards, so a custom
 * from→to pair becomes "from `from` until today" — the honest reading of the
 * one shape it cannot express — and "all" becomes the endpoint's own maximum.
 * Both are said on the card rather than hidden.
 */
export const rangeToDays = (query: AnalyticsWindowQuery, now: Date = new Date()): number => {
  if (query.from && query.to) {
    const from = new Date(query.from).getTime();
    if (!Number.isNaN(from)) {
      const days = Math.ceil((now.getTime() - from) / MS_PER_DAY);
      return Math.min(OPERATIONS_MAX_DAYS, Math.max(1, days));
    }
  }
  switch (query.range) {
    case "90d":
      return 90;
    case "12m":
    case "all":
      return OPERATIONS_MAX_DAYS;
    case "30d":
    default:
      return 30;
  }
};

/** What the window actually covered, for the provenance line. */
export const operationsWindowLabel = (data?: BugHunterOperationsMetrics): string =>
  data
    ? `last ${data.windowDays} days (${data.since.slice(0, 10)} → today, UTC days)`
    : "window loading";

export interface OpsDatum {
  group: string;
  key: string;
  value: number;
}

/** A bar per named quantity — the shape `hBarOpts` charts read. */
export interface OpsBar {
  group: string;
  value: number;
}

/* ── outcomes ─────────────────────────────────────────────────────────── */

export const OUTCOME_ACCEPTED = "Accepted";
export const OUTCOME_DECLINED = "Declined";
export const OUTCOME_UNDECIDED = "Undecided";

/**
 * Green for accepted matches THROUGHPUT_SCALE's "approved → merged" on the
 * sibling cards, so "good news" is one hue across the tab. Undecided is grey
 * because it is the absence of a decision, not a third outcome.
 */
export const OUTCOME_SCALE: ColorScale = {
  [OUTCOME_ACCEPTED]: PALETTE.green,
  [OUTCOME_DECLINED]: PALETTE.orange,
  [OUTCOME_UNDECIDED]: PALETTE.gray,
};

export const buildFiledSeries = (days: BugHunterOperationsDay[]): OpsDatum[] => [
  ...days.map(d => ({ group: OUTCOME_ACCEPTED, key: d.date, value: d.accepted })),
  ...days.map(d => ({ group: OUTCOME_DECLINED, key: d.date, value: d.declined })),
  ...days.map(d => ({ group: OUTCOME_UNDECIDED, key: d.date, value: d.undecided })),
];

export const buildFiledTable = (days: BugHunterOperationsDay[]) => ({
  columns: ["Day (UTC)", OUTCOME_ACCEPTED, OUTCOME_DECLINED, OUTCOME_UNDECIDED, "Filed"],
  rows: days.map(d => [d.date, d.accepted, d.declined, d.undecided, d.filed]),
});

/** "N filed · X% of those ruled on accepted", or the honest sentence when nothing has been ruled on. */
export const filedTakeaway = (data: BugHunterOperationsMetrics): string | undefined => {
  const { filed, accepted, declined } = data.totals;
  if (filed === 0) return undefined;
  const judged = accepted + declined;
  if (judged === 0) return `${filed.toLocaleString()} filed — none ruled on yet`;
  return `${filed.toLocaleString()} filed · ${formatRate(accepted / judged)} of the ${judged.toLocaleString()} ruled on were accepted`;
};

/* ── sources ──────────────────────────────────────────────────────────── */

export const SOURCE_ORDER: BugFindingSource[] = [
  BugFindingSource.CODE_REVIEW,
  BugFindingSource.TEST_FAILURE,
  BugFindingSource.PRODUCTION_LOG,
  BugFindingSource.LINT_ERROR,
  BugFindingSource.REPORTED_BUG,
  BugFindingSource.UX_SIGNAL,
  BugFindingSource.ANALYTICS_SUGGESTION,
];

export const sourceLabel = (source: string): string =>
  BUG_FINDING_SOURCE_LABELS[source as BugFindingSource] ?? source;

/** Fixed slot per source. Distinct hues for the two finders that file most. */
export const SOURCE_SCALE: ColorScale = {
  [sourceLabel(BugFindingSource.CODE_REVIEW)]: PALETTE.blue,
  [sourceLabel(BugFindingSource.TEST_FAILURE)]: PALETTE.orange,
  [sourceLabel(BugFindingSource.PRODUCTION_LOG)]: PALETTE.teal,
  [sourceLabel(BugFindingSource.LINT_ERROR)]: PALETTE.gold,
  [sourceLabel(BugFindingSource.REPORTED_BUG)]: PALETTE.magenta,
  [sourceLabel(BugFindingSource.UX_SIGNAL)]: PALETTE.cyan,
  [sourceLabel(BugFindingSource.ANALYTICS_SUGGESTION)]: PALETTE.gray,
};

/** Only sources that filed something in the window get a series — each in its fixed colour. */
export const presentSources = (bySource: BugHunterOperationsSource[]): BugFindingSource[] => {
  const present = new Set<string>(bySource.map(s => s.source));
  return SOURCE_ORDER.filter(s => present.has(s));
};

export const buildSourceSeries = (
  days: BugHunterOperationsDay[],
  sources: BugFindingSource[],
): OpsDatum[] =>
  sources.flatMap(source =>
    days.map(d => ({
      group: sourceLabel(source),
      key: d.date,
      value: d.bySource[source] ?? 0,
    })),
  );

const acceptedShareCell = (accepted: number, declined: number): string => {
  const judged = accepted + declined;
  return judged === 0 ? "—" : formatRate(accepted / judged);
};

/** Window totals per source, with the accepted share the chart cannot show. */
export const buildSourceTable = (bySource: BugHunterOperationsSource[]) => ({
  columns: ["Source", "Filed", "Accepted", "Declined", "Undecided", "Accepted share"],
  rows: bySource.map(s => [
    sourceLabel(s.source),
    s.filed,
    s.accepted,
    s.declined,
    s.undecided,
    acceptedShareCell(s.accepted, s.declined),
  ]),
});

export const sourceTakeaway = (bySource: BugHunterOperationsSource[]): string | undefined => {
  const top = bySource[0];
  if (!top || top.filed === 0) return undefined;
  const total = bySource.reduce((s, r) => s + r.filed, 0);
  return `${sourceLabel(top.source)} filed the most (${formatRate(top.filed / total)} of ${total.toLocaleString()}), accepted ${acceptedShareCell(top.accepted, top.declined)} of the time`;
};

/* ── difficulty ───────────────────────────────────────────────────────── */

export const DIFFICULTY_ORDER: BugHunterDifficulty[] = ["easy", "hard", "reported"];

export const DIFFICULTY_LABELS: Record<BugHunterDifficulty, string> = {
  easy: "Easy to spot",
  hard: "Hard to spot",
  reported: "Reported by people",
};

export const DIFFICULTY_SCALE: ColorScale = {
  [DIFFICULTY_LABELS.easy]: PALETTE.blue,
  [DIFFICULTY_LABELS.hard]: PALETTE.orange,
  [DIFFICULTY_LABELS.reported]: PALETTE.teal,
};

export const buildDifficultySeries = (days: BugHunterOperationsDay[]): OpsDatum[] =>
  DIFFICULTY_ORDER.flatMap(difficulty =>
    days.map(d => ({
      group: DIFFICULTY_LABELS[difficulty],
      key: d.date,
      value: d.byDifficulty[difficulty]?.filed ?? 0,
    })),
  );

export const buildDifficultyTable = (data: BugHunterOperationsMetrics) => ({
  columns: ["How it was found", "Filed", "Accepted", "Declined", "Undecided", "Accepted share"],
  rows: DIFFICULTY_ORDER.map(difficulty => {
    const row = data.byDifficulty.find(r => r.difficulty === difficulty);
    return [
      DIFFICULTY_LABELS[difficulty],
      row?.filed ?? 0,
      row?.accepted ?? 0,
      row?.declined ?? 0,
      row?.undecided ?? 0,
      acceptedShareCell(row?.accepted ?? 0, row?.declined ?? 0),
    ];
  }),
});

/** The comparison the split exists for: do hard-to-spot bugs hold up as well as easy ones? */
export const difficultyTakeaway = (data: BugHunterOperationsMetrics): string | undefined => {
  const easy = data.byDifficulty.find(r => r.difficulty === "easy");
  const hard = data.byDifficulty.find(r => r.difficulty === "hard");
  if (!easy || !hard || easy.filed + hard.filed === 0) return undefined;
  const easyShare = acceptedShareCell(easy.accepted, easy.declined);
  const hardShare = acceptedShareCell(hard.accepted, hard.declined);
  return `${hard.filed.toLocaleString()} hard-to-spot vs ${easy.filed.toLocaleString()} easy — accepted ${hardShare} vs ${easyShare} of those ruled on`;
};

/* ── reporters ────────────────────────────────────────────────────────── */

export const REPORTER_ORDER: BugHunterReporter[] = ["agent", "staff", "consumer"];

export const REPORTER_LABELS: Record<BugHunterReporter, string> = {
  agent: "Bug Hunter",
  staff: "Staff",
  consumer: "Consumers",
};

/** One hue for every bar: these are identities compared side by side, not a magnitude to ramp. */
export const uniformScale = (labels: string[], color: string = PALETTE.blue): ColorScale =>
  Object.fromEntries(labels.map(label => [label, color]));

export const buildReporterBars = (byReporter: BugHunterOperationsReporter[]): OpsBar[] =>
  REPORTER_ORDER.map(reporter => ({
    group: REPORTER_LABELS[reporter],
    value: byReporter.find(r => r.reporter === reporter)?.filed ?? 0,
  }));

export const buildReporterTable = (byReporter: BugHunterOperationsReporter[]) => ({
  columns: ["Raised by", "Filed", "Accepted", "Declined", "Accepted share"],
  rows: REPORTER_ORDER.map(reporter => {
    const row = byReporter.find(r => r.reporter === reporter);
    return [
      REPORTER_LABELS[reporter],
      row?.filed ?? 0,
      row?.accepted ?? 0,
      row?.declined ?? 0,
      acceptedShareCell(row?.accepted ?? 0, row?.declined ?? 0),
    ];
  }),
});

export const reporterTakeaway = (byReporter: BugHunterOperationsReporter[]): string | undefined => {
  const total = byReporter.reduce((s, r) => s + r.filed, 0);
  if (total === 0) return undefined;
  const agent = byReporter.find(r => r.reporter === "agent")?.filed ?? 0;
  const people = total - agent;
  return `${formatRate(agent / total)} raised by Bug Hunter, ${people.toLocaleString()} by people`;
};

/* ── tokens by trigger ────────────────────────────────────────────────── */

export const TRIGGER_ORDER: BugHuntTrigger[] = [
  BugHuntTrigger.SCHEDULED,
  BugHuntTrigger.MANUAL,
  BugHuntTrigger.FIX_SESSION,
];

export const TRIGGER_LABELS: Record<BugHuntTrigger, string> = {
  [BugHuntTrigger.SCHEDULED]: "Nightly sweep",
  [BugHuntTrigger.MANUAL]: "On-demand sweep",
  [BugHuntTrigger.FIX_SESSION]: "Fix session",
};

export const TRIGGER_SCALE: ColorScale = {
  [TRIGGER_LABELS[BugHuntTrigger.SCHEDULED]]: PALETTE.blue,
  [TRIGGER_LABELS[BugHuntTrigger.MANUAL]]: PALETTE.orange,
  [TRIGGER_LABELS[BugHuntTrigger.FIX_SESSION]]: PALETTE.teal,
};

const dayTokens = (d: BugHunterOperationsDay, trigger: BugHuntTrigger): number => {
  const cell = d.tokens[trigger];
  return cell ? cell.inputTokens + cell.outputTokens : 0;
};

export const buildTokensSeries = (days: BugHunterOperationsDay[]): OpsDatum[] =>
  TRIGGER_ORDER.flatMap(trigger =>
    days.map(d => ({
      group: TRIGGER_LABELS[trigger],
      key: d.date,
      value: dayTokens(d, trigger),
    })),
  );

export const buildTokensTable = (days: BugHunterOperationsDay[]) => ({
  columns: [
    "Day (UTC)",
    ...TRIGGER_ORDER.map(t => TRIGGER_LABELS[t]),
    "Tokens",
    "Cost (USD)",
    "Runs",
  ],
  rows: days.map(d => {
    const perTrigger = TRIGGER_ORDER.map(t => dayTokens(d, t));
    const cost = TRIGGER_ORDER.reduce((s, t) => s + (d.tokens[t]?.costUsd ?? 0), 0);
    const runs = TRIGGER_ORDER.reduce((s, t) => s + (d.tokens[t]?.runs ?? 0), 0);
    return [
      d.date,
      ...perTrigger,
      perTrigger.reduce((s, v) => s + v, 0),
      Math.round(cost * 100) / 100,
      runs,
    ];
  }),
});

export const tokensTakeaway = (data: BugHunterOperationsMetrics): string | undefined => {
  const total = data.totals.inputTokens + data.totals.outputTokens;
  if (total === 0) return undefined;
  return `${formatTokens(total)} tokens over ${data.totals.runs.toLocaleString()} runs · ${formatTokens(data.totals.inputTokens)} in / ${formatTokens(data.totals.outputTokens)} out`;
};

/* ── breadth ──────────────────────────────────────────────────────────── */

export const BREADTH_GROUP = "Lines in scope";
export const BREADTH_SCALE: ColorScale = { [BREADTH_GROUP]: PALETTE.blue };

/**
 * The first day any sweep reported breadth. Days before it are not "zero
 * lines shown" — they predate the recording — so the plot starts here and the
 * card says so. Null when nothing in the window ever reported.
 */
export const breadthStart = (days: BugHunterOperationsDay[]): string | null =>
  days.find(d => d.breadth != null)?.date ?? null;

/** From `breadthStart` onward. A later day with no breadth is a day with no sweep (or one that died before Discover), shown as zero and marked in the table. */
export const buildBreadthSeries = (days: BugHunterOperationsDay[]): OpsDatum[] => {
  const start = breadthStart(days);
  if (!start) return [];
  return days
    .filter(d => d.date >= start)
    .map(d => ({ group: BREADTH_GROUP, key: d.date, value: d.breadth?.linesInScope ?? 0 }));
};

export const buildBreadthTable = (days: BugHunterOperationsDay[]) => ({
  columns: [
    "Day (UTC)",
    "Lines in scope",
    "Files",
    "Commits",
    "Sweeps reporting",
    "Whole-repo sweeps",
  ],
  rows: days.map(d =>
    d.breadth
      ? [
          d.date,
          d.breadth.linesInScope,
          d.breadth.filesInScope,
          d.breadth.commits,
          d.breadth.runs,
          d.breadth.deepRuns,
        ]
      : [d.date, "not recorded", "", "", 0, ""],
  ),
});

/**
 * Tokens per line of code shown, over the days where both are known —
 * sweep tokens only, since a fix session is shown a bug, not a diff. A sweep
 * that reads more and spends proportionally more is covering ground; one
 * that spends more over the same lines is thinking harder, or looping.
 */
export const tokensPerLine = (days: BugHunterOperationsDay[]): number | null => {
  const measured = days.filter(d => d.breadth && d.breadth.linesInScope > 0);
  const lines = measured.reduce((s, d) => s + (d.breadth?.linesInScope ?? 0), 0);
  if (lines === 0) return null;
  const tokens = measured.reduce(
    (s, d) => s + dayTokens(d, BugHuntTrigger.SCHEDULED) + dayTokens(d, BugHuntTrigger.MANUAL),
    0,
  );
  return tokens / lines;
};

export const breadthTakeaway = (data: BugHunterOperationsMetrics): string | undefined => {
  if (!data.breadth) return undefined;
  const ratio = tokensPerLine(data.days);
  const head = `${data.breadth.linesInScope.toLocaleString()} lines shown across ${data.breadth.runs.toLocaleString()} sweeps`;
  return ratio == null
    ? head
    : `${head} · about ${Math.round(ratio).toLocaleString()} tokens per line`;
};

/* ── models ───────────────────────────────────────────────────────────── */

export const buildModelBars = (models: BugHunterOperationsModel[]): OpsBar[] =>
  models.map(m => ({ group: m.model, value: m.inputTokens + m.outputTokens }));

export const buildModelTable = (models: BugHunterOperationsModel[]) => ({
  columns: ["Model", "Provider", "Tokens", "Input", "Output", "Cache reads", "Runs"],
  rows: models.map(m => [
    m.model,
    m.provider,
    m.inputTokens + m.outputTokens,
    m.inputTokens,
    m.outputTokens,
    m.cacheReadTokens,
    m.runs,
  ]),
});

export const modelTakeaway = (models: BugHunterOperationsModel[]): string | undefined => {
  const top = models[0];
  if (!top) return undefined;
  const total = models.reduce((s, m) => s + m.inputTokens + m.outputTokens, 0);
  if (total === 0) return undefined;
  return `${top.model} did ${formatRate((top.inputTokens + top.outputTokens) / total)} of the tokens across ${top.runs.toLocaleString()} runs`;
};

/* ── empty states ─────────────────────────────────────────────────────── */

export const operationsEmptyText = (data?: BugHunterOperationsMetrics): string | undefined =>
  !data || (data.totals.filed === 0 && data.totals.runs === 0)
    ? "Nothing filed and no runs in this window yet."
    : undefined;

export const filedEmptyText = (data?: BugHunterOperationsMetrics): string | undefined =>
  !data || data.totals.filed === 0 ? "No bugs filed in this window yet." : undefined;

export const tokensEmptyText = (data?: BugHunterOperationsMetrics): string | undefined =>
  !data || data.totals.inputTokens + data.totals.outputTokens === 0
    ? "No token usage reported in this window yet."
    : undefined;

export const breadthEmptyText = (data?: BugHunterOperationsMetrics): string | undefined =>
  !data || !data.breadth
    ? "No sweep in this window has reported how much code it was shown. Recording began on 23 Sep 2026; it arrives with the next completed sweep."
    : undefined;

export const modelEmptyText = (data?: BugHunterOperationsMetrics): string | undefined =>
  !data || data.tokensByModel.length === 0
    ? "No per-model usage reported yet. It arrives with the next completed run."
    : undefined;
