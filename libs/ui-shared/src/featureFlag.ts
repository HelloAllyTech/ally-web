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
  DUPLICATE_SIMULATION_FLAG: getEnvVar(
    "VITE_DUPLICATE_SIMULATION_FLAG",
    "NEXT_PUBLIC_DUPLICATE_SIMULATION_FLAG",
  ),
  NEW_CREATE_SIMULATION_FLAG: getEnvVar(
    "VITE_NEW_CREATE_SIMULATION_FLAG",
    "NEXT_PUBLIC_NEW_CREATE_SIMULATION_FLAG",
  ),
  LANGUAGE_CAPABILITY_FLAG: getEnvVar(
    "VITE_LANGUAGE_CAPABILITY_FLAG",
    "NEXT_PUBLIC_LANGUAGE_CAPABILITY_FLAG",
  ),
  SCORE_COLOR_FLAG: getEnvVar("VITE_SCORE_COLOR_FLAG", "NEXT_PUBLIC_SCORE_COLOR_FLAG"),
  AUTO_TERMINATION_FIELD_FLAG: getEnvVar(
    "VITE_AUTO_TERMINATION_FIELD_FLAG",
    "NEXT_PUBLIC_AUTO_TERMINATION_FIELD_FLAG",
  ),
  GOOGLE_SIGN_IN_FLAG: getEnvVar("VITE_GOOGLE_SIGN_IN_FLAG", "NEXT_PUBLIC_GOOGLE_SIGN_IN_FLAG"),
};
