import { describe, expect, it } from "vitest";

import { largestRemainderPreview } from "../utils/split";

/**
 * The split preview must agree with ally-be's largest-remainder util, because it is what an admin
 * reads before committing an irreversible redistribution of everyone's votes. A preview that
 * implied coins were created or lost would undermine the one guarantee the split makes.
 *
 * These cases mirror src/product-roadmap/service/test/largest-remainder.util.spec.ts.
 */
describe("largestRemainderPreview", () => {
  it("matches the backend's reference cases", () => {
    expect(largestRemainderPreview(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(largestRemainderPreview(100, [50, 30, 20])).toEqual([50, 30, 20]);
    expect(largestRemainderPreview(7, [1, 1, 1])).toEqual([3, 2, 2]);
    expect(largestRemainderPreview(0, [1, 1])).toEqual([0, 0]);
    expect(largestRemainderPreview(1, [1, 1])).toEqual([1, 0]);
    expect(largestRemainderPreview(5, [1, 0, 4])).toEqual([1, 0, 4]);
  });

  it("hands everything to the first part when all weights are non-positive", () => {
    // Matches the backend rather than throwing — the UI still has to render something.
    expect(largestRemainderPreview(100, [0, 0, 0])).toEqual([100, 0, 0]);
    expect(largestRemainderPreview(10, [-5, -1])).toEqual([10, 0]);
  });

  it("gives leftovers to the largest remainders, lowest index winning a tie", () => {
    expect(largestRemainderPreview(10, [3, 3, 3])).toEqual([4, 3, 3]);
    expect(largestRemainderPreview(11, [3, 3, 3])).toEqual([4, 4, 3]);
  });

  it("returns an empty array for no parts", () => {
    expect(largestRemainderPreview(50, [])).toEqual([]);
  });

  it("conserves the total across 300 randomised previews", () => {
    // The invariant that matters: the preview must never imply coins appear or vanish.
    for (let seed = 0; seed < 300; seed++) {
      const rand = (n: number, salt: number) => ((seed * 9301 + salt * 49297) % 233280) % n;
      const total = rand(201, 1); // scores can exceed 100 once many people have voted
      const partCount = 2 + rand(5, 2);
      const weights = Array.from({ length: partCount }, (_, i) => rand(100, i + 3));

      const shares = largestRemainderPreview(total, weights);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
      expect(shares).toHaveLength(partCount);
      expect(shares.every(s => s >= 0 && Number.isInteger(s))).toBe(true);
    }
  });
});
