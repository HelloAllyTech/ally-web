/** Fallback when API fails - commonly available models */
export const FALLBACK_AUTOFILL_MODEL_OPTIONS = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-4-turbo-preview", label: "gpt-4-turbo-preview" },
] as const;

export const DEFAULT_AUTOFILL_MODEL = "gpt-4o";
