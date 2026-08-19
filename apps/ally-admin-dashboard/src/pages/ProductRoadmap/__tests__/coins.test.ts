import { describe, expect, it } from "vitest";
import { RoadmapCoinBudget, RoadmapOpportunityStage, RoadmapOpportunityType } from "@types";

import { clampCoins, isAllocatable, maxFor, remainingWithPending } from "../utils/coins";

const budget = (used: number): RoadmapCoinBudget => ({
  periodKey: "2026-07",
  coinsPerMonth: 100,
  used,
  remaining: Math.max(0, 100 - used),
});

describe("maxFor", () => {
  it("adds back the coins already on this row", () => {
    // THE CASE THAT BROKE THE SOURCE: fully committed at 100, but 30 of those are on this very
    // row, so this row may still hold up to 30. Without the self-exclusion the ceiling reads 0
    // and `+` looks permanently disabled on a row you already voted for.
    expect(maxFor(budget(100), 30)).toBe(30);
  });

  it("is the whole budget when nothing is committed", () => {
    expect(maxFor(budget(0), 0)).toBe(100);
  });

  it("is the remaining budget on an unvoted row", () => {
    expect(maxFor(budget(60), 0)).toBe(40);
  });

  it("never goes negative, even if stored data exceeds the cap", () => {
    // Defensive: a pre-trigger breach in migrated data must not produce a negative ceiling.
    expect(maxFor(budget(140), 0)).toBe(0);
  });
});

describe("clampCoins", () => {
  it("caps at the row ceiling rather than the raw budget", () => {
    expect(clampCoins(500, budget(100), 30)).toBe(30);
    expect(clampCoins(500, budget(60), 0)).toBe(40);
  });

  it("floors fractional input", () => {
    expect(clampCoins(7.9, budget(0), 0)).toBe(7);
  });

  it("treats junk and negatives as zero", () => {
    for (const raw of ["", "abc", NaN, undefined, null, -5, "-12"]) {
      expect(clampCoins(raw, budget(0), 0)).toBe(0);
    }
  });

  it("accepts numeric strings, which is what a text input gives us", () => {
    expect(clampCoins("42", budget(0), 0)).toBe(42);
  });
});

describe("isAllocatable", () => {
  it("is true only for the new stage", () => {
    expect(isAllocatable({ stage: RoadmapOpportunityStage.NEW })).toBe(true);
    for (const stage of [
      RoadmapOpportunityStage.PRIORITISED,
      RoadmapOpportunityStage.UNDER_DEVELOPMENT,
      RoadmapOpportunityStage.RELEASED,
      RoadmapOpportunityStage.ARCHIVED,
    ]) {
      expect(isAllocatable({ stage })).toBe(false);
    }
  });

  it("treats a missing stage as new, so a partial row never renders as locked", () => {
    expect(isAllocatable({})).toBe(true);
  });

  it("is false for a bug opportunity, even in the new stage", () => {
    expect(
      isAllocatable({ stage: RoadmapOpportunityStage.NEW, type: RoadmapOpportunityType.BUG }),
    ).toBe(false);
  });

  it("is true for a non-bug opportunity in the new stage", () => {
    expect(
      isAllocatable({ stage: RoadmapOpportunityStage.NEW, type: RoadmapOpportunityType.IDEA }),
    ).toBe(true);
  });
});

describe("remainingWithPending", () => {
  it("accounts for a local edit the server has not seen yet", () => {
    // 60 used, 40 remaining, this row currently holds 10 on the server and the user has just
    // clicked it up to 25 — so only 25 of the 40 are really left.
    expect(remainingWithPending(budget(60), 25, 10)).toBe(25);
  });

  it("frees budget when the pending value is lower than the server's", () => {
    expect(remainingWithPending(budget(60), 0, 10)).toBe(50);
  });

  it("is zero at the cap, which is what disables the + button", () => {
    expect(remainingWithPending(budget(100), 30, 30)).toBe(0);
  });

  it("never goes negative", () => {
    expect(remainingWithPending(budget(100), 50, 0)).toBe(0);
  });
});
