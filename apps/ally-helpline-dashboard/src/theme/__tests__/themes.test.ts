import { describe, it, expect } from "vitest";

import {
  DEFAULT_UI_THEME,
  isUiTheme,
  normalizeUiTheme,
  THEME_META,
  UI_THEMES,
} from "../themes";

describe("theme contract", () => {
  it("exposes exactly the three themes", () => {
    expect(UI_THEMES).toEqual(["current", "claude", "carbon"]);
  });

  it("uses a valid default theme (current = zero-regression look)", () => {
    expect(UI_THEMES).toContain(DEFAULT_UI_THEME);
    expect(DEFAULT_UI_THEME).toBe("current");
  });

  it("has metadata (label key + 3 swatch colours) for every system", () => {
    UI_THEMES.forEach(themeId => {
      const meta = THEME_META[themeId];
      expect(meta).toBeDefined();
      expect(meta.labelKey).toMatch(/^profile\.settings\.appearance\./);
      expect(meta.swatch).toHaveLength(3);
    });
  });

  describe("isUiTheme", () => {
    it("accepts every known theme id", () => {
      UI_THEMES.forEach(themeId => expect(isUiTheme(themeId)).toBe(true));
    });

    it("rejects unknown, legacy, or non-string values", () => {
      // Legacy colour-theme ids are no longer valid ids (they normalise instead).
      expect(isUiTheme("daylight")).toBe(false);
      expect(isUiTheme("dark")).toBe(false);
      expect(isUiTheme("")).toBe(false);
      expect(isUiTheme(undefined)).toBe(false);
      expect(isUiTheme(null)).toBe(false);
      expect(isUiTheme(123)).toBe(false);
    });
  });

  describe("normalizeUiTheme", () => {
    it("passes through valid theme ids", () => {
      expect(normalizeUiTheme("claude")).toBe("claude");
      expect(normalizeUiTheme("carbon")).toBe("carbon");
      expect(normalizeUiTheme("current")).toBe("current");
    });

    it("collapses legacy colour-theme ids to current", () => {
      expect(normalizeUiTheme("daylight")).toBe("current");
      expect(normalizeUiTheme("forest")).toBe("current");
      expect(normalizeUiTheme("sunset")).toBe("current");
    });

    it("falls back to the default for anything unrecognised", () => {
      expect(normalizeUiTheme("bogus")).toBe(DEFAULT_UI_THEME);
      expect(normalizeUiTheme(undefined)).toBe(DEFAULT_UI_THEME);
      expect(normalizeUiTheme(null)).toBe(DEFAULT_UI_THEME);
      expect(normalizeUiTheme(42)).toBe(DEFAULT_UI_THEME);
    });
  });
});
