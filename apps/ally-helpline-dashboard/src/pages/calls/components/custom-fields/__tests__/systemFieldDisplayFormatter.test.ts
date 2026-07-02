import { describe, expect, it } from "vitest";

import {
  formatSystemFieldDisplayValue,
  isLocaleFormattedSeedKey,
} from "../systemFieldDisplayFormatter";

// Mimics real i18next pluralized interpolation, where the count is embedded
// in the resolved string itself (see en.json's "minutes_other": "{{count}}
// minutes") — a plain `(key) => key` stub would hide a caller that also
// prepends the count itself, producing a duplicate like "10 10 minutes".
const t = ((key: string, options?: { count?: number }) => {
  const templates: Record<string, string> = {
    "common.minutes_one": "{{count}} minute",
    "common.minutes_other": "{{count}} minutes",
  };
  const template = templates[key] ?? key;
  return options?.count !== undefined
    ? template.replace("{{count}}", String(options.count))
    : template;
}) as any;

describe("systemFieldDisplayFormatter", () => {
  describe("isLocaleFormattedSeedKey", () => {
    it("is true for exactly the 4 locale-sensitive SYSTEM seedKeys", () => {
      expect(isLocaleFormattedSeedKey("callDuration")).toBe(true);
      expect(isLocaleFormattedSeedKey("callDate")).toBe(true);
      expect(isLocaleFormattedSeedKey("callTime")).toBe(true);
      expect(isLocaleFormattedSeedKey("listeningShare")).toBe(true);
    });

    it("is false for other seedKeys and null/undefined", () => {
      expect(isLocaleFormattedSeedKey("callId")).toBe(false);
      expect(isLocaleFormattedSeedKey(null)).toBe(false);
      expect(isLocaleFormattedSeedKey(undefined)).toBe(false);
    });
  });

  describe("formatSystemFieldDisplayValue", () => {
    it("formats callDuration as minutes without duplicating the count", () => {
      // The formatter always resolves the "_other" key (matching the
      // pre-existing hardcoded field's exact behavior) rather than doing
      // real one/other pluralization, so even a count of 1 renders "minutes".
      expect(formatSystemFieldDisplayValue("callDuration", "600", t)).toBe("10 minutes");
      expect(formatSystemFieldDisplayValue("callDuration", "60", t)).toBe("1 minutes");
      expect(formatSystemFieldDisplayValue("callDuration", "0", t)).toBe("0 minutes");
    });

    it("returns the raw value for callDuration when non-numeric", () => {
      expect(formatSystemFieldDisplayValue("callDuration", "not-a-number", t)).toBe("not-a-number");
    });

    it("formats callTime by splitting the start|end pair", () => {
      const result = formatSystemFieldDisplayValue(
        "callTime",
        "2024-03-05T10:00:00.000Z|2024-03-05T11:00:00.000Z",
        t,
      );
      expect(result).toContain(" - ");
    });

    it("formats listeningShare as a percentage without rounding", () => {
      expect(formatSystemFieldDisplayValue("listeningShare", "0.5", t)).toBe("50%");
    });

    it("returns the raw value unchanged for seedKeys with no override", () => {
      expect(formatSystemFieldDisplayValue("callId", "42", t)).toBe("42");
    });
  });
});
