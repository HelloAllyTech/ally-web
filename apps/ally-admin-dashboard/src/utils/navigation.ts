import { NavigationItem } from "@components/types";
import {
  ROUTES,
  en,
  SIDEBAR_ITEMS,
  Permissions,
  UserRole,
  isSuperAdminRole,
  isRoleplayStudioEmailAllowed,
} from "@constants";
import { store } from "@store";

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
    id: SIDEBAR_ITEMS.SETTINGS,
    label: "Settings",
    path: ROUTES.SETTINGS,
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
 * Resolves the navigation tabs visible to a user, in their effective order:
 * permission-gated items (require permissions to be loaded), plus role-gated
 * items (Analytics, Settings) for super-admins, then reordered by the user's
 * saved sidebar order. The first element is the user's "first tab" — used both
 * to render the sidebar and to pick the default landing route after login.
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
  const resolvedEmail = email ?? store.getState()?.user?.user?.email;
  const isSuperAdmin = isSuperAdminRole(role);
  // Role-gated (super-admin only) items, appended below independently of
  // permissions, in nav order: Analytics then Settings (last).
  const roleGatedItems = navigationItems.filter(item =>
    [
      SIDEBAR_ITEMS.ANALYTICS,
      SIDEBAR_ITEMS.AGENT_TEST_CASES,
      SIDEBAR_ITEMS.COMPETENCIES,
      SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
      SIDEBAR_ITEMS.SETTINGS,
    ].includes(item.id),
  );

  // Permission-gated items require permissions to be loaded; until then show
  // nothing for them. Role-gated items are appended below.
  const base =
    !permissions || permissions.length === 0
      ? []
      : navigationItems.filter(item => {
          switch (item.id) {
            case SIDEBAR_ITEMS.SIMULATION_STUDIO:
              return permissions.includes(Permissions.EDIT_SCENARIO);
            case SIDEBAR_ITEMS.ROLEPLAY_STUDIO:
              // Rollout gate: permission AND the temporary email allowlist.
              return (
                permissions.includes(Permissions.VIEW_ROLEPLAY_SPECS) &&
                isRoleplayStudioEmailAllowed(resolvedEmail)
              );
            case SIDEBAR_ITEMS.EVENTS:
              return permissions.includes(Permissions.EDIT_EVENT);
            case SIDEBAR_ITEMS.CHARACTER_LIBRARY:
              return permissions.includes(Permissions.EDIT_CHARACTER_LIBRARY);
            case SIDEBAR_ITEMS.SCENARIO_VOICES:
              return permissions.includes(Permissions.EDIT_SCENARIO_VOICE);
            case SIDEBAR_ITEMS.SCENARIO_LANGUAGES:
              return permissions.includes(Permissions.EDIT_SCENARIO_LANGUAGE);
            case SIDEBAR_ITEMS.PROMPTS:
              return permissions.includes(Permissions.EDIT_PROMPT);
            case SIDEBAR_ITEMS.USERS:
              return (
                permissions.includes(Permissions.EDIT_USER) ||
                permissions.includes(Permissions.VIEW_USERS)
              );
            case SIDEBAR_ITEMS.MANAGE_GUARDRAILS:
              return permissions.includes(Permissions.EDIT_GUARDRAIL);
            case SIDEBAR_ITEMS.TRANSLATIONS:
              return permissions.includes(Permissions.VIEW_I18N_TRANSLATIONS);
            case SIDEBAR_ITEMS.TOOLTIPS:
              return permissions.includes(Permissions.VIEW_TOOLTIPS);
            case SIDEBAR_ITEMS.BLOG:
              return permissions.includes(Permissions.VIEW_BLOGS);
            case SIDEBAR_ITEMS.USER_BADGES:
              return permissions.includes(Permissions.VIEW_ADMIN_BADGE);
            case SIDEBAR_ITEMS.ANALYTICS:
            case SIDEBAR_ITEMS.AGENT_TEST_CASES:
            case SIDEBAR_ITEMS.COMPETENCIES:
            case SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS:
            case SIDEBAR_ITEMS.SETTINGS:
              // Role-gated, not permission-gated; appended below for super-admins.
              return false;
            default:
              return true;
          }
        });

  const visible = isSuperAdmin ? [...base, ...roleGatedItems] : base;
  return applySavedOrder(visible, savedOrder);
};
