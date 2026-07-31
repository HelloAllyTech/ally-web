import { ProviderConfigSchema } from "./providerConfigSchema";

/**
 * Field schemas for the Speech Recognition and Language Model registries.
 *
 * Mirrors `STT_CONFIG_SCHEMA` / `LLM_CONFIG_SCHEMA` in
 * `ally-be/src/learn/constants/provider-config-schemas.constants.ts`, which are
 * themselves derived from `ally-ai-learn/app/stt/factory.py` and
 * `app/llms/factory.py`.
 *
 * `model` is required on hosted providers because both runtimes fall back to
 * the *platform default* model when it's missing while keeping the chosen
 * provider — an ElevenLabs client asking for Deepgram's "nova-3" starts a
 * session and transcribes nothing.
 */
const MODEL_FIELD = {
  key: "model",
  label: "Model",
  required: true,
  type: "string" as const,
};

export const STT_PROVIDER_SCHEMA: ProviderConfigSchema = {
  deepgram: [{ ...MODEL_FIELD, placeholder: "nova-3" }],
  sarvam: [{ ...MODEL_FIELD, placeholder: "saarika:v2.5" }],
  elevenlabs: [
    {
      ...MODEL_FIELD,
      placeholder: "scribe_v2_realtime",
      hint: "Only scribe_v2_realtime streams; the batch scribe models emit no interim transcripts in a live turn.",
    },
  ],
  google: [
    { ...MODEL_FIELD, placeholder: "chirp_2" },
    {
      key: "location",
      label: "Location",
      required: false,
      type: "string",
      placeholder: "asia-southeast1",
      hint: "Google regional endpoint.",
    },
    {
      key: "languageCode",
      label: "Language code override",
      required: false,
      type: "string",
      placeholder: "pa-Guru-IN",
      hint: "Only when the provider needs a script-qualified code that differs from the session language.",
    },
  ],
};

const TEMPERATURE_FIELD = {
  key: "temperature",
  label: "Temperature",
  required: false,
  type: "number" as const,
  min: 0,
  max: 2,
  placeholder: "Leave blank for the provider default",
  hint: "A simulation's own temperature still overrides this.",
};

/** Ollama and vLLM serve whatever the server is running, so model is optional. */
export const LLM_PROVIDER_SCHEMA: ProviderConfigSchema = {
  openai: [{ ...MODEL_FIELD, placeholder: "gpt-4o-mini" }, TEMPERATURE_FIELD],
  google: [{ ...MODEL_FIELD, placeholder: "gemini-2.0-flash-exp" }, TEMPERATURE_FIELD],
  gemini: [{ ...MODEL_FIELD, placeholder: "gemini-2.0-flash-exp" }, TEMPERATURE_FIELD],
  ollama: [
    { ...MODEL_FIELD, required: false, hint: "Optional — the server decides." },
    TEMPERATURE_FIELD,
  ],
  vllm: [
    { ...MODEL_FIELD, required: false, hint: "Optional — the server decides." },
    TEMPERATURE_FIELD,
  ],
};
