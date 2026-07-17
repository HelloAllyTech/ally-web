import { Scenario, ScenarioStatus, SimulationLog, SimulationSummary } from "@types";

export enum NextChallengeReason {
  LEVEL_UP = "levelUp",
  KEEP_PRACTICING = "keepPracticing",
  BUILD_CONFIDENCE = "buildConfidence",
}

export interface NextChallengeRecommendation {
  scenario: Scenario;
  reason: NextChallengeReason;
  difficulty: string;
}

const DIFFICULTY_ORDER = ["EASY", "MEDIUM", "HARD"];
const DEFAULT_DIFFICULTY_INDEX = DIFFICULTY_ORDER.indexOf("MEDIUM");

// Score thresholds (as a percentage of totalScore) that move the learner
// up or down a difficulty level for the recommended next scenario.
export const NEXT_CHALLENGE_LEVEL_UP_THRESHOLD = 70;
export const NEXT_CHALLENGE_STEP_DOWN_THRESHOLD = 40;

const getDifficultyIndex = (difficultyLevel?: string): number => {
  const index = DIFFICULTY_ORDER.indexOf(difficultyLevel?.toUpperCase() ?? "");
  return index === -1 ? DEFAULT_DIFFICULTY_INDEX : index;
};

export const getScorePercentage = (
  score?: number | null,
  totalScore?: number | null,
): number | null => {
  if (score === null || score === undefined) return null;
  if (totalScore) return Math.round((score / totalScore) * 100);
  return score;
};

/**
 * Pick the best scenario at a given difficulty: scenarios the learner has
 * never completed come first (in catalog order), otherwise the one with the
 * lowest best score so far.
 */
const pickAtDifficulty = (
  candidates: Scenario[],
  difficultyIndex: number,
  bestScoreByScenario: Map<number, number | null>,
): Scenario | undefined => {
  const atLevel = candidates.filter(s => getDifficultyIndex(s.difficultyLevel) === difficultyIndex);
  const unattempted = atLevel.find(s => !bestScoreByScenario.has(s.id as number));
  if (unattempted) return unattempted;

  return [...atLevel].sort(
    (a, b) =>
      (bestScoreByScenario.get(a.id as number) ?? Infinity) -
      (bestScoreByScenario.get(b.id as number) ?? Infinity),
  )[0];
};

/**
 * Recommend the next scenario to attempt based on the session just finished
 * and the learner's score history:
 * - scored >= 70%: level up to a harder scenario
 * - scored < 40%: step down to rebuild confidence
 * - otherwise: keep practicing at the same difficulty
 * Within the target difficulty, unattempted scenarios win; then lowest best score.
 */
export const getNextChallenge = (
  summary: SimulationSummary,
  scenarios: Scenario[],
  logs: SimulationLog[] = [],
): NextChallengeRecommendation | null => {
  const candidates = scenarios.filter(
    s => s.id && s.id !== summary.scenarioId && s.status !== ScenarioStatus.COMING_SOON,
  );
  if (!candidates.length) return null;

  const bestScoreByScenario = new Map<number, number | null>();
  logs.forEach(log => {
    if (log.score === null) return;
    const best = bestScoreByScenario.get(log.scenarioId);
    if (best === undefined || best === null || log.score > best) {
      bestScoreByScenario.set(log.scenarioId, log.score);
    }
  });

  const currentIndex = getDifficultyIndex(summary.scenario?.difficultyLevel);
  const percentage = getScorePercentage(summary.score, summary.totalScore);

  let targetIndex = currentIndex;
  if (percentage !== null && percentage >= NEXT_CHALLENGE_LEVEL_UP_THRESHOLD) {
    targetIndex = Math.min(currentIndex + 1, DIFFICULTY_ORDER.length - 1);
  } else if (percentage !== null && percentage < NEXT_CHALLENGE_STEP_DOWN_THRESHOLD) {
    targetIndex = Math.max(currentIndex - 1, 0);
  }

  // Try the target difficulty first, then the nearest levels.
  const fallbackOrder = [...new Set([targetIndex, currentIndex, 1, 0, 2])];
  for (const index of fallbackOrder) {
    const scenario = pickAtDifficulty(candidates, index, bestScoreByScenario);
    if (scenario) {
      const reason =
        index > currentIndex
          ? NextChallengeReason.LEVEL_UP
          : index < currentIndex
            ? NextChallengeReason.BUILD_CONFIDENCE
            : NextChallengeReason.KEEP_PRACTICING;
      return { scenario, reason, difficulty: DIFFICULTY_ORDER[index] };
    }
  }
  return null;
};
