export enum Permissions {
  EDIT_SCENARIO = "edit:scenario",
  EDIT_USER = "edit:user",
  VIEW_USERS = "view:users",
  EDIT_LIVEKIT = "edit:livekit",
  EDIT_EVENT = "edit:session-events",
  DELETE_EVENT = "delete:session-events",
  VIEW_ADMIN_SCENARIO = "view:admin:scenario",
  EDIT_SCENARIO_VOICE = "edit:scenario-voice",
  EDIT_SCENARIO_LANGUAGE = "edit:admin:language",
  EDIT_CHARACTER_LIBRARY = "edit:scenario-character",
  EDIT_PROMPT = "edit:admin:prompts",
  VIEW_PROMPT = "view:admin:prompts",
  VIEW_ADMIN_BADGE = "view:admin:badges",
  EDIT_GUARDRAIL = "edit:admin:guardrails",
  EDIT_MULTI_TENANT_ADMINS = "edit:multi-tenant-admins",
  // Granted only to SUPER_DUPER_ADMIN (never SUPER_ADMIN) — gates the
  // Super Duper Admins management page.
  VIEW_SUPER_DUPER_ADMINS = "view:super-duper-admins",
  EDIT_SUPER_DUPER_ADMINS = "edit:super-duper-admins",
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
  VIEW_AI_LAB = "view:admin:ai-lab",
  EDIT_AI_LAB = "edit:admin:ai-lab",
  DELETE_AI_LAB = "delete:admin:ai-lab",
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
  AI_LAB: "ai-lab",
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
  "gopikrishnan.sasikumar@helloally.ai",
];

/**
 * Canonicalize an email for allowlist matching: lower-case, trim, and drop any
 * `+tag` sub-address, so gopikrishnan.sasikumar+admin@… matches the single
 * gopikrishnan.sasikumar@… allowlist entry. Mirrors the backend's
 * normalizeEmailForAllowlist (ally-be roleplay-v2-access.util) so both gates
 * agree on who is allowlisted.
 */
export const normalizeEmailForAllowlist = (raw?: string | null): string => {
  const email = (raw ?? "").trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at); // includes '@'
  const plus = local.indexOf("+");
  const baseLocal = plus === -1 ? local : local.slice(0, plus);
  return `${baseLocal}${domain}`;
};

/**
 * Membership test against ROLEPLAY_STUDIO_ALLOWED_EMAILS. Case-insensitive and
 * `+tag`-tolerant: any sub-address of an allowlisted email matches too.
 */
export const isRoleplayStudioEmailAllowed = (email?: string | null): boolean => {
  const normalized = normalizeEmailForAllowlist(email);
  if (!normalized) return false;
  return ROLEPLAY_STUDIO_ALLOWED_EMAILS.map(normalizeEmailForAllowlist).includes(normalized);
};
