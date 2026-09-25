import { describe, expect, it } from "vitest";

import {
  applyMatchSelection,
  breakMatch,
  formatCorrectAnswer,
  formatLikertResponses,
  isPendingResult,
  isSurveyQuiz,
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

describe("isPendingResult", () => {
  it("is pending only for a graded question with no verdict yet", () => {
    expect(isPendingResult({ correct: null })).toBe(true);
    expect(isPendingResult({ correct: null, graded: true })).toBe(true);
    expect(isPendingResult({ correct: null, graded: false })).toBe(false);
    expect(isPendingResult({ correct: false })).toBe(false);
  });
});

describe("isSurveyQuiz", () => {
  it("is a survey only when every question is ungraded", () => {
    expect(isSurveyQuiz([{ graded: false }, { graded: false }])).toBe(true);
    expect(isSurveyQuiz([{ graded: false }, { graded: true }])).toBe(false);
    // Older payloads carry no flag at all — those are graded.
    expect(isSurveyQuiz([{}])).toBe(false);
    expect(isSurveyQuiz([])).toBe(false);
  });
});

describe("formatCorrectAnswer", () => {
  const labels = { true: "True", false: "False" };

  it("resolves option ids to their text", () => {
    const question = {
      type: "mcq_multi",
      options: [
        { id: "a", text: "Listen" },
        { id: "b", text: "Interrupt" },
        { id: "c", text: "Reflect" },
      ],
    };
    expect(formatCorrectAnswer(question, { selectedOptionIds: ["a", "c"] }, labels)).toEqual([
      "Listen, Reflect",
    ]);
  });

  it("labels true/false", () => {
    expect(formatCorrectAnswer({ type: "true_false" }, { booleanAnswer: false }, labels)).toEqual([
      "False",
    ]);
  });

  it("numbers an ordering and arrows a matching", () => {
    const ordering = {
      type: "ordering",
      items: [
        { id: "x", text: "Greet" },
        { id: "y", text: "Assess" },
      ],
    };
    expect(formatCorrectAnswer(ordering, { orderedItemIds: ["x", "y"] }, labels)).toEqual([
      "1. Greet",
      "2. Assess",
    ]);
    const matching = {
      type: "matching",
      left: [{ id: "l1", text: "Anger" }],
      right: [{ id: "r1", text: "Validate" }],
    };
    expect(
      formatCorrectAnswer(matching, { pairs: [{ leftId: "l1", rightId: "r1" }] }, labels),
    ).toEqual(["Anger → Validate"]);
  });

  it("joins a blank's accepted answers", () => {
    expect(
      formatCorrectAnswer(
        { type: "fill_blank" },
        { blanks: [{ blankId: "b1", acceptedAnswers: ["calm", "steady"] }] },
        labels,
      ),
    ).toEqual(["calm / steady"]);
  });

  it("shows nothing when there is no key", () => {
    expect(formatCorrectAnswer({ type: "mcq_single" }, undefined, labels)).toEqual([]);
  });

  it("drops ids that no longer resolve instead of showing them raw", () => {
    const question = { type: "mcq_single", options: [{ id: "a", text: "A" }] };
    expect(formatCorrectAnswer(question, { selectedOptionIds: ["gone"] }, labels)).toEqual([]);
  });
});

describe("formatLikertResponses", () => {
  it("pairs each statement with its chosen point, or null", () => {
    const question = {
      statements: [
        { id: "s1", text: "I felt prepared" },
        { id: "s2", text: "I felt calm" },
      ],
      scale: [
        { id: "p1", text: "Disagree" },
        { id: "p2", text: "Agree" },
      ],
    };
    expect(formatLikertResponses(question, { s1: "p2" })).toEqual([
      { statement: "I felt prepared", rating: "Agree" },
      { statement: "I felt calm", rating: null },
    ]);
  });
});
