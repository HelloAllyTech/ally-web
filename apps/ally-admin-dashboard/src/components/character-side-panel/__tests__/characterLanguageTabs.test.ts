import { describe, expect, it } from "vitest";

/**
 * Which language tabs a character's panel shows.
 *
 * Mirrors the tab construction in CharacterSidePanel. The rule worth pinning
 * is the second one: a language the catalog no longer offers still gets a tab
 * when the character holds content for it. Driving the tabs purely off the
 * live catalog hid real production data — a character voiced in Malayalam kept
 * its voice, style note and eight sample lines while Malayalam was not an
 * enabled language, and nothing rendered any of it.
 */

interface Catalog {
  language_id: number;
  label?: string;
  voices?: Array<{ id: string }>;
}

const buildTabs = (
  catalog: Catalog[],
  character: {
    voices?: Record<string, string>;
    languageCharacteristics?: Record<string, string>;
    linguisticStyleSamples?: Record<string, string[]>;
  },
  voiceById: Map<string, { name?: string; languageLabel?: string }> = new Map(),
) => {
  const fromCatalog = catalog.map(language => ({
    id: String(language.language_id),
    label: language.label ?? `Language ${language.language_id}`,
    retired: false,
  }));

  const stored = new Set<string>();
  for (const map of [
    character.voices,
    character.languageCharacteristics,
    character.linguisticStyleSamples,
  ]) {
    Object.keys(map ?? {}).forEach(id => stored.add(id));
  }

  const known = new Set(fromCatalog.map(t => t.id));
  const retired = [...stored]
    .filter(id => !known.has(id))
    .map(id => ({
      id,
      label: voiceById.get((character.voices ?? {})[id])?.languageLabel ?? `Language ${id}`,
      retired: true,
    }));

  return [...fromCatalog, ...retired].sort((a, b) => Number(a.id) - Number(b.id));
};

const prodCatalog: Catalog[] = [
  { language_id: 1, label: "English (India)" },
  { language_id: 2, label: "Hindi (India)" },
  { language_id: 5, label: "Marathi (India)" },
];

describe("character language tabs", () => {
  it("shows the enabled languages", () => {
    const tabs = buildTabs(prodCatalog, {});
    expect(tabs.map(t => t.label)).toEqual(["English (India)", "Hindi (India)", "Marathi (India)"]);
  });

  it("keeps a tab for a language the catalog no longer offers", () => {
    // Mohan in production: a Malayalam (9) voice, while Malayalam is not an
    // enabled language. Without this his content is unreachable.
    const tabs = buildTabs(
      prodCatalog,
      {
        voices: { "9": "voice-ml" },
        languageCharacteristics: { "9": "Rural Kerala Malayalam" },
        linguisticStyleSamples: { "9": ["…"] },
      },
      new Map([["voice-ml", { name: "Malayalam - Anand", languageLabel: "Malayalam (India)" }]]),
    );

    const retired = tabs.find(t => t.id === "9");
    expect(retired).toBeDefined();
    expect(retired?.retired).toBe(true);
    // Named from the stored voice, the only place the language's name survives.
    expect(retired?.label).toBe("Malayalam (India)");
  });

  it("falls back to the id when even the voice cannot name the language", () => {
    const tabs = buildTabs(prodCatalog, { linguisticStyleSamples: { "11": ["…"] } });
    expect(tabs.find(t => t.id === "11")?.label).toBe("Language 11");
  });

  it("adds no tab for a language the character is silent about", () => {
    const tabs = buildTabs(prodCatalog, { voices: { "1": "voice-en" } });
    expect(tabs).toHaveLength(3);
    expect(tabs.every(t => !t.retired)).toBe(true);
  });

  it("keeps tabs in language-id order so a retired one is not stranded last", () => {
    const tabs = buildTabs(prodCatalog, { voices: { "4": "voice-te" } });
    expect(tabs.map(t => t.id)).toEqual(["1", "2", "4", "5"]);
  });
});
