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
export const VOICE_TYPE_SUMMARY: Record<string, { title: string; v3: string }> = {
  pvc: {
    title: "Professional voice clone",
    // v3 does render these — measured 200s with audio indistinguishable from the
    // fine-tuned render — so this states what is certain (the fine-tune goes
    // unused) rather than recommending a model.
    v3: "eleven_v3 will not use its fine-tune; only eleven_multilingual_v2 does.",
  },
  ivc: {
    title: "Instant voice clone",
    v3: "Works with eleven_v3.",
  },
  voice_design: {
    title: "Voice Design voice",
    v3: "Works with eleven_v3.",
  },
  premade: {
    title: "ElevenLabs stock voice",
    v3: "Works with eleven_v3.",
  },
  unknown: {
    title: "Clone type unclear",
    v3: "ElevenLabs did not say whether this is an Instant or a Professional clone — check the workspace before using eleven_v3.",
  },
};

/** Voice types eleven_v3 can render from. */
const V3_COMPATIBLE_VOICE_TYPES = ["ivc", "voice_design", "premade"];

/**
 * Advisory for an ElevenLabs voice whose type eleven_v3 cannot use.
 *
 * v3 does not support fine-tuned models, and a Professional clone is one — so it
 * silently renders from the first ~30-90s of training audio and still returns
 * 200. A warning rather than a blocked save: a same-voice A/B was perceptually
 * identical, so the pairing is unsupported rather than proven harmful.
 */
export const getElevenLabsV3Warning = (
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string | null => {
  if (String(provider ?? "").toUpperCase() !== TtsProvider.ELEVENLABS) return null;
  if (!/v3/i.test(String(config?.model ?? ""))) return null;

  const type = String(config?.voice_type ?? "").trim();
  if (!type) {
    return "This voice runs eleven_v3 but its voice type is unrecorded. Sync it from ElevenLabs — v3 cannot use a Professional Voice Clone and will silently substitute a lower-fidelity render.";
  }
  if (type === "unknown") {
    return "ElevenLabs did not report a category that distinguishes an Instant from a Professional clone. Confirm in the ElevenLabs workspace which flow created this voice.";
  }
  if (!V3_COMPATIBLE_VOICE_TYPES.includes(type)) {
    return `eleven_v3 will not use this ${type.toUpperCase()} voice's fine-tuned model — it renders from the first ~30-90s of the training audio instead. It still returns audio and may sound close, so judge it by ear. Only eleven_multilingual_v2 uses the fine-tune.`;
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
        { value: "pvc", label: "Professional clone (PVC) — not v3-compatible" },
        { value: "ivc", label: "Instant clone (IVC)" },
        { value: "voice_design", label: "Voice Design / generated" },
        { value: "premade", label: "ElevenLabs stock (premade)" },
        { value: "unknown", label: "Unknown — needs confirming" },
      ],
      hint: "Decides whether eleven_v3 can use this voice. Populated by Sync from ElevenLabs rather than guessed.",
    },
    {
      key: "voice_id",
      label: "Voice ID",
      required: true,
      aliases: ["voiceId"],
      type: "string",
      placeholder: "21m00Tcm4TlvDq8ikWAM",
      hint: "The voice's id in ElevenLabs, not its display name.",
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
  ],
};

export const TTS_PROVIDER_OPTIONS = Object.values(TtsProvider).map(provider => ({
  value: provider,
  label: provider.charAt(0) + provider.slice(1).toLowerCase(),
}));

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
  if (!isSupportedProvider(provider)) {
    return [
      `Unsupported voice provider "${provider}". Supported: ${Object.values(TtsProvider).join(", ")}.`,
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
