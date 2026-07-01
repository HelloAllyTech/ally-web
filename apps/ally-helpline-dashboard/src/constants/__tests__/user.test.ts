import { describe, it, expect } from "vitest";

import { canPickUiTheme, THEME_PICKER_ALLOWED_EMAILS } from "../user.ts";

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
