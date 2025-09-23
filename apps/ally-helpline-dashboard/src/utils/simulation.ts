import { SIMULATON_BENCHMARK_SCORE } from "@constants";

export const getSimulationScoreDisplay = (score: number, showBenchmark?: boolean) =>
  score || score === 0
    ? `${score}${showBenchmark ? `(Benchmark: ${SIMULATON_BENCHMARK_SCORE})` : ""}`
    : "--";
