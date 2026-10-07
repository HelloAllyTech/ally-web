import { describe, expect, it } from "vitest";

import { safeLink } from "../links";

const FALLBACK = "https://www.helloally.ai";

describe("safeLink", () => {
  it.each([
    "https://www.helloally.ai/contact",
    "http://example.org",
    "mailto:team@example.org",
    "  https://www.helloally.ai  ",
  ])("keeps a web or mail link: %s", value => {
    expect(safeLink(value, FALLBACK)).toBe(value.trim());
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/relative/path",
    "www.helloally.ai",
    "https://",
    "landing.contact.href",
    "",
    undefined,
  ])("falls back for anything else: %s", value => {
    expect(safeLink(value, FALLBACK)).toBe(FALLBACK);
  });
});
