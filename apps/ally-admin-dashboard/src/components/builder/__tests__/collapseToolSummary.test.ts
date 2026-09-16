import { describe, expect, it } from "vitest";
import { collapseToolSummary } from "../BuildActivityFeed";

/**
 * A run makes a hundred tool calls and most summaries are the command itself —
 * a `cd` into the runner's checkout, a heredoc, a curl carrying a JSON body.
 * Printed in full on the collapsed row they wrap over several lines each, and
 * the feed's real signal (gate results, verification, the plan) gets scrolled
 * past. The full text stays one click away in the expanded detail.
 */
describe("collapseToolSummary", () => {
  it("leaves a short summary alone", () => {
    expect(collapseToolSummary("Ran the tests")).toBe("Ran the tests");
  });

  it("flattens the newlines a heredoc drags in", () => {
    expect(collapseToolSummary("cat <<EOF\n  body\n  more\nEOF")).toBe("cat <<EOF body more EOF");
  });

  it("truncates a long command and marks it", () => {
    const long = `cd /home/runner/work/ally-be/ally-be/repos/ally-be && ${"git diff --name-only ".repeat(8)}`;
    const out = collapseToolSummary(long);

    expect(out.length).toBeLessThanOrEqual(97);
    expect(out.endsWith("…")).toBe(true);
  });

  it("cuts at a word boundary rather than mid-token", () => {
    const long = `${"alpha ".repeat(40)}omega`;
    expect(collapseToolSummary(long)).toMatch(/alpha…$/);
  });

  /** A single unbroken token has no boundary worth honouring. */
  it("still truncates when there is no boundary", () => {
    expect(collapseToolSummary("x".repeat(400))).toHaveLength(97);
  });
});
