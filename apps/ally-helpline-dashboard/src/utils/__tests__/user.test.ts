import { describe, it, expect } from "vitest";

import { UserRole, UserStatus } from "@types";

import { isCounselor, isUserAvailable } from "../user";

describe("user utils", () => {
  describe("isCounselor", () => {
    it("should return true for COUNSELLOR role", () => {
      const result = isCounselor(UserRole.COUNSELLOR);
      expect(result).toBe(true);
    });

    it("should return false for ADMIN role", () => {
      const result = isCounselor(UserRole.ADMIN);
      expect(result).toBe(false);
    });

    it("should return false for LEARNER role", () => {
      const result = isCounselor(UserRole.LEARNER);
      expect(result).toBe(false);
    });

    it("should return false for invalid role", () => {
      const result = isCounselor("INVALID_ROLE");
      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = isCounselor("");
      expect(result).toBe(false);
    });

    it("should return false for null and undefined", () => {
      expect(isCounselor(null as any)).toBe(false);
      expect(isCounselor(undefined as any)).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(isCounselor("counselor")).toBe(false);
      expect(isCounselor("COUNSELOR")).toBe(true); // This matches the enum value
      expect(isCounselor("Counselor")).toBe(false);
    });
  });

  describe("isUserAvailable", () => {
    it("should return true for AVAILABLE status", () => {
      const result = isUserAvailable(UserStatus.AVAILABLE);
      expect(result).toBe(true);
    });

    it("should return false for OFFLINE status", () => {
      const result = isUserAvailable(UserStatus.OFFLINE);
      expect(result).toBe(false);
    });

    it("should return false for invalid status", () => {
      const result = isUserAvailable("INVALID_STATUS");
      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = isUserAvailable("");
      expect(result).toBe(false);
    });

    it("should return false for null and undefined", () => {
      expect(isUserAvailable(null as any)).toBe(false);
      expect(isUserAvailable(undefined as any)).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(isUserAvailable("available")).toBe(true); // This matches the enum value
      expect(isUserAvailable("Available")).toBe(false);
      expect(isUserAvailable("AVAILABLE")).toBe(false);
    });
  });
});
