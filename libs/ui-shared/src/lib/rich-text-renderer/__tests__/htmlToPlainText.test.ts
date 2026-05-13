import { describe, it, expect } from "vitest";

import { htmlToPlainText } from "../htmlToPlainText";

describe("htmlToPlainText", () => {
  it("returns empty string for null, undefined, or empty input", () => {
    expect(htmlToPlainText(null)).toBe("");
    expect(htmlToPlainText(undefined)).toBe("");
    expect(htmlToPlainText("")).toBe("");
  });

  it("returns plain text unchanged when there are no tags", () => {
    expect(htmlToPlainText("Hello world")).toBe("Hello world");
  });

  it("strips inline formatting tags and concatenates visible text", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("collapses whitespace introduced by block-level tags", () => {
    const html = "<p>Hello</p>\n<p>world</p>";
    expect(htmlToPlainText(html)).toBe("Hello world");
  });

  it("preserves list item text without bullet markup", () => {
    const html = "<h3>What's hard</h3><ul><li>Defensiveness</li><li>Avoidance</li></ul>";
    expect(htmlToPlainText(html)).toBe("What's hard Defensiveness Avoidance");
  });

  it("decodes HTML entities", () => {
    expect(htmlToPlainText("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });

  it("does not execute scripts embedded in the input", () => {
    // DOMParser.parseFromString doesn't run <script> tags. We assert the
    // visible-text extraction is what we expect rather than relying on
    // side-effect tracking.
    const html = '<p>safe</p><script>throw new Error("nope")</script>';
    expect(htmlToPlainText(html)).toBe("safe");
  });

  it("does not fire <img onerror> handlers during extraction", () => {
    // If the implementation used innerHTML on a live document, the broken
    // <img> would queue an error event. DOMParser builds an inert document
    // so this is safe; we just confirm the alt-less img contributes no text.
    const html = '<p>before</p><img src="x" onerror="throw new Error()"><p>after</p>';
    expect(htmlToPlainText(html)).toBe("before after");
  });

  it("trims leading and trailing whitespace from the result", () => {
    expect(htmlToPlainText("  <p>  Hello  </p>  ")).toBe("Hello");
  });

  it("handles HTML with attributes that should be ignored", () => {
    const html = '<p class="foo" id="bar">Hello <em title="x">there</em></p>';
    expect(htmlToPlainText(html)).toBe("Hello there");
  });
});
