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
  TURN_INDICATOR_FLAG: getEnvVar("VITE_TURN_INDICATOR_FLAG", "NEXT_PUBLIC_TURN_INDICATOR_FLAG"),
  // Hides the entry points to the selectable main-agent prompt variants
  // feature: the studio's main-agent prompt picker in edit-simulation,
  // and the "Duplicate as variant" / "Delete variant" buttons in
  // PromptSidePanel. Everything else (Prompt Management page for editing
  // non-variant prompts, the legacy Behaviour Instructions table, runtime
  // resolution via default Prompt #1) stays available. Used to keep the
  // feature dark in prod until per-user permission gating is added.
  SELECTABLE_MAIN_AGENT_PROMPT_FLAG: getEnvVar(
    "VITE_SELECTABLE_MAIN_AGENT_PROMPT_FLAG",
    "NEXT_PUBLIC_SELECTABLE_MAIN_AGENT_PROMPT_FLAG",
  ),
  MAX_ACTIVE_USERS_POPUP_FLAG: getEnvVar(
    "VITE_MAX_ACTIVE_USERS_POPUP_FLAG",
    "NEXT_PUBLIC_MAX_ACTIVE_USERS_POPUP_FLAG",
  ),
  SHARE_FOR_REVIEW_FLAG: getEnvVar(
    "VITE_SHARE_FOR_REVIEW_FLAG",
    "NEXT_PUBLIC_SHARE_FOR_REVIEW_FLAG",
  ),
  GENERAL_COMMENTS_FLAG: getEnvVar(
    "VITE_GENERAL_COMMENTS_FLAG",
    "NEXT_PUBLIC_GENERAL_COMMENTS_FLAG",
  ),
  SCRIBE_REVIEW_FLAG: getEnvVar("VITE_SCRIBE_REVIEW_FLAG", "NEXT_PUBLIC_SCRIBE_REVIEW_FLAG"),
  CITATION_FLAG: getEnvVar("VITE_CITATION_FLAG", "NEXT_PUBLIC_CITATION_FLAG"),
};
