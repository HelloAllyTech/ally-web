import { describe, expect, it } from "vitest";

import {
  applyMatchSelection,
  breakMatch,
  leftIdForRight,
  rightIdForLeft,
  splitFillBlankTemplate,
} from "../quizHelpers";

describe("splitFillBlankTemplate", () => {
  it("splits a template into ordered text and blank segments", () => {
    const segments = splitFillBlankTemplate("The {{a}} sat on the {{b}}.");
    expect(segments).toEqual([
      { kind: "text", value: "The " },
      { kind: "blank", blankId: "a" },
      { kind: "text", value: " sat on the " },
      { kind: "blank", blankId: "b" },
      { kind: "text", value: "." },
    ]);
  });

  it("tolerates whitespace inside the braces", () => {
    const segments = splitFillBlankTemplate("x {{  id1 }} y");
    expect(segments[1]).toEqual({ kind: "blank", blankId: "id1" });
  });

  it("handles a blank at the very start and end", () => {
    const segments = splitFillBlankTemplate("{{a}} middle {{b}}");
    expect(segments[0]).toEqual({ kind: "text", value: "" });
    expect(segments[segments.length - 1]).toEqual({ kind: "text", value: "" });
    expect(segments.filter(s => s.kind === "blank")).toHaveLength(2);
  });

  it("returns a single text segment when there are no blanks", () => {
    expect(splitFillBlankTemplate("just text")).toEqual([{ kind: "text", value: "just text" }]);
  });
});

describe("matching pairing reducer", () => {
  it("creates a pair", () => {
    const pairs = applyMatchSelection([], "l1", "r1");
    expect(pairs).toEqual([{ leftId: "l1", rightId: "r1" }]);
  });

  it("keeps the left side single-use (re-pairing a left evicts the old pair)", () => {
    let pairs = applyMatchSelection([], "l1", "r1");
    pairs = applyMatchSelection(pairs, "l1", "r2");
    expect(pairs).toEqual([{ leftId: "l1", rightId: "r2" }]);
  });

  it("keeps the right side single-use (re-pairing a right evicts the old pair)", () => {
    let pairs = applyMatchSelection([], "l1", "r1");
    pairs = applyMatchSelection(pairs, "l2", "r1");
    expect(pairs).toEqual([{ leftId: "l2", rightId: "r1" }]);
  });

  it("does not mutate the input array", () => {
    const original = [{ leftId: "l1", rightId: "r1" }];
    const next = applyMatchSelection(original, "l2", "r2");
    expect(original).toEqual([{ leftId: "l1", rightId: "r1" }]);
    expect(next).toHaveLength(2);
  });

  it("breaks a pair by either side", () => {
    const pairs = [
      { leftId: "l1", rightId: "r1" },
      { leftId: "l2", rightId: "r2" },
    ];
    expect(breakMatch(pairs, "left", "l1")).toEqual([{ leftId: "l2", rightId: "r2" }]);
    expect(breakMatch(pairs, "right", "r2")).toEqual([{ leftId: "l1", rightId: "r1" }]);
  });

  it("looks up the partner id for each side", () => {
    const pairs = [{ leftId: "l1", rightId: "r9" }];
    expect(rightIdForLeft(pairs, "l1")).toBe("r9");
    expect(rightIdForLeft(pairs, "lX")).toBeNull();
    expect(leftIdForRight(pairs, "r9")).toBe("l1");
    expect(leftIdForRight(pairs, "rX")).toBeNull();
  });
});
