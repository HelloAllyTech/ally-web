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
  MIN_TRIGGER_COUNT_FLAG: getEnvVar(
    "VITE_MIN_TRIGGER_COUNT_FLAG",
    "NEXT_PUBLIC_MIN_TRIGGER_COUNT_FLAG",
  ),
  GENERAL_COMMENTS_FLAG: getEnvVar(
    "VITE_GENERAL_COMMENTS_FLAG",
    "NEXT_PUBLIC_GENERAL_COMMENTS_FLAG",
  ),
  SHARE_FOR_REVIEW_FLAG: getEnvVar(
    "VITE_SHARE_FOR_REVIEW_FLAG",
    "NEXT_PUBLIC_SHARE_FOR_REVIEW_FLAG",
  ),
  SCRIBE_REVIEW_FLAG: getEnvVar("VITE_SCRIBE_REVIEW_FLAG", "NEXT_PUBLIC_SCRIBE_REVIEW_FLAG"),
};
