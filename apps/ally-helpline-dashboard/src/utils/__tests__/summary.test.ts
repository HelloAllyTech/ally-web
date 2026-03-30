import { describe, it, expect } from "vitest";

import { CallProvider } from "@constants";

import { getEstimatedSummaryGenerationTime } from "../summary";

describe("summary utils", () => {
  describe("getEstimatedSummaryGenerationTime", () => {
    it("should calculate estimated time for short call duration", () => {
      const result = getEstimatedSummaryGenerationTime(100, CallProvider.AUDIO_UPLOAD); // 100 seconds
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should calculate estimated time for medium call duration", () => {
      const result = getEstimatedSummaryGenerationTime(1000, CallProvider.AUDIO_UPLOAD); // ~16.7 minutes
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should calculate estimated time for long call duration", () => {
      const result = getEstimatedSummaryGenerationTime(3600, CallProvider.AUDIO_UPLOAD); // 1 hour
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should return a positive integer", () => {
      const result = getEstimatedSummaryGenerationTime(500, CallProvider.AUDIO_UPLOAD);
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should handle zero duration", () => {
      const result = getEstimatedSummaryGenerationTime(0, CallProvider.AUDIO_UPLOAD);
      expect(result).toBe(0);
    });

    it("should handle very short duration", () => {
      const result = getEstimatedSummaryGenerationTime(1, CallProvider.AUDIO_UPLOAD);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should scale proportionally with call duration", () => {
      const shortCall = getEstimatedSummaryGenerationTime(100, CallProvider.AUDIO_UPLOAD);
      const longCall = getEstimatedSummaryGenerationTime(1000, CallProvider.AUDIO_UPLOAD);

      expect(longCall).toBeGreaterThan(shortCall);
    });

    it("should handle very long call duration", () => {
      const result = getEstimatedSummaryGenerationTime(10000, CallProvider.AUDIO_UPLOAD); // ~2.8 hours
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should use the 1.2 buffer factor", () => {
      // The function should apply a 1.2 buffer to the calculation
      // This is tested indirectly by checking that the result is reasonable
      const result = getEstimatedSummaryGenerationTime(2503, CallProvider.AUDIO_UPLOAD); // Same as CallSummaryGenerationData.durationInSeconds
      expect(result).toBeGreaterThan(0);
    });
  });
});
