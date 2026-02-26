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
  SIMULATION_VOICE_FLAG: getEnvVar(
    "VITE_SIMULATION_VOICE_FLAG",
    "NEXT_PUBLIC_SIMULATION_VOICE_FLAG",
  ),
  SIMULATION_SETTINGS_FLAG: getEnvVar(
    "VITE_SIMULATION_SETTINGS_FLAG",
    "NEXT_PUBLIC_SIMULATION_SETTINGS_FLAG",
  ),
  MAX_ACTIVE_USERS_POPUP_FLAG: getEnvVar(
    "VITE_MAX_ACTIVE_USERS_POPUP_FLAG",
    "NEXT_PUBLIC_MAX_ACTIVE_USERS_POPUP_FLAG",
  ),
  SIMULATION_REPORT_FLAG: getEnvVar(
    "VITE_SIMULATION_REPORT_FLAG",
    "NEXT_PUBLIC_SIMULATION_REPORT_FLAG",
  ),
  LANGUAGE_SELECTOR_FLAG: getEnvVar(
    "VITE_LANGUAGE_SELECTOR_FLAG",
    "NEXT_PUBLIC_LANGUAGE_SELECTOR_FLAG",
  ),
  SUMMARY_TABS_FLAG: getEnvVar("VITE_SUMMARY_TABS_FLAG", "NEXT_PUBLIC_SUMMARY_TABS_FLAG"),
};
