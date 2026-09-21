import { describe, expect, it } from "vitest";

import {
  COPY_PATHS,
  DEFAULT_COPY,
  describePath,
  hasTokenDrift,
  isCopyPath,
  mergeCopy,
  readCopy,
  sectionOf,
  tokensOf,
} from "../sjtCopy";
import { ITEMS, OPTION_IDS } from "../sjtData";

describe("the copy model", () => {
  it("addresses every line of the page, chrome and content alike", () => {
    // Four options with text and reasoning, plus phase, setting and scenario.
    const perItem = OPTION_IDS.length * 2 + 3;
    ITEMS.forEach(item => {
      expect(COPY_PATHS.filter(path => path.startsWith(`items.${item.id}.`))).toHaveLength(perItem);
    });

    // Nothing addressable is anything but a string: an override can only ever
    // reword the page, so a non-string leaf would be a field nobody can edit.
    COPY_PATHS.forEach(path => expect(typeof readCopy(DEFAULT_COPY, path)).toBe("string"));
    expect(COPY_PATHS).toContain("items.1.options.a.why");
    expect(COPY_PATHS).toContain("intro.note");
    expect(COPY_PATHS).toContain("rankLabels.3");
    expect(COPY_PATHS).toContain("bands.mixed");
  });

  it("reads a missing path as empty rather than throwing", () => {
    expect(readCopy(DEFAULT_COPY, "intro.nope")).toBe("");
    expect(readCopy(DEFAULT_COPY, "")).toBe("");
    expect(isCopyPath("intro.nope")).toBe(false);
  });

  it("applies an override and leaves the rest of the page alone", () => {
    const merged = mergeCopy({ "intro.lede": "Rewritten." });

    expect(merged.intro.lede).toBe("Rewritten.");
    expect(merged.intro.note).toBe(DEFAULT_COPY.intro.note);
    // The defaults are the shared source of every render; an override must not
    // reach back into them.
    expect(DEFAULT_COPY.intro.lede).not.toBe("Rewritten.");
  });

  it("ignores overrides that name a line the page doesn't have", () => {
    const merged = mergeCopy({
      "intro.nope": "invented",
      "items.999.scenario": "invented",
      intro: "invented",
    });

    expect(merged).toEqual(DEFAULT_COPY);
    expect("nope" in merged.intro).toBe(false);
  });

  it("reaches an option's reasoning, which is the copy most worth editing", () => {
    const path = `items.${ITEMS[0].id}.options.b.why`;
    const merged = mergeCopy({ [path]: "Because it names the feeling first." });

    expect(merged.items[String(ITEMS[0].id)].options.b.why).toBe(
      "Because it names the feeling first.",
    );
    expect(merged.items[String(ITEMS[0].id)].options.b.text).toBe(ITEMS[0].options.b.text);
  });

  it("flags an edit that dropped a placeholder the line needs", () => {
    expect(tokensOf(DEFAULT_COPY.question.remaining)).toEqual(["{remaining}"]);

    expect(hasTokenDrift("question.remaining", "{remaining} to go")).toBe(false);
    expect(hasTokenDrift("question.remaining", "nearly there")).toBe(true);
    // A line with no placeholders can't drift.
    expect(hasTokenDrift("intro.startLabel", "Begin")).toBe(false);
  });

  it("names a path the way a reviewer would say it", () => {
    expect(describePath("intro.lede")).toBe("Intro screen · lede");
    expect(describePath("intro.howBodyTwo")).toBe("Intro screen · how body two");
    expect(describePath("items.3.options.b.why")).toBe("Scenario 3 · option B reasoning");
    expect(describePath("items.3.scenario")).toBe("Scenario 3 · scenario");
    expect(describePath("domains.VN.blurb")).toBe("Area VN · blurb");
    expect(describePath("rankLabels.0")).toBe("Rank label 1");
    expect(sectionOf("results.note")).toBe("Results screen");
  });
});
