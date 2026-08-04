import {
  getProviderLabelFrom,
  getProviderSchemaFields,
  ProviderConfigField,
  ProviderConfigSchema,
  readConfigField,
  validateProviderConfig,
} from "./providerConfigSchema";

/**
 * Per-provider shape of a scenario voice's `config`.
 *
 * Mirrors `VOICE_CONFIG_SCHEMA` in
 * `ally-be/src/learn/util/voice-config-schema.util.ts`, which is itself derived
 * from the `from_config()` classmethods in `ally-ai-learn/app/tts/*.py` — the
 * only consumers of the column. Keep all three in sync when a provider is added
 * or its client changes.
 *
 * Why this matters: when a required field is missing, the runtime's
 * `create_tts_client()` catches the resulting error and falls back to a default
 * Deepgram voice. The scenario still runs, just in the wrong voice — so a bad
 * config is invisible until someone listens to a call.
 */

export enum TtsProvider {
  DEEPGRAM = "DEEPGRAM",
  ELEVENLABS = "ELEVENLABS",
  SARVAM = "SARVAM",
  GOOGLE = "GOOGLE",
  HUME = "HUME",
}

export enum VoiceGender {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non-binary",
}

/**
 * Voices use the shared provider-config field shape, so the same
 * `<ProviderConfigFields>` renderer and validator serve Voices, Speech
 * Recognition and Language Model. See `providerConfigSchema.ts`.
 */
export type VoiceConfigField = ProviderConfigField;

/**
 * Gender is optional but consequential: ally-be only offers a language in
 * simulation creation when it has both a male and a female voice, and voice
 * fallback matches on this value.
 *
 * Deliberately not required — a voice dispatches fine without one and existing
 * rows must stay editable — so the form warns instead of blocking. See
 * `isMissingGender` below and the banner in ScenarioVoiceSidePanel.
 */
const GENDER_FIELD: VoiceConfigField = {
  key: "gender",
  label: "Gender",
  required: false,
  type: "select",
  options: [
    { value: VoiceGender.MALE, label: "Male" },
    { value: VoiceGender.FEMALE, label: "Female" },
    { value: VoiceGender.NON_BINARY, label: "Non-binary" },
  ],
  hint: "Groups voices in the studio picker and picks a fallback voice mid-call.",
};

/**
 * Plain-English description of a voice type, plus what it means for v3.
 *
 * The sync banner used to print `generated -> voice_design`, which is our
 * internal enum on both sides of an arrow and tells a reader nothing. What they
 * need is what the voice IS and whether they can use v3 with it.
 */
/**
 * Plain-English name for a voice type — what the voice IS, nothing more.
 *
 * Says nothing about v3 on purpose. `getElevenLabsV3Warning` is the single
 * source for that, because both this and the warning render together after a
 * sync: this used to carry a parallel `v3` verdict per type, which duplicated
 * the warning on screen and was a second list that could drift out of step
 * with V3_COMPATIBLE_VOICE_TYPES.
 */
export const VOICE_TYPE_SUMMARY: Record<string, { title: string }> = {
  pvc: { title: "Custom-trained from recordings" },
  ivc: { title: "Quick clone from a short sample" },
  voice_design: { title: "Generated with Voice Design" },
  premade: { title: "ElevenLabs stock voice" },
  unknown: { title: "How it was created is unclear" },
};

/** Voice types eleven_v3 can render from. */
const V3_COMPATIBLE_VOICE_TYPES = ["ivc", "voice_design", "premade"];

/** Whether a model string names an ElevenLabs v3 model. */
export const isElevenLabsV3Model = (model?: string | null): boolean =>
  /v3/i.test(String(model ?? ""));

/**
 * Whether v3 is a sound choice for a voice of this type — the same check
 * `getElevenLabsV3Warning` uses to decide whether to stay silent.
 *
 * Exists separately because the model picker needs this fact independent of
 * which model happens to be selected right now: a voice's per-voice
 * fine-tune list (`availableModels`) never includes v3 for ANY voice type —
 * that's a fact about how v3 works, not a per-voice signal — so it cannot
 * tell the picker whether v3 suits THIS voice. Only voice type can.
 */
export const isElevenLabsV3CompatibleVoiceType = (voiceType?: string | null): boolean =>
  V3_COMPATIBLE_VOICE_TYPES.includes(String(voiceType ?? "").trim());

/**
 * Advisory for an ElevenLabs voice whose training eleven_v3 cannot use.
 *
 * v3 does not support fine-tuned models, and a Professional clone is one — so it
 * silently renders from the first ~30-90s of training audio and still returns
 * 200. A warning rather than a blocked save: a same-voice A/B was perceptually
 * identical, so the pairing is unsupported rather than proven harmful.
 *
 * Written for a studio user, not an engineer: no "PVC", "fine-tune" or
 * "render". The reader configuring a voice cannot act on our vocabulary, only
 * on what will happen and what to do about it — which is why every message ends
 * in an instruction. An earlier draft said "eleven_v3 will not use this PVC
 * voice's fine-tuned model", which is precise and unreadable.
 */
export const getElevenLabsV3Warning = (
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string | null => {
  if (String(provider ?? "").toUpperCase() !== TtsProvider.ELEVENLABS) return null;
  if (!isElevenLabsV3Model(config?.model)) return null;

  const type = String(config?.voice_type ?? "").trim();
  if (!type) {
    return 'We do not know how this voice was created, so we cannot say how it will sound on the v3 model. Click "Sync from ElevenLabs" to check.';
  }
  if (type === "unknown") {
    return "ElevenLabs did not tell us how this voice was created. Check in the ElevenLabs workspace whether it was trained from recordings — if it was, v3 will not sound as close to the original person.";
  }
  if (!V3_COMPATIBLE_VOICE_TYPES.includes(type)) {
    return "This voice was custom-trained from real recordings. The v3 model cannot use that training — it will still speak, but it will not sound as close to the original person. Listen to it before you use it.";
  }
  return null;
};

/**
 * Whether a config has no gender set.
 *
 * Not a validation error — a warning. A language is only offered for simulation
 * creation once it has both a male and a female voice, so an unset gender
 * narrows where the voice can be used without breaking playback.
 */
export const isMissingGender = (config?: Record<string, any>): boolean =>
  !String(config?.gender ?? "").trim();

export const VOICE_CONFIG_SCHEMA: Record<TtsProvider, VoiceConfigField[]> = {
  [TtsProvider.DEEPGRAM]: [
    GENDER_FIELD,
    {
      key: "model",
      label: "Model",
      required: true,
      type: "string",
      placeholder: "aura-asteria-en",
      hint: "Deepgram voice model id.",
    },
  ],
  [TtsProvider.ELEVENLABS]: [
    GENDER_FIELD,
    // Right after Gender, ahead of Model/Voice type: for a new voice, typing
    // this is what triggers the debounced auto-lookup (keyed on this field's
    // value, regardless of render order) that fills those two fields in —
    // putting it first means it has already fired by the time an admin
    // scrolls down to them, instead of the fields it feeds coming first.
    {
      key: "voice_id",
      label: "Voice ID",
      required: true,
      aliases: ["voiceId"],
      type: "string",
      placeholder: "21m00Tcm4TlvDq8ikWAM",
      hint: "The voice's id in ElevenLabs, not its display name.",
    },
    {
      key: "model",
      label: "Model",
      required: true,
      type: "string",
      placeholder: "eleven_turbo_v2_5",
    },
    {
      key: "voice_type",
      label: "Voice type",
      required: false,
      type: "select",
      options: [
        { value: "", label: "Not recorded" },
        { value: "pvc", label: "Custom-trained from recordings" },
        { value: "ivc", label: "Quick clone from a short sample" },
        { value: "voice_design", label: "Generated with Voice Design" },
        { value: "premade", label: "ElevenLabs stock voice" },
        { value: "unknown", label: "Unclear — needs checking" },
      ],
      hint: 'Decides how this voice sounds on the v3 model. Use "Sync from ElevenLabs" to fill it in rather than guessing.',
    },
  ],
  [TtsProvider.SARVAM]: [
    GENDER_FIELD,
    {
      key: "model",
      label: "Model",
      required: true,
      type: "string",
      placeholder: "bulbul:v2",
    },
    {
      key: "speaker",
      label: "Speaker",
      required: true,
      type: "string",
      placeholder: "abhilash",
      hint: "Sarvam speaker name, lower-case.",
    },
    {
      key: "age",
      label: "Age",
      required: false,
      type: "string",
      placeholder: "adult",
    },
  ],
  [TtsProvider.GOOGLE]: [
    GENDER_FIELD,
    {
      key: "voice_name",
      label: "Voice name",
      required: false,
      type: "string",
      placeholder: "en-IN-Chirp3-HD-Achernar",
      hint: "Leave empty to let Google pick by gender and language.",
    },
    {
      key: "model_name",
      label: "Model name",
      required: false,
      type: "string",
      placeholder: "chirp_3",
      hint: "Chirp voices default to chirp_3; other names follow the plugin default.",
    },
    {
      key: "voice_cloning_key",
      label: "Voice cloning key",
      required: false,
      type: "string",
      hint: "Only for Google custom cloned voices.",
    },
  ],
  [TtsProvider.HUME]: [
    GENDER_FIELD,
    // Right after Gender, ahead of Voice name: this decides WHICH catalog
    // the Voice name picker below pulls from (Hume's own library vs a
    // custom-cloned voice) — same reasoning as ElevenLabs' Voice ID coming
    // before Model. Picking this first means Voice name already reflects the
    // right scope by the time an admin reaches it, instead of defaulting to
    // HUME_AI and needing a second look after changing this.
    {
      key: "voice_provider",
      label: "Voice source",
      required: false,
      type: "select",
      options: [
        { value: "HUME_AI", label: "Hume library (HUME_AI)" },
        { value: "CUSTOM_VOICE", label: "Custom voice (CUSTOM_VOICE)" },
      ],
    },
    {
      key: "voice_name",
      label: "Voice name",
      required: true,
      type: "string",
      placeholder: "Priya",
    },
    {
      key: "instant_mode",
      label: "Instant mode",
      required: false,
      type: "boolean",
    },
  ],
};

export const TTS_PROVIDER_OPTIONS = Object.values(TtsProvider).map(provider => ({
  value: provider,
  label: provider.charAt(0) + provider.slice(1).toLowerCase(),
}));

/**
 * Which config field a provider's account-wide catalog fills — the field
 * that becomes a picker once `getTtsCatalog` has data for this provider.
 * Absent for a provider with no real catalog endpoint (Sarvam: no listing
 * endpoint exists, only an unofficial trick of scraping speaker names out of
 * a deliberately-triggered validation error).
 */
export const TTS_CATALOG_FIELD_KEY: Partial<Record<TtsProvider, string>> = {
  [TtsProvider.ELEVENLABS]: "model",
  [TtsProvider.DEEPGRAM]: "model",
  [TtsProvider.GOOGLE]: "voice_name",
  [TtsProvider.HUME]: "voice_name",
};

/** Display label for a provider, falling back to the raw stored value. */
export const getProviderLabel = (provider?: string): string =>
  getProviderLabelFrom(TTS_PROVIDER_OPTIONS, provider);

export const isSupportedProvider = (provider?: string): boolean =>
  Object.values(TtsProvider).includes(String(provider ?? "").toUpperCase() as TtsProvider);

const GENDER_LABELS: Record<string, string> = {
  [VoiceGender.MALE]: "Male",
  [VoiceGender.FEMALE]: "Female",
  [VoiceGender.NON_BINARY]: "Non-binary",
};

/** Female first, then male, then non-binary; anything unrecognised sorts last. */
const GENDER_RANK: Record<string, number> = {
  [VoiceGender.FEMALE]: 0,
  [VoiceGender.MALE]: 1,
  [VoiceGender.NON_BINARY]: 2,
};

export const getVoiceGenderRank = (gender?: string | null): number =>
  GENDER_RANK[String(gender ?? "").toLowerCase()] ?? 3;

/**
 * Display label for a gender.
 *
 * A voice with no gender is called out as unspecified rather than folded into
 * another group — it's a real gap that needs fixing in voice management, not
 * something to hide behind a plausible-looking label.
 */
export const getVoiceGenderLabel = (gender?: string | null): string => {
  const normalized = String(gender ?? "").toLowerCase();
  if (!normalized) return "Unspecified gender";
  return GENDER_LABELS[normalized] ?? normalized;
};

/** Heading a voice sits under in a picker: "Provider · Gender". */
export const getVoiceGroupLabel = (provider?: string, gender?: string | null): string =>
  `${getProviderLabel(provider)} · ${getVoiceGenderLabel(gender)}`;

export interface GroupedVoiceOption {
  value: string;
  label: string;
  groupLabel: string;
}

/**
 * Build picker options grouped by provider, then gender.
 *
 * That's the order people actually choose in — pick the vendor you trust for
 * this language, then the gender the persona needs. The result is sorted so
 * each group's members are adjacent, which is what TextDropdown relies on to
 * decide where a header starts.
 */
export const buildGroupedVoiceOptions = (
  voices: Array<{
    id: string;
    name: string;
    provider?: string;
    gender?: string | null;
    age?: string | null;
  }> = [],
): GroupedVoiceOption[] =>
  voices
    .map(voice => ({
      value: voice.id,
      label: voice.age ? `${voice.name} · ${voice.age}` : voice.name,
      groupLabel: getVoiceGroupLabel(voice.provider, voice.gender),
      providerLabel: getProviderLabel(voice.provider),
      genderRank: getVoiceGenderRank(voice.gender),
    }))
    .sort(
      (a, b) =>
        a.providerLabel.localeCompare(b.providerLabel) ||
        a.genderRank - b.genderRank ||
        a.label.localeCompare(b.label),
    )
    .map(({ value, label, groupLabel }) => ({ value, label, groupLabel }));

export const getProviderSchema = (provider?: string): VoiceConfigField[] =>
  getProviderSchemaFields(VOICE_CONFIG_SCHEMA as ProviderConfigSchema, provider);

/**
 * Keys present in a config that its provider's schema doesn't describe.
 *
 * Not an error — seeded Google rows carry a redundant `languageCode`, and the
 * runtime ignores anything it doesn't read. The form surfaces them so they stay
 * visible and editable instead of being silently dropped on save.
 */
export { readConfigField };

export const getUnknownConfigKeys = (
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string[] => {
  if (!config) return [];
  const known = new Set(
    getProviderSchema(provider).flatMap(field => [field.key, ...(field.aliases ?? [])]),
  );
  return Object.keys(config).filter(key => !known.has(key));
};

/** Client-side mirror of ally-be's validateVoiceConfig. */
export const validateVoiceConfig = (
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string[] => {
  const trimmed = String(provider ?? "").trim();
  // Nothing chosen yet is a normal, expected state for a new voice — not a
  // bad value. The panel already shows "Pick a provider to configure this
  // voice." and disables Save for it; repeating that here as
  // `Unsupported voice provider ""` read as if an invalid choice had been
  // made, when none had been made at all.
  if (!trimmed) return [];
  if (!isSupportedProvider(trimmed)) {
    return [
      `Unsupported voice provider "${provider}". Supported: ${TTS_PROVIDER_OPTIONS.map(option => option.label).join(", ")}.`,
    ];
  }
  return validateProviderConfig(VOICE_CONFIG_SCHEMA as ProviderConfigSchema, provider, config);
};

/** Short one-line summary of a config, for the voices table. */
export const summarizeVoiceConfig = (
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string => {
  const parts = getProviderSchema(provider)
    .filter(field => field.key !== "gender")
    .map(field => {
      const value = readConfigField(config, field);
      return value === undefined ? null : `${field.label}: ${value}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
};
