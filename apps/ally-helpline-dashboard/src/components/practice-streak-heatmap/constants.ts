import { PracticeStreakGroupBy } from "@types";

/**
 * Absolute, rule-based heatmap scale.
 *
 * Cell colour is driven purely by fixed minute thresholds (not by the min/max of
 * the data in view), so the same number of practice minutes always maps to the
 * same colour. Thresholds are defined per grouping because a "busy" day and a
 * "busy" month sit at very different absolute magnitudes.
 *
 * `thresholds[i]` is the lower bound (exclusive of 0, inclusive otherwise) for
 * intensity level `i + 1`. Level 0 is reserved for zero-minute (empty) cells.
 */
export const HEATMAP_THRESHOLDS: Record<PracticeStreakGroupBy, number[]> = {
  // day: light up to 10m, then 20m, 40m, 40m+
  [PracticeStreakGroupBy.DAY]: [0, 10, 20, 40],
  // week: ~5x the day scale
  [PracticeStreakGroupBy.WEEK]: [0, 30, 60, 120],
  // month: ~20x the day scale
  [PracticeStreakGroupBy.MONTH]: [0, 120, 240, 480],
};

/**
 * Per-grouping practice goal, in minutes, used to fill the progress ring for
 * the current (most recent) period. These are product-chosen targets — tune
 * them here without touching the component. They intentionally sit a little
 * below the top heatmap threshold so a good session comfortably closes the
 * ring rather than making it feel unreachable.
 */
export const PRACTICE_GOAL_MINUTES: Record<PracticeStreakGroupBy, number> = {
  [PracticeStreakGroupBy.DAY]: 15,
  [PracticeStreakGroupBy.WEEK]: 60,
  [PracticeStreakGroupBy.MONTH]: 240,
};

/** Tailwind classes per intensity level (0 = empty ... 4 = most). */
export const HEATMAP_LEVEL_CLASSES: string[] = [
  "bg-neutral-100 text-typography-400 border border-border-light", // 0 – empty
  "bg-primary-100 text-primary-700", // 1
  "bg-primary-300 text-primary-900", // 2
  "bg-primary-500 text-white", // 3
  "bg-primary-700 text-white", // 4
];

/**
 * Maps practice minutes to an intensity level [0..4] using the absolute
 * thresholds for the given grouping.
 */
export const getHeatmapLevel = (minutes: number, groupBy: PracticeStreakGroupBy): number => {
  if (minutes <= 0) return 0;
  const thresholds = HEATMAP_THRESHOLDS[groupBy];
  // thresholds[0] is 0 (>0 => at least level 1); start comparing from index 1.
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (minutes >= thresholds[i]) level = i + 1;
  }
  return level;
};
