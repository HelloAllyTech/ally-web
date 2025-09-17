import { SIMULATON_BENCHMARK_SCORE } from "@constants";

export const getSimulationScoreDisplay = (score: number) =>
  score || score === 0 ? `${score}/${SIMULATON_BENCHMARK_SCORE}` : "--";
