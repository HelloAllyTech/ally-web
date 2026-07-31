import { describe, it, expect } from "vitest";

import {
  TtsProvider,
  buildGroupedVoiceOptions,
  getUnknownConfigKeys,
  getVoiceGenderLabel,
  getVoiceGroupLabel,
  isMissingGender,
  isSupportedProvider,
  readConfigField,
  summarizeVoiceConfig,
  validateVoiceConfig,
} from "../voiceProviders";

describe("isSupportedProvider", () => {
  it("accepts the providers the runtime can dispatch to, any casing", () => {
    expect(isSupportedProvider("SARVAM")).toBe(true);
    expect(isSupportedProvider("sarvam")).toBe(true);
    expect(isSupportedProvider(TtsProvider.HUME)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSupportedProvider("OPENAI")).toBe(false);
    expect(isSupportedProvider("")).toBe(false);
    expect(isSupportedProvider(undefined)).toBe(false);
  });
});

describe("validateVoiceConfig", () => {
  // Mirrors ally-be's voice-config-schema.util.spec.ts — the two must agree or
  // the form will let through a payload the API rejects.
  it("does not require gender — the form warns instead of blocking", () => {
    expect(validateVoiceConfig(TtsProvider.GOOGLE, {})).toEqual([]);
    expect(
      validateVoiceConfig(TtsProvider.SARVAM, { model: "bulbul:v2", speaker: "abhilash" }),
    ).toEqual([]);
  });

  it("does not let a missing gender mask a missing required field", () => {
    expect(validateVoiceConfig(TtsProvider.SARVAM, {})).toEqual([
      "Model is required.",
      "Speaker is required.",
    ]);
  });

  it("requires each provider's own fields", () => {
    expect(validateVoiceConfig(TtsProvider.SARVAM, { gender: "male" })).toEqual([
      "Model is required.",
      "Speaker is required.",
    ]);
    expect(validateVoiceConfig(TtsProvider.HUME, { gender: "male" })).toEqual([
      "Voice name is required.",
    ]);
    expect(validateVoiceConfig(TtsProvider.DEEPGRAM, { gender: "male" })).toEqual([
      "Model is required.",
    ]);
  });

  it("requires nothing beyond gender for Google", () => {
    expect(validateVoiceConfig(TtsProvider.GOOGLE, { gender: "female" })).toEqual([]);
  });

  it("accepts the legacy voiceId spelling for ElevenLabs", () => {
    expect(
      validateVoiceConfig(TtsProvider.ELEVENLABS, {
        gender: "female",
        model: "eleven_turbo_v2_5",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
      }),
    ).toEqual([]);
  });

  it("flags an unsupported provider", () => {
    expect(validateVoiceConfig("OPENAI", { gender: "male" })[0]).toContain(
      'Unsupported voice provider "OPENAI"',
    );
  });

  it("constrains enum-valued fields", () => {
    expect(validateVoiceConfig(TtsProvider.GOOGLE, { gender: "woman" })).toEqual([
      "Gender must be one of: Male, Female, Non-binary.",
    ]);
  });

  it("tolerates keys the schema does not describe", () => {
    expect(
      validateVoiceConfig(TtsProvider.GOOGLE, {
        gender: "female",
        voice_name: "en-IN-Chirp3-HD-Achernar",
        languageCode: "en-IN",
      }),
    ).toEqual([]);
  });
});

describe("readConfigField", () => {
  it("falls back to a legacy alias", () => {
    const field = { key: "voice_id", label: "Voice ID", required: true, aliases: ["voiceId"] };
    expect(readConfigField({ voiceId: "abc" }, field as any)).toBe("abc");
    expect(readConfigField({ voice_id: "xyz", voiceId: "abc" }, field as any)).toBe("xyz");
  });

  it("treats an empty string as absent", () => {
    const field = { key: "model", label: "Model", required: true, type: "string" as const };
    expect(readConfigField({ model: "" }, field as any)).toBeUndefined();
  });
});

describe("getUnknownConfigKeys", () => {
  it("lists only keys the provider's schema does not cover", () => {
    expect(
      getUnknownConfigKeys(TtsProvider.GOOGLE, {
        gender: "female",
        voice_name: "x",
        languageCode: "en-IN",
      }),
    ).toEqual(["languageCode"]);
  });

  it("does not treat a legacy alias as unknown", () => {
    expect(
      getUnknownConfigKeys(TtsProvider.ELEVENLABS, { gender: "female", voiceId: "abc" }),
    ).toEqual([]);
  });
});

describe("summarizeVoiceConfig", () => {
  it("summarises the provider's own fields, leaving gender to its own column", () => {
    expect(
      summarizeVoiceConfig(TtsProvider.SARVAM, {
        gender: "male",
        model: "bulbul:v2",
        speaker: "abhilash",
      }),
    ).toBe("Model: bulbul:v2 · Speaker: abhilash");
  });

  it("falls back to a dash when there is nothing to show", () => {
    expect(summarizeVoiceConfig(TtsProvider.GOOGLE, { gender: "female" })).toBe("—");
  });
});

describe("isMissingGender", () => {
  it("flags a config with no usable gender", () => {
    expect(isMissingGender(undefined)).toBe(true);
    expect(isMissingGender({})).toBe(true);
    expect(isMissingGender({ gender: "" })).toBe(true);
    expect(isMissingGender({ gender: "   " })).toBe(true);
  });

  it("passes a config that has one", () => {
    expect(isMissingGender({ gender: "male" })).toBe(false);
  });
});

describe("getVoiceGenderLabel", () => {
  it("names a missing gender rather than hiding it", () => {
    expect(getVoiceGenderLabel(null)).toBe("Unspecified gender");
    expect(getVoiceGenderLabel("")).toBe("Unspecified gender");
  });

  it("titles the known values", () => {
    expect(getVoiceGenderLabel("female")).toBe("Female");
    expect(getVoiceGenderLabel("NON-BINARY")).toBe("Non-binary");
  });
});

describe("getVoiceGroupLabel", () => {
  it("joins provider and gender", () => {
    expect(getVoiceGroupLabel("SARVAM", "male")).toBe("Sarvam · Male");
    expect(getVoiceGroupLabel("GOOGLE", null)).toBe("Google · Unspecified gender");
  });
});

describe("buildGroupedVoiceOptions", () => {
  const voices = [
    { id: "s-male", name: "Abhilash", provider: "SARVAM", gender: "male", age: "adult" },
    { id: "g-none", name: "Leda", provider: "GOOGLE", gender: null },
    { id: "g-female", name: "Achernar", provider: "GOOGLE", gender: "female" },
    { id: "s-female", name: "Anushka", provider: "SARVAM", gender: "female" },
    { id: "g-male", name: "Puck", provider: "GOOGLE", gender: "male" },
  ];

  it("orders by provider, then gender, then name", () => {
    expect(buildGroupedVoiceOptions(voices).map(o => o.value)).toEqual([
      "g-female",
      "g-male",
      "g-none",
      "s-female",
      "s-male",
    ]);
  });

  it("puts a gender-less voice in its own group rather than an adjacent one", () => {
    const groups = buildGroupedVoiceOptions(voices).map(o => o.groupLabel);

    expect(groups).toEqual([
      "Google · Female",
      "Google · Male",
      "Google · Unspecified gender",
      "Sarvam · Female",
      "Sarvam · Male",
    ]);
  });

  it("keeps each group's members adjacent, which is what the header logic needs", () => {
    const groups = buildGroupedVoiceOptions([
      ...voices,
      { id: "g-female-2", name: "Kore", provider: "GOOGLE", gender: "female" },
    ]).map(o => o.groupLabel);

    const firstIndexes = groups.map(g => groups.indexOf(g));
    const runsAreContiguous = groups.every(
      (g, i) => i === 0 || g === groups[i - 1] || firstIndexes[i] === i,
    );
    expect(runsAreContiguous).toBe(true);
  });

  it("appends age to the label when the voice has one", () => {
    const [abhilash] = buildGroupedVoiceOptions([voices[0]]);
    expect(abhilash.label).toBe("Abhilash · adult");
  });

  it("handles an empty list", () => {
    expect(buildGroupedVoiceOptions([])).toEqual([]);
    expect(buildGroupedVoiceOptions()).toEqual([]);
  });
});
