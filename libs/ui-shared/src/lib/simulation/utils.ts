import { DIFFICULTY_STATE_SCORE_MAP } from "./constants";
import { DifficultyLevel } from "./types";

export const getSimulationEvents = <T extends { data?: any; timestamp: string }>(events: T[]) => {
  return events.map(event => {
    const { data, timestamp } = event as any;
    return {
      score: data?.score ?? null,
      emoji: data?.emoji ?? "",
      message: data?.message ?? "",
      timestamp,
    };
  });
};
export { MAX_SESSION_MINUTES, WARNING_THRESHOLD } from "./waveformConstants";

export const getCurrentStateIndex = (
  score: number,
  difficultyLevel: string,
): number => {
  const stateConfigs = DIFFICULTY_STATE_SCORE_MAP[difficultyLevel as DifficultyLevel];
  if (!stateConfigs) return 0;

  for (let i = stateConfigs.length - 1; i >= 0; i--) {
    const { scoreRange } = stateConfigs[i];
    const meetsMin = scoreRange.min === undefined || score >= scoreRange.min;
    const meetsMax = scoreRange.max === undefined || score < scoreRange.max;
    if (meetsMin && meetsMax) return i;
  }

  return 0;
};

export const getProgressPercentage = (
  currentStateIndex: number,
  totalStates: number,
): number => {
  if (totalStates <= 1) return 100;
  return (currentStateIndex / (totalStates - 1)) * 100;
};
