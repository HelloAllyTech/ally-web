import { describe, expect, it } from "vitest";

import i18n from "../../../i18n";
import { en, hi, kn, mr, ta } from "../../../i18n/locales";

const leafKeys = (node: unknown, path = ""): string[] =>
  node !== null && typeof node === "object"
    ? Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        leafKeys(value, path ? `${path}.${key}` : key),
      )
    : [path];

describe("text helpline translations", () => {
  it.each(Object.entries({ hi, mr, ta, kn }))(
    "%s carries every helpline key English has",
    (_lang, resource) => {
      for (const section of ["helplineTalker", "helplineWorkspace"] as const) {
        expect(leafKeys((resource as any)[section], section)).toEqual(
          leafKeys((en as any)[section], section),
        );
      }
      expect((resource as any).nav.tabs.helpline).toBeTruthy();
    },
  );

  it("says the queue position as an ordinal where the language has one", () => {
    const position = (lang: string, count: number) =>
      i18n.getFixedT(lang)("helplineTalker.waiting.position", { count, ordinal: true });

    expect(position("en", 2)).toBe("You're 2nd in line");
    expect(position("en", 3)).toBe("You're 3rd in line");
    expect(position("en", 11)).toBe("You're 11th in line");
    expect(position("en", 22)).toBe("You're 22nd in line");
    expect(position("mr", 3)).toBe("रांगेत तुमचा 3रा नंबर आहे");
    expect(position("mr", 4)).toBe("रांगेत तुमचा 4था नंबर आहे");
    expect(position("mr", 7)).toBe("रांगेत तुमचा 7वा नंबर आहे");
    expect(position("hi", 6)).toBe("लाइन में आपका नंबर 6 है");
  });
});
