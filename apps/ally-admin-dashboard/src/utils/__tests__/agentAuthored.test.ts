import { describe, expect, it } from "vitest";

import { asAgentText, asAgentTextList } from "../agentAuthored";

describe("asAgentText", () => {
  it("passes strings through untouched", () => {
    expect(asAgentText("Which tenant owns this?")).toBe("Which tenant owns this?");
  });

  it("reads the words out of an object written where text belongs", () => {
    // The exact shape that crashed the Builder session page: React error #31,
    // "object with keys {id, text}".
    expect(asAgentText({ id: "q1", text: "Which tenant owns this?" })).toBe(
      "Which tenant owns this?",
    );
    expect(asAgentText({ id: "r1", label: "Per-tenant toggle" })).toBe("Per-tenant toggle");
  });

  it("shows unreadable objects as JSON rather than hiding them", () => {
    expect(asAgentText({ severity: 3 })).toBe('{"severity":3}');
  });

  it("reads an empty object as nothing at all", () => {
    expect(asAgentText({})).toBe("");
  });

  it("joins an array written where one string belongs", () => {
    expect(asAgentText(["First point", "Second point"])).toBe("First point\nSecond point");
  });

  it("renders nullish and non-string scalars as text", () => {
    expect(asAgentText(null)).toBe("");
    expect(asAgentText(undefined)).toBe("");
    expect(asAgentText(7)).toBe("7");
    expect(asAgentText(false)).toBe("false");
  });
});

describe("asAgentTextList", () => {
  it("flattens object rows and drops empties", () => {
    expect(
      asAgentTextList([
        { id: "q1", text: "Which tenant owns this?" },
        "",
        "Does it need a migration?",
        null,
      ]),
    ).toEqual(["Which tenant owns this?", "Does it need a migration?"]);
  });

  it("keeps a bare string as a one-item list", () => {
    // Dropping it would hide a readiness blocker.
    expect(asAgentTextList("Which tenant owns this?")).toEqual(["Which tenant owns this?"]);
  });

  it("returns an empty list for nothing at all", () => {
    expect(asAgentTextList(undefined)).toEqual([]);
    expect(asAgentTextList({})).toEqual([]);
  });
});
