import { SIMULATON_BENCHMARK_SCORE } from "@constants";

export const getSimulationScoreDisplay = (score: number, showBenchmark?: boolean) =>
  score || score === 0
    ? `${score}${showBenchmark ? ` (Benchmark: ${SIMULATON_BENCHMARK_SCORE})` : ""}`
    : "--";

/**
 * Which post-session tabs a roleplay shows. The backend sends this already
 * resolved; the fallback only covers a response cached from before the
 * sub-toggles existed. Mirrors the backend's DEFAULT_FEEDBACK_TABS: both on.
 *
 * `skills` is gone — the Skills Demonstrated tab was switched off
 * platform-wide on 2026-08-24 and retired on 2026-08-31.
 *
 * Shared because the debrief now appears on three surfaces — the post-session
 * screen, the Roleplay Logs drawer and the inline track log — and a roleplay
 * whose author switched the debrief off must not show it on any of them.
 */
export const resolveFeedbackTabs = (metadata?: {
  feedbackTabs?: { debrief: boolean; transcript: boolean };
}) => metadata?.feedbackTabs ?? { debrief: true, transcript: true };
