import { describe, expect, it } from "vitest";

import { BugHuntDecisionReplayPoint, BugHunterScoreboard } from "@types";

import {
  acceptanceRate,
  fixerRows,
  formatRate,
  replayTakeaway,
  replayVerdictLabel,
  scoreboardRows,
  scoreboardTakeaway,
} from "../bugHunterDecisionsChart";

const counts = (filed: number, accepted: number, declined: number, pending = 0) => ({
  filed,
  accepted,
  declined,
  pending,
});

const board = (over: Partial<BugHunterScoreboard> = {}): BugHunterScoreboard => ({
  repo: "ally-web",
  days: 90,
  since: "2026-07-10",
  rows: [],
  bySense: {
    tests: counts(40, 36, 4),
    code_review: counts(60, 12, 30, 18),
    production_log: counts(3, 1, 1, 1),
  },
  byModel: { "gemini-2.5-pro": counts(80, 40, 30, 10) },
  fixByModel: {
    "gemini/gemini-2.5-pro": {
      sessions: 8,
      merged: 6,
      failed: 1,
      passVerdicts: 6,
      failVerdicts: 2,
    },
    "gemini/gemini-2.5-flash": {
      sessions: 2,
      merged: 0,
      failed: 2,
      passVerdicts: 0,
      failVerdicts: 1,
    },
  },
  ...over,
});

const point = (over: Partial<BugHuntDecisionReplayPoint>): BugHuntDecisionReplayPoint => ({
  point: "D7",
  owner: "rule",
  fixed: false,
  decisions: 10,
  withShadow: 10,
  agreed: 4,
  disagreed: 6,
  ownerWins: 2,
  shadowWins: 3,
  undecided: 1,
  vetoes: 0,
  flipThreshold: 30,
  verdict: "not_enough_cases",
  ...over,
});

describe("the scoreboard", () => {
  it("rates acceptance over ruled-on, and reads a dash under five ruled on", () => {
    expect(acceptanceRate(counts(40, 36, 4))).toBe(0.9);
    expect(acceptanceRate(counts(3, 1, 1, 1))).toBeNull();
    expect(formatRate(0.9)).toBe("90%");
    expect(formatRate(null)).toBe("—");
  });

  it("orders senses by what they filed and leaves out the silent ones", () => {
    const rows = scoreboardRows({ ...board().bySense, reported_bugs: counts(0, 0, 0) });
    expect(rows.map(r => r.key)).toEqual(["code_review", "tests", "production_log"]);
    expect(rows[1]).toMatchObject({ key: "tests", rate: 0.9 });
    expect(rows[2].rate).toBeNull();
  });

  it("folds fixers with a merge rate under the same thinness rule", () => {
    const rows = fixerRows(board().fixByModel);
    expect(rows.map(r => r.key)).toEqual(["gemini/gemini-2.5-pro", "gemini/gemini-2.5-flash"]);
    expect(rows[0].mergeRate).toBe(0.75);
    expect(rows[1].mergeRate).toBeNull();
  });

  it("names the sense that pays and the one that is noise", () => {
    expect(scoreboardTakeaway(board())).toBe(
      "tests is the sense that pays here (90% accepted); code_review is the noise (29%)",
    );
    expect(scoreboardTakeaway(board({ bySense: { tests: counts(40, 36, 4) } }))).toBe(
      "tests: 90% of 40 ruled on were accepted",
    );
    expect(scoreboardTakeaway(board({ bySense: {} }))).toBeUndefined();
    expect(scoreboardTakeaway(undefined)).toBeUndefined();
  });
});

describe("the replay", () => {
  it("labels verdicts in plain words", () => {
    expect(replayVerdictLabel("flip")).toBe("flip");
    expect(replayVerdictLabel("keep")).toBe("keep");
    expect(replayVerdictLabel("fixed")).toBe("fixed");
    expect(replayVerdictLabel("not_enough_cases")).toBe("not enough cases");
  });

  it("says which points have earned a flip, else how far the leading shadow is", () => {
    expect(
      replayTakeaway([point({ verdict: "flip" }), point({ point: "D5", verdict: "flip" })]),
    ).toBe("The shadow has earned D7, D5: flip on Settings → AI models");
    expect(replayTakeaway([point({})])).toBe("D7: the shadow is ahead 3 to 2, 27 more to flip");
    expect(replayTakeaway([point({ ownerWins: 5, shadowWins: 1 })])).toBe(
      "Every owner is ahead of its shadow so far",
    );
    expect(replayTakeaway([point({ ownerWins: 0, shadowWins: 0 })])).toBe(
      "No disagreement has reached an outcome yet",
    );
    expect(replayTakeaway([])).toBeUndefined();
  });
});
