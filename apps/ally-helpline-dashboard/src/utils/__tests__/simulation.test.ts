import { describe, it, expect } from "vitest";

import { getSimulationScoreDisplay } from "../simulation";

describe("simulation utils", () => {
  describe("getSimulationScoreDisplay", () => {
    it("should return score with benchmark when showBenchmark is true", () => {
      const result = getSimulationScoreDisplay(75, true);
      expect(result).toBe("75 (Benchmark: 50)");
    });

    it("should return score without benchmark when showBenchmark is false", () => {
      const result = getSimulationScoreDisplay(75, false);
      expect(result).toBe("75");
    });

    it("should return score without benchmark when showBenchmark is undefined", () => {
      const result = getSimulationScoreDisplay(75);
      expect(result).toBe("75");
    });

    it("should handle score of 0", () => {
      const result = getSimulationScoreDisplay(0, true);
      expect(result).toBe("0 (Benchmark: 50)");
    });

    it("should return '--' for falsy scores when showBenchmark is false", () => {
      expect(getSimulationScoreDisplay(0, false)).toBe("0");
      expect(getSimulationScoreDisplay(null as any, false)).toBe("--");
      expect(getSimulationScoreDisplay(undefined as any, false)).toBe("--");
    });

    it("should return '--' for falsy scores when showBenchmark is true", () => {
      expect(getSimulationScoreDisplay(null as any, true)).toBe("--");
      expect(getSimulationScoreDisplay(undefined as any, true)).toBe("--");
    });

    it("should handle negative scores", () => {
      const result = getSimulationScoreDisplay(-10, true);
      expect(result).toBe("-10 (Benchmark: 50)");
    });

    it("should handle very high scores", () => {
      const result = getSimulationScoreDisplay(1000, true);
      expect(result).toBe("1000 (Benchmark: 50)");
    });

    it("should handle decimal scores", () => {
      const result = getSimulationScoreDisplay(75.5, true);
      expect(result).toBe("75.5 (Benchmark: 50)");
    });
  });
});
