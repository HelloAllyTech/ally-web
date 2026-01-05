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
  SCORE_COLOR_FLAG: getEnvVar("VITE_SCORE_COLOR_FLAG", "NEXT_PUBLIC_SCORE_COLOR_FLAG"),
  AUTO_TERMINATION_FIELD_FLAG: getEnvVar(
    "VITE_AUTO_TERMINATION_FIELD_FLAG",
    "NEXT_PUBLIC_AUTO_TERMINATION_FIELD_FLAG",
  ),
  GOOGLE_SIGN_IN_FLAG: getEnvVar("VITE_GOOGLE_SIGN_IN_FLAG", "NEXT_PUBLIC_GOOGLE_SIGN_IN_FLAG"),
  LOGO_UPLOAD_FLAG: getEnvVar("VITE_LOGO_UPLOAD_FLAG", "NEXT_PUBLIC_LOGO_UPLOAD_FLAG"),
  PROFILE_UPLOAD_FLAG: getEnvVar("VITE_PROFILE_UPLOAD_FLAG", "NEXT_PUBLIC_PROFILE_UPLOAD_FLAG"),
};
