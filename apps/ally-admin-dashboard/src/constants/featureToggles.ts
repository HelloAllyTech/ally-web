/**
 * Feature-toggle keys, mirroring the backend registry
 * (`ally-be/src/authorization/constants/admin-feature-toggle.constants.ts`).
 *
 * This is UI wiring — which sidebar item / route maps to which key — kept
 * separate from the registry's human-facing `label`/`description`, which are
 * always fetched from `GET /v1/authorization/feature-toggles/registry` rather
 * than hardcoded here. Key literals are duplicated once, here, so every call
 * site (nav, routes, in-page gates, the toggle editor) references the same
 * constant instead of retyping the string.
 */
export const FeatureToggleKey = {
  MANAGE_SCENARIO_LANGUAGES: "manage_scenario_languages",
  AI_LAB: "ai_lab",
  COMPETENCIES: "competencies",
  ROLEPLAY_SESSION_LOGS: "roleplay_session_logs",
  ORG_DETAIL_CONTENT_TABS: "org_detail_content_tabs",
  CONTENT_MANAGEMENT: "content_management",
  ANALYTICS: "analytics",
  ANALYTICS_AGENT: "analytics_agent",
  ANALYTICS_SUGGESTIONS: "analytics_suggestions",
  UX_SIGNALS: "ux_signals",
  USER_BADGES: "user_badges",
  CHARACTER_LIBRARY: "character_library",
  MANAGE_STT_CONFIGS: "manage_stt_configs",
  MANAGE_LLM_MODEL_CATALOG: "manage_llm_model_catalog",
  MANAGE_GUARDRAILS: "manage_guardrails",
  MANAGE_TOOLTIPS: "manage_tooltips",
  SETTINGS: "settings",
  LOGS: "logs",
  MOBILE_RELEASES: "mobile_releases",
  AGENT_TEST_CASES: "agent_test_cases",
  WHATSAPP_BOT: "whatsapp_bot",
  KNOWLEDGE_BASE: "knowledge_base",
  PRODUCT_ROADMAP_MANAGE: "product_roadmap_manage",
  ADMIN_USER_MANAGEMENT: "admin_user_management",
  MULTI_TENANT_ALLOWLIST_MANAGEMENT: "multi_tenant_allowlist_management",
  BUG_HUNTER: "bug_hunter",
  BUILDER: "builder",
  OPERATIONAL_ADMIN_ACTIONS: "operational_admin_actions",
} as const;

export type FeatureToggleKeyType = (typeof FeatureToggleKey)[keyof typeof FeatureToggleKey];

/**
 * Org-level (per-tenant) toggles — a different axis from FeatureToggleKey
 * above, which is per-USER and only ever set for platform admins. An org
 * toggle is flipped by a platform admin on the organisation, and switches a
 * surface on for that org's OWN admins. Backed by a `preference` row, read one
 * at a time via its own settings endpoint.
 */
export const OrgToggle = {
  CHARACTER_LIBRARY: "character_library",
} as const;

export type OrgToggle = (typeof OrgToggle)[keyof typeof OrgToggle];

/**
 * Sidebar item id -> the org toggle plus the permission that together surface
 * it for a tenant's own admins. The mirror of buildSidebarItemFeatureKeyMap for
 * the org axis; same lazy-build rule, same reason.
 *
 * `permission` is a plain string rather than the Permissions enum to keep this
 * module free of a `@constants` cross-import at module scope.
 */
export const buildSidebarItemOrgToggleMap = (
  sidebarItems: Record<string, string>,
): Map<string, { toggle: OrgToggle; permission: string }> =>
  new Map([
    [
      sidebarItems.CHARACTER_LIBRARY,
      { toggle: OrgToggle.CHARACTER_LIBRARY, permission: "view:scenario-character" },
    ],
  ]);

/**
 * Sidebar item id -> feature-toggle key. Single source of truth for nav
 * gating (utils/navigation.ts) — replaces the old buildSuperDuperAdminOnlyItems()
 * set and the SUPER_ADMIN_ROLES switch branch with one lookup. Built lazily by
 * the caller (not at module scope) wherever it needs SIDEBAR_ITEMS, to match
 * this codebase's "no module-load-time work across circular imports" rule.
 */
export const buildSidebarItemFeatureKeyMap = (
  sidebarItems: Record<string, string>,
): Map<string, string> =>
  new Map<string, string>([
    [sidebarItems.CHARACTER_LIBRARY, FeatureToggleKey.CHARACTER_LIBRARY],
    [sidebarItems.STT_CONFIGS, FeatureToggleKey.MANAGE_STT_CONFIGS],
    [sidebarItems.LLM_MODEL_CATALOG, FeatureToggleKey.MANAGE_LLM_MODEL_CATALOG],
    [sidebarItems.MANAGE_GUARDRAILS, FeatureToggleKey.MANAGE_GUARDRAILS],
    [sidebarItems.TOOLTIPS, FeatureToggleKey.MANAGE_TOOLTIPS],
    [sidebarItems.USER_BADGES, FeatureToggleKey.USER_BADGES],
    [sidebarItems.AGENT_TEST_CASES, FeatureToggleKey.AGENT_TEST_CASES],
    [sidebarItems.SETTINGS, FeatureToggleKey.SETTINGS],
    [sidebarItems.LOGS, FeatureToggleKey.LOGS],
    [sidebarItems.MOBILE_RELEASES, FeatureToggleKey.MOBILE_RELEASES],
    [sidebarItems.WHATSAPP_BOT, FeatureToggleKey.WHATSAPP_BOT],
    [sidebarItems.BUG_HUNTER, FeatureToggleKey.BUG_HUNTER],
    [sidebarItems.BUILDER, FeatureToggleKey.BUILDER],
    [sidebarItems.ANALYTICS, FeatureToggleKey.ANALYTICS],
    [sidebarItems.COMPETENCIES, FeatureToggleKey.COMPETENCIES],
    [sidebarItems.AI_LAB, FeatureToggleKey.AI_LAB],
    [sidebarItems.ROLEPLAY_SESSION_LOGS, FeatureToggleKey.ROLEPLAY_SESSION_LOGS],
    [sidebarItems.SCENARIO_LANGUAGES, FeatureToggleKey.MANAGE_SCENARIO_LANGUAGES],
  ]);

/**
 * Section groupings for the ~24-toggle editor (Admin User Management detail
 * view), mirroring the layout ComfortAudioSettings uses for its grouped
 * toggles. A straightforward categorization of the registry — assigned here
 * once so the editor doesn't need its own copy.
 */
export const FEATURE_TOGGLE_SECTIONS = {
  ANALYTICS: "Analytics",
  CONTENT_AND_SIMULATION_CONFIG: "Content & Simulation Config",
  PLATFORM_CONFIG: "Platform Config",
  USER_AND_ORG_MANAGEMENT: "User & Org Management",
  TESTING: "Testing",
} as const;

export type FeatureToggleSection =
  (typeof FEATURE_TOGGLE_SECTIONS)[keyof typeof FEATURE_TOGGLE_SECTIONS];

/** feature key -> section label, for grouping the toggle editor's rows. */
export const FEATURE_TOGGLE_KEY_TO_SECTION: Record<string, FeatureToggleSection> = {
  [FeatureToggleKey.ANALYTICS]: FEATURE_TOGGLE_SECTIONS.ANALYTICS,
  [FeatureToggleKey.ANALYTICS_AGENT]: FEATURE_TOGGLE_SECTIONS.ANALYTICS,
  [FeatureToggleKey.ANALYTICS_SUGGESTIONS]: FEATURE_TOGGLE_SECTIONS.ANALYTICS,

  [FeatureToggleKey.MANAGE_SCENARIO_LANGUAGES]:
    FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.CHARACTER_LIBRARY]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.MANAGE_STT_CONFIGS]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.MANAGE_LLM_MODEL_CATALOG]:
    FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.MANAGE_GUARDRAILS]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.MANAGE_TOOLTIPS]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.COMPETENCIES]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.AI_LAB]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.ORG_DETAIL_CONTENT_TABS]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  [FeatureToggleKey.CONTENT_MANAGEMENT]: FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,

  [FeatureToggleKey.SETTINGS]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.LOGS]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.MOBILE_RELEASES]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.KNOWLEDGE_BASE]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.WHATSAPP_BOT]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.OPERATIONAL_ADMIN_ACTIONS]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.BUG_HUNTER]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.BUILDER]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  [FeatureToggleKey.UX_SIGNALS]: FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,

  [FeatureToggleKey.USER_BADGES]: FEATURE_TOGGLE_SECTIONS.USER_AND_ORG_MANAGEMENT,
  [FeatureToggleKey.ADMIN_USER_MANAGEMENT]: FEATURE_TOGGLE_SECTIONS.USER_AND_ORG_MANAGEMENT,
  [FeatureToggleKey.MULTI_TENANT_ALLOWLIST_MANAGEMENT]:
    FEATURE_TOGGLE_SECTIONS.USER_AND_ORG_MANAGEMENT,
  [FeatureToggleKey.PRODUCT_ROADMAP_MANAGE]: FEATURE_TOGGLE_SECTIONS.USER_AND_ORG_MANAGEMENT,

  [FeatureToggleKey.AGENT_TEST_CASES]: FEATURE_TOGGLE_SECTIONS.TESTING,
  [FeatureToggleKey.ROLEPLAY_SESSION_LOGS]: FEATURE_TOGGLE_SECTIONS.TESTING,
};

/** Order sections should render in the toggle editor. */
export const FEATURE_TOGGLE_SECTION_ORDER: FeatureToggleSection[] = [
  FEATURE_TOGGLE_SECTIONS.ANALYTICS,
  FEATURE_TOGGLE_SECTIONS.CONTENT_AND_SIMULATION_CONFIG,
  FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG,
  FEATURE_TOGGLE_SECTIONS.USER_AND_ORG_MANAGEMENT,
  FEATURE_TOGGLE_SECTIONS.TESTING,
];

/** Section a key not yet categorized here falls back to, so a new backend key never disappears. */
export const DEFAULT_FEATURE_TOGGLE_SECTION: FeatureToggleSection =
  FEATURE_TOGGLE_SECTIONS.PLATFORM_CONFIG;
