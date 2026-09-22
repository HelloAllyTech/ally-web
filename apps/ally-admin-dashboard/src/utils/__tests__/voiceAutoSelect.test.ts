import { describe, expect, it } from "vitest";

import {
  autoSelectLanguageVoices,
  pickVoiceForLanguage,
  resolveAutoCast,
  voiceAgeDistance,
} from "../voiceAutoSelect";

const englishVoices = [
  { id: "en-young-f", name: "Anushka", provider: "SARVAM", gender: "female", age: "young adult" },
  { id: "en-senior-f", name: "Kamala", provider: "GOOGLE", gender: "female", age: "senior" },
  { id: "en-adult-m", name: "Abhilash", provider: "DEEPGRAM", gender: "male", age: "adult" },
];

describe("pickVoiceForLanguage", () => {
  it("matches the persona's gender before anything else", () => {
    const selection = pickVoiceForLanguage(englishVoices, { gender: "male", age: 24 });
    // Age says young adult, but no male voice is one — gender wins.
    expect(selection?.voice.id).toBe("en-adult-m");
    expect(selection?.genderMatched).toBe(true);
    expect(selection?.ageMatched).toBe(false);
  });

  it("ranks age above provider, unlike the dropdown's own order", () => {
    // Alphabetically GOOGLE precedes SARVAM, which is what the grouped picker
    // sorts on — the persona's age has to override that.
    const selection = pickVoiceForLanguage(englishVoices, { gender: "female", age: 27 });
    expect(selection?.voice.id).toBe("en-young-f");
    expect(selection?.ageMatched).toBe(true);
  });

  it("picks the nearer band when no voice matches the persona's age", () => {
    const voices = [
      { id: "child", name: "A", provider: "GOOGLE", gender: "female", age: "child" },
      { id: "adult", name: "B", provider: "GOOGLE", gender: "female", age: "adult" },
    ];
    expect(pickVoiceForLanguage(voices, { gender: "female", age: 70 })?.voice.id).toBe("adult");
  });

  it("prefers an untagged voice over one two bands out", () => {
    const voices = [
      { id: "child", name: "A", provider: "GOOGLE", gender: "female", age: "child" },
      { id: "untagged", name: "B", provider: "GOOGLE", gender: "female", age: null },
    ];
    expect(pickVoiceForLanguage(voices, { gender: "female", age: 45 })?.voice.id).toBe("untagged");
  });

  it("still voices a language that has nothing of the persona's gender", () => {
    const voices = [{ id: "hi-male", name: "Raju", provider: "ELEVENLABS", gender: "male" }];
    const selection = pickVoiceForLanguage(voices, { gender: "female", age: 30 });
    expect(selection?.voice.id).toBe("hi-male");
    expect(selection?.genderMatched).toBe(false);
  });

  it("is stable when the persona says nothing", () => {
    const selection = pickVoiceForLanguage(englishVoices, {});
    // DEEPGRAM sorts first once nothing else distinguishes the voices.
    expect(selection?.voice.id).toBe("en-adult-m");
    expect(selection?.genderMatched).toBe(true);
    expect(selection?.ageMatched).toBe(true);
  });

  it("returns null for a language with no voices", () => {
    expect(pickVoiceForLanguage([], { gender: "female" })).toBeNull();
  });
});

describe("voiceAgeDistance", () => {
  it("treats an unknown persona age as no preference", () => {
    expect(voiceAgeDistance("child", null)).toBe(0);
  });

  it("accepts a band on either side", () => {
    expect(voiceAgeDistance("senior", "senior")).toBe(0);
    expect(voiceAgeDistance("adult", 70)).toBe(1);
  });
});

describe("autoSelectLanguageVoices", () => {
  const languages = [
    { language_id: 1, label: "English (India)", voices: englishVoices },
    {
      language_id: 2,
      label: "Hindi (India)",
      voices: [{ id: "hi-male", name: "Raju", provider: "ELEVENLABS", gender: "male" }],
    },
    { language_id: 5, label: "Marathi (India)", voices: [] },
  ];

  it("casts every language that has voices, and reports what it could not match", () => {
    const picks = autoSelectLanguageVoices({
      languages,
      persona: { gender: "female", age: 27 },
    });

    expect(picks.map(pick => [pick.languageId, pick.voiceId])).toEqual([
      ["1", "en-young-f"],
      ["2", "hi-male"],
    ]);
    expect(picks.find(pick => pick.languageId === "2")?.genderMatched).toBe(false);
  });

  it("never overwrites a voice that is already chosen", () => {
    const picks = autoSelectLanguageVoices({
      languages,
      persona: { gender: "female", age: 27 },
      existing: { "1": "en-senior-f" },
    });
    expect(picks.map(pick => pick.languageId)).toEqual(["2"]);
  });
});

describe("resolveAutoCast", () => {
  const languages = [
    { language_id: 1, label: "English (India)", voices: englishVoices },
    {
      language_id: 2,
      label: "Hindi (India)",
      voices: [{ id: "hi-male", name: "Raju", provider: "ELEVENLABS", gender: "male" }],
    },
  ];
  const persona = { gender: "female" as const, age: 27 };
  const noneCast = {};
  const nothingDismissed = new Set<string>();

  it("casts every language for a simulation that has none", () => {
    const cast = resolveAutoCast({
      languages,
      current: {},
      alreadyCast: noneCast,
      dismissed: nothingDismissed,
      persona,
    });
    expect(cast?.next).toEqual({ "1": "en-young-f", "2": "hi-male" });
  });

  it("stops once its own cast is in place, so it cannot re-enter", () => {
    const next = { "1": "en-young-f", "2": "hi-male" };
    expect(
      resolveAutoCast({
        languages,
        current: next,
        alreadyCast: next,
        dismissed: nothingDismissed,
        persona,
      }),
    ).toBeNull();
  });

  it("re-casts when the persona changes", () => {
    const next = { "1": "en-young-f", "2": "hi-male" };
    const cast = resolveAutoCast({
      languages,
      current: next,
      alreadyCast: next,
      dismissed: nothingDismissed,
      persona: { gender: "female", age: 68 },
    });
    expect(cast?.next["1"]).toBe("en-senior-f");
  });

  it("leaves a saved simulation's own mapping alone, gaps included", () => {
    // Hindi is absent on purpose — the author removed it before saving.
    expect(
      resolveAutoCast({
        languages,
        current: { "1": "en-senior-f" },
        alreadyCast: noneCast,
        dismissed: nothingDismissed,
        persona,
      }),
    ).toBeNull();
  });

  it("stands down as soon as the author changes one of its picks", () => {
    const cast = { "1": "en-young-f", "2": "hi-male" };
    expect(
      resolveAutoCast({
        languages,
        current: { ...cast, "1": "en-senior-f" },
        alreadyCast: cast,
        dismissed: nothingDismissed,
        persona,
      }),
    ).toBeNull();
  });

  it("does not put back a language the author removed", () => {
    const cast = { "1": "en-young-f", "2": "hi-male" };
    expect(
      resolveAutoCast({
        languages,
        current: { "1": "en-young-f" },
        alreadyCast: cast,
        dismissed: new Set(["2"]),
        persona,
      }),
    ).toBeNull();
  });
});
