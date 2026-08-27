import { describe, expect, it } from "vitest";

import { computeLineDiff } from "../diffLines";

/**
 * The diff is what a reviewer reads to decide whether a file edit was
 * sensible, so the property that matters is that unchanged lines stay
 * unchanged: a diff that marks the whole file as rewritten because one line
 * moved tells the reader nothing and costs them the scroll.
 */

const types = (oldText: string, newText: string) =>
  computeLineDiff(oldText, newText).map(line => line.type);

const texts = (oldText: string, newText: string) =>
  computeLineDiff(oldText, newText).map(line => `${line.type}:${line.text}`);

describe("computeLineDiff", () => {
  it("marks an untouched file as all context", () => {
    expect(types("a\nb\nc", "a\nb\nc")).toEqual(["context", "context", "context"]);
  });

  it("keeps the surrounding lines as context when one line changes", () => {
    // The whole point: a one-line edit should read as a one-line edit.
    expect(texts("a\nb\nc", "a\nB\nc")).toEqual([
      "context:a",
      "remove:b",
      "add:B",
      "context:c",
    ]);
  });

  it("reports an insertion without disturbing what surrounds it", () => {
    expect(texts("a\nc", "a\nb\nc")).toEqual(["context:a", "add:b", "context:c"]);
  });

  it("reports a deletion without disturbing what surrounds it", () => {
    expect(texts("a\nb\nc", "a\nc")).toEqual(["context:a", "remove:b", "context:c"]);
  });

  it("treats a new file as all additions", () => {
    expect(types("", "a\nb")).toEqual(["add", "add"]);
  });

  it("treats a deleted file as all removals", () => {
    expect(types("a\nb", "")).toEqual(["remove", "remove"]);
  });

  it("survives two files with nothing in common", () => {
    expect(types("a\nb", "x\ny")).toEqual(["remove", "remove", "add", "add"]);
  });

  it("handles an empty-to-empty edit without inventing lines", () => {
    expect(computeLineDiff("", "")).toEqual([]);
  });

  it("does not stall on a file large enough to blow the LCS table", () => {
    // Past the cell ceiling it falls back to a whole-block diff — a worse
    // diff, but a page that stays responsive, which is the right trade.
    const big = Array.from({ length: 3_000 }, (_, index) => `line ${index}`).join("\n");
    const bigger = `${big}\nline 3000`;

    const started = Date.now();
    const diff = computeLineDiff(big, bigger);

    expect(diff.length).toBeGreaterThan(0);
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
