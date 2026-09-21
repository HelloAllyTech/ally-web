import { describe, expect, it } from "vitest";

import { DEFAULT_COPY } from "../sjtCopy";
import { buildExport, coerceOverrides, parseOverrides } from "../useSjtCopy";

describe("copy overrides", () => {
  it("survives junk instead of blanking the page", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides("{ not json")).toEqual({});
    expect(parseOverrides('"a string"')).toEqual({});
    expect(parseOverrides("[1,2,3]")).toEqual({});
  });

  it("keeps only edits that name a line this page renders", () => {
    const kept = parseOverrides(
      JSON.stringify({
        "intro.lede": "Kept.",
        "intro.invented": "Dropped — no such line.",
        "results.note": 42,
      }),
    );

    expect(kept).toEqual({ "intro.lede": "Kept." });
  });

  it("drops an edit that is just the committed wording retyped", () => {
    // Otherwise it counts as a change forever, and outlives a later reword of
    // the default it happens to match.
    expect(coerceOverrides({ "intro.startLabel": DEFAULT_COPY.intro.startLabel })).toEqual({});
  });

  it("refuses a value long enough to fill this browser's storage", () => {
    expect(coerceOverrides({ "intro.lede": "x".repeat(4001) })).toEqual({});
    expect(coerceOverrides({ "intro.lede": "x".repeat(4000) })).toEqual({
      "intro.lede": "x".repeat(4000),
    });
  });

  it("reads an exported file as well as a bare map, so a round trip works", () => {
    const exported = buildExport({ "intro.lede": "Rewritten." });

    expect(exported.version).toBe(1);
    expect(exported.changeCount).toBe(1);
    expect(coerceOverrides(exported)).toEqual({ "intro.lede": "Rewritten." });
    expect(parseOverrides(JSON.stringify(exported))).toEqual({ "intro.lede": "Rewritten." });
  });

  it("exports in the page's own order, not the order the edits happened", () => {
    const exported = buildExport({
      "results.note": "Later on the page.",
      "intro.eyebrow": "Earlier on the page.",
    });

    expect(Object.keys(exported.changes)).toEqual(["intro.eyebrow", "results.note"]);
  });
});
