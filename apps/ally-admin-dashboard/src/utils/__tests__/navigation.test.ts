import { describe, it, expect } from "vitest";

import { NavigationItem } from "@components/types";
import { ROUTES, SIDEBAR_ITEMS, Permissions, UserRole } from "@constants";

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

describe("deriveNavigationItems", () => {
  it("returns no items when permissions are missing/empty for a non-super-admin", () => {
    expect(
      deriveNavigationItems({ permissions: undefined, role: undefined, savedOrder: undefined }),
    ).toEqual([]);
    expect(
      deriveNavigationItems({ permissions: [], role: UserRole.ADMIN, savedOrder: undefined }),
    ).toEqual([]);
  });

  it("shows Product Roadmap for a user holding only VIEW_PRODUCT_ROADMAP", () => {
    // Deliberately permission-gated rather than role-gated, because viewing and voting are
    // meant to reach a wider group than the manage surface. If someone moves the tab into
    // buildSuperDuperAdminOnlyItems(), this fails.
    const result = deriveNavigationItems({
      permissions: [Permissions.VIEW_PRODUCT_ROADMAP],
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.PRODUCT_ROADMAP]);
    expect(result[0].path).toBe(ROUTES.PRODUCT_ROADMAP);
  });

  it("hides Product Roadmap from a super-duper-admin who lacks the permission", () => {
    // Role alone must not unlock it — the grant migration is what does.
    const result = deriveNavigationItems({
      permissions: [],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.PRODUCT_ROADMAP);
  });

  it("filters permission-gated items to those the user can access", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_EVENT],
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.EVENTS]);
    expect(result[0].path).toBe(ROUTES.MANAGE_EVENTS);
  });

  it("resolves Simulation Studio as the first tab for a user with EDIT_SCENARIO", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    expect(result[0].id).toBe(SIDEBAR_ITEMS.SIMULATION_STUDIO);
    expect(result[0].path).toBe(ROUTES.SIMULATION_STUDIO);
  });

  it("treats USERS as accessible with either EDIT_USER or VIEW_USERS", () => {
    expect(
      deriveNavigationItems({
        permissions: [Permissions.VIEW_USERS],
        role: UserRole.ADMIN,
        savedOrder: undefined,
      }).map(i => i.id),
    ).toContain(SIDEBAR_ITEMS.USERS);
  });

  it("shows a plain super-admin the super-admin-tier tabs but not the super-duper-only tabs", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.SUPER_ADMIN,
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    // Super-admin-tier tabs remain visible to a plain super-admin.
    expect(ids).toContain(SIDEBAR_ITEMS.ANALYTICS);
    expect(ids).toContain(SIDEBAR_ITEMS.COMPETENCIES);
    expect(ids).toContain(SIDEBAR_ITEMS.AI_LAB);
    expect(ids).toContain(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS);
    expect(ids).toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    // Super-duper-admin-only tabs are hidden from a plain super-admin.
    expect(ids).not.toContain(SIDEBAR_ITEMS.SETTINGS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.LOGS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.AGENT_TEST_CASES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).not.toContain(SIDEBAR_ITEMS.STT_CONFIGS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.USER_BADGES);
  });

  it("shows only super-admin-tier items to a super-admin with no permissions", () => {
    const result = deriveNavigationItems({
      permissions: [],
      role: UserRole.SUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([
      SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
      SIDEBAR_ITEMS.ANALYTICS,
      SIDEBAR_ITEMS.COMPETENCIES,
      SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
      SIDEBAR_ITEMS.AI_LAB,
    ]);
  });

  it("exposes the super-duper-only tabs (and super-admin-tier tabs) to a super-duper-admin, Logs last", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    // Permission-gated tab still resolves as the first tab.
    expect(ids[0]).toBe(SIDEBAR_ITEMS.SIMULATION_STUDIO);
    // Super-duper-only tabs are all present.
    expect(ids).toContain(SIDEBAR_ITEMS.SETTINGS);
    expect(ids).toContain(SIDEBAR_ITEMS.LOGS);
    expect(ids).toContain(SIDEBAR_ITEMS.AGENT_TEST_CASES);
    expect(ids).toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).toContain(SIDEBAR_ITEMS.USER_BADGES);
    // Super-admin-tier tabs remain visible too (duper is a super-admin).
    expect(ids).toContain(SIDEBAR_ITEMS.ANALYTICS);
    expect(ids).toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
    // WhatsApp Bot is appended after Logs in the default order.
    expect(ids[ids.length - 1]).toBe(SIDEBAR_ITEMS.WHATSAPP_BOT);
  });

  it("shows the super-duper-only + super-admin-tier tabs, in natural order, to a super-duper-admin with no permissions", () => {
    const result = deriveNavigationItems({
      permissions: [],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([
      SIDEBAR_ITEMS.CHARACTER_LIBRARY,
      SIDEBAR_ITEMS.STT_CONFIGS,
      SIDEBAR_ITEMS.LLM_MODEL_CATALOG,
      SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
      SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
      SIDEBAR_ITEMS.TOOLTIPS,
      SIDEBAR_ITEMS.USER_BADGES,
      SIDEBAR_ITEMS.ANALYTICS,
      SIDEBAR_ITEMS.AGENT_TEST_CASES,
      SIDEBAR_ITEMS.COMPETENCIES,
      SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
      SIDEBAR_ITEMS.AI_LAB,
      SIDEBAR_ITEMS.SETTINGS,
      SIDEBAR_ITEMS.LOGS,
      SIDEBAR_ITEMS.WHATSAPP_BOT,
    ]);
  });

  it("hides the super-duper-only tabs from a regular admin even when they hold the underlying permission", () => {
    const result = deriveNavigationItems({
      permissions: [
        Permissions.EDIT_CHARACTER_LIBRARY,
        Permissions.EDIT_SCENARIO_LANGUAGE,
        Permissions.EDIT_GUARDRAIL,
        Permissions.VIEW_TOOLTIPS,
        Permissions.VIEW_ADMIN_BADGE,
      ],
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    const ids = result.map(i => i.id);
    expect(ids).not.toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    // Languages is super-admin-tier now, so a regular admin is still excluded.
    expect(ids).not.toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.USER_BADGES);
  });

  it("exposes Roleplay Session Logs to both super-admin tiers but not to a regular admin", () => {
    const superDuperAdmin = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(superDuperAdmin.map(i => i.id)).toContain(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS);

    // A plain super-admin sees it too — it is a read-only cross-tenant view.
    const superAdmin = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.SUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(superAdmin.map(i => i.id)).toContain(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS);

    const admin = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    expect(admin.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS);
  });

  it("flags super-duper-only tabs with superDuperAdminOnly and leaves other tabs unflagged", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    const flagged = new Set(result.filter(i => i.superDuperAdminOnly).map(i => i.id));
    // The super-duper-only tabs carry the flag (drives the sidebar's blue dot).
    expect(flagged).toEqual(
      new Set([
        SIDEBAR_ITEMS.CHARACTER_LIBRARY,
        SIDEBAR_ITEMS.STT_CONFIGS,
        SIDEBAR_ITEMS.LLM_MODEL_CATALOG,
        SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
        SIDEBAR_ITEMS.TOOLTIPS,
        SIDEBAR_ITEMS.USER_BADGES,
        SIDEBAR_ITEMS.AGENT_TEST_CASES,
        SIDEBAR_ITEMS.SETTINGS,
        SIDEBAR_ITEMS.LOGS,
        SIDEBAR_ITEMS.WHATSAPP_BOT,
      ]),
    );
    // Super-admin-tier and permission-gated tabs stay unflagged (no dot).
    const byId = new Map(result.map(i => [i.id, i]));
    expect(byId.get(SIDEBAR_ITEMS.ANALYTICS)?.superDuperAdminOnly).toBeFalsy();
    expect(byId.get(SIDEBAR_ITEMS.COMPETENCIES)?.superDuperAdminOnly).toBeFalsy();
    expect(byId.get(SIDEBAR_ITEMS.AI_LAB)?.superDuperAdminOnly).toBeFalsy();
    expect(byId.get(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS)?.superDuperAdminOnly).toBeFalsy();
    expect(byId.get(SIDEBAR_ITEMS.SCENARIO_LANGUAGES)?.superDuperAdminOnly).toBeFalsy();
    expect(byId.get(SIDEBAR_ITEMS.SIMULATION_STUDIO)?.superDuperAdminOnly).toBeFalsy();
  });

  it("applies the user's saved order so their chosen tab is first", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT],
      role: UserRole.ADMIN,
      savedOrder: [SIDEBAR_ITEMS.EVENTS],
    });
    expect(result[0].id).toBe(SIDEBAR_ITEMS.EVENTS);
  });

  it("never surfaces role-gated items for a non-super-admin, even via a stale saved order", () => {
    const result = deriveNavigationItems({
      permissions: [Permissions.EDIT_EVENT],
      role: UserRole.ADMIN,
      savedOrder: [SIDEBAR_ITEMS.ANALYTICS, SIDEBAR_ITEMS.SETTINGS, SIDEBAR_ITEMS.EVENTS],
    });
    expect(result.map(i => i.id)).toEqual([SIDEBAR_ITEMS.EVENTS]);
  });

  it("shows WhatsApp Bot to a super-duper-admin", () => {
    const result = deriveNavigationItems({
      permissions: [],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    const item = result.find(i => i.id === SIDEBAR_ITEMS.WHATSAPP_BOT);
    expect(item).toBeDefined();
    expect(item?.path).toBe(ROUTES.WHATSAPP_BOT);
    // The sidebar renders a blue dot from this flag, marking the elevated tier.
    expect(item?.superDuperAdminOnly).toBe(true);
  });

  it("hides WhatsApp Bot from a plain super-admin holding every permission", () => {
    // The corpus decides what the bot tells mental healthcare workers, and the conversation log
    // holds their clinical questions beside their phone numbers — so this is SDA-only, and a
    // permission grant must not be able to unlock it. If someone moves the tab out of
    // buildSuperDuperAdminOnlyItems(), this fails.
    const result = deriveNavigationItems({
      permissions: Object.values(Permissions),
      role: UserRole.SUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
  });

  it("hides WhatsApp Bot from a regular admin", () => {
    const result = deriveNavigationItems({
      permissions: Object.values(Permissions),
      role: UserRole.ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).not.toContain(SIDEBAR_ITEMS.WHATSAPP_BOT);
  });
});
