import { describe, expect, it } from "vitest";
import { RoadmapVoteBudget, RoadmapOpportunityStage, RoadmapOpportunityType } from "@types";

import { clampVotes, isVotable, maxFor, remainingWithPending } from "../utils/votes";

const budget = (available: number): RoadmapVoteBudget => ({ available });

describe("maxFor", () => {
  it("adds the votes already on this row to what's still available", () => {
    // THE CASE THAT BROKE THE SOURCE: fully spent, but 30 of the total spend is on this very
    // row, so this row may still hold up to 30. Without adding those back the ceiling reads 0
    // and the button looks permanently disabled on a row you already voted for.
    expect(maxFor(budget(0), 30)).toBe(30);
  });

  it("is the whole available balance when nothing is committed to this row", () => {
    expect(maxFor(budget(100), 0)).toBe(100);
  });

  it("is available plus whatever's already here", () => {
    expect(maxFor(budget(40), 10)).toBe(50);
  });
});

describe("clampVotes", () => {
  it("caps at the row ceiling rather than the raw available balance", () => {
    expect(clampVotes(500, budget(0), 30)).toBe(30);
    expect(clampVotes(500, budget(40), 0)).toBe(40);
  });

  it("floors fractional input", () => {
    expect(clampVotes(7.9, budget(100), 0)).toBe(7);
  });

  it("treats junk and negatives as zero", () => {
    for (const raw of ["", "abc", NaN, undefined, null, -5, "-12"]) {
      expect(clampVotes(raw, budget(100), 0)).toBe(0);
    }
  });

  it("accepts numeric strings, which is what a text input gives us", () => {
    expect(clampVotes("42", budget(100), 0)).toBe(42);
  });
});

describe("isVotable", () => {
  it("is true only for the new stage", () => {
    expect(isVotable({ stage: RoadmapOpportunityStage.NEW })).toBe(true);
    for (const stage of [
      RoadmapOpportunityStage.PRIORITISED,
      RoadmapOpportunityStage.UNDER_DEVELOPMENT,
      RoadmapOpportunityStage.RELEASED,
      RoadmapOpportunityStage.ARCHIVED,
    ]) {
      expect(isVotable({ stage })).toBe(false);
    }
  });

  it("treats a missing stage as new, so a partial row never renders as locked", () => {
    expect(isVotable({})).toBe(true);
  });

  it("is false for a bug opportunity, even in the new stage", () => {
    expect(
      isVotable({ stage: RoadmapOpportunityStage.NEW, type: RoadmapOpportunityType.BUG }),
    ).toBe(false);
  });

  it("is true for a non-bug opportunity in the new stage", () => {
    expect(
      isVotable({ stage: RoadmapOpportunityStage.NEW, type: RoadmapOpportunityType.IDEA }),
    ).toBe(true);
  });
});

describe("remainingWithPending", () => {
  it("accounts for a local edit the server has not seen yet", () => {
    // 40 available, this row currently holds 10 on the server and the user has just tapped it
    // up to 25 — so only 25 of the 40 are really left.
    expect(remainingWithPending(budget(40), 25, 10)).toBe(25);
  });

  it("frees budget when the pending value is lower than the server's", () => {
    expect(remainingWithPending(budget(40), 0, 10)).toBe(50);
  });

  it("is zero at the balance, which is what disables the vote button", () => {
    expect(remainingWithPending(budget(0), 30, 30)).toBe(0);
  });

  it("never goes negative", () => {
    expect(remainingWithPending(budget(0), 50, 0)).toBe(0);
  });
});
