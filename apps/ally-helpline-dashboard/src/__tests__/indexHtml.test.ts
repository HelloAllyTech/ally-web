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
  it("reads 'Ally', not the scaffold placeholder", () => {
    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"/);
    expect(descriptionMatch).not.toBeNull();
    expect(descriptionMatch![1]).toBe("Ally");
  });
});
