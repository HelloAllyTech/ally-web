import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression test for the link-preview text shown when a link to this app
 * (app.helloally.ai) is shared in WhatsApp/etc: scrapers without an og:title
 * fall back to <meta name="description">, which used to read the Vite
 * scaffold placeholder "Ally UI project" instead of the product name "Ally".
 */
const HTML_PATH = path.resolve(__dirname, "../../index.html");
const html = fs.readFileSync(HTML_PATH, "utf-8");

describe("index.html meta description", () => {
  it("names the product, not the scaffold placeholder", () => {
    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"/);
    expect(descriptionMatch).not.toBeNull();

    const description = descriptionMatch![1];
    // Asserted as intent rather than an exact string. This pinned the literal
    // "Ally" until the description was deliberately lengthened to something that
    // reads better in a link preview, which failed a test that had no quarrel
    // with the new text. What actually matters is what the docblock says: the
    // scaffold placeholder must not come back, and the product name must lead.
    expect(description).not.toMatch(/UI project/i);
    expect(description).toMatch(/^Ally\b/);
  });
});
