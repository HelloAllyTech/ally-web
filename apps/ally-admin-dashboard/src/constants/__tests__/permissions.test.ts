import { describe, it, expect } from "vitest";

import { isRoleplayStudioEmailAllowed } from "../permissions";

describe("isRoleplayStudioEmailAllowed", () => {
  it("allows an exact allowlisted email", () => {
    expect(isRoleplayStudioEmailAllowed("gopikrishnan.sasikumar@helloally.ai")).toBe(true);
  });

  it("allows a +tag sub-address of an allowlisted email", () => {
    expect(isRoleplayStudioEmailAllowed("gopikrishnan.sasikumar+admin@helloally.ai")).toBe(true);
    expect(isRoleplayStudioEmailAllowed("gopikrishnan.sasikumar+anything.else@helloally.ai")).toBe(
      true,
    );
  });

  it("is case-insensitive", () => {
    expect(isRoleplayStudioEmailAllowed("Gopikrishnan.Sasikumar+QA@HelloAlly.ai")).toBe(true);
  });

  it("rejects a non-allowlisted email", () => {
    expect(isRoleplayStudioEmailAllowed("someone.else@helloally.ai")).toBe(false);
  });

  it("rejects a +tag on a different local part", () => {
    expect(isRoleplayStudioEmailAllowed("gopikrishnan+admin@helloally.ai")).toBe(false);
  });

  it("rejects empty / nullish input", () => {
    expect(isRoleplayStudioEmailAllowed("")).toBe(false);
    expect(isRoleplayStudioEmailAllowed(null)).toBe(false);
    expect(isRoleplayStudioEmailAllowed(undefined)).toBe(false);
  });
});
