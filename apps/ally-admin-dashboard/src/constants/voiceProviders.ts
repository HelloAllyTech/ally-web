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
 * Roughly how old the voice sounds, entered by hand.
 *
 * Nothing dispatches it — no TTS client reads `age`, so this exists purely to
 * help a human choose, and to float age-appropriate voices up the studio's
 * picker against the persona's age.
 *
 * The vocabulary is ours because no provider's fits. Deepgram publishes
 * `Adult` / `Young Adult` / `Mature`, ElevenLabs `young` / `middle_aged` /
 * `old`, and Sarvam — where the only values we already store came from —
 * documents no age attribute at all. Three incompatible sets and one absence,
 * so adopting any of them would just be arbitrary.
 *
 * `adult` deliberately keeps the broad meaning the existing rows use, rather
 * than being narrowed to a decade, so nothing already entered becomes wrong.
 */
export enum VoiceAge {
  CHILD = "child",
  TEEN = "teen",
  YOUNG_ADULT = "young adult",
  ADULT = "adult",
  SENIOR = "senior",
}

/**
 * What the voices list sends to mean "this field is missing".
 *
 * Not a stored value — ally-be's filter treats it as a null-or-blank test. It is
 * the point of filtering on these at all: finding the rows that still need one,
 * since a voice with no gender drops its language out of simulation creation and
 * one with no age cannot be ordered against a persona's.
 */
export const UNSET_FILTER_VALUE = "unset";

/** Gender choices for the voices list filter, plus the gap. */
export const VOICE_GENDER_FILTER_OPTIONS = [
  { label: "Male", value: VoiceGender.MALE },
  { label: "Female", value: VoiceGender.FEMALE },
  { label: "Non-binary", value: VoiceGender.NON_BINARY },
  { label: "Not set", value: UNSET_FILTER_VALUE },
];

/** Age choices for the voices list filter, plus the gap. */
export const VOICE_AGE_FILTER_OPTIONS = [
  { label: "Child", value: VoiceAge.CHILD },
  { label: "Teen", value: VoiceAge.TEEN },
  { label: "Young adult", value: VoiceAge.YOUNG_ADULT },
  { label: "Adult", value: VoiceAge.ADULT },
  { label: "Senior", value: VoiceAge.SENIOR },
  { label: "Not set", value: UNSET_FILTER_VALUE },
];

const AGE_FIELD: VoiceConfigField = {
  key: "age",
  label: "Age",
  required: false,
  type: "select",
  options: [
    { value: "", label: "Not recorded" },
    { value: VoiceAge.CHILD, label: "Child" },
    { value: VoiceAge.TEEN, label: "Teen" },
    { value: VoiceAge.YOUNG_ADULT, label: "Young adult" },
    { value: VoiceAge.ADULT, label: "Adult" },
    { value: VoiceAge.SENIOR, label: "Senior" },
  ],
  hint: "Optional. Floats age-appropriate voices up the studio's picker; nothing is sent to the provider.",
};

/**
 * Where each age sits on a scale, so a persona's age can be matched to a band.
 *
 * Only the boundaries a human would recognise. `adult` covers the long middle
 * on purpose — it is the value most existing rows carry, and narrowing it would
 * silently demote voices that are perfectly appropriate.
 */
const AGE_BAND_RANGES: Array<{ age: VoiceAge; upTo: number }> = [
  { age: VoiceAge.CHILD, upTo: 12 },
  { age: VoiceAge.TEEN, upTo: 19 },
  { age: VoiceAge.YOUNG_ADULT, upTo: 34 },
  { age: VoiceAge.ADULT, upTo: 59 },
  { age: VoiceAge.SENIOR, upTo: Infinity },
];

/**
 * The band a numeric age falls in, or null when there is no usable number.
 *
 * The studio stores a persona's age as a number while a voice carries a band,
 * so one of them has to be translated to compare them at all.
 */
export const toVoiceAgeBand = (age?: string | number | null): VoiceAge | null => {
  const raw = String(age ?? "").trim();
  if (!raw) return null;
  // Already a band (a voice's own value) — accept it as-is.
  const asBand = raw.toLowerCase();
  if ((Object.values(VoiceAge) as string[]).includes(asBand)) return asBand as VoiceAge;

  const years = Number(raw);
  if (!Number.isFinite(years) || years < 0) return null;
  return AGE_BAND_RANGES.find(band => years <= band.upTo)?.age ?? null;
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
  /**
   * ElevenLabs' own verdict on v3 for THIS voice, when ally-be has supplied
   * one: `false` flagged, `null` no objection, `true` their recommendation.
   * `undefined` means we have no verdict — a brand-new voice, or a catalog
   * request that failed — and the voice-type rule below stands in.
   *
   * It can only ever silence the warning, never raise one, so every message
   * below keeps deciding its own wording. The point is staleness: ElevenLabs
   * say v3 "doesn't YET support Professional Voice Clones", and on the day that
   * changes this banner would otherwise keep insisting the training cannot be
   * used. Their answer has to outrank our assumption.
   */
  v3Verdict?: boolean | null,
): string | null => {
  if (String(provider ?? "").toUpperCase() !== TtsProvider.ELEVENLABS) return null;
  if (!isElevenLabsV3Model(config?.model)) return null;

  if (v3Verdict !== undefined && v3Verdict !== false) return null;

  const type = String(config?.voice_type ?? "").trim();
  if (!type) {
    // Names the control as it is actually labelled in the panel. It was
    // renamed to "Re-check with ElevenLabs" when it was demoted from a primary
    // button, and these two hints kept pointing at the old name — sending the
    // reader looking for a button that is not on the screen.
    return 'We do not know how this voice was created, so we cannot say how it will sound on the v3 model. Click "Re-check with ElevenLabs" to check.';
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
    AGE_FIELD,
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
    AGE_FIELD,
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
      hint: 'Decides how this voice sounds on the v3 model. Use "Re-check with ElevenLabs" to fill it in rather than guessing.',
    },
  ],
  [TtsProvider.SARVAM]: [
    GENDER_FIELD,
    AGE_FIELD,
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
  ],
  [TtsProvider.GOOGLE]: [
    GENDER_FIELD,
    AGE_FIELD,
    // Ahead of Voice name, because it decides which voices are even valid:
    // Google's Gemini voices are the bare-named ones ("Puck", "Kore") and are
    // rejected outright unless a Gemini model is named — "This voice requires a
    // model name to be specified" — while the language-prefixed Chirp3-HD names
    // want chirp_3. Same reasoning as ElevenLabs' Voice ID before Model and
    // Hume's Voice source before Voice name: choose the scope, then the voice.
    {
      key: "model_name",
      label: "Model name",
      required: false,
      type: "string",
      placeholder: "chirp_3",
      hint: "chirp_3 for the Chirp3-HD voices; gemini-2.5-flash-tts for the bare-named Gemini ones, which will not play without it. Leave empty for Standard, Neural2 and Wavenet.",
    },
    {
      key: "voice_name",
      label: "Voice name",
      required: false,
      type: "string",
      placeholder: "en-IN-Chirp3-HD-Achernar",
      hint: "Leave empty to let Google pick by gender and language.",
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
    AGE_FIELD,
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
 * How far down the list a voice sits once a persona's gender is known.
 *
 * Ordering, not filtering — nothing is removed. A persona voiced against its
 * gender is a legitimate choice (a female character given a male voice is a
 * real configuration), and a voice whose gender nobody recorded is still
 * usable, so hiding either would take a decision away from the admin. This
 * only decides what they see first.
 */
const genderMatchRank = (voiceGender?: string | null, preferredGender?: string | null): number => {
  const preferred = String(preferredGender ?? "")
    .trim()
    .toLowerCase();
  if (!preferred) return 0;
  const actual = String(voiceGender ?? "")
    .trim()
    .toLowerCase();
  if (actual === preferred) return 0;
  // Unrecorded before a deliberate mismatch: it might well be the right voice,
  // where a different gender is the least likely thing being looked for.
  if (!actual) return 1;
  return 2;
};

/**
 * The same three tiers for age, translated through bands so a persona's number
 * can be compared with a voice's category at all.
 *
 * Applied within a "Provider · Gender" group rather than above it: those two
 * fields form the group label, so ranking age above either one splits a group
 * and its sticky header renders twice. Age is also optional and hand-entered, so
 * most voices carry none for now — it should refine an order, not drive it.
 */
const ageMatchRank = (voiceAge?: string | null, preferredAge?: string | number | null): number => {
  const preferred = toVoiceAgeBand(preferredAge);
  if (!preferred) return 0;
  const actual = toVoiceAgeBand(voiceAge);
  if (actual === preferred) return 0;
  if (!actual) return 1;
  return 2;
};

/**
 * Build picker options grouped by provider, then gender.
 *
 * That's the order people actually choose in — pick the vendor you trust for
 * this language, then the gender the persona needs. The result is sorted so
 * each group's members are adjacent, which is what TextDropdown relies on to
 * decide where a header starts.
 *
 * `preferredGender` (the persona's, in the simulation being edited) floats the
 * matching voices to the top, then the ones with no recorded gender, then the
 * rest. Without it the order is unchanged, so every other caller is unaffected.
 */
export const buildGroupedVoiceOptions = (
  voices: Array<{
    id: string;
    name: string;
    provider?: string;
    gender?: string | null;
    age?: string | null;
  }> = [],
  preferredGender?: string | null,
  preferredAge?: string | number | null,
): GroupedVoiceOption[] =>
  voices
    .map(voice => ({
      value: voice.id,
      label: voice.age ? `${voice.name} · ${voice.age}` : voice.name,
      groupLabel: getVoiceGroupLabel(voice.provider, voice.gender),
      providerLabel: getProviderLabel(voice.provider),
      genderRank: getVoiceGenderRank(voice.gender),
      matchRank: genderMatchRank(voice.gender, preferredGender),
      ageRank: ageMatchRank(voice.age, preferredAge),
    }))
    .sort(
      (a, b) =>
        // Ahead of provider: which gender you need is the stronger signal once
        // the persona has one, and grouping stays intact because every member
        // of a "Provider · Gender" group shares the same match rank.
        a.matchRank - b.matchRank ||
        a.providerLabel.localeCompare(b.providerLabel) ||
        a.genderRank - b.genderRank ||
        // Age sorts INSIDE a group, never above provider or gender. Those two
        // are what a group label is made of, so ranking age above either splits
        // a group in two and TextDropdown renders its header twice — verified
        // by reordering three voices across two providers. So a matching age
        // surfaces first within "Google · Female" rather than reshuffling the
        // groups themselves.
        a.ageRank - b.ageRank ||
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
