import { describe, it, expect } from "vitest";

import en from "../locales/en.json";
import hi from "../locales/hi.json";
import kn from "../locales/kn.json";
import mr from "../locales/mr.json";
import ta from "../locales/ta.json";

const getKeys = (obj: object, prefix = ""): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      return newKey;
    }
    if (typeof value === "object" && value !== null) {
      return getKeys(value, newKey);
    }
    return [];
  });
};

describe("locales", () => {
  const enKeys = new Set(getKeys(en));
  const locales = { hi, kn, mr, ta };

  it("should have the same keys as en.json", () => {
    Object.entries(locales).forEach(([lang, locale]) => {
      const localeKeys = new Set(getKeys(locale));
      const missingKeys = [...enKeys].filter(key => !localeKeys.has(key));
      const extraKeys = [...localeKeys].filter(key => !enKeys.has(key));
      expect(missingKeys, `Missing keys in ${lang}.json`).toEqual([]);
      expect(extraKeys, `Extra keys in ${lang}.json`).toEqual([]);
    });
  });
});
