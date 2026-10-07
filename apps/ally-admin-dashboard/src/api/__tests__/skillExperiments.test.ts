import { describe, expect, it } from "vitest";

// Raw source, via Vite's ?raw import — RTK Query exposes no way to read the
// registered `tagTypes` back (same check as helplineAdmin.test.ts).
import baseApiSource from "../baseApi.ts?raw";
import skillExperimentsSource from "../skillExperiments.ts?raw";

/**
 * A tag a slice uses must ALSO be declared in baseAPI's `tagTypes`. RTK Query
 * silently ignores an unregistered tag, so turning an experiment on would look
 * like it worked while the list kept showing it off.
 */
describe("skillExperiments API tag registration", () => {
  const usedTags = [...new Set(skillExperimentsSource.match(/TAG_TYPES\.[A-Z0-9_]+/g) ?? [])];

  it("uses at least one tag (guards against the regex silently matching nothing)", () => {
    expect(usedTags.length).toBeGreaterThan(0);
  });

  it.each(usedTags)("registers %s in baseApi tagTypes", tag => {
    expect(
      baseApiSource.includes(tag),
      `${tag} is used by api/skillExperiments.ts but not registered in api/baseApi.ts tagTypes`,
    ).toBe(true);
  });
});
