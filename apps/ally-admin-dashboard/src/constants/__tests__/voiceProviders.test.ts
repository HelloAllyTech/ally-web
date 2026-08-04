import { describe, it, expect } from "vitest";

import {
  TtsProvider,
  TTS_CATALOG_FIELD_KEY,
  VOICE_CONFIG_SCHEMA,
  buildGroupedVoiceOptions,
  getUnknownConfigKeys,
  getVoiceGenderLabel,
  getVoiceGroupLabel,
  getElevenLabsV3Warning,
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

  it("flags an unsupported provider, listing supported ones with clean labels", () => {
    const [message] = validateVoiceConfig("OPENAI", { gender: "male" });
    expect(message).toContain('Unsupported voice provider "OPENAI"');
    // Not raw enum values (DEEPGRAM, ELEVENLABS, ...) — those read as
    // shouting and unpolished next to the rest of the studio's copy.
    expect(message).toContain("Deepgram");
    expect(message).not.toContain("DEEPGRAM");
  });

  it("says nothing about a not-yet-chosen provider — that's a normal state, not an invalid one", () => {
    // A brand-new voice has provider === "" until someone picks one. The
    // panel already shows "Pick a provider to configure this voice." and
    // disables Save for it — repeating that here as `Unsupported voice
    // provider ""` read as if an invalid choice had been made.
    expect(validateVoiceConfig("", { gender: "male" })).toEqual([]);
    expect(validateVoiceConfig(undefined, undefined)).toEqual([]);
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

describe("TTS_CATALOG_FIELD_KEY", () => {
  // Guards against drift: if a provider's schema ever renames its catalog
  // field, this constant has to be updated in the same change, or the
  // picker silently stops appearing for that provider.
  it("names a real field in that provider's own schema", () => {
    for (const [provider, key] of Object.entries(TTS_CATALOG_FIELD_KEY)) {
      const schema = VOICE_CONFIG_SCHEMA[provider as TtsProvider];
      expect(schema.some(field => field.key === key)).toBe(true);
    }
  });

  // Sarvam has no real listing endpoint — only an unofficial trick of
  // scraping speaker names out of a deliberately-triggered validation
  // error — so it deliberately has no catalog field, and its Model/Speaker
  // fields stay free text.
  it("has no entry for a provider with no real catalog endpoint", () => {
    expect(TTS_CATALOG_FIELD_KEY[TtsProvider.SARVAM]).toBeUndefined();
  });
});

/**
 * Ported from ally-be, which owned an identical copy of this rule until it was
 * found to be dead — it populated a `warning` field on the sync response that
 * nothing rendered, and had already drifted from this one. The implementation
 * stays here because the advisory must appear the instant an admin flips the
 * Model dropdown, and must work off a persisted `voice_type` for a voice nobody
 * has re-synced — neither of which survives a round-trip. These tests came with
 * it: they were the only guard on the wording, and this file had none.
 */
describe("getElevenLabsV3Warning", () => {
  const config = (model: string, voiceType?: string | null) => ({
    model,
    ...(voiceType === undefined ? {} : { voice_type: voiceType }),
  });

  // Warning, not error: a same-voice A/B of the fine-tuned v2 render against
  // the v3 fallback was perceptually identical, so blocking the save would
  // discard deliberate work on no evidence of harm. States the mechanism
  // without prescribing a model — v3 genuinely renders these voices (measured),
  // so recommending v2 would overstate the evidence.
  it("warns for a PVC on v3, naming the consequence but not prescribing", () => {
    const w = getElevenLabsV3Warning("ELEVENLABS", config("eleven_v3", "pvc"));
    expect(w).toMatch(/custom-trained from real recordings/i);
    expect(w).toMatch(/will still speak/i);
    expect(w).toMatch(/not sound as close to the original person/i);
    expect(w).toMatch(/listen to it/i);
    // Must not claim v3 cannot render it — it can, and does.
    expect(w).not.toMatch(/cannot use this voice/i);
  });

  it("warns when the type is unrecorded, since silence is how this went unnoticed", () => {
    for (const type of [null, "", undefined]) {
      const w = getElevenLabsV3Warning("ELEVENLABS", config("eleven_v3", type));
      expect(w).toMatch(/do not know how this voice was created/i);
      // Must name the action that resolves it, as the panel labels it, or the
      // reader goes looking for a button that isn't there.
      expect(w).toMatch(/Re-check with ElevenLabs/i);
    }
  });

  it("warns for an ambiguous category rather than assuming", () => {
    expect(getElevenLabsV3Warning("ELEVENLABS", config("eleven_v3", "unknown"))).toMatch(
      /did not tell us how this voice was created/i,
    );
  });

  // These strings are read by studio users configuring a voice, who cannot act
  // on our vocabulary. Guarding the whole set rather than one message, because
  // the jargon crept in one message at a time.
  it.each(["pvc", "unknown", null])("keeps internal vocabulary out of the %s message", type => {
    const w = getElevenLabsV3Warning("ELEVENLABS", config("eleven_v3", type)) ?? "";
    expect(w).not.toMatch(/\bPVC\b|\bIVC\b/);
    expect(w).not.toMatch(/fine-tun/i);
    expect(w).not.toMatch(/\brender/i);
    // "the v3 model" is fine; raw model ids are not.
    expect(w).not.toMatch(/eleven_/);
  });

  it.each(["ivc", "voice_design", "premade"])("stays silent for %s on v3", type => {
    expect(getElevenLabsV3Warning("ELEVENLABS", config("eleven_v3", type))).toBeNull();
  });

  // A PVC on v2 is the correct, fine-tuned configuration — nothing to say.
  it("stays silent for any voice type on a v2 model", () => {
    expect(
      getElevenLabsV3Warning("ELEVENLABS", config("eleven_multilingual_v2", "pvc")),
    ).toBeNull();
    expect(getElevenLabsV3Warning("ELEVENLABS", config("eleven_flash_v2_5", null))).toBeNull();
  });

  // Only ElevenLabs has a v3, so no other provider's config can trigger this —
  // a stray "v3" in another provider's model string must not produce advice
  // about a model that provider does not have.
  it("says nothing for a non-ElevenLabs provider", () => {
    expect(getElevenLabsV3Warning("GOOGLE", config("some-v3-voice", "pvc"))).toBeNull();
    expect(getElevenLabsV3Warning(undefined, config("eleven_v3", "pvc"))).toBeNull();
  });
});

/**
 * ElevenLabs say v3 "doesn't YET support Professional Voice Clones". When that
 * changes, ally-be's per-voice verdict changes with it — and this advisory has
 * to defer to that, or it would go on insisting the training cannot be used
 * long after that stopped being true, with nothing to reveal it.
 *
 * The verdict may only silence the warning, never raise one, so each message
 * below still chooses its own wording from voice type.
 */
describe("getElevenLabsV3Warning — deferring to ElevenLabs' own verdict", () => {
  const pvcOnV3 = { model: "eleven_v3", voice_type: "pvc" };

  it("warns for a PVC while ElevenLabs flags v3 for it", () => {
    expect(getElevenLabsV3Warning("ELEVENLABS", pvcOnV3, false)).toMatch(
      /custom-trained from real recordings/i,
    );
  });

  it("goes quiet once ElevenLabs stops objecting to v3 for that voice", () => {
    // `null` = listed as usable, or otherwise no objection.
    expect(getElevenLabsV3Warning("ELEVENLABS", pvcOnV3, null)).toBeNull();
  });

  it("goes quiet when ElevenLabs makes v3 the recommendation outright", () => {
    expect(getElevenLabsV3Warning("ELEVENLABS", pvcOnV3, true)).toBeNull();
  });

  // The advisory is the thing that caught 23 production rows, so losing it when
  // we simply have no data would be the worst outcome of the three.
  it("still warns from voice type alone when no verdict is available", () => {
    expect(getElevenLabsV3Warning("ELEVENLABS", pvcOnV3, undefined)).toMatch(
      /custom-trained from real recordings/i,
    );
    expect(getElevenLabsV3Warning("ELEVENLABS", pvcOnV3)).toMatch(
      /custom-trained from real recordings/i,
    );
  });

  it("keeps warning about an unrecorded or unclear voice type with no verdict", () => {
    expect(getElevenLabsV3Warning("ELEVENLABS", { model: "eleven_v3", voice_type: "" })).toMatch(
      /do not know how this voice was created/i,
    );
    expect(
      getElevenLabsV3Warning("ELEVENLABS", { model: "eleven_v3", voice_type: "unknown" }),
    ).toMatch(/did not tell us how this voice was created/i);
  });

  it("says nothing for a non-v3 model whatever the verdict", () => {
    expect(
      getElevenLabsV3Warning(
        "ELEVENLABS",
        { model: "eleven_multilingual_v2", voice_type: "pvc" },
        false,
      ),
    ).toBeNull();
  });
});
