import type { CodeActivityDay } from "@api";

/**
 * Pure helpers for the changelog's code-activity heatmap, kept out of the
 * component so they can be tested without rendering.
 */

/** Days per request — and how many cells fill the strip at desktop width. */
export const CODE_ACTIVITY_PAGE_DAYS = 30;

/**
 * Lower bounds of heat levels 1–4 in changed lines per day; 0 is its own level.
 *
 * FIXED rather than derived from the loaded days, so a cell keeps its colour
 * when older days load in beside it. Chosen from the real distribution over
 * Jul–Sep 2026 (all repos summed): quartiles of the days with any change fell
 * at about 3k, 9k and 18k, with the busiest day near 52k.
 */
export const CODE_ACTIVITY_LEVEL_FLOORS = [1, 3_000, 10_000, 25_000] as const;

/**
 * Empty cell, then a one-hue ramp around the blog's terracotta accent
 * (#D97757), light to dark. Checked with the dataviz ordinal validator against
 * the page surface #FAF9F5: monotone lightness, visible gaps between steps,
 * and the lightest step clears 2:1 against the page.
 */
export const CODE_ACTIVITY_COLOURS = [
  "#EDE9E1",
  "#FC8F6C",
  "#D76F4C",
  "#B34F2C",
  "#8F2D02",
] as const;

export const activityLevel = (churn: number): number => {
  let level = 0;
  CODE_ACTIVITY_LEVEL_FLOORS.forEach((floor, i) => {
    if (churn >= floor) level = i + 1;
  });
  return level;
};

const compact = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** What each legend swatch covers, e.g. "3k–10k lines". */
export const levelRangeLabel = (level: number): string => {
  if (level === 0) return "No changes";
  const floors = CODE_ACTIVITY_LEVEL_FLOORS;
  const lo = floors[level - 1];
  const hi = floors[level];
  if (hi === undefined) return `${compact(lo)}+ lines`;
  return `${compact(lo)}–${compact(hi)} lines`;
};

// The browser's own locale, as the changelog's date headings below use.
export const formatLines = (n: number): string => n.toLocaleString();

const DAY_MS = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd plus `n` days, in UTC. */
export const addDays = (date: string, n: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const asUtc = (date: string) => new Date(`${date}T00:00:00Z`);

/** "Tue, Sep 15, 2026" in en-US. Days are UTC, so they are formatted in UTC too. */
export const formatDay = (date: string): string =>
  asUtc(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The label above a column where a month starts, always with its year — the
 * strip scrolls back across years, and the leftmost loaded cell (the only
 * other place a year could go) is usually scrolled out of sight.
 */
export const monthLabel = (date: string): string =>
  asUtc(date).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

export const isMonday = (date: string): boolean => asUtc(date).getUTCDay() === 1;

/**
 * Folds a newly loaded page into the days already shown, oldest first. Keyed
 * by date so an overlapping page can never show a day twice, and the fresher
 * copy of a day wins.
 */
export const mergeDays = (
  loaded: CodeActivityDay[],
  incoming: CodeActivityDay[],
): CodeActivityDay[] => {
  const byDate = new Map(loaded.map(day => [day.date, day]));
  incoming.forEach(day => byDate.set(day.date, day));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const sumChurn = (days: CodeActivityDay[]): number =>
  days.reduce((total, day) => total + day.churn, 0);
