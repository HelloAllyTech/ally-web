import { describe, expect, it } from "vitest";

import { EMPTY_PROGRESS, parseProgress } from "../useSjtProgress";
import { ITEMS, OptionId } from "../sjtData";

const complete: OptionId[] = ["b", "c", "a", "d"];

const allAnswered = () =>
  Object.fromEntries(ITEMS.map(item => [item.id, complete])) as Record<number, OptionId[]>;

describe("parseProgress", () => {
  it("starts fresh when there is nothing stored", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
  });

  it("starts fresh on unparseable or non-object payloads", () => {
    expect(parseProgress("not json")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('"a string"')).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("null")).toEqual(EMPTY_PROGRESS);
  });

  it("starts fresh on an unrecognised stage", () => {
    expect(parseProgress(JSON.stringify({ stage: "finished", index: 3, answers: {} }))).toEqual(
      EMPTY_PROGRESS,
    );
  });

  it("restores a mid-run position and its rankings", () => {
    const raw = JSON.stringify({ stage: "quiz", index: 4, answers: { 1: complete, 2: ["b"] } });
    expect(parseProgress(raw)).toEqual({
      stage: "quiz",
      index: 4,
      answers: { 1: complete, 2: ["b"] },
    });
  });

  it("clamps an out-of-range index back to the first scenario", () => {
    ["-1", String(ITEMS.length), "1.5", '"3"'].forEach(index => {
      const raw = `{"stage":"quiz","index":${index},"answers":{}}`;
      expect(parseProgress(raw).index).toBe(0);
    });
  });

  it("drops rankings that are too long, duplicated, or not real options", () => {
    const raw = JSON.stringify({
      stage: "quiz",
      index: 0,
      answers: {
        1: ["a", "b", "c", "d", "a"],
        2: ["a", "a"],
        3: ["a", "z"],
        4: "bcad",
        5: complete,
      },
    });
    expect(parseProgress(raw).answers).toEqual({ 5: complete });
  });

  it("ignores answers for scenarios that no longer exist", () => {
    const raw = JSON.stringify({ stage: "quiz", index: 0, answers: { 999: complete } });
    expect(parseProgress(raw).answers).toEqual({});
  });

  it("restores the results screen once every scenario is ranked", () => {
    const raw = JSON.stringify({ stage: "results", index: 0, answers: allAnswered() });
    const restored = parseProgress(raw);
    expect(restored.stage).toBe("results");
    expect(restored.index).toBe(ITEMS.length - 1);
  });

  it("sends a results payload with a gap back to the first unranked scenario", () => {
    const answers = allAnswered();
    delete answers[ITEMS[6].id];
    answers[ITEMS[3].id] = ["b", "c"];

    // Scoring a partial ranking as a finished run would report a score the
    // learner never earned, so the incomplete scenario is where they resume.
    const restored = parseProgress(JSON.stringify({ stage: "results", index: 9, answers }));
    expect(restored.stage).toBe("quiz");
    expect(restored.index).toBe(3);
  });
});
