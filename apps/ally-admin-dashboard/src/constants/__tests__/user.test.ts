import { describe, expect, it } from "vitest";

import {
  SUPER_ADMIN_ROLES,
  SUPER_DUPER_ADMIN_ROLES,
  UserRole,
  adminLoginRolesFor,
  isSuperAdminRole,
  isSuperDuperAdminRole,
  resolveAdminRole,
} from "../user";

describe("INTERNAL role", () => {
  it("clears super-admin UI gates", () => {
    expect(SUPER_ADMIN_ROLES).toContain(UserRole.INTERNAL);
    expect(isSuperAdminRole(UserRole.INTERNAL)).toBe(true);
  });

  it("does not reach the elevated super-duper-admin surfaces", () => {
    expect(SUPER_DUPER_ADMIN_ROLES).not.toContain(UserRole.INTERNAL);
    expect(isSuperDuperAdminRole(UserRole.INTERNAL)).toBe(false);
  });
});

describe("adminLoginRolesFor", () => {
  it("keeps INTERNAL out of the standalone dashboard's audience", () => {
    const roles = adminLoginRolesFor(false);

    expect(roles).not.toContain(UserRole.INTERNAL);
    expect(roles).toEqual([
      UserRole.SUPER_ADMIN,
      UserRole.SUPER_DUPER_ADMIN,
      UserRole.MULTI_TENANT_ADMIN,
    ]);
  });

  it("admits INTERNAL on the embedded surface", () => {
    expect(adminLoginRolesFor(true)).toContain(UserRole.INTERNAL);
  });
});

describe("resolveAdminRole", () => {
  it("recovers INTERNAL when the backend collapsed the role elsewhere", () => {
    // A member of staff who is also a learner: `determineUserRole` has no
    // INTERNAL branch, so it falls through to whichever group row came first.
    expect(
      resolveAdminRole({ role: UserRole.LEARNER, roles: [UserRole.LEARNER, UserRole.INTERNAL] }),
    ).toBe(UserRole.INTERNAL);
  });

  it("prefers the highest tier when several are held", () => {
    expect(
      resolveAdminRole({
        role: UserRole.SUPER_ADMIN,
        roles: [UserRole.INTERNAL, UserRole.SUPER_ADMIN, UserRole.SUPER_DUPER_ADMIN],
      }),
    ).toBe(UserRole.SUPER_DUPER_ADMIN);
  });

  it("leaves a non-super-admin role exactly as the backend reported it", () => {
    // Only the super-admin tiers are hoisted, so no existing user's gating moves.
    expect(
      resolveAdminRole({ role: UserRole.ADMIN, roles: [UserRole.ADMIN, UserRole.LEARNER] }),
    ).toBe(UserRole.ADMIN);
    expect(
      resolveAdminRole({
        role: UserRole.ADMIN,
        roles: [UserRole.ADMIN, UserRole.MULTI_TENANT_ADMIN],
      }),
    ).toBe(UserRole.ADMIN);
  });

  it("falls back to role when roles is absent or empty", () => {
    expect(resolveAdminRole({ role: UserRole.SUPER_ADMIN })).toBe(UserRole.SUPER_ADMIN);
    expect(resolveAdminRole({ role: UserRole.SUPER_ADMIN, roles: [] })).toBe(UserRole.SUPER_ADMIN);
    expect(resolveAdminRole(undefined)).toBeUndefined();
  });
});
