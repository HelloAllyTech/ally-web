import { describe, expect, it } from "vitest";

import {
  buildDefaultCoverPrompt,
  COVER_PROMPT_MAX_LENGTH,
  COVER_PROMPT_RULES,
  toPlainSummary,
} from "../coverImagePrompt";

describe("buildDefaultCoverPrompt", () => {
  it("names the course and summarises the rich-text description", () => {
    const prompt = buildDefaultCoverPrompt(
      "  Listening Well  ",
      "<p>Learn to <strong>listen</strong> without fixing.</p><ul><li>Reflect feelings</li></ul>",
    );

    expect(prompt).toContain('a training course titled "Listening Well".');
    expect(prompt).toContain(
      "The course is about: Learn to listen without fixing. Reflect feelings",
    );
    expect(prompt).not.toMatch(/<[^>]+>/);
  });

  it("always ends with the safety rules, since nothing is appended server-side", () => {
    const prompt = buildDefaultCoverPrompt("Any course", "");
    expect(prompt.endsWith(COVER_PROMPT_RULES)).toBe(true);
    expect(COVER_PROMPT_RULES).toMatch(/no text, letters/i);
    expect(COVER_PROMPT_RULES).toMatch(/No identifiable real person/);
    expect(COVER_PROMPT_RULES).toMatch(/16:9/);
  });

  it("still reads as a sentence for an untitled, undescribed course", () => {
    const prompt = buildDefaultCoverPrompt("", null);
    expect(prompt).toContain("cover image for a training course.");
    expect(prompt).not.toContain("titled");
    expect(prompt).not.toContain("The course is about");
  });

  it("stays inside the backend's prompt limit even for a very long description", () => {
    const prompt = buildDefaultCoverPrompt("T".repeat(300), `<p>${"word ".repeat(5000)}</p>`);
    expect(prompt.length).toBeLessThan(COVER_PROMPT_MAX_LENGTH);
  });
});

describe("toPlainSummary", () => {
  it("cuts at a word boundary and marks the cut", () => {
    expect(toPlainSummary("one two three four", 12)).toBe("one two…");
  });

  it("leaves short text untouched", () => {
    expect(toPlainSummary("<p>Short.</p>", 50)).toBe("Short.");
  });
});
