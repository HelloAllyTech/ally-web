import { describe, it, expect } from "vitest";

import { NavigationItem } from "@components/types";
import { ROUTES, SIDEBAR_ITEMS, Permissions, FeatureToggleKey } from "@constants";

import { applySavedOrder, deriveNavigationItems } from "../navigation";

describe("applySavedOrder", () => {
  const items: NavigationItem[] = [
    { id: "a", label: "A", path: "/a" },
    { id: "b", label: "B", path: "/b" },
    { id: "c", label: "C", path: "/c" },
  ];

  it("returns items unchanged when there is no saved order", () => {
    expect(applySavedOrder(items)).toEqual(items);
    expect(applySavedOrder(items, [])).toEqual(items);
  });

  it("reorders items to follow the saved order", () => {
    expect(applySavedOrder(items, ["c", "a", "b"]).map(i => i.id)).toEqual(["c", "a", "b"]);
  });

  it("appends visible items missing from the saved order, in original relative order", () => {
    expect(applySavedOrder(items, ["c"]).map(i => i.id)).toEqual(["c", "a", "b"]);
  });

  it("ignores stale/unknown ids in the saved order without hiding any tab", () => {
    expect(applySavedOrder(items, ["zzz", "b", "ghost"]).map(i => i.id)).toEqual(["b", "a", "c"]);
  });
});

// Every key the feature-toggle-gated tier maps to (see buildSidebarItemFeatureKeyMap).
const ALL_FEATURE_GATED_KEYS = [
  FeatureToggleKey.CHARACTER_LIBRARY,
  FeatureToggleKey.MANAGE_STT_CONFIGS,
  FeatureToggleKey.MANAGE_LLM_MODEL_CATALOG,
  FeatureToggleKey.MANAGE_GUARDRAILS,
  FeatureToggleKey.MANAGE_TOOLTIPS,
  FeatureToggleKey.USER_BADGES,
  FeatureToggleKey.AGENT_TEST_CASES,
  FeatureToggleKey.SETTINGS,
  FeatureToggleKey.LOGS,
  FeatureToggleKey.WHATSAPP_BOT,
  FeatureToggleKey.BUG_HUNTER,
  FeatureToggleKey.ANALYTICS,
  FeatureToggleKey.COMPETENCIES,
  FeatureToggleKey.AI_LAB,
  FeatureToggleKey.ROLEPLAY_SESSION_LOGS,
  FeatureToggleKey.MANAGE_SCENARIO_LANGUAGES,
];

describe("deriveNavigationItems", () => {
  it("returns no items when permissions/features are missing/empty", () => {
    expect(
      deriveNavigationItems({ permissions: undefined, features: undefined, savedOrder: undefined }),
    ).toEqual([]);
    expect(
      deriveNavigationItems({ permissions: [], features: [], savedOrder: undefined }),
    ).toEqual([]);
  });

  it("shows Product Roadmap for a user holding only VIEW_PRODUCT_ROADMAP", () => {
    // Deliberately permission-gated rather than feature-toggle-gated, because viewing and
    // voting are meant to reach a wider group than the manage surface. If someone moves the
    // tab into buildSidebarItemFeatureKeyMap, this fails.
    const result = deriveNavigationItems({
      permissions: [Permissions.VIEW_PRODUCT_ROADMAP],
      features: [],
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.PRODUCT_ROADMAP]);
    expect(result[0].path).toBe(ROUTES.PRODUCT_ROADMAP);
  });

  it("hides Product Roadmap from a holder of every feature toggle who lacks the permission", () => {
    // Feature toggles alone must not unlock it — the permission grant is what does.
    const result = deriveNavigationItems({
      permissions: [],
      features: ALL_FEATURE_GATED_KEYS,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.PRODUCT_ROADMAP);
  });

  it("filters permission-gated items to those the user can access", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_EVENT],
      features: [],
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.EVENTS]);
    expect(result[0].path).toBe(ROUTES.MANAGE_EVENTS);
  });

  it("resolves Simulation Studio as the first tab for a user with EDIT_SCENARIO", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      features: [],
      savedOrder: undefined,
    });
    expect(result[0].id).toBe(SIDEBAR_ITEMS.SIMULATION_STUDIO);
    expect(result[0].path).toBe(ROUTES.SIMULATION_STUDIO);
  });

  it("treats USERS as accessible with either EDIT_USER or VIEW_USERS", () => {
    expect(
      deriveNavigationItems({
        permissions: [Permissions.VIEW_USERS],
        features: [],
        savedOrder: undefined,
      }).map(i => i.id),
    ).toContain(SIDEBAR_ITEMS.USERS);
  });

  it("shows only the tabs whose feature toggle is held, independent of permissions", () => {
    const result = deriveNavigationItems({
      permissions: [],
      features: [FeatureToggleKey.ANALYTICS, FeatureToggleKey.COMPETENCIES],
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    expect(ids).toContain(SIDEBAR_ITEMS.ANALYTICS);
    expect(ids).toContain(SIDEBAR_ITEMS.COMPETENCIES);
    // Every other feature-gated tab stays hidden — only the two held keys unlock.
    expect(ids).not.toContain(SIDEBAR_ITEMS.AI_LAB);
    expect(ids).not.toContain(SIDEBAR_ITEMS.SETTINGS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
  });

  it("shows every feature-gated tab to a holder of every key", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      features: ALL_FEATURE_GATED_KEYS,
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    expect(ids).toContain(SIDEBAR_ITEMS.SETTINGS);
    expect(ids).toContain(SIDEBAR_ITEMS.LOGS);
    expect(ids).toContain(SIDEBAR_ITEMS.AGENT_TEST_CASES);
    expect(ids).toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).toContain(SIDEBAR_ITEMS.USER_BADGES);
    expect(ids).toContain(SIDEBAR_ITEMS.ANALYTICS);
    expect(ids).toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
    expect(ids).toContain(SIDEBAR_ITEMS.BUG_HUNTER);
  });

  it("hides every feature-gated tab from a regular admin even when they hold every permission", () => {
    const result = deriveNavigationItems({
      permissions: [
        Permissions.EDIT_CHARACTER_LIBRARY,
        Permissions.EDIT_SCENARIO_LANGUAGE,
        Permissions.EDIT_GUARDRAIL,
        Permissions.VIEW_TOOLTIPS,
        Permissions.VIEW_ADMIN_BADGE,
      ],
      features: [],
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    expect(ids).not.toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).not.toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.USER_BADGES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
  });

  it("applies the user's saved order so their chosen tab is first", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT],
      features: [],
      savedOrder: [SIDEBAR_ITEMS.EVENTS],
    });
    expect(result[0].id).toBe(SIDEBAR_ITEMS.EVENTS);
  });

  it("never surfaces feature-gated items for a non-holder, even via a stale saved order", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_EVENT],
      features: [],
      savedOrder: [SIDEBAR_ITEMS.ANALYTICS, SIDEBAR_ITEMS.SETTINGS, SIDEBAR_ITEMS.EVENTS],
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.EVENTS]);
  });

  it("shows WhatsApp Bot to a holder of the whatsapp_bot toggle", () => {
    const result = deriveNavigationItems({
      permissions: [],
      features: [FeatureToggleKey.WHATSAPP_BOT],
      savedOrder: undefined,
    });
    const item = result.find(i => i.id === SIDEBAR_ITEMS.WHATSAPP_BOT);
    expect(item).toBeDefined();
    expect(item?.path).toBe(ROUTES.WHATSAPP_BOT);
  });

  it("hides WhatsApp Bot from a user holding every permission but not the toggle", () => {
    // The corpus is what the bot tells mental healthcare workers, and the conversation log
    // holds their clinical questions beside their phone numbers — so a permission grant must
    // not be able to unlock it on its own.
    const result = deriveNavigationItems({
      permissions: Object.values(Permissions),
      features: [],
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
  });
});
