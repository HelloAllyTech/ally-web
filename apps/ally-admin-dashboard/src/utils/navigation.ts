import { NavigationItem } from "@components/types";
import {
  ROUTES,
  en,
  SIDEBAR_ITEMS,
  Permissions,
  UserRole,
  isSuperAdminRole,
  isSuperDuperAdminRole,
  isRoleplayStudioEmailAllowed,
} from "@constants";
import { store } from "@store";

/**
 * Tabs a SUPER_DUPER_ADMIN can reach but a plain SUPER_ADMIN cannot. Single
 * source of truth for both the role gate and the "superDuperAdminOnly" flag the
 * sidebar uses to render a small blue dot beside these labels. Built lazily
 * (like `buildNavigationItems`) so it doesn't read `@constants` at module-eval
 * time, which would break under circular imports.
 */
const buildSuperDuperAdminOnlyItems = (): Set<string> =>
  new Set<string>([
    SIDEBAR_ITEMS.CHARACTER_LIBRARY,
    // Matches the route gate: editing the STT registry changes which engine
    // every language (and every simulation defaulting to it) transcribes with.
    SIDEBAR_ITEMS.STT_CONFIGS,
    SIDEBAR_ITEMS.LLM_MODEL_CATALOG,
    SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
    SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
    SIDEBAR_ITEMS.TOOLTIPS,
    SIDEBAR_ITEMS.USER_BADGES,
    SIDEBAR_ITEMS.AGENT_TEST_CASES,
    SIDEBAR_ITEMS.SETTINGS,
    // AWS CloudWatch logs can carry sensitive request data — restrict to the
    // elevated tier, same as the SDA management surface.
    SIDEBAR_ITEMS.LOGS,
  ]);

/**
 * Builds the full set of admin navigation tabs in their default order. Built
 * lazily (not at module-eval time) to avoid reading `@constants` exports before
 * they are initialized under circular imports. Permission/role gating is applied
 * by `deriveNavigationItems`; the user's personalized order by `applySavedOrder`.
 */
const buildNavigationItems = (): NavigationItem[] => [
  {
    id: SIDEBAR_ITEMS.SIMULATION_STUDIO,
    label: en.simulation.rolePlays,
    path: ROUTES.SIMULATION_STUDIO,
  },
  {
    id: SIDEBAR_ITEMS.ROLEPLAY_STUDIO,
    label: en.roleplayStudio.navLabel,
    path: ROUTES.ROLEPLAY_STUDIO,
  },
  {
    id: SIDEBAR_ITEMS.EVENTS,
    label: en.simulation.events,
    path: ROUTES.MANAGE_EVENTS,
  },
  {
    id: SIDEBAR_ITEMS.CHARACTER_LIBRARY,
    label: "Characters",
    path: ROUTES.CHARACTER_LIBRARY,
  },
  {
    id: SIDEBAR_ITEMS.SCENARIO_VOICES,
    label: en.simulation.voices,
    path: ROUTES.MANAGE_SCENARIO_VOICES,
  },
  {
    id: SIDEBAR_ITEMS.STT_CONFIGS,
    label: "Speech Recognition",
    path: ROUTES.MANAGE_STT_CONFIGS,
  },
  {
    id: SIDEBAR_ITEMS.LLM_MODEL_CATALOG,
    label: "Language Model",
    path: ROUTES.MANAGE_LLM_MODEL_CATALOG,
  },
  {
    id: SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
    label: en.simulation.languages,
    path: ROUTES.MANAGE_SCENARIO_LANGUAGES,
  },
  {
    id: SIDEBAR_ITEMS.PROMPTS,
    label: en.simulation.prompts,
    path: ROUTES.MANAGE_PROMPTS,
  },
  {
    id: SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
    label: en.simulation.guardrails,
    path: ROUTES.MANAGE_GUARDRAILS,
  },
  {
    id: SIDEBAR_ITEMS.TRANSLATIONS,
    label: "Translations",
    path: ROUTES.MANAGE_TRANSLATIONS,
  },
  {
    id: SIDEBAR_ITEMS.TOOLTIPS,
    label: "Tooltips",
    path: ROUTES.MANAGE_TOOLTIPS,
  },
  {
    id: SIDEBAR_ITEMS.BLOG,
    label: "Blog",
    path: ROUTES.BLOG,
  },
  {
    id: SIDEBAR_ITEMS.PRODUCT_ROADMAP,
    label: "Product Roadmap",
    path: ROUTES.PRODUCT_ROADMAP,
  },
  {
    id: SIDEBAR_ITEMS.USERS,
    label: en.userManagement.users,
    path: ROUTES.USER_MANAGEMENT,
  },
  {
    id: SIDEBAR_ITEMS.USER_BADGES,
    label: en.userManagement.badges,
    path: ROUTES.USER_BADGES,
  },
  {
    id: SIDEBAR_ITEMS.ANALYTICS,
    label: "Analytics",
    path: ROUTES.ANALYTICS,
  },
  {
    id: SIDEBAR_ITEMS.AGENT_TEST_CASES,
    label: "Agent Test Cases",
    path: ROUTES.AGENT_TEST_CASES,
  },
  {
    id: SIDEBAR_ITEMS.COMPETENCIES,
    label: "Competencies",
    path: ROUTES.COMPETENCIES,
  },
  {
    id: SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
    label: "Roleplay Session Logs",
    path: ROUTES.ROLEPLAY_SESSION_LOGS,
  },
  {
    id: SIDEBAR_ITEMS.AI_LAB,
    label: en.aiLab.title,
    path: ROUTES.AI_LAB,
  },
  {
    id: SIDEBAR_ITEMS.SETTINGS,
    label: "Settings",
    path: ROUTES.SETTINGS,
  },
  {
    id: SIDEBAR_ITEMS.LOGS,
    label: "Logs",
    path: ROUTES.LOGS,
  },
];

/**
 * Returns `items` reordered to follow `savedOrder` (a list of item ids).
 * Ids in `savedOrder` that aren't currently visible are skipped, and visible
 * items missing from `savedOrder` (e.g. newly added tabs) are appended in their
 * original relative order. Tolerant of stale/unknown ids — never hides a tab.
 */
export const applySavedOrder = (
  items: NavigationItem[],
  savedOrder?: string[],
): NavigationItem[] => {
  if (!savedOrder?.length) return items;
  const byId = new Map(items.map(item => [item.id, item]));
  const ordered = savedOrder
    .map(id => byId.get(id))
    .filter((item): item is NavigationItem => Boolean(item));
  const orderedIds = new Set(savedOrder);
  const rest = items.filter(item => !orderedIds.has(item.id));
  return [...ordered, ...rest];
};

/**
 * Resolves the navigation tabs visible to a user, in their effective order,
 * then reordered by the user's saved sidebar order. The first element is the
 * user's "first tab" — used both to render the sidebar and to pick the default
 * landing route after login. Tabs fall into three gating tiers:
 *  - Super-duper-admin only (Characters, Languages, Guardrails, Tooltips,
 *    Badges, Agent Test Cases, Super Duper Admins, Settings, Logs): shown
 *    solely to SUPER_DUPER_ADMIN, independent of permissions.
 *  - Super-admin tier (Analytics, Competencies, AI Lab, Roleplay Session Logs):
 *    shown to both super-admin roles, independent of permissions.
 *  - Permission-gated (everything else): shown once permissions are loaded and
 *    the user holds the required permission.
 * The single-pass filter preserves each tab's natural order from
 * buildNavigationItems (Settings stays last).
 */
export const deriveNavigationItems = ({
  permissions,
  role,
  savedOrder,
  email,
}: {
  // Accepts `string[]` to match how permissions are stored in Redux; enum
  // members compare cleanly against the string entries.
  permissions: string[] | undefined;
  role: UserRole | undefined;
  savedOrder: string[] | undefined;
  /**
   * Logged-in user's email, used for allowlist-gated items (Roleplay Studio).
   * Optional for backward compatibility: when omitted, falls back to the user
   * slice in the store (read lazily at call time to avoid init-order issues).
   */
  email?: string;
}): NavigationItem[] => {
  const navigationItems = buildNavigationItems();
  const superDuperAdminOnlyItems = buildSuperDuperAdminOnlyItems();
  const resolvedEmail = email ?? store.getState()?.user?.user?.email;
  const isSuperAdmin = isSuperAdminRole(role);
  const isSuperDuperAdmin = isSuperDuperAdminRole(role);
  const hasPermissions = Boolean(permissions && permissions.length > 0);

  const visible = navigationItems.filter(item => {
    // Super-duper-admin-only tabs. Role-gated (no permission required); a plain
    // SUPER_ADMIN no longer sees these.
    if (superDuperAdminOnlyItems.has(item.id)) return isSuperDuperAdmin;

    switch (item.id) {
      // Super-admin-tier tabs (both super-admin roles). Role-gated.
      case SIDEBAR_ITEMS.ANALYTICS:
      case SIDEBAR_ITEMS.COMPETENCIES:
      case SIDEBAR_ITEMS.AI_LAB:
      case SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS:
        return isSuperAdmin;

      // Permission-gated tabs require permissions to be loaded; until then
      // show nothing for them.
      default:
        if (!hasPermissions) return false;
        switch (item.id) {
          case SIDEBAR_ITEMS.SIMULATION_STUDIO:
            return permissions!.includes(Permissions.EDIT_SCENARIO);
          case SIDEBAR_ITEMS.ROLEPLAY_STUDIO:
            // Rollout gate: permission AND the temporary email allowlist.
            return (
              permissions!.includes(Permissions.VIEW_ROLEPLAY_SPECS) &&
              isRoleplayStudioEmailAllowed(resolvedEmail)
            );
          case SIDEBAR_ITEMS.EVENTS:
            return permissions!.includes(Permissions.EDIT_EVENT);
          case SIDEBAR_ITEMS.SCENARIO_VOICES:
            return permissions!.includes(Permissions.EDIT_SCENARIO_VOICE);
          case SIDEBAR_ITEMS.PROMPTS:
            return permissions!.includes(Permissions.EDIT_PROMPT);
          case SIDEBAR_ITEMS.USERS:
            return (
              permissions!.includes(Permissions.EDIT_USER) ||
              permissions!.includes(Permissions.VIEW_USERS)
            );
          case SIDEBAR_ITEMS.TRANSLATIONS:
            return permissions!.includes(Permissions.VIEW_I18N_TRANSLATIONS);
          case SIDEBAR_ITEMS.BLOG:
            return permissions!.includes(Permissions.VIEW_BLOGS);
          // Permission-gated, deliberately NOT role-gated: viewing and voting on the
          // roadmap are meant to reach a wider group than the manage surface, so the tab
          // must stay out of buildSuperDuperAdminOnlyItems().
          case SIDEBAR_ITEMS.PRODUCT_ROADMAP:
            return permissions!.includes(Permissions.VIEW_PRODUCT_ROADMAP);
          default:
            return true;
        }
    }
  });

  // Tag the super-duper-admin-only tabs so the sidebar can render a blue dot
  // beside them. Only a SUPER_DUPER_ADMIN ever sees these tabs, so the flag is
  // unconditional on membership in the set.
  const flagged = visible.map(item =>
    superDuperAdminOnlyItems.has(item.id) ? { ...item, superDuperAdminOnly: true } : item,
  );

  return applySavedOrder(flagged, savedOrder);
};
