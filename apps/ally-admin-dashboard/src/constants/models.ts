/**
 * Fallback for the autofill/regenerate/improve model dropdown when the API is
 * unavailable. The live list comes from GET /v1/learn/models, which now returns
 * the universal LLM registry filtered to autofill-runnable providers (OpenAI +
 * Anthropic — no Gemini autofill executor). Keep these entries mirroring the
 * ally-be registry (llm-model-registry.constants.ts) so the fallback doesn't
 * drift; `supportsTemperature` mirrors the registry's per-model capability.
 */
export const FALLBACK_AUTOFILL_MODEL_OPTIONS = [
  { value: "gpt-4.1", label: "gpt-4.1", provider: "openai" as const, supportsTemperature: true },
  {
    value: "gpt-4.1-mini",
    label: "gpt-4.1-mini",
    provider: "openai" as const,
    supportsTemperature: true,
  },
  { value: "gpt-4o", label: "gpt-4o", provider: "openai" as const, supportsTemperature: true },
  {
    value: "gpt-4o-mini",
    label: "gpt-4o-mini",
    provider: "openai" as const,
    supportsTemperature: true,
  },
  { value: "gpt-5", label: "gpt-5", provider: "openai" as const, supportsTemperature: false },
  {
    value: "gpt-5-mini",
    label: "gpt-5-mini",
    provider: "openai" as const,
    supportsTemperature: false,
  },
  {
    value: "claude-sonnet-4-6",
    label: "claude-sonnet-4-6",
    provider: "anthropic" as const,
    supportsTemperature: true,
  },
  {
    value: "claude-haiku-4-5",
    label: "claude-haiku-4-5",
    provider: "anthropic" as const,
    supportsTemperature: true,
  },
  {
    value: "claude-opus-4-7",
    label: "claude-opus-4-7",
    provider: "anthropic" as const,
    supportsTemperature: true,
  },
];

export const DEFAULT_AUTOFILL_MODEL = "gpt-4o";

/**
 * LLM models offered for the per-prompt/skill override in Prompt Management.
 * These prompts run in the ally-ai-learn / ally-ai runtimes, which support
 * OpenAI + Gemini (Anthropic not wired in yet). Limited to models that accept a
 * custom `temperature` — OpenAI reasoning models (o-series, gpt-5) reject it, so
 * they're intentionally excluded here (and the runtimes also guard against it).
 * Grouped by provider for the dropdown's optgroups; the runtime infers the
 * provider from the chosen model name.
 */
export const PROMPT_LLM_MODEL_OPTIONS: {
  provider: "openai" | "gemini";
  label: string;
  models: { value: string; label: string }[];
}[] = [
  {
    provider: "openai",
    label: "OpenAI",
    models: [
      { value: "gpt-4.1", label: "gpt-4.1" },
      { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { value: "gpt-4o", label: "gpt-4o" },
      { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    ],
  },
  {
    provider: "gemini",
    label: "Gemini",
    models: [
      { value: "gemini-2.5-pro", label: "gemini-2.5-pro" },
      { value: "gemini-2.5-flash", label: "gemini-2.5-flash" },
    ],
  },
];

/** Default temperature shown when an author first enables a prompt override. */
export const PROMPT_TEMPERATURE_DEFAULT = 0.7;

/** Provider for a model value from the options above; undefined if unknown. */
export const providerForModel = (model?: string): string | undefined => {
  if (!model) return undefined;
  for (const group of PROMPT_LLM_MODEL_OPTIONS) {
    if (group.models.some(m => m.value === model)) return group.provider;
  }
  return undefined;
};
