import { NavigationItem } from "@components/types";
import {
  ROUTES,
  en,
  SIDEBAR_ITEMS,
  Permissions,
  buildSidebarItemFeatureKeyMap,
  buildSidebarItemOrgToggleMap,
  isRoleplayStudioEmailAllowed,
  OrgToggle,
} from "@constants";
import { store } from "@store";

import { hasFeature } from "./permissions";

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
  {
    id: SIDEBAR_ITEMS.BUG_HUNTER,
    label: en.bugHunter.tabLabel,
    path: ROUTES.BUG_HUNTER,
  },
  {
    id: SIDEBAR_ITEMS.WHATSAPP_BOT,
    label: en.whatsappBot.navLabel,
    path: ROUTES.WHATSAPP_BOT,
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
 * landing route after login. Tabs fall into two gating tiers:
 *  - Feature-toggle-gated (Characters, Speech Recognition, Language Model,
 *    Guardrails, Tooltips, Badges, Agent Test Cases, Settings, Logs,
 *    WhatsApp Bot, Bug Hunter, Analytics, Competencies, AI Lab, Roleplay
 *    Session Logs, Languages): shown once the user's feature-toggle list is
 *    loaded and holds the matching key (see `buildSidebarItemFeatureKeyMap`),
 *    independent of permissions. This one map replaces the former
 *    buildSuperDuperAdminOnlyItems() set and the SUPER_ADMIN_ROLES switch
 *    branch — both were role-tier gates for exactly these tabs.
 *  - Permission-gated (everything else): shown once permissions are loaded and
 *    the user holds the required permission.
 * The single-pass filter preserves each tab's natural order from
 * buildNavigationItems (Settings stays last).
 */
export const deriveNavigationItems = ({
  permissions,
  features,
  savedOrder,
  email,
  orgToggles,
}: {
  // Accepts `string[]` to match how permissions/features are stored in Redux;
  // enum members compare cleanly against the string entries.
  permissions: string[] | undefined;
  features: string[] | undefined;
  savedOrder: string[] | undefined;
  /**
   * Logged-in user's email, used for allowlist-gated items (Roleplay Studio).
   * Optional for backward compatibility: when omitted, falls back to the user
   * slice in the store (read lazily at call time to avoid init-order issues).
   */
  email?: string;
  /**
   * Org-level (per-tenant) toggles the caller's organisation has switched on.
   * A tab whose per-user feature toggle is absent can still appear via this
   * route — that is how a tenant's own ADMINs see Characters. Optional: an
   * omitted or empty map behaves exactly as before.
   */
  orgToggles?: Partial<Record<OrgToggle, boolean>>;
}): NavigationItem[] => {
  const navigationItems = buildNavigationItems();
  const featureGatedItems = buildSidebarItemFeatureKeyMap(SIDEBAR_ITEMS);
  const orgGatedItems = buildSidebarItemOrgToggleMap(SIDEBAR_ITEMS);
  const resolvedEmail = email ?? store.getState()?.user?.user?.email;
  const hasPermissions = Boolean(permissions && permissions.length > 0);

  const visible = navigationItems.filter(item => {
    // Feature-toggle-gated tabs. Independent of permissions — a tab here is
    // either the user's toggle grants it or it does not exist for them.
    const featureKey = featureGatedItems.get(item.id);
    if (featureKey) {
      if (hasFeature(features, featureKey)) return true;
      // Second grant path for a tenant's own admins: the ORG has the feature
      // on and this user holds the permission to use it. Both halves are
      // required — the org switch alone must not surface the tab for, say, a
      // counsellor who happens to log into admin.
      const orgGate = orgGatedItems.get(item.id);
      return Boolean(
        orgGate &&
        orgToggles?.[orgGate.toggle] &&
        hasPermissions &&
        permissions!.includes(orgGate.permission),
      );
    }

    switch (item.id) {
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
          // Permission-gated, deliberately NOT feature-toggle-gated: viewing and
          // voting on the roadmap are meant to reach a wider group than the
          // manage surface, so the tab must stay out of the feature-key map.
          case SIDEBAR_ITEMS.PRODUCT_ROADMAP:
            return permissions!.includes(Permissions.VIEW_PRODUCT_ROADMAP);
          default:
            return true;
        }
    }
  });

  return applySavedOrder(visible, savedOrder);
};
