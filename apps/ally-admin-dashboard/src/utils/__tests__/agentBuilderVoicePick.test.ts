import { describe, expect, it } from "vitest";

import {
  describeVoicePicks,
  isGenderMatched,
  pickVoicesForLanguages,
  toCastPicks,
} from "../agentBuilderVoicePick";

const catalog = [
  {
    language_id: 1,
    label: "English (India)",
    voices: [
      { id: "en-male", name: "Abhilash", provider: "SARVAM", gender: "male", age: "adult" },
      { id: "en-female", name: "Anushka", provider: "SARVAM", gender: "female", age: "adult" },
      { id: "en-unknown", name: "Legacy", provider: "GOOGLE", gender: null, age: null },
    ],
  },
  {
    language_id: 2,
    label: "Hindi (India)",
    // Only male voices — the real local catalog looks like this.
    voices: [{ id: "hi-male", name: "Raju", provider: "ELEVENLABS", gender: "male" }],
  },
  { language_id: 5, label: "Marathi (India)", voices: [] },
];

const languages = [
  { languageId: "1", label: "English (India)", code: "en" },
  { languageId: "2", label: "Hindi (India)", code: "hi" },
  { languageId: "5", label: "Marathi (India)", code: "mr" },
];

describe("pickVoicesForLanguages", () => {
  it("prefers a voice matching the persona's gender", () => {
    const picks = pickVoicesForLanguages({
      languages: [languages[0]],
      catalog,
      personaGender: "female",
      personaAge: 34,
    });

    expect(picks).toEqual([
      {
        languageId: "1",
        languageLabel: "English (India)",
        voiceId: "en-female",
        voiceName: "Anushka",
        source: "fallback",
        genderMatched: true,
      },
    ]);
  });

  it("flags a language that has no voice of the persona's gender", () => {
    const [pick] = pickVoicesForLanguages({
      languages: [languages[1]],
      catalog,
      personaGender: "female",
    });

    expect(pick.voiceId).toBe("hi-male");
    expect(pick.genderMatched).toBe(false);
  });

  it("skips languages with no voices, and languages already mapped", () => {
    const picks = pickVoicesForLanguages({
      languages,
      catalog,
      personaGender: "female",
      existingLanguageVoices: { "1": "a-voice-the-trainer-chose" },
    });

    expect(picks.map(p => p.languageId)).toEqual(["2"]);
  });

  it("still picks when the persona has no gender", () => {
    const picks = pickVoicesForLanguages({ languages: [languages[0]], catalog });

    expect(picks).toHaveLength(1);
    expect(picks[0].genderMatched).toBe(true);
  });
});

describe("isGenderMatched", () => {
  it("treats an unrecorded voice gender as unknown, not a mismatch", () => {
    expect(isGenderMatched("", "female")).toBe(true);
    expect(isGenderMatched(null, "female")).toBe(true);
    expect(isGenderMatched("male", "female")).toBe(false);
    expect(isGenderMatched("Female", "female")).toBe(true);
    expect(isGenderMatched("male", "")).toBe(true);
  });
});

describe("toCastPicks", () => {
  it("marks server-cast voices as cast and resolves the gender match", () => {
    const picks = toCastPicks(
      [
        {
          languageId: "2",
          languageLabel: "Hindi (India)",
          voiceId: "hi-male",
          voiceName: "Raju",
          voiceGender: "male",
        },
      ],
      "female",
    );

    expect(picks).toEqual([
      {
        languageId: "2",
        languageLabel: "Hindi (India)",
        voiceId: "hi-male",
        voiceName: "Raju",
        source: "cast",
        genderMatched: false,
      },
    ]);
  });
});

describe("describeVoicePicks", () => {
  it("names each voice and calls out mismatches and fallbacks", () => {
    const summary = describeVoicePicks(
      [
        {
          languageId: "1",
          languageLabel: "English (India)",
          voiceId: "en-female",
          voiceName: "Anushka",
          source: "cast",
          genderMatched: true,
        },
        {
          languageId: "2",
          languageLabel: "Hindi (India)",
          voiceId: "hi-male",
          voiceName: "Raju",
          source: "fallback",
          genderMatched: false,
        },
      ],
      "female",
    );

    expect(summary).toBe(
      "English (India) → Anushka, Hindi (India) → Raju (no female voice, default pick)",
    );
  });
});
