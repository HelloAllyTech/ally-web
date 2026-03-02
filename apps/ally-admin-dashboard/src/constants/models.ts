export const AUTOFILL_MODEL_OPTIONS = [
  { value: "gpt-5.2", label: "GPT-5.2 (Best quality)" },
  { value: "gpt-5-mini", label: "GPT-5 mini (Balanced)" },
  { value: "gpt-4.1", label: "GPT-4.1 (Smart)" },
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o mini (Fast & cheap)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
] as const;

export const DEFAULT_AUTOFILL_MODEL = "gpt-4o";
