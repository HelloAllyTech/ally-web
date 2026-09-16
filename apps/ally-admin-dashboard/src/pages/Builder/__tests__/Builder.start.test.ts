import { describe, expect, it } from "vitest";
import { BUILDER_TITLE_MAX, sessionTitleFrom, startErrorMessage } from "../builderStart";

/**
 * Starting a build from the hero box.
 *
 * The box is a four-line textarea asking what you want built, so people type a
 * paragraph — and `title` is capped at 200 characters server-side. A longer one
 * came back as a 400 that the UI rendered as "Couldn't start a new build." and
 * nothing else, twice, to two different people.
 */
describe("sessionTitleFrom", () => {
  it("leaves a short title exactly as typed", () => {
    expect(sessionTitleFrom("  Add a filter to roleplay logs  ")).toBe(
      "Add a filter to roleplay logs",
    );
  });

  it("collapses the whitespace a pasted paragraph brings with it", () => {
    expect(sessionTitleFrom("Add   a\n\nfilter")).toBe("Add a filter");
  });

  it("keeps a long title within what the server accepts", () => {
    const typed = `${"word ".repeat(120)}end`;
    expect(sessionTitleFrom(typed).length).toBeLessThanOrEqual(BUILDER_TITLE_MAX);
  });

  /**
   * "…for individual liste" reads like a bug. "…for individual" reads like a
   * title.
   */
  it("cuts at a word boundary rather than mid-word", () => {
    const typed = `${"alpha ".repeat(60)}omega`;
    expect(sessionTitleFrom(typed).endsWith("alpha")).toBe(true);
  });

  /**
   * A single enormous token has no boundary to honour, and shrinking the title
   * to almost nothing to find one would be worse than cutting it.
   */
  it("still fills the title when there is no boundary to cut at", () => {
    const typed = "x".repeat(400);
    expect(sessionTitleFrom(typed)).toHaveLength(BUILDER_TITLE_MAX);
  });
});

describe("startErrorMessage", () => {
  /** class-validator returns an array of field errors. */
  it("joins the field errors the server listed", () => {
    expect(
      startErrorMessage(
        { data: { message: ["title must be shorter than 200 characters"] } },
        "fallback",
      ),
    ).toBe("title must be shorter than 200 characters");
  });

  it("passes through a single-string message", () => {
    expect(startErrorMessage({ data: { message: "Builder is disabled." } }, "fallback")).toBe(
      "Builder is disabled.",
    );
  });

  /** A network drop carries nothing worth showing, so the generic line stays. */
  it("falls back when the error says nothing", () => {
    expect(startErrorMessage(new Error("Network request failed"), "fallback")).toBe("fallback");
    expect(startErrorMessage({ data: { message: [] } }, "fallback")).toBe("fallback");
    expect(startErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
