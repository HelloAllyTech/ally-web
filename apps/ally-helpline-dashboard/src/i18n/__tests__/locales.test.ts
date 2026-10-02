import { describe, expect, it } from "vitest";

import { en, hi, kn, mr, ta } from "../locales";

/**
 * The locale files are shipped as-is, so a bad value is a bad screen.
 *
 * On 2026-10-01 a fix ran `npm run i18n:sync` without the translate argument,
 * which writes "" for every key the target language lacks. i18next shows ""
 * as a translation, so about 385 strings per language went blank in Hindi,
 * Marathi, Kannada and Tamil, where they had been falling back to English.
 * Nothing caught it because nothing looked at the values. This does.
 */
const leaves = (node: unknown, path = ""): Array<[string, unknown]> => {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      leaves(value, path ? `${path}.${key}` : key),
    );
  }
  if (Array.isArray(node)) {
    return node.flatMap((value, index) => leaves(value, `${path}[${index}]`));
  }
  return [[path, node]];
};

const LOCALES = { en, hi, mr, kn, ta } as const;

describe("locale files", () => {
  it.each(Object.entries(LOCALES))("%s has no blank translation values", (_lang, resource) => {
    const blanks = leaves(resource)
      .filter(([, value]) => typeof value === "string" && value.trim() === "")
      .map(([path]) => path);
    expect(blanks).toEqual([]);
  });

  it.each(Object.entries(LOCALES))("%s has only string leaves", (_lang, resource) => {
    const nonStrings = leaves(resource)
      .filter(([, value]) => typeof value !== "string")
      .map(([path]) => path);
    expect(nonStrings).toEqual([]);
  });
});
