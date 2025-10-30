import { describe, it, expect } from "vitest";

import { Permissions } from "@constants";

import { hasPermissions } from "../permissions";

describe("permissions utils", () => {
  describe("hasPermissions", () => {
    it("should return true when user has all required permissions", () => {
      const userPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
        Permissions.EDIT_LIVEKIT,
      ];
      const requiredPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return true when user has at least one of the required permissions", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_USER];
      const requiredPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false when user has none of the required permissions", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];
      const requiredPermissions = [Permissions.EDIT_USER, Permissions.EDIT_LIVEKIT];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(false);
    });

    it("should return true when no required permissions are specified", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];
      const requiredPermissions: Permissions[] = [];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return true when required permissions array is undefined", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions)).toBe(true);
    });

    it("should return true when required permissions array is empty", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, [])).toBe(true);
    });

    it("should return false when user has empty permissions and required permissions exist", () => {
      const userPermissions: Permissions[] = [];
      const requiredPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(false);
    });

    it("should return true when both user and required permissions are empty", () => {
      const userPermissions: Permissions[] = [];
      const requiredPermissions: Permissions[] = [];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should handle single permission check", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];
      const requiredPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should handle multiple required permissions with partial match", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_USER];
      const requiredPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_LIVEKIT,
        Permissions.EDIT_EVENT,
      ];

      // Should return true because user has at least one (SIMULATION_STUDIO)
      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should handle user management permissions", () => {
      const userPermissions = [Permissions.EDIT_USER, Permissions.EDIT_LIVEKIT];
      const requiredPermissions = [Permissions.EDIT_USER];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false when user has different permissions than required", () => {
      const userPermissions = [Permissions.EDIT_USER, Permissions.EDIT_LIVEKIT];
      const requiredPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(false);
    });

    it("should handle case where user has more permissions than required", () => {
      const userPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
        Permissions.EDIT_LIVEKIT,
        Permissions.EDIT_EVENT,
      ];
      const requiredPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should handle case where user has fewer permissions than required", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];
      const requiredPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
        Permissions.EDIT_LIVEKIT,
      ];

      // Should return true because user has at least one (SIMULATION_STUDIO)
      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should work with all available permissions", () => {
      const userPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
        Permissions.EDIT_LIVEKIT,
        Permissions.EDIT_EVENT,
      ];

      expect(hasPermissions(userPermissions, [Permissions.EDIT_SCENARIO])).toBe(true);
      expect(hasPermissions(userPermissions, [Permissions.EDIT_USER])).toBe(true);
      expect(hasPermissions(userPermissions, [Permissions.EDIT_LIVEKIT])).toBe(true);
      expect(hasPermissions(userPermissions, [Permissions.EDIT_EVENT])).toBe(true);
    });

    it("should work with user edit permissions", () => {
      const userPermissions = [Permissions.EDIT_USER, Permissions.EDIT_LIVEKIT];

      expect(hasPermissions(userPermissions, [Permissions.EDIT_USER])).toBe(true);
      expect(hasPermissions(userPermissions, [Permissions.EDIT_LIVEKIT])).toBe(true);
    });

    it("should handle mixed permissions", () => {
      const userPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
        Permissions.EDIT_LIVEKIT,
      ];
      const requiredPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false when checking for permission user does not have", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_USER];
      const requiredPermissions = [Permissions.EDIT_LIVEKIT, Permissions.EDIT_EVENT];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(false);
    });

    it("should handle duplicate permissions in user permissions array", () => {
      const userPermissions = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_USER,
      ];
      const requiredPermissions = [Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should handle duplicate permissions in required permissions array", () => {
      const userPermissions = [Permissions.EDIT_SCENARIO];
      const requiredPermissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_SCENARIO];

      expect(hasPermissions(userPermissions, requiredPermissions)).toBe(true);
    });
  });
});
