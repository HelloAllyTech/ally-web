import { describe, expect, it } from "vitest";

import { band, isComplete, scoreItem } from "../scoring";
import { DOMAINS, ITEMS, OptionId } from "../sjtData";

const KEY: OptionId[] = ["b", "c", "a", "d"];

describe("scoreItem", () => {
  it("gives 100% for the exact consensus order", () => {
    expect(scoreItem(KEY, KEY)).toEqual({ raw: 12, pct: 100 });
  });

  it("gives 0% for the fully reversed order", () => {
    expect(scoreItem([...KEY].reverse(), KEY)).toEqual({ raw: 4, pct: 0 });
  });

  it("awards partial credit for a near-miss rather than nothing", () => {
    // One adjacent swap: the two moved options each lose a point.
    const { pct } = scoreItem(["c", "b", "a", "d"], KEY);
    expect(pct).toBe(75);
    expect(pct).toBeGreaterThan(scoreItem([...KEY].reverse(), KEY).pct);
  });

  it("never returns a negative percentage", () => {
    ITEMS.forEach(item => {
      expect(scoreItem([...item.key].reverse(), item.key).pct).toBeGreaterThanOrEqual(0);
    });
  });

  it("scores an empty order as 0 rather than throwing", () => {
    expect(scoreItem([], KEY).pct).toBe(0);
  });
});

describe("band", () => {
  it.each([
    [100, "Closely aligned", "good"],
    [85, "Closely aligned", "good"],
    [84, "Broadly aligned", "good"],
    [65, "Broadly aligned", "good"],
    [64, "Mixed", "mid"],
    [45, "Mixed", "mid"],
    [44, "Worth revisiting", "low"],
    [0, "Worth revisiting", "low"],
  ])("bands %i%% as %s", (pct, name, tone) => {
    expect(band(pct)).toEqual({ name, tone });
  });
});

describe("isComplete", () => {
  it("is true only for a full four-option ranking", () => {
    expect(isComplete(["a", "b", "c", "d"])).toBe(true);
    expect(isComplete(["a", "b", "c"])).toBe(false);
    expect(isComplete([])).toBe(false);
    expect(isComplete(undefined)).toBe(false);
  });
});

describe("item content", () => {
  it("has ten scenarios with unique ids", () => {
    expect(ITEMS).toHaveLength(10);
    expect(new Set(ITEMS.map(item => item.id)).size).toBe(10);
  });

  it("ranks all four options exactly once in every key", () => {
    ITEMS.forEach(item => {
      expect([...item.key].sort()).toEqual(["a", "b", "c", "d"]);
    });
  });

  it("gives every option both a response and its reasoning", () => {
    ITEMS.forEach(item => {
      (["a", "b", "c", "d"] as OptionId[]).forEach(id => {
        expect(item.options[id].text.trim()).not.toBe("");
        expect(item.options[id].why.trim()).not.toBe("");
      });
    });
  });

  it("assigns every scenario to a known domain, and covers all four", () => {
    const used = new Set(ITEMS.map(item => item.domain));
    used.forEach(code => expect(DOMAINS[code]).toBeDefined());
    expect(used.size).toBe(Object.keys(DOMAINS).length);
  });

  it("gives every domain at least two scenarios, so no area score rests on one", () => {
    Object.keys(DOMAINS).forEach(code => {
      expect(ITEMS.filter(item => item.domain === code).length).toBeGreaterThanOrEqual(2);
    });
  });
});
