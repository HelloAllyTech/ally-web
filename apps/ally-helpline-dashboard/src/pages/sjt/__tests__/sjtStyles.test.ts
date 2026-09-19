import { readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

/**
 * Assertions against the stylesheet as text.
 *
 * The page's look can't be checked through the component tests — vitest stubs
 * CSS imports, so nothing here has computed styles. These two invariants are
 * worth guarding anyway: both were broken at some point, and neither shows up
 * as a test failure or a lint error, only as a page that looks wrong.
 */
const CSS = readFileSync(join(__dirname, "..", "sjt.css"), "utf8");
const APP_CSS = readFileSync(join(__dirname, "..", "..", "..", "index.css"), "utf8");

/** Declared font stacks, one entry per `font-family:` / `--display:` / `--body:`. */
const fontStacks = CSS.match(/(?:font-family|--display|--body):[^;]+;/g) ?? [];

const NOT_SERIF = /sans-serif|monospace|ui-monospace|Mono|Grotesk|Helvetica|Arial|system-ui/;

describe("sjt.css", () => {
  it("names no font family of its own — they come from the app tokens", () => {
    expect(fontStacks.length).toBeGreaterThan(0);

    // This page used to carry its own copy of the two serif stacks, from when
    // the rest of the app was still on Carbon. It no longer does: --display and
    // --body alias the app-wide --font-* tokens, and every other declaration
    // goes through var(). A literal family reappearing here means the page has
    // started drifting from the app again, which is the thing worth catching.
    fontStacks.forEach(stack => expect(stack).toMatch(/var\(--/));
  });

  it("resolves through app tokens that are serif only — no sans, no monospace", () => {
    // The invariant this file has always guarded ("/SJT1 renders serif only")
    // now lives one level up, because the families moved to index.css when the
    // page's private palette was folded into the app's. Guarding it there
    // covers every route rather than just this one.
    const appStacks = APP_CSS.match(/--font-(?:primary|secondary|tertiary|sans):[^;]+;/g) ?? [];
    expect(appStacks.length).toBe(4);
    appStacks.forEach(stack => {
      expect(stack).toMatch(/serif/);
      expect(stack).not.toMatch(NOT_SERIF);
    });
  });

  it("keeps the button reset inside :where() so button classes still win", () => {
    // A plain `.sjt button { font: inherit; color: inherit }` scores (0,1,1)
    // and outranks `.sjt-btn` at (0,1,0) — which silently discarded every
    // button's font and colour, leaving .sjt-btn's label inheriting --ink onto
    // its own --ink background, invisible. `:where()` adds no specificity, so
    // the later component rules take over.
    expect(CSS).toMatch(/\.sjt :where\(button\)\s*\{/);
    expect(CSS).not.toMatch(/^\.sjt button\s*\{/m);
  });

  it("scopes every rule under .sjt so nothing leaks into the rest of the app", () => {
    const selectors = CSS.replace(/\/\*[\s\S]*?\*\//g, "")
      // Drop @media openers so their nested rules are read like any other.
      .replace(/@media[^{]*\{/g, "")
      .split("}")
      .filter(chunk => chunk.includes("{"))
      .flatMap(chunk =>
        chunk
          .slice(0, chunk.lastIndexOf("{"))
          .split(",")
          .map(one => one.trim())
          .filter(Boolean),
      );

    expect(selectors.length).toBeGreaterThan(30);
    selectors.forEach(selector => expect(selector).toMatch(/^\.sjt\b|^\.sjt-/));
  });
});
