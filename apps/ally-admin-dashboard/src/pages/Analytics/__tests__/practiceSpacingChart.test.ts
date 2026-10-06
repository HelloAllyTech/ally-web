import { describe, expect, it } from "vitest";

import { StickinessSpacing } from "@types";

import {
  SPACING_TABLE_COLUMNS,
  buildSpacingBars,
  hasSpacingShares,
  spacingScale,
  spacingTableRows,
  spacingTakeaway,
} from "../practiceSpacingChart";

const band = (key: string, label: string, gaps: number, sharePct: number | null) => ({
  band: key,
  label,
  minDays: 0,
  maxDays: null,
  gaps,
  sharePct,
  learners: Math.max(1, Math.round(gaps / 3)),
});

const spacing = (over: Partial<StickinessSpacing> = {}): StickinessSpacing => ({
  window: "all",
  bands: [
    band("0-1", "0–1 days", 120, 40),
    band("2-6", "2–6 days", 90, 30),
    band("7-13", "7–13 days", 45, 15),
    band("14-29", "14–29 days", 30, 10),
    band("30+", "30+ days", 15, 5),
  ],
  totalGaps: 300,
  minGapSample: 20,
  learnersWithSessions: 140,
  activeLearners: 90,
  targetDays: 7,
  learnersWithinTarget: 55,
  withinTargetPct: 61.1,
  medianGapDays: 4,
  minLearners: 5,
  provenance: { derivation: "d", note: "n" },
  ...over,
});

describe("practice spacing", () => {
  it("draws one bar per band in the server's order, shortest gap first", () => {
    const bars = buildSpacingBars(spacing().bands);
    expect(bars.map(b => b.group)).toEqual([
      "0–1 days",
      "2–6 days",
      "7–13 days",
      "14–29 days",
      "30+ days",
    ]);
    expect(bars.map(b => b.value)).toEqual([40, 30, 15, 10, 5]);
  });

  it("keeps a withheld share withheld and knows when nothing can be drawn", () => {
    const thin = spacing({
      totalGaps: 6,
      bands: [band("0-1", "0–1 days", 4, null), band("2-6", "2–6 days", 2, null)],
    });
    expect(buildSpacingBars(thin.bands).map(b => b.value)).toEqual([null, null]);
    expect(hasSpacingShares(thin.bands)).toBe(false);
    expect(hasSpacingShares(spacing().bands)).toBe(true);
  });

  it("colours every band the same — no band is 'better'", () => {
    const scale = spacingScale(spacing().bands);
    expect(Object.keys(scale)).toHaveLength(5);
    expect(new Set(Object.values(scale)).size).toBe(1);
  });

  it("states the per-learner weekly share from the server", () => {
    expect(spacingTakeaway(spacing())).toBe(
      "61.1% of active learners practise at least weekly (median gap ≤ 7 days)",
    );
  });

  it("refuses the share below the learner floor, and says nothing with no active learners", () => {
    expect(spacingTakeaway(spacing({ activeLearners: 3, withinTargetPct: null }))).toBe(
      "Too few active learners to state a share (n = 3 · need 5)",
    );
    expect(spacingTakeaway(spacing({ activeLearners: 0, withinTargetPct: null }))).toBeUndefined();
  });

  it("tables counts always and shares as sent", () => {
    const rows = spacingTableRows([band("30+", "30+ days", 3, null)]);
    expect(rows).toEqual([["30+ days", 3, null, 1]]);
    expect(SPACING_TABLE_COLUMNS).toHaveLength(4);
  });
});
