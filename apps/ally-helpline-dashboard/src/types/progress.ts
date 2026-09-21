/**
 * Level state only — what the persistent nav indicator needs.
 *
 * Mirrors ally-be's ProgressSummaryDto.
 */
export interface ProgressSummary {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  /** Null once the learner is at the top of the ladder. */
  xpToNextLevel: number | null;
  nextLevelXp: number | null;
  /** 0-1. Always 1 at max level, so a full ring reads as "topped out". */
  progress: number;
  isMaxLevel: boolean;
}

export interface LevelThreshold {
  level: number;
  requiredXp: number;
}

export interface ProgressResponse extends ProgressSummary {
  lifetimePracticeMinutes: number;
  sessionsCompleted: number;
  trackItemsCompleted: number;
  /** The whole ladder, served so the client never hardcodes thresholds that could drift. */
  ladder: LevelThreshold[];
  lastLevelUpAt: string | null;
}
