import { describe, expect, it } from "vitest";

import { asList } from "../characterData";

/**
 * The crash this pins: a character whose `knowledgeSources` jsonb held a bare
 * string instead of a list. `knowledgeSources?.length` is truthy for a
 * non-empty string, so the guard let it through and the following `.map` threw
 * "e.map is not a function" — which surfaced as the admin error page the
 * moment anyone opened that character.
 */
describe("asList", () => {
  it("passes an array through untouched", () => {
    const sources = [{ id: "1", title: "A" }];

    expect(asList(sources)).toBe(sources);
  });

  it("returns an empty list for a string, so `.length` no longer lies", () => {
    expect(asList("not a list")).toEqual([]);
    // The shape of the original bug: truthy length, no `.map`.
    expect(asList("not a list").length).toBe(0);
  });

  it("returns an empty list for null, undefined and objects", () => {
    expect(asList(null)).toEqual([]);
    expect(asList(undefined)).toEqual([]);
    expect(asList({ title: "A" })).toEqual([]);
  });

  it("keeps an empty array empty rather than substituting a new one's contents", () => {
    expect(asList([])).toEqual([]);
  });
});
