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
  LANGUAGE_CAPABILITY_FLAG: getEnvVar(
    "VITE_LANGUAGE_CAPABILITY_FLAG",
    "NEXT_PUBLIC_LANGUAGE_CAPABILITY_FLAG",
  ),
  LANGUAGE_SELECTOR_FLAG: getEnvVar(
    "VITE_LANGUAGE_SELECTOR_FLAG",
    "NEXT_PUBLIC_LANGUAGE_SELECTOR_FLAG",
  ),
  BEHAVIOURS_AND_STATES_INSTRUCTION_FLAG: getEnvVar(
    "VITE_BEHAVIOURS_AND_STATES_INSTRUCTION_FLAG",
    "NEXT_PUBLIC_BEHAVIOURS_AND_STATES_INSTRUCTION_FLAG",
  ),
  TURN_INDICATOR_FLAG: getEnvVar(
    "VITE_TURN_INDICATOR_FLAG",
    "NEXT_PUBLIC_TURN_INDICATOR_FLAG",
  ),
};
