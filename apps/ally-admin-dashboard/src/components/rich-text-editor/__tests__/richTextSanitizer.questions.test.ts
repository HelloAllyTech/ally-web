import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "../richTextSanitizer";

const marker = '<div data-ally-question="q1"></div>';

/**
 * The placeholder is the one `div` and the one data attribute the sanitizer
 * lets through, and only for the article builder. Everything the learner is
 * ever told about the question — including the answer key — is stored
 * alongside the HTML, never inside it, so nothing here needs to carry it.
 */
describe("sanitizeHtml — article question placeholders", () => {
  it("strips the placeholder by default", () => {
    expect(sanitizeHtml(`<p>a</p>${marker}`)).toBe("<p>a</p>");
  });

  it("keeps the placeholder when questions are allowed", () => {
    const html = sanitizeHtml(`<p>a</p>${marker}`, { allowQuestions: true });
    expect(html).toContain('data-ally-question="q1"');
  });

  it("keeps placeholders and images together", () => {
    const html = sanitizeHtml(`<img src="https://x/y.png" alt="y">${marker}`, {
      allowImages: true,
      allowQuestions: true,
    });
    expect(html).toContain("<img");
    expect(html).toContain("data-ally-question");
  });

  it("does not open the door to other data attributes", () => {
    const html = sanitizeHtml('<div data-evil="1" data-ally-question="q1"></div>', {
      allowQuestions: true,
    });
    expect(html).toContain("data-ally-question");
    expect(html).not.toContain("data-evil");
  });

  it("does not open the door to other attributes on the placeholder", () => {
    const html = sanitizeHtml(
      '<div data-ally-question="q1" onclick="alert(1)" style="color:red"></div>',
      { allowQuestions: true },
    );
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("style");
  });

  it("still strips scripts and iframes", () => {
    const html = sanitizeHtml(`<script>alert(1)</script><iframe src="x"></iframe>${marker}`, {
      allowQuestions: true,
    });
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<iframe");
  });

  it("leaves images out when only questions are allowed", () => {
    const html = sanitizeHtml(`<img src="https://x/y.png">${marker}`, { allowQuestions: true });
    expect(html).not.toContain("<img");
    expect(html).toContain("data-ally-question");
  });
});
