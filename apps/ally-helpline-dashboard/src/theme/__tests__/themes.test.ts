import { describe, it, expect } from "vitest";

import { DEFAULT_UI_THEME, isUiTheme, THEME_META, UI_THEMES } from "../themes";

describe("themes contract", () => {
  it("exposes exactly the five expected themes", () => {
    expect(UI_THEMES).toEqual(["daylight", "midnight", "forest", "sunset", "ocean"]);
  });

  it("uses a valid default theme", () => {
    expect(UI_THEMES).toContain(DEFAULT_UI_THEME);
    expect(DEFAULT_UI_THEME).toBe("daylight");
  });

  it("has metadata (label key + 3 swatch colours) for every theme", () => {
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

    it("rejects unknown or non-string values", () => {
      expect(isUiTheme("dark")).toBe(false);
      expect(isUiTheme("")).toBe(false);
      expect(isUiTheme(undefined)).toBe(false);
      expect(isUiTheme(null)).toBe(false);
      expect(isUiTheme(123)).toBe(false);
    });
  });
});
