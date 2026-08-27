import { describe, expect, it } from "vitest";

import { priorityBorderColour } from "../utils/priorityColour";

const hue = (colour: string) => Number(colour.match(/hsl\((\d+)/)![1]);

describe("priorityBorderColour", () => {
  it("puts the top score at red and the bottom at green", () => {
    expect(hue(priorityBorderColour(100, 100))).toBe(0);
    expect(hue(priorityBorderColour(0, 100))).toBe(120);
  });

  it("passes through yellow at the midpoint", () => {
    expect(hue(priorityBorderColour(50, 100))).toBe(60);
  });

  it("is monotonic — more votes is never a cooler colour", () => {
    const hues = [0, 10, 25, 40, 60, 80, 99, 100].map(s => hue(priorityBorderColour(s, 100)));
    const sorted = [...hues].sort((a, b) => b - a);
    expect(hues).toEqual(sorted);
  });

  it("clamps a score above the ceiling instead of overshooting past red", () => {
    // A stale maxScore can be lower than a freshly-allocated score. Unclamped this would produce
    // a negative hue, which renders as a completely different colour rather than as "hottest".
    expect(hue(priorityBorderColour(150, 100))).toBe(0);
  });

  it("survives a zero or negative ceiling", () => {
    expect(() => priorityBorderColour(5, 0)).not.toThrow();
    expect(hue(priorityBorderColour(5, 0))).toBe(0);
  });

  it("treats a negative score as the bottom of the scale", () => {
    // Roleplay scores can go negative elsewhere in the platform; a vote total should not, but
    // clamping means a bad number renders as "coldest" rather than as an invalid hue.
    expect(hue(priorityBorderColour(-20, 100))).toBe(120);
  });
});
