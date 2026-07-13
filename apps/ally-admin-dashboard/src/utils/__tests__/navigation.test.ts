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
    expect(ids).toContain(SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS);
    // Super-duper-admin-only tabs are hidden from a plain super-admin.
    expect(ids).not.toContain(SIDEBAR_ITEMS.SETTINGS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.AGENT_TEST_CASES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).not.toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
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
      SIDEBAR_ITEMS.ANALYTICS,
      SIDEBAR_ITEMS.COMPETENCIES,
      SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
    ]);
  });

  it("exposes the super-duper-only tabs (and super-admin-tier tabs) to a super-duper-admin, Settings last", () => {
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
    expect(ids).toContain(SIDEBAR_ITEMS.AGENT_TEST_CASES);
    expect(ids).toContain(SIDEBAR_ITEMS.CHARACTER_LIBRARY);
    expect(ids).toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).toContain(SIDEBAR_ITEMS.USER_BADGES);
    // Super-admin-tier tabs remain visible too (duper is a super-admin).
    expect(ids).toContain(SIDEBAR_ITEMS.ANALYTICS);
    // Settings stays last in the default order.
    expect(ids[ids.length - 1]).toBe(SIDEBAR_ITEMS.SETTINGS);
  });

  it("shows the super-duper-only + super-admin-tier tabs, in natural order, to a super-duper-admin with no permissions", () => {
    const result = deriveNavigationItems({
      permissions: [],
      role: UserRole.SUPER_DUPER_ADMIN,
      savedOrder: undefined,
    });
    expect(result.map(i => i.id)).toEqual([
      SIDEBAR_ITEMS.CHARACTER_LIBRARY,
      SIDEBAR_ITEMS.SCENARIO_LANGUAGES,
      SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
      SIDEBAR_ITEMS.TOOLTIPS,
      SIDEBAR_ITEMS.USER_BADGES,
      SIDEBAR_ITEMS.ANALYTICS,
      SIDEBAR_ITEMS.AGENT_TEST_CASES,
      SIDEBAR_ITEMS.COMPETENCIES,
      SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS,
      SIDEBAR_ITEMS.SETTINGS,
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
    expect(ids).not.toContain(SIDEBAR_ITEMS.SCENARIO_LANGUAGES);
    expect(ids).not.toContain(SIDEBAR_ITEMS.MANAGE_GUARDRAILS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.TOOLTIPS);
    expect(ids).not.toContain(SIDEBAR_ITEMS.USER_BADGES);
  });

  it("exposes Roleplay Session Logs only to super-admins", () => {
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
});
