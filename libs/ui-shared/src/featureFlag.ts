const getEnvVar = (viteKey: string, nextKey: string): boolean => {
  // Support both Vite (import.meta.env) and Next.js (process.env)
  if (typeof process !== "undefined" && process.env?.[nextKey]) {
    return process.env[nextKey] === "true";
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] === "true";
  }
  return false;
};

export const FEATURE_FLAGS_MAP = {
  TERMS_AND_CONDITION_FLAG: getEnvVar(
    "VITE_TERMS_AND_CONDITION_FLAG",
    "NEXT_PUBLIC_TERMS_AND_CONDITION_FLAG",
  ),
  TRIGGER_WARNINGS_FLAG: getEnvVar(
    "VITE_TRIGGER_WARNINGS_FLAG",
    "NEXT_PUBLIC_TRIGGER_WARNINGS_FLAG",
  ),
  DUPLICATE_SIMULATION_FLAG: getEnvVar(
    "VITE_DUPLICATE_SIMULATION_FLAG",
    "NEXT_PUBLIC_DUPLICATE_SIMULATION_FLAG",
  ),
  CUSTOM_FIELD_FLAG: getEnvVar("VITE_CUSTOM_FIELD_FLAG", "NEXT_PUBLIC_CUSTOM_FIELD_FLAG"),
};
