import { describe, it, expect } from "vitest";

import {
  ALLY_ADMIN_ROLES,
  canViewOrganizationSettings,
  hasAllyAdminAccess,
  ORG_SETTINGS_ALLOWED_EMAILS,
} from "../user.ts";
import { UserRole } from "../../types/user";

describe("canViewOrganizationSettings", () => {
  it("returns true only for an ADMIN whose email is allowlisted", () => {
    ORG_SETTINGS_ALLOWED_EMAILS.forEach(email => {
      expect(canViewOrganizationSettings({ email, role: UserRole.ADMIN })).toBe(true);
    });
  });

  it("returns false for an allowlisted email without the ADMIN role", () => {
    const email = ORG_SETTINGS_ALLOWED_EMAILS[0];
    expect(canViewOrganizationSettings({ email, role: UserRole.LEARNER })).toBe(false);
    expect(canViewOrganizationSettings({ email, role: UserRole.COUNSELLOR })).toBe(false);
    expect(canViewOrganizationSettings({ email })).toBe(false);
  });

  it("returns false for an ADMIN whose email is not allowlisted", () => {
    expect(canViewOrganizationSettings({ email: "admin@example.com", role: UserRole.ADMIN })).toBe(
      false,
    );
  });

  it("returns false when the user or email is missing, null or undefined", () => {
    expect(canViewOrganizationSettings({ role: UserRole.ADMIN })).toBe(false);
    expect(canViewOrganizationSettings({ email: "", role: UserRole.ADMIN })).toBe(false);
    expect(canViewOrganizationSettings(null)).toBe(false);
    expect(canViewOrganizationSettings(undefined)).toBe(false);
  });
});

describe("hasAllyAdminAccess", () => {
  it("is false for a consumer-only account", () => {
    expect(hasAllyAdminAccess({ role: UserRole.LEARNER, roles: [UserRole.LEARNER] })).toBe(false);
  });

  it("is false for a tenant ADMIN, who cannot sign into the admin console", () => {
    expect(
      hasAllyAdminAccess({ role: UserRole.ADMIN, roles: [UserRole.ADMIN, UserRole.LEARNER] }),
    ).toBe(false);
  });

  it.each(ALLY_ADMIN_ROLES)("is true when roles include %s", role => {
    expect(hasAllyAdminAccess({ role: UserRole.LEARNER, roles: [UserRole.LEARNER, role] })).toBe(
      true,
    );
  });

  it("reads `roles`, not the collapsed `role`", () => {
    // The backend collapses a multi-role account to a single `role` by a
    // priority list that omits MULTI_TENANT_ADMIN entirely, so this account
    // reports role: "LEARNER" while still being able to sign into the console.
    // A `role`-only check would hide the link from exactly the people it's for.
    expect(
      hasAllyAdminAccess({
        role: UserRole.LEARNER,
        roles: [UserRole.LEARNER, UserRole.MULTI_TENANT_ADMIN],
      }),
    ).toBe(true);
  });

  it("falls back to `role` for payloads predating the roles array", () => {
    expect(hasAllyAdminAccess({ role: UserRole.SUPER_ADMIN })).toBe(true);
    expect(hasAllyAdminAccess({ role: UserRole.LEARNER })).toBe(false);
  });

  it("prefers `roles` over `role` when both are present", () => {
    // role is stale/collapsed to something privileged but roles no longer
    // carries an admin role — the array is the authority.
    expect(hasAllyAdminAccess({ role: UserRole.SUPER_ADMIN, roles: [UserRole.LEARNER] })).toBe(
      false,
    );
  });

  it("is false for a missing or empty user", () => {
    expect(hasAllyAdminAccess(null)).toBe(false);
    expect(hasAllyAdminAccess(undefined)).toBe(false);
    expect(hasAllyAdminAccess({})).toBe(false);
    expect(hasAllyAdminAccess({ roles: [] })).toBe(false);
  });

  it("does not admit roles the admin console's login rejects", () => {
    // Admission is by role name, so an unrecognised role must not surface the
    // link however privileged it looks — cloning a super admin's permissions
    // does not get an account past the console's login.
    expect(hasAllyAdminAccess({ roles: ["SOME_PRIVILEGED_CLONE" as UserRole] })).toBe(false);
    expect(ALLY_ADMIN_ROLES).toEqual([
      UserRole.SUPER_ADMIN,
      UserRole.SUPER_DUPER_ADMIN,
      UserRole.MULTI_TENANT_ADMIN,
    ]);
  });
});
