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

/** Declared font stacks, one entry per `font-family:` / `--display:` / `--body:`. */
const fontStacks = CSS.match(/(?:font-family|--display|--body):[^;]+;/g) ?? [];

describe("sjt.css", () => {
  it("declares serif families only — no sans, no monospace", () => {
    expect(fontStacks.length).toBeGreaterThan(0);

    // `var(--display)` / `var(--body)` both resolve to serif stacks, so the
    // only literal families to police are the two definitions themselves.
    const literal = fontStacks.filter(stack => !/var\(--(display|body)\)/.test(stack));
    literal.forEach(stack => {
      expect(stack).toMatch(/serif/);
      expect(stack).not.toMatch(/sans-serif|monospace|ui-monospace|Mono|Grotesk|Helvetica|Arial/);
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
