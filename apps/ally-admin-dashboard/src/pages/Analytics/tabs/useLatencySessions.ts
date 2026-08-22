import { useEffect, useState } from "react";

import {
  AnalyticsWindowQuery,
  useGetVoiceLatencySessionsQuery,
  useGetVoiceLatencySessionsSummaryQuery,
} from "@api";

export const LATENCY_SESSIONS_PAGE_SIZE = 25;

/**
 * State + query wiring for the Latency tab's session-wise-by-simulation
 * panel: owns which simulation is picked and the pagination offset; `query`
 * (window)/`language` are the page-level shared filters, passed in rather
 * than owned here. Two independent RTK Query hooks (list + summary) so
 * paging through sessions never re-triggers (or flickers) the summary
 * average, which only depends on scenarioId/language/window.
 *
 * `initialScenarioId`, when given, seeds the picked simulation AND re-applies
 * on every change (not just the first) — so a parent (the by-scenario
 * ranking panel) can push a new scenario in each time a different row is
 * clicked, not just once on mount.
 */
export function useLatencySessions(
  query: AnalyticsWindowQuery,
  language: string,
  initialScenarioId?: number,
) {
  const [scenarioId, setScenarioId] = useState<number | undefined>(initialScenarioId);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (initialScenarioId != null) setScenarioId(initialScenarioId);
  }, [initialScenarioId]);

  // A new simulation or language narrows/widens the result set — start over
  // at the first page rather than showing a stale offset into a new list.
  useEffect(() => {
    setOffset(0);
  }, [scenarioId, language]);

  const languageParam = language || undefined;

  const sessionsQuery = useGetVoiceLatencySessionsQuery(
    {
      ...query,
      scenarioId: scenarioId ?? 0,
      language: languageParam,
      limit: LATENCY_SESSIONS_PAGE_SIZE,
      offset,
    },
    { skip: !scenarioId },
  );

  const summaryQuery = useGetVoiceLatencySessionsSummaryQuery(
    { ...query, scenarioId: scenarioId ?? 0, language: languageParam },
    { skip: !scenarioId },
  );

  const rows = sessionsQuery.data?.data ?? [];
  const total = sessionsQuery.data?.total ?? 0;

  const canPrev = offset > 0;
  const canNext = offset + LATENCY_SESSIONS_PAGE_SIZE < total;
  const goPrev = () => setOffset(prev => Math.max(0, prev - LATENCY_SESSIONS_PAGE_SIZE));
  const goNext = () => setOffset(prev => (canNext ? prev + LATENCY_SESSIONS_PAGE_SIZE : prev));

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + LATENCY_SESSIONS_PAGE_SIZE, total);

  return {
    scenarioId,
    setScenarioId,
    rows,
    total,
    isLoading: sessionsQuery.isLoading,
    isFetching: sessionsQuery.isFetching,
    isError: sessionsQuery.isError,
    refetch: sessionsQuery.refetch,
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,
    isSummaryError: summaryQuery.isError,
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  };
}
