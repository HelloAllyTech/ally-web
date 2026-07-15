import { describe, it, expect } from "vitest";

import { Scenario, ScenarioStatus, SimulationLog, SimulationSummary } from "@types";

import { getNextChallenge, getScorePercentage, NextChallengeReason } from "../nextChallenge";

const makeScenario = (id: number, difficultyLevel?: string, status?: ScenarioStatus): Scenario => ({
  id,
  title: `Scenario ${id}`,
  status: status ?? ScenarioStatus.ACTIVE,
  difficultyLevel,
});

const makeSummary = (
  scenarioId: number,
  difficultyLevel: string,
  score: number | null,
  totalScore = 100,
): SimulationSummary =>
  ({
    scenarioId,
    score,
    totalScore,
    scenario: makeScenario(scenarioId, difficultyLevel),
  }) as SimulationSummary;

const makeLog = (scenarioId: number, score: number | null): SimulationLog =>
  ({ scenarioId, score }) as SimulationLog;

describe("nextChallenge utils", () => {
  describe("getScorePercentage", () => {
    it("normalizes score against totalScore", () => {
      expect(getScorePercentage(40, 50)).toBe(80);
    });

    it("treats score as a percentage when totalScore is missing", () => {
      expect(getScorePercentage(65, 0)).toBe(65);
    });

    it("returns null when score is missing", () => {
      expect(getScorePercentage(null, 100)).toBeNull();
      expect(getScorePercentage(undefined, 100)).toBeNull();
    });
  });

  describe("getNextChallenge", () => {
    const catalog = [
      makeScenario(1, "EASY"),
      makeScenario(2, "EASY"),
      makeScenario(3, "MEDIUM"),
      makeScenario(4, "MEDIUM"),
      makeScenario(5, "HARD"),
    ];

    it("levels up to a harder scenario on a high score", () => {
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 85), catalog, []);
      expect(result?.scenario.id).toBe(5);
      expect(result?.reason).toBe(NextChallengeReason.LEVEL_UP);
      expect(result?.difficulty).toBe("HARD");
    });

    it("steps down to an easier scenario on a low score", () => {
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 20), catalog, []);
      expect(result?.scenario.id).toBe(1);
      expect(result?.reason).toBe(NextChallengeReason.BUILD_CONFIDENCE);
      expect(result?.difficulty).toBe("EASY");
    });

    it("stays at the same difficulty on a middling score", () => {
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 55), catalog, []);
      expect(result?.scenario.id).toBe(4);
      expect(result?.reason).toBe(NextChallengeReason.KEEP_PRACTICING);
    });

    it("stays at HARD when already at the top difficulty", () => {
      const result = getNextChallenge(makeSummary(5, "HARD", 90), [
        ...catalog,
        makeScenario(6, "HARD"),
      ]);
      expect(result?.scenario.id).toBe(6);
      expect(result?.reason).toBe(NextChallengeReason.KEEP_PRACTICING);
    });

    it("prefers scenarios the learner has never completed", () => {
      const logs = [makeLog(3, 60), makeLog(4, 90)];
      const result = getNextChallenge(
        makeSummary(3, "MEDIUM", 55),
        [...catalog, makeScenario(7, "MEDIUM")],
        logs,
      );
      expect(result?.scenario.id).toBe(7);
    });

    it("falls back to the lowest-scored scenario when all are attempted", () => {
      const logs = [makeLog(4, 90), makeLog(4, 40), makeLog(3, 60)];
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 55), [catalog[2], catalog[3]], logs);
      expect(result?.scenario.id).toBe(4);
    });

    it("falls back to a nearby difficulty when the target level has no scenarios", () => {
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 85), [
        makeScenario(3, "MEDIUM"),
        makeScenario(4, "MEDIUM"),
      ]);
      expect(result?.scenario.id).toBe(4);
      expect(result?.reason).toBe(NextChallengeReason.KEEP_PRACTICING);
    });

    it("treats a missing difficulty as MEDIUM and a missing score as same-level practice", () => {
      const result = getNextChallenge(makeSummary(3, "", null), catalog, []);
      expect(result?.difficulty).toBe("MEDIUM");
      expect(result?.reason).toBe(NextChallengeReason.KEEP_PRACTICING);
    });

    it("excludes the current scenario and coming-soon scenarios", () => {
      const result = getNextChallenge(makeSummary(3, "MEDIUM", 55), [
        makeScenario(3, "MEDIUM"),
        makeScenario(4, "MEDIUM", ScenarioStatus.COMING_SOON),
      ]);
      expect(result).toBeNull();
    });
  });
});
