/** Fallback when API fails - commonly available models */
export const FALLBACK_AUTOFILL_MODEL_OPTIONS = [
  { value: "gpt-4o", label: "gpt-4o", provider: "openai" as const },
  { value: "gpt-4o-mini", label: "gpt-4o-mini", provider: "openai" as const },
  { value: "gpt-4-turbo-preview", label: "gpt-4-turbo-preview", provider: "openai" as const },
  { value: "claude-opus-4-7", label: "claude-opus-4-7", provider: "anthropic" as const },
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6", provider: "anthropic" as const },
  { value: "claude-haiku-4-5", label: "claude-haiku-4-5", provider: "anthropic" as const },
];

export const DEFAULT_AUTOFILL_MODEL = "gpt-4o";
