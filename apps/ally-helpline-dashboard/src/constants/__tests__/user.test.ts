import { describe, it, expect } from "vitest";

import {
  canViewOrganizationSettings,
  isInternalAllyEmail,
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

describe("isInternalAllyEmail", () => {
  it("returns true for an @helloally.ai email", () => {
    expect(isInternalAllyEmail("engineer@helloally.ai")).toBe(true);
  });

  it("is case-insensitive and tolerates surrounding whitespace", () => {
    expect(isInternalAllyEmail("Engineer@HelloAlly.AI")).toBe(true);
    expect(isInternalAllyEmail("  engineer@helloally.ai  ")).toBe(true);
  });

  it("returns false for a lookalike domain that merely contains 'ally'", () => {
    expect(isInternalAllyEmail("admin@sally-corp.com")).toBe(false);
    expect(isInternalAllyEmail("admin@notreallyally.ai")).toBe(false);
  });

  it("returns false for any external tenant admin email", () => {
    expect(isInternalAllyEmail("admin@customer-org.com")).toBe(false);
  });

  it("returns false when the email is missing, empty, null or undefined", () => {
    expect(isInternalAllyEmail("")).toBe(false);
    expect(isInternalAllyEmail(null)).toBe(false);
    expect(isInternalAllyEmail(undefined)).toBe(false);
  });
});
