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
 * Background class per heat level, 0 (no changes) to 4. The colours are the
 * `activity` tokens in tailwind.config.ts, where the ramp and its validation
 * are documented. Full class names, so Tailwind's scanner finds them.
 */
export const CODE_ACTIVITY_LEVEL_CLASSES = [
  "bg-activity-0",
  "bg-activity-1",
  "bg-activity-2",
  "bg-activity-3",
  "bg-activity-4",
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
 * Cells a month name runs across ("Oct 2026" is wider than a day's cell). A
 * Monday's date within this many cells after a month name is left out rather
 * than printed on top of it.
 */
const MONTH_LABEL_SPAN = 3;

/** True where the strip names a month: on the 1st, and on the leftmost cell
 * unless the next month's name would land on top of it a few cells later. */
const namesMonth = (days: { date: string }[], i: number): boolean => {
  const dayOfMonth = Number(days[i].date.slice(8));
  return dayOfMonth === 1 || (i === 0 && dayOfMonth <= 24);
};

/**
 * The one line of text under a day's cell: the month's name where a month is
 * named, a Monday's date otherwise, else nothing. One row for both keeps the
 * strip short.
 */
export const axisLabel = (
  days: { date: string }[],
  i: number,
): { kind: "month" | "day"; text: string } | null => {
  if (namesMonth(days, i)) return { kind: "month", text: monthLabel(days[i].date) };
  if (!isMonday(days[i].date)) return null;
  for (let back = 1; back < MONTH_LABEL_SPAN && i - back >= 0; back++) {
    if (namesMonth(days, i - back)) return null;
  }
  return { kind: "day", text: String(Number(days[i].date.slice(8))) };
};

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
