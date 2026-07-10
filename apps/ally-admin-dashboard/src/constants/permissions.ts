export enum Permissions {
  EDIT_SCENARIO = "edit:scenario",
  EDIT_USER = "edit:user",
  VIEW_USERS = "view:users",
  EDIT_LIVEKIT = "edit:livekit",
  EDIT_EVENT = "edit:session-events",
  VIEW_ADMIN_SCENARIO = "view:admin:scenario",
  EDIT_SCENARIO_VOICE = "edit:scenario-voice",
  EDIT_SCENARIO_LANGUAGE = "edit:admin:language",
  EDIT_CHARACTER_LIBRARY = "edit:scenario-character",
  EDIT_PROMPT = "edit:admin:prompts",
  VIEW_PROMPT = "view:admin:prompts",
  VIEW_ADMIN_BADGE = "view:admin:badges",
  EDIT_GUARDRAIL = "edit:admin:guardrails",
  EDIT_MULTI_TENANT_ADMINS = "edit:multi-tenant-admins",
  VIEW_I18N_TRANSLATIONS = "view:admin:i18n-translations",
  EDIT_I18N_TRANSLATIONS = "edit:admin:i18n-translations",
  VIEW_TOOLTIPS = "view:admin:tooltips",
  EDIT_TOOLTIPS = "edit:admin:tooltips",
  VIEW_ROLEPLAY_SPECS = "view:roleplay-specs",
  EDIT_ROLEPLAY_SPEC = "edit:roleplay-spec",
  EDIT_ROLEPLAY_COPILOT = "edit:roleplay-copilot",
  VIEW_ROLEPLAY_REHEARSALS = "view:roleplay-rehearsals",
  EDIT_ROLEPLAY_REHEARSALS = "edit:roleplay-rehearsals",
  VIEW_BLOGS = "view:blogs",
  EDIT_BLOG = "edit:blog",
  DELETE_BLOG = "delete:blog",
}

export const SIDEBAR_ITEMS = {
  SIMULATION_STUDIO: "simulation-studio",
  EVENTS: "events",
  CHARACTER_LIBRARY: "character-library",
  USERS: "users",
  SCENARIO_VOICES: "scenario-voices",
  SCENARIO_LANGUAGES: "scenario-languages",
  PROMPTS: "prompts",
  USER_BADGES: "user-badges",
  MANAGE_GUARDRAILS: "manage-guardrails",
  TRANSLATIONS: "translations",
  TOOLTIPS: "tooltips",
  ANALYTICS: "analytics",
  AGENT_TEST_CASES: "agent-test-cases",
  COMPETENCIES: "competencies",
  ROLEPLAY_SESSION_LOGS: "roleplay-session-logs",
  ROLEPLAY_STUDIO: "roleplay-studio",
  BLOG: "blog",
  SETTINGS: "settings",
};

/**
 * Temporary rollout allowlist for the Roleplay Studio v2. The studio is gated
 * by BOTH the roleplay permissions above AND this email allowlist (compared
 * case-insensitively) until it is opened up more broadly. Applied to the
 * sidebar entry (deriveNavigationItems) and to the routes (PrivateLayout's
 * `allowedEmails` prop).
 */
export const ROLEPLAY_STUDIO_ALLOWED_EMAILS = [
  "admin@example.com",
  "sandeep.malhotra@helloally.ai",
];

/** Case-insensitive membership test against ROLEPLAY_STUDIO_ALLOWED_EMAILS. */
export const isRoleplayStudioEmailAllowed = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return ROLEPLAY_STUDIO_ALLOWED_EMAILS.some(allowed => allowed.toLowerCase() === normalized);
};
