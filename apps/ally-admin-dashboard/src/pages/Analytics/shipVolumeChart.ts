import { ShipVolumeResponse, ShipVolumeWeek } from "@types";

import { ColorScale, PALETTE, stableScale } from "./chartScales";

/**
 * Pure transforms for the ship-volume card. Kept out of the component so the
 * honesty rules they encode — which week is too unfinished to compare, what a
 * missing repo does to every bar, and the fact that churn is an output measure —
 * are unit-testable without a DOM.
 */

/** Windows the chart offers. Mirrors SHIP_VOLUME_WINDOWS on the server. */
export const SHIP_VOLUME_WINDOWS: { weeks: number; label: string }[] = [
  { weeks: 12, label: "Last 12 weeks" },
  { weeks: 26, label: "Last 26 weeks" },
  { weeks: 52, label: "Last 52 weeks" },
];

export const DEFAULT_SHIP_VOLUME_WEEKS = 12;

/**
 * A week ready to draw.
 *
 * `label` carries the axis marker for the in-progress week and `plainLabel` does
 * not: Carbon truncates a tick label past 14 characters, so the axis gets a
 * one-character marker whose meaning lives in prose under the chart, while the
 * table and the export — which have room for words — say "in progress".
 */
export interface ShipVolumeWeekView {
  weekStart: string;
  label: string;
  plainLabel: string;
  added: number;
  deleted: number;
  churn: number;
  partial: boolean;
  churnByRepo: Record<string, number>;
}

/** "30 Aug" — short enough to survive Carbon's 14-character tick truncation. */
export const weekLabel = (weekStart: string): string => {
  const d = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekStart;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
};

export const buildShipVolumeWeeks = (data: ShipVolumeResponse | undefined): ShipVolumeWeekView[] =>
  (data?.weeks ?? []).map((week: ShipVolumeWeek) => {
    const plainLabel = weekLabel(week.weekStart);
    return {
      weekStart: week.weekStart,
      plainLabel,
      label: week.partial ? `${plainLabel} *` : plainLabel,
      added: week.added,
      deleted: week.deleted,
      churn: week.churn,
      partial: week.partial,
      churnByRepo: Object.fromEntries(week.repos.map(r => [r.repo, r.churn])),
    };
  });

export const buildShipVolumeSeries = (
  weeks: ShipVolumeWeekView[],
  repos: string[],
): { group: string; key: string; value: number }[] =>
  repos.flatMap(repo =>
    weeks.map(w => ({ group: repo, key: w.label, value: w.churnByRepo[repo] ?? 0 })),
  );

/**
 * One distinct hue per repo, PINNED rather than hashed.
 *
 * `stableScale` hashes a name into the categorical palette, which is right for a
 * dimension whose value set is open — a tenant, a language, a provider. It is
 * wrong here, and verifiably so: hashing these seven repo names collides three
 * pairs into three slots (ally-be with infra, ally-web with ally-mobile,
 * ally-ai with the wiki). On a LINE chart a repeated colour is a nuisance; on a
 * STACKED bar it is a correctness problem, because two same-coloured bands sit
 * flush against each other and the reader cannot see where one ends.
 *
 * The repo list is closed, known and small, so it gets the same treatment as the
 * other closed dimensions in `chartScales` (`llm`/`stt`/`tts`, the model
 * providers): an explicit assignment, one hue each. Hues are spread around the
 * palette rather than taken in order, so neighbouring bands stay separable
 * whatever order the churn ranking puts them in.
 */
export const SHIP_VOLUME_REPO_COLOURS: ColorScale = {
  "ally-be": PALETTE.blue,
  "ally-web": PALETTE.purple,
  "ally-ai": PALETTE.magenta,
  "ally-ai-learn": PALETTE.teal,
  "ally-mobile": PALETTE.orange,
  infra: PALETTE.green,
  "helloallytech.github.io": PALETTE.gold,
};

/**
 * A repo added to the server's list but not to the map above still gets a
 * colour — hashed, as before — rather than rendering as an uncoloured band.
 */
export const buildShipVolumeScale = (repos: string[]): ColorScale => ({
  ...stableScale(repos.filter(r => !(r in SHIP_VOLUME_REPO_COLOURS))),
  ...Object.fromEntries(
    repos.filter(r => r in SHIP_VOLUME_REPO_COLOURS).map(r => [r, SHIP_VOLUME_REPO_COLOURS[r]]),
  ),
});

/** Weeks with anything on them — what the chart can actually draw. */
export const plottedWeeks = (weeks: ShipVolumeWeekView[]): ShipVolumeWeekView[] =>
  weeks.filter(w => w.churn > 0);

export const partialWeek = (weeks: ShipVolumeWeekView[]): ShipVolumeWeekView | undefined =>
  weeks.find(w => w.partial);

export const partialFootnote = (week: ShipVolumeWeekView): string =>
  `* ${week.plainLabel} is the week in progress — it can only grow, so compare it ` +
  `with the weeks beside it only once it closes.`;

/**
 * The one-line reading, computed from the COMPLETE weeks only.
 *
 * Deliberately a comparison against the recent norm rather than a
 * week-over-week delta: this series is spiky by nature (one large refactor moves
 * a bar more than a busy week does), and two adjacent bars are the pair a reader
 * is least entitled to draw a trend from.
 */
export const shipVolumeTakeaway = (weeks: ShipVolumeWeekView[]): string | undefined => {
  const complete = weeks.filter(w => !w.partial && w.churn > 0);
  if (complete.length < 2) return undefined;

  const latest = complete[complete.length - 1];
  const prior = complete.slice(0, -1);
  const mean = prior.reduce((sum, w) => sum + w.churn, 0) / prior.length;
  if (mean <= 0) return undefined;

  const share = latest.churn / mean;
  const scale = `${formatLines(latest.churn)} changed lines in the week of ${latest.plainLabel}`;

  // A tenth either way is inside this series' ordinary bounce; calling that a
  // change would train the reader to see movement that is not there.
  if (share >= 0.9 && share <= 1.1) {
    return `${scale} — in line with the previous ${prior.length} weeks.`;
  }
  const pct = Math.round(Math.abs(share - 1) * 100);
  const direction = share > 1 ? "above" : "below";
  return `${scale} — ${pct}% ${direction} the previous ${prior.length}-week average.`;
};

/**
 * What to say when a repo is missing from the axis, or behind on it.
 *
 * The most important sentence on the panel when it applies. Churn is a sum
 * across repos, so a repo that failed to load makes every bar shorter with
 * nothing on the chart to show it happened — an understated axis that looks
 * complete is worse than an error.
 */
export const unavailableNote = (data: ShipVolumeResponse | undefined): string | undefined => {
  const problems = data?.unavailableRepos ?? [];
  if (problems.length === 0) return undefined;

  const missing = problems.filter(r => !r.servedFromCache).map(r => r.repo);
  const stale = problems.filter(r => r.servedFromCache).map(r => r.repo);

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(
      `${listOf(missing)} could not be read, so ${
        missing.length === 1 ? "its" : "their"
      } changes are MISSING from every bar — the totals below are understated.`,
    );
  }
  if (stale.length > 0) {
    parts.push(
      `${listOf(stale)} ${stale.length === 1 ? "is" : "are"} shown from the last ` +
        `cached reading, which may be a few hours behind (GitHub rebuilds a repo's ` +
        `statistics after a push).`,
    );
  }
  return parts.join(" ");
};

/**
 * Two empty states that look identical on a bare axis and mean opposite things:
 * nothing shipped, versus nothing could be read.
 */
export const shipVolumeEmptyText = (
  data: ShipVolumeResponse | undefined,
  weeks: ShipVolumeWeekView[],
): string => {
  const readable = (data?.unavailableRepos ?? []).filter(r => !r.servedFromCache).length;
  const total = (data?.repos.length ?? 0) + readable;

  if (data && readable > 0 && readable === total) {
    return (
      "No repository statistics could be read, so there is nothing to plot. This is " +
      "a reporting failure, not a quiet week — retry in a moment, and if it persists " +
      "the platform's GitHub credentials are the place to look."
    );
  }
  if (weeks.length > 0) {
    return `Nothing landed on any repo in the last ${weeks.length} weeks.`;
  }
  return "No weekly volume to show yet.";
};

export const buildShipVolumeTable = (
  weeks: ShipVolumeWeekView[],
  repos: string[],
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: [
    "Week of",
    "Changed lines",
    "Added",
    "Removed",
    "Net",
    ...repos.map(r => `${r} (churn)`),
  ],
  rows: weeks.map(w => [
    w.partial ? `${w.plainLabel} (in progress)` : w.plainLabel,
    w.churn,
    w.added,
    // Shown as a positive count in its own column, with `net` beside it, so the
    // reader can see a deletion-heavy week for what it is rather than inferring
    // it from a shorter bar.
    w.deleted,
    w.added - w.deleted,
    ...repos.map(r => w.churnByRepo[r] ?? 0),
  ]),
});

/** "12,345" — grouped, because five- and six-digit line counts are the norm here. */
export const formatLines = (n: number): string => n.toLocaleString();

const listOf = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
