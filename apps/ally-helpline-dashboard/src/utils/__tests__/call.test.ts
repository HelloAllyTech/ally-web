import { describe, it, expect } from "vitest";

import { CallProvider } from "@constants";

import { isProviderCloudTelephony } from "../call";

describe("call utils", () => {
  describe("isProviderCloudTelephony", () => {
    it("should return true for EXOTEL_CONFERENCE_CALL provider", () => {
      const result = isProviderCloudTelephony(CallProvider.EXOTEL_CONFERENCE_CALL);
      expect(result).toBe(true);
    });

    it("should return true for OZONETEL provider", () => {
      const result = isProviderCloudTelephony(CallProvider.OZONETEL);
      expect(result).toBe(true);
    });

    it("should return false for MICROPHONE provider", () => {
      const result = isProviderCloudTelephony(CallProvider.MICROPHONE);
      expect(result).toBe(false);
    });

    it("should handle invalid provider values", () => {
      const result = isProviderCloudTelephony("INVALID_PROVIDER" as CallProvider);
      expect(result).toBe(false);
    });

    it("should handle null and undefined values", () => {
      expect(isProviderCloudTelephony(null as any)).toBe(false);
      expect(isProviderCloudTelephony(undefined as any)).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isProviderCloudTelephony("" as CallProvider)).toBe(false);
    });
  });
});
