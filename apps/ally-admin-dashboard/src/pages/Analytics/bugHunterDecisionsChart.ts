import { en } from "@constants";
import {
  BugHuntDecisionReplayPoint,
  BugHunterScoreboard,
  BugHunterScoreboardCounts,
  BugHunterScoreboardFixRow,
} from "@types";

import { formatPercent } from "./tokenChart";

/** Fewer ruled-on findings than this and the acceptance rate reads as a dash. */
export const SCOREBOARD_MIN_RULED = 5;

/** Accepted over ruled-on, or null when too few have been ruled on to say. */
export const acceptanceRate = (c: BugHunterScoreboardCounts): number | null => {
  const ruled = c.accepted + c.declined;
  return ruled >= SCOREBOARD_MIN_RULED ? c.accepted / ruled : null;
};

export const formatRate = (rate: number | null): string =>
  rate === null ? en.bugHunter.scoreboard.thin : formatPercent(rate);

export interface ScoreboardTableRow extends BugHunterScoreboardCounts {
  key: string;
  rate: number | null;
}

/** Senses (or models) with anything filed, most filed first, acceptance beside. */
export const scoreboardRows = (
  cells: Record<string, BugHunterScoreboardCounts> | undefined,
): ScoreboardTableRow[] =>
  Object.entries(cells ?? {})
    .filter(([, c]) => c.filed > 0)
    .map(([key, c]) => ({ key, ...c, rate: acceptanceRate(c) }))
    .sort((a, b) => b.filed - a.filed || a.key.localeCompare(b.key));

export interface FixerTableRow extends BugHunterScoreboardFixRow {
  key: string;
  /** Merged over sessions, or null under the same thinness rule. */
  mergeRate: number | null;
}

export const fixerRows = (
  cells: Record<string, BugHunterScoreboardFixRow> | undefined,
): FixerTableRow[] =>
  Object.entries(cells ?? {})
    .filter(([, c]) => c.sessions > 0)
    .map(([key, c]) => ({
      key,
      ...c,
      mergeRate: c.sessions >= SCOREBOARD_MIN_RULED ? c.merged / c.sessions : null,
    }))
    .sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key));

/** One sentence: the best and the worst sense on this repo, when either can be called. */
export const scoreboardTakeaway = (board: BugHunterScoreboard | undefined): string | undefined => {
  if (!board) return undefined;
  const rated = scoreboardRows(board.bySense).filter(r => r.rate !== null);
  if (!rated.length) return undefined;
  const best = rated.reduce((a, b) => (b.rate! > a.rate! ? b : a));
  const worst = rated.reduce((a, b) => (b.rate! < a.rate! ? b : a));
  if (best.key === worst.key) {
    return `${best.key}: ${formatPercent(best.rate!)} of ${best.accepted + best.declined} ruled on were accepted`;
  }
  return `${best.key} is the sense that pays here (${formatPercent(best.rate!)} accepted); ${worst.key} is the noise (${formatPercent(worst.rate!)})`;
};

export const replayVerdictLabel = (verdict: BugHuntDecisionReplayPoint["verdict"]): string => {
  const t = en.bugHunter.scoreboard;
  switch (verdict) {
    case "flip":
      return t.verdictFlip;
    case "keep":
      return t.verdictKeep;
    case "fixed":
      return t.verdictFixed;
    default:
      return t.verdictNotEnough;
  }
};

/** One sentence over the replay: which points, if any, the shadow is winning. */
export const replayTakeaway = (
  points: BugHuntDecisionReplayPoint[] | undefined,
): string | undefined => {
  if (!points?.length) return undefined;
  const flips = points.filter(p => p.verdict === "flip").map(p => p.point);
  if (flips.length)
    return `The shadow has earned ${flips.join(", ")}: flip on Settings → AI models`;
  const decided = points.filter(p => !p.fixed && p.ownerWins + p.shadowWins > 0);
  if (!decided.length) return "No disagreement has reached an outcome yet";
  const leading = decided.reduce((a, b) =>
    b.shadowWins - b.ownerWins > a.shadowWins - a.ownerWins ? b : a,
  );
  return leading.shadowWins > leading.ownerWins
    ? `${leading.point}: the shadow is ahead ${leading.shadowWins} to ${leading.ownerWins}, ${leading.flipThreshold - leading.shadowWins} more to flip`
    : `Every owner is ahead of its shadow so far`;
};
