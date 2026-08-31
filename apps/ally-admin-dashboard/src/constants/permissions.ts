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
  VIEW_CHARACTER_LIBRARY = "view:scenario-character",
  CREATE_CHARACTER_LIBRARY = "create:scenario-character",
  EDIT_CHARACTER_LIBRARY = "edit:scenario-character",
  DELETE_CHARACTER_LIBRARY = "delete:scenario-character",
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
  VIEW_BLOGS = "view:blogs",
  EDIT_BLOG = "edit:blog",
  DELETE_BLOG = "delete:blog",
  VIEW_AI_LAB = "view:admin:ai-lab",
  EDIT_AI_LAB = "edit:admin:ai-lab",
  // Product Roadmap. Three tiers because the board is a voting surface, not a CRUD screen:
  // VIEW = read, VOTE = participate (file/allocate/comment/own views), EDIT = manage.
  VIEW_PRODUCT_ROADMAP = "view:admin:product-roadmap",
  VOTE_PRODUCT_ROADMAP = "vote:admin:product-roadmap",
  EDIT_PRODUCT_ROADMAP = "edit:admin:product-roadmap",
  DELETE_AI_LAB = "delete:admin:ai-lab",
  // Builder. Two tiers, not three: VIEW is read-only (catching up on a build),
  // EDIT covers the interview, PRD edits and starting or stopping a build.
  // No delete — a session is cancelled, never removed, because its PRs outlive it.
  VIEW_BUILDER = "view:admin:builder",
  EDIT_BUILDER = "edit:admin:builder",
  // Per-user preferences (e.g. the saved admin sidebar order). Held by every
  // platform-tier group — PLATFORM_ADMIN inherited both from SUPER_DUPER_ADMIN
  // in the role-collapse migration — but NOT by a plain tenant ADMIN or a
  // MULTI_TENANT_ADMIN, which is why the preferences calls in useUser's
  // checkAuth are treated as non-fatal. Gate personalisation UI on this rather
  // than on a role-tier name: permissions union across a user's groups, so a
  // dual-role account is judged on what it can actually do.
  VIEW_USER_PREFERENCES = "view:user:preferences",
  EDIT_USER_PREFERENCES = "edit:user:preferences",
  // Guards all three custom-field-definition writes (create / update / delete)
  // on ally-be's CustomFieldsController. Held by the platform tiers *and* by a
  // tenant-scoped ADMIN, who gets it for the helpline-side
  // OrgCustomFieldDefinitionsSection — an ADMIN cannot reach the admin console's
  // Organization Detail route (no view:users / edit:user), so gating this
  // console's controls on it does not widen them.
  MANAGE_CUSTOM_FIELD_DEFINITIONS = "manage:custom-field:definitions",
}

export const SIDEBAR_ITEMS = {
  SIMULATION_STUDIO: "simulation-studio",
  EVENTS: "events",
  CHARACTER_LIBRARY: "character-library",
  USERS: "users",
  SCENARIO_VOICES: "scenario-voices",
  STT_CONFIGS: "stt-configs",
  LLM_CONFIGS: "llm-configs",
  LLM_MODEL_CATALOG: "llm-model-catalog",
  SCENARIO_LANGUAGES: "scenario-languages",
  PROMPTS: "prompts",
  USER_BADGES: "user-badges",
  MANAGE_GUARDRAILS: "manage-guardrails",
  TRANSLATIONS: "translations",
  TOOLTIPS: "tooltips",
  ANALYTICS: "analytics",
  AGENT_TEST_CASES: "agent-test-cases",
  PRODUCT_ROADMAP: "product-roadmap",
  COMPETENCIES: "competencies",
  ROLEPLAY_SESSION_LOGS: "roleplay-session-logs",
  BLOG: "blog",
  AI_LAB: "ai-lab",
  SETTINGS: "settings",
  LOGS: "logs",
  WHATSAPP_BOT: "whatsapp-bot",
  BUG_HUNTER: "bug-hunter",
  BUILDER: "builder",
};

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
