import { describe, expect, it } from "vitest";

// Source-level, via Vite's ?raw import. renderIcon is a private switch inside a component that
// needs a store, a router and a drag-and-drop context to render, so reaching it through the DOM
// costs far more setup than the invariant is worth — and the invariant is purely structural:
// every navigable sidebar item must have a case.
import permissionsSource from "../../../constants/permissions.ts?raw";
import navigationSource from "../../../utils/navigation.ts?raw";
import sidebarSource from "../Sidebar.tsx?raw";

/**
 * Every item in the sidebar must render an icon.
 *
 * `renderIcon` ends in `default: return null`, so a new tab added to SIDEBAR_ITEMS and wired into
 * navigation.ts gets no icon and nothing anywhere complains — the tab just sits in the sidebar with
 * a blank space where every sibling has a glyph. That is exactly how Logs and the WhatsApp Bot
 * shipped iconless, and it is invisible in a diff because the omission is in a file neither change
 * touched.
 */
describe("sidebar icons", () => {
  // Scoped to renderIcon's own body. Sidebar.tsx now holds a second switch over the same
  // SIDEBAR_ITEMS keys (renderBadge, for the Bug Hunter waiting-on-you count), and matching
  // the whole file would let a badge case satisfy the "this item has an icon" invariant — the
  // exact silent-omission bug this file exists to catch.
  const renderIconSource = (() => {
    const start = sidebarSource.indexOf("const renderIcon");
    const end = sidebarSource.indexOf("const renderBadge", start);
    return sidebarSource.slice(start, end === -1 ? undefined : end);
  })();

  const iconCases = new Set(
    [...renderIconSource.matchAll(/case SIDEBAR_ITEMS\.([A-Z_0-9]+):/g)].map(m => m[1]),
  );

  const declaredItems = (() => {
    const block = permissionsSource.slice(permissionsSource.indexOf("export const SIDEBAR_ITEMS"));
    return [...block.slice(0, block.indexOf("};")).matchAll(/^\s+([A-Z_0-9]+):/gm)].map(m => m[1]);
  })();

  // Only the items actually placed in the sidebar. A SIDEBAR_ITEMS key that navigation.ts never
  // renders has nothing to draw an icon for.
  const navigableItems = declaredItems.filter(id =>
    new RegExp(`SIDEBAR_ITEMS\\.${id}\\b`).test(navigationSource),
  );

  it("finds the sources (guards against a regex silently matching nothing)", () => {
    expect(declaredItems.length).toBeGreaterThan(20);
    expect(navigableItems.length).toBeGreaterThan(20);
    expect(iconCases.size).toBeGreaterThan(20);
  });

  it.each(["LOGS", "WHATSAPP_BOT"])("renders an icon for %s", id => {
    expect(iconCases.has(id)).toBe(true);
  });

  it("uses a different icon for CloudWatch logs than for roleplay session logs", () => {
    // Two log surfaces sharing one glyph are indistinguishable in the collapsed sidebar.
    const iconFor = (id: string) =>
      renderIconSource.match(
        new RegExp(`case SIDEBAR_ITEMS\\.${id}:\\s*\\n\\s*return <(\\w+)`),
      )?.[1];

    expect(iconFor("LOGS")).toBeTruthy();
    expect(iconFor("ROLEPLAY_SESSION_LOGS")).toBeTruthy();
    expect(iconFor("LOGS")).not.toBe(iconFor("ROLEPLAY_SESSION_LOGS"));
  });

  it("has an icon case for every navigable sidebar item", () => {
    const missing = navigableItems.filter(id => !iconCases.has(id));
    expect(
      missing,
      `these sidebar items render no icon (renderIcon falls through to default: null): ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
