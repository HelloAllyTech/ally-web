import { describe, it, expect } from "vitest";

import { blogPostTitle, excerptFromHtml } from "../blogMeta";

describe("blogPostTitle", () => {
  it("suffixes the post title so browser tabs identify the site", () => {
    expect(blogPostTitle("Introducing Ally Learning Tracks")).toBe(
      "Introducing Ally Learning Tracks | Ally Blog",
    );
  });
});

describe("excerptFromHtml", () => {
  it("returns undefined for empty input", () => {
    expect(excerptFromHtml(undefined)).toBeUndefined();
    expect(excerptFromHtml(null)).toBeUndefined();
    expect(excerptFromHtml("")).toBeUndefined();
  });

  it("returns undefined when the markup carries no text", () => {
    expect(excerptFromHtml("<p></p><div>   </div>")).toBeUndefined();
  });

  it("strips tags and collapses whitespace", () => {
    expect(excerptFromHtml("<h2>Naturalness</h2>\n<p>is   <strong>hard</strong>.</p>")).toBe(
      "Naturalness is hard.",
    );
  });

  it("decodes HTML entities rather than leaking them into the description", () => {
    expect(excerptFromHtml("<p>Supervisors &amp; counsellors&nbsp;coach live</p>")).toBe(
      "Supervisors & counsellors coach live",
    );
  });

  it("does not truncate text within the limit", () => {
    const short = "A guided way to build skills.";
    expect(excerptFromHtml(`<p>${short}</p>`)).toBe(short);
  });

  it("truncates long text on a word boundary and appends an ellipsis", () => {
    const body = `<p>${"word ".repeat(80).trim()}</p>`;
    const result = excerptFromHtml(body)!;

    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(201);
    // Word boundary: nothing should be cut mid-token.
    expect(result.replace("…", "").endsWith("word")).toBe(true);
  });

  it("falls back to a hard cut when a single token exceeds the limit", () => {
    const result = excerptFromHtml(`<p>${"x".repeat(300)}</p>`)!;

    expect(result).toBe(`${"x".repeat(200)}…`);
  });

  it("trims dangling punctuation before the ellipsis", () => {
    const body = `<p>${"alpha ".repeat(33).trim()}, beta gamma</p>`;
    const result = excerptFromHtml(body)!;

    expect(result).not.toMatch(/[.,;:!?-]…$/);
  });
});
