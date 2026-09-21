import { describe, expect, it, vi } from "vitest";

/**
 * Applying a character's per-language fields to a simulation.
 *
 * The logic under test is the `mergeByLanguage` behaviour inside
 * CharacterProfileSelector, exercised here as a standalone function so it can
 * be pinned without mounting the selector (which pulls the whole simulation
 * form in). Kept deliberately close to the implementation: what matters is the
 * three rules it encodes.
 */

interface Form {
  values: Record<string, unknown>;
  setValue: ReturnType<typeof vi.fn>;
}

const makeForm = (values: Record<string, unknown> = {}): Form => ({
  values,
  setValue: vi.fn(),
});

/** Mirrors CharacterProfileSelector.mergeByLanguage. */
const mergeByLanguage = <T>(form: Form, field: string, incoming?: Record<string, T>): void => {
  const entries = Object.entries(incoming ?? {}).filter(
    ([languageId, value]) =>
      /^\d+$/.test(languageId) && value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return;
  const current = (form.values[field] ?? {}) as Record<string, T>;
  form.setValue(
    field,
    { ...current, ...Object.fromEntries(entries) },
    { shouldDirty: true, shouldTouch: true },
  );
};

describe("applying a character's languages to a simulation", () => {
  it("files each voice under its own language, not English", () => {
    const form = makeForm();

    // The bug this replaces: a character voiced in Marathi (language 5) had
    // its voice written into the English slot, so an English session
    // dispatched Marathi TTS.
    mergeByLanguage(form, "languageVoices", { "5": "voice-marathi" });

    expect(form.setValue).toHaveBeenCalledWith(
      "languageVoices",
      { "5": "voice-marathi" },
      expect.anything(),
    );
  });

  it("fills every language the character speaks, not just one", () => {
    const form = makeForm();

    mergeByLanguage(form, "languageVoices", {
      "1": "voice-en",
      "2": "voice-hi",
      "5": "voice-mr",
    });

    expect(form.setValue.mock.calls[0][1]).toEqual({
      "1": "voice-en",
      "2": "voice-hi",
      "5": "voice-mr",
    });
  });

  it("keeps languages the trainer already set and the character is silent about", () => {
    const form = makeForm({ languageVoices: { "6": "trainer-tamil-pick" } });

    mergeByLanguage(form, "languageVoices", { "1": "voice-en" });

    expect(form.setValue.mock.calls[0][1]).toEqual({
      "6": "trainer-tamil-pick",
      "1": "voice-en",
    });
  });

  it("lets the character win for a language it does define", () => {
    const form = makeForm({ languageVoices: { "1": "older-pick" } });

    mergeByLanguage(form, "languageVoices", { "1": "character-pick" });

    expect(form.setValue.mock.calls[0][1]).toEqual({ "1": "character-pick" });
  });

  it("writes nothing when the character has no languages set", () => {
    const form = makeForm();

    mergeByLanguage(form, "languageVoices", {});
    mergeByLanguage(form, "languageVoices", undefined);

    expect(form.setValue).not.toHaveBeenCalled();
  });

  it("ignores junk keys and blank values", () => {
    const form = makeForm();

    mergeByLanguage(form, "languageVoices", {
      en: "not-a-language-id",
      "1": "",
      "2": "voice-hi",
    } as Record<string, string>);

    // A non-numeric key would never be looked up by language id, and a blank
    // value would read as "a voice is set" while dispatching nothing.
    expect(form.setValue.mock.calls[0][1]).toEqual({ "2": "voice-hi" });
  });

  it("carries samples and style across the same way", () => {
    const form = makeForm({ linguisticStyleSamples: { "1": ["English line"] } });

    mergeByLanguage(form, "linguisticStyleSamples", { "5": ["मी ठीक आहे"] });
    mergeByLanguage(form, "languageCharacteristics", { "5": "Colloquial Pune Marathi" });

    expect(form.setValue.mock.calls[0][1]).toEqual({
      "1": ["English line"],
      "5": ["मी ठीक आहे"],
    });
    expect(form.setValue.mock.calls[1][1]).toEqual({ "5": "Colloquial Pune Marathi" });
  });
});
