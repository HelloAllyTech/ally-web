import { describe, expect, it } from "vitest";

// Raw source, via Vite's ?raw import. See the note below on why this is a source check.
import baseApiSource from "../baseApi.ts?raw";
import whatsappBotSource from "../whatsappBot.ts?raw";

/**
 * Every tag a slice uses must ALSO be declared in baseAPI's `tagTypes`.
 *
 * RTK Query silently ignores an unregistered tag — the invalidation simply never fires, so a save
 * appears to succeed while the list keeps showing stale data. baseApi.ts carries a comment about
 * four tags that shipped exactly that way once.
 *
 * Checked against the SOURCE rather than the runtime api object because RTK Query does not expose
 * `tagTypes` on the created api — there is no supported way to read the registered set back. A
 * source check encodes the real invariant ("these two lists agree") and cannot be fooled by an
 * internal shape change, which is more than can be said for poking at private fields.
 */
describe("whatsappBot API tag registration", () => {
  const usedTags = [
    ...new Set(whatsappBotSource.match(/TAG_TYPES\.[A-Z0-9_]+/g) ?? []),
  ];

  it("uses at least one tag (guards against the regex silently matching nothing)", () => {
    expect(usedTags.length).toBeGreaterThan(0);
  });

  it.each(usedTags)("registers %s in baseApi tagTypes", tag => {
    expect(
      baseApiSource.includes(tag),
      `${tag} is used by api/whatsappBot.ts but not registered in api/baseApi.ts tagTypes — ` +
        `RTK Query will ignore it and the cache invalidation will never fire`,
    ).toBe(true);
  });
});

/**
 * `@carbon/charts` must be reachable only through the lazy `UsageDashboard` boundary.
 *
 * The WhatsApp route loads eagerly — six of its seven tabs are light forms and tables — so the chart
 * library is code-split at the SUB-TAB. One stray top-level chart import in a sibling tab silently
 * pulls the whole library back into the eager bundle, and nothing about the page looks or behaves
 * differently, so nobody notices. This is that regression test.
 */
describe("WhatsApp bot chart bundle split", () => {
  const chartImporters = Object.entries(
    import.meta.glob("../../pages/WhatsAppBot/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >,
  )
    .filter(([, source]) => /from "@carbon\/charts/.test(source))
    .map(([path]) => path.split("/").pop());

  it("finds the WhatsAppBot sources (guards against the glob silently matching nothing)", () => {
    expect(
      Object.keys(
        import.meta.glob("../../pages/WhatsAppBot/*.tsx", { query: "?raw", import: "default", eager: true }),
      ).length,
    ).toBeGreaterThan(5);
  });

  it("is imported by UsageDashboard.tsx and nothing else", () => {
    expect(chartImporters).toEqual(["UsageDashboard.tsx"]);
  });
});
