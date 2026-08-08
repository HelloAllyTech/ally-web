import { useEffect, useRef, useState } from "react";

import { useGetPracticeStreakSummaryQuery } from "@api";
import { PracticeStreakSummary } from "@types";

import { localDateIn } from "../components/practice-streak-heatmap/streakState";

/** Matches the cadence useSimulationSummaryPolling already uses for this page. */
const POLL_INTERVAL_MS = 3500;
/**
 * How long to wait for the async write before giving up, in ms (~5 polls).
 *
 * A wall-clock deadline rather than a count of responses: RTK Query returns a
 * referentially stable object when a poll yields identical data, so counting
 * renders or effect fires would never advance for a streak that stays PENDING —
 * and the hook would poll forever.
 */
const GIVE_UP_AFTER_MS = POLL_INTERVAL_MS * 5;

/**
 * Resolves the streak state that reflects the session the user just finished.
 *
 * The streak is NOT written by the end-session request. It is written by a
 * consumer of an async SCENARIO_SESSION_ENDED event coming off the LiveKit/SQS
 * pipeline, so there is no response to ride on and an immediate read can easily
 * beat the write. This polls until the payload is demonstrably about the current
 * business day AND has stopped saying PENDING.
 *
 * Returns `null` while pending and on timeout. That is deliberate: showing
 * nothing is strictly better than announcing a streak that did not happen.
 */
export const usePostSessionStreak = (enabled: boolean) => {
  const [resolved, setResolved] = useState<PracticeStreakSummary | null>(null);
  const [givenUp, setGivenUp] = useState(false);
  const resolvedRef = useRef(false);

  const shouldPoll = enabled && !resolved && !givenUp;

  const { data } = useGetPracticeStreakSummaryQuery(undefined, {
    skip: !enabled,
    pollingInterval: shouldPoll ? POLL_INTERVAL_MS : 0,
  });

  useEffect(() => {
    if (!enabled || resolvedRef.current) return;

    const timer = setTimeout(() => setGivenUp(true), GIVE_UP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    // Latched via a ref as well as state: a later focus refetch must not
    // re-trigger the entrance animation or change the number under the user.
    if (!enabled || resolvedRef.current || !data) return;

    // A cached payload from a previous business day would describe the wrong
    // day entirely, so require the response to be about today before trusting
    // streakEventToday at all.
    const isAboutToday = data.today === localDateIn(data.businessTimezone);
    if (!isAboutToday || data.streakEventToday === "PENDING") return;

    resolvedRef.current = true;
    setResolved(data);
  }, [data, enabled]);

  return { streak: resolved };
};
