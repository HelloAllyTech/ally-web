import { describe, it, expect } from "vitest";

import { DIFFICULTY_STATE_SCORE_MAP } from "../constants";
import { getCurrentStateIndex, getProgressPercentage } from "../utils";
import { DifficultyLevel } from "../types";

describe("simulation utils", () => {
  describe("DIFFICULTY_STATE_SCORE_MAP", () => {
    it("should have configs for all difficulty levels", () => {
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.EASY]).toBeDefined();
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.MEDIUM]).toBeDefined();
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.HARD]).toBeDefined();
    });

    it("should have 4 states for each difficulty level", () => {
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.EASY]).toHaveLength(4);
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.MEDIUM]).toHaveLength(4);
      expect(DIFFICULTY_STATE_SCORE_MAP[DifficultyLevel.HARD]).toHaveLength(4);
    });
  });

  describe("getCurrentStateIndex", () => {
    describe("EASY difficulty", () => {
      it("should return 0 for score less than -50", () => {
        expect(getCurrentStateIndex(-100, DifficultyLevel.EASY)).toBe(0);
        expect(getCurrentStateIndex(-51, DifficultyLevel.EASY)).toBe(0);
      });

      it("should return 1 for score between -50 and 20", () => {
        expect(getCurrentStateIndex(-50, DifficultyLevel.EASY)).toBe(1);
        expect(getCurrentStateIndex(0, DifficultyLevel.EASY)).toBe(1);
        expect(getCurrentStateIndex(19, DifficultyLevel.EASY)).toBe(1);
      });

      it("should return 2 for score between 20 and 70", () => {
        expect(getCurrentStateIndex(20, DifficultyLevel.EASY)).toBe(2);
        expect(getCurrentStateIndex(50, DifficultyLevel.EASY)).toBe(2);
        expect(getCurrentStateIndex(69, DifficultyLevel.EASY)).toBe(2);
      });

      it("should return 3 for score greater than or equal to 70", () => {
        expect(getCurrentStateIndex(70, DifficultyLevel.EASY)).toBe(3);
        expect(getCurrentStateIndex(100, DifficultyLevel.EASY)).toBe(3);
        expect(getCurrentStateIndex(500, DifficultyLevel.EASY)).toBe(3);
      });
    });

    describe("MEDIUM difficulty", () => {
      it("should return 0 for score less than -20", () => {
        expect(getCurrentStateIndex(-50, DifficultyLevel.MEDIUM)).toBe(0);
        expect(getCurrentStateIndex(-21, DifficultyLevel.MEDIUM)).toBe(0);
      });

      it("should return 1 for score between -20 and 50", () => {
        expect(getCurrentStateIndex(-20, DifficultyLevel.MEDIUM)).toBe(1);
        expect(getCurrentStateIndex(0, DifficultyLevel.MEDIUM)).toBe(1);
        expect(getCurrentStateIndex(49, DifficultyLevel.MEDIUM)).toBe(1);
      });

      it("should return 2 for score between 50 and 100", () => {
        expect(getCurrentStateIndex(50, DifficultyLevel.MEDIUM)).toBe(2);
        expect(getCurrentStateIndex(75, DifficultyLevel.MEDIUM)).toBe(2);
        expect(getCurrentStateIndex(99, DifficultyLevel.MEDIUM)).toBe(2);
      });

      it("should return 3 for score greater than or equal to 100", () => {
        expect(getCurrentStateIndex(100, DifficultyLevel.MEDIUM)).toBe(3);
        expect(getCurrentStateIndex(200, DifficultyLevel.MEDIUM)).toBe(3);
      });
    });

    describe("HARD difficulty", () => {
      it("should return 0 for score less than -10", () => {
        expect(getCurrentStateIndex(-50, DifficultyLevel.HARD)).toBe(0);
        expect(getCurrentStateIndex(-11, DifficultyLevel.HARD)).toBe(0);
      });

      it("should return 1 for score between -10 and 100", () => {
        expect(getCurrentStateIndex(-10, DifficultyLevel.HARD)).toBe(1);
        expect(getCurrentStateIndex(0, DifficultyLevel.HARD)).toBe(1);
        expect(getCurrentStateIndex(99, DifficultyLevel.HARD)).toBe(1);
      });

      it("should return 2 for score between 100 and 200", () => {
        expect(getCurrentStateIndex(100, DifficultyLevel.HARD)).toBe(2);
        expect(getCurrentStateIndex(150, DifficultyLevel.HARD)).toBe(2);
        expect(getCurrentStateIndex(199, DifficultyLevel.HARD)).toBe(2);
      });

      it("should return 3 for score greater than or equal to 200", () => {
        expect(getCurrentStateIndex(200, DifficultyLevel.HARD)).toBe(3);
        expect(getCurrentStateIndex(500, DifficultyLevel.HARD)).toBe(3);
      });
    });

    describe("edge cases", () => {
      it("should return 0 for unknown difficulty level", () => {
        expect(getCurrentStateIndex(50, "UNKNOWN")).toBe(0);
      });

      it("should return 0 for empty string difficulty", () => {
        expect(getCurrentStateIndex(50, "")).toBe(0);
      });

      it("should handle zero score", () => {
        expect(getCurrentStateIndex(0, DifficultyLevel.EASY)).toBe(1);
        expect(getCurrentStateIndex(0, DifficultyLevel.MEDIUM)).toBe(1);
        expect(getCurrentStateIndex(0, DifficultyLevel.HARD)).toBe(1);
      });
    });
  });

  describe("getProgressPercentage", () => {
    it("should return 0 for first state", () => {
      expect(getProgressPercentage(0, 4)).toBe(0);
    });

    it("should return 100 for last state", () => {
      expect(getProgressPercentage(3, 4)).toBe(100);
    });

    it("should return correct percentage for middle states", () => {
      expect(getProgressPercentage(1, 4)).toBeCloseTo(33.33, 1);
      expect(getProgressPercentage(2, 4)).toBeCloseTo(66.67, 1);
    });

    it("should return 100 for single state", () => {
      expect(getProgressPercentage(0, 1)).toBe(100);
    });

    it("should return 50 for first of two states", () => {
      expect(getProgressPercentage(0, 2)).toBe(0);
      expect(getProgressPercentage(1, 2)).toBe(100);
    });
  });
});
