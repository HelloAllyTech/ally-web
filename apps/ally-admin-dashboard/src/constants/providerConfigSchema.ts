/**
 * Declarative shape of a provider's `config`, shared by the three
 * provider-backed registries: Voices (TTS), Speech Recognition (STT) and
 * Language Model (LLM).
 *
 * Mirrors `ProviderConfigField` in
 * `ally-be/src/learn/util/provider-config-schema.util.ts`, which validates the
 * same shapes server-side. The per-service schemas differ (the runtimes accept
 * different providers and read different keys); only the machinery is shared,
 * so one `<ProviderConfigFields>` renders all three forms.
 *
 * Keep a schema in step with its backend twin when a provider is added or a
 * client changes — a required field the runtime needs but the form never
 * collects is invisible until a session misbehaves.
 */
export interface ProviderConfigField {
  key: string;
  label: string;
  required: boolean;
  /** Legacy spellings still accepted on read, e.g. ElevenLabs `voiceId`. */
  aliases?: string[];
  type: "string" | "boolean" | "select" | "number";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Shown under the input — say what the value is, not that it's required. */
  hint?: string;
  /** Inclusive bounds for `type: "number"`. */
  min?: number;
  max?: number;
}

/** provider key (as stored) → the fields that provider's client reads. */
export type ProviderConfigSchema = Record<string, ProviderConfigField[]>;

/** Case-insensitive lookup: voices store "GOOGLE", STT/LLM store "google". */
export const getProviderSchemaFields = (
  schema: ProviderConfigSchema,
  provider?: string,
): ProviderConfigField[] => {
  const lookup = String(provider ?? "").toLowerCase();
  const key = Object.keys(schema).find(candidate => candidate.toLowerCase() === lookup);
  return key ? schema[key] : [];
};

/**
 * Read a field's value, tolerating legacy spellings. Empty string counts as
 * absent so a blank input reads as "not set".
 */
export const readConfigField = (
  config: Record<string, any> | undefined,
  field: ProviderConfigField,
): any => {
  if (!config) return undefined;
  for (const key of [field.key, ...(field.aliases ?? [])]) {
    const value = config[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

/**
 * Client-side mirror of the backend validator, so the form can disable Save
 * with a specific reason instead of round-tripping to a 400.
 */
export const validateProviderConfig = (
  schema: ProviderConfigSchema,
  provider: string | undefined,
  config: Record<string, any> | undefined,
): string[] => {
  const fields = getProviderSchemaFields(schema, provider);
  if (!fields.length) {
    return [`Unsupported provider "${provider}".`];
  }

  const errors: string[] = [];
  for (const field of fields) {
    const value = readConfigField(config, field);

    if (value === undefined) {
      if (field.required) errors.push(`${field.label} is required.`);
      continue;
    }
    if (field.type === "boolean" && typeof value !== "boolean") {
      errors.push(`${field.label} must be true or false.`);
      continue;
    }
    if (field.type === "number") {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        errors.push(`${field.label} must be a number.`);
        continue;
      }
      if (field.min !== undefined && parsed < field.min) {
        errors.push(`${field.label} must be at least ${field.min}.`);
        continue;
      }
      if (field.max !== undefined && parsed > field.max) {
        errors.push(`${field.label} must be at most ${field.max}.`);
        continue;
      }
    }
    // Enum-valued fields (voice gender, Hume voice_provider) must stay within
    // the set the rest of the system understands.
    if (field.options && !field.options.some(option => option.value === value)) {
      errors.push(
        `${field.label} must be one of: ${field.options.map(option => option.label).join(", ")}.`,
      );
    }
  }
  return errors;
};

/** "elevenlabs" → "ElevenLabs". Replaces the per-registry label helpers. */
export const getProviderLabelFrom = (
  options: Array<{ value: string; label: string }>,
  provider?: string,
): string =>
  options.find(option => option.value.toLowerCase() === String(provider ?? "").toLowerCase())
    ?.label ??
  provider ??
  "—";

/**
 * Build the options for a "which config does this language/simulation use"
 * picker: an inherit sentinel followed by the registry rows.
 */
export const buildConfigPickerOptions = (
  configs: Array<{ id: string; name: string }>,
  inheritLabel: string,
): Array<{ value: string; label: string }> => [
  { value: "", label: inheritLabel },
  ...configs.map(config => ({ value: config.id, label: config.name })),
];
