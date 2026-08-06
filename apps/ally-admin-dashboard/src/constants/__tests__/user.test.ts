import { describe, expect, it } from "vitest";

import { UserRole, resolveAdminRole } from "../user";

describe("resolveAdminRole", () => {
  it("prefers the highest tier when several are held", () => {
    expect(
      resolveAdminRole({
        role: UserRole.SUPER_ADMIN,
        roles: [UserRole.LEARNER, UserRole.SUPER_ADMIN, UserRole.SUPER_DUPER_ADMIN],
      }),
    ).toBe(UserRole.SUPER_DUPER_ADMIN);
  });

  it("leaves a non-portal role exactly as the backend reported it", () => {
    // ADMIN alone isn't hoisted, so no existing ADMIN-only user's gating moves.
    expect(
      resolveAdminRole({ role: UserRole.ADMIN, roles: [UserRole.ADMIN, UserRole.LEARNER] }),
    ).toBe(UserRole.ADMIN);
  });

  it("recovers MULTI_TENANT_ADMIN when the backend collapsed to a non-portal role", () => {
    // determineUserRole's priority list has no MULTI_TENANT_ADMIN branch, so a
    // user holding [LEARNER, ADMIN, MULTI_TENANT_ADMIN] collapses to "ADMIN" —
    // which the portal's role gate doesn't admit, even though the user
    // genuinely holds a portal-eligible role.
    expect(
      resolveAdminRole({
        role: UserRole.ADMIN,
        roles: [UserRole.LEARNER, UserRole.ADMIN, UserRole.MULTI_TENANT_ADMIN],
      }),
    ).toBe(UserRole.MULTI_TENANT_ADMIN);
  });

  it("still prefers a held super-admin tier over MULTI_TENANT_ADMIN", () => {
    expect(
      resolveAdminRole({
        role: UserRole.SUPER_ADMIN,
        roles: [UserRole.MULTI_TENANT_ADMIN, UserRole.SUPER_ADMIN],
      }),
    ).toBe(UserRole.SUPER_ADMIN);
  });

  it("falls back to role when roles is absent or empty", () => {
    expect(resolveAdminRole({ role: UserRole.SUPER_ADMIN })).toBe(UserRole.SUPER_ADMIN);
    expect(resolveAdminRole({ role: UserRole.SUPER_ADMIN, roles: [] })).toBe(UserRole.SUPER_ADMIN);
    expect(resolveAdminRole(undefined)).toBeUndefined();
  });
});
