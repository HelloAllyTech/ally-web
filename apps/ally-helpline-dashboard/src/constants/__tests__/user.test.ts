import { describe, it, expect } from "vitest";

import {
  canPickUiTheme,
  canViewOrganizationSettings,
  ORG_SETTINGS_ALLOWED_EMAILS,
  THEME_PICKER_ALLOWED_EMAILS,
} from "../user.ts";
import { UserRole } from "../../types/user";

describe("canPickUiTheme", () => {
  it("returns true for every allowlisted email", () => {
    THEME_PICKER_ALLOWED_EMAILS.forEach(email => {
      expect(canPickUiTheme({ email })).toBe(true);
    });
  });

  it("returns false for a non-allowlisted email", () => {
    expect(canPickUiTheme({ email: "someone@example.com" })).toBe(false);
  });

  it("returns false when email is missing, empty, null or undefined", () => {
    expect(canPickUiTheme({})).toBe(false);
    expect(canPickUiTheme({ email: "" })).toBe(false);
    expect(canPickUiTheme(null)).toBe(false);
    expect(canPickUiTheme(undefined)).toBe(false);
  });
});

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
