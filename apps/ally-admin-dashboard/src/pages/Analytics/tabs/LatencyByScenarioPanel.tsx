import { useEffect, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { AnalyticsWindowQuery, useGetVoiceLatencyByScenarioQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { formatDate } from "@utils";

import { asOf, windowLabel } from "../analyticsFilters";
import { ChartCard, buildSource, hBarOpts, single } from "../chartKit";
import { PALETTE } from "../chartScales";
import { buildVoiceLatencyByScenarioBars } from "../latencyChart";
import { formatMs } from "./LatencySessionsPanel";
import { LATENCY_SESSIONS_PAGE_SIZE as PAGE_SIZE } from "./useLatencySessions";

interface LatencyByScenarioPanelProps {
  query: AnalyticsWindowQuery;
  language: string;
  /** Bubbles the clicked row's scenario up so LatencySessionsPanel (mounted below) can jump straight to it. */
  onSelectScenario: (scenarioId: number) => void;
}

/**
 * "Which simulations are slow right now" — the ranking LatencySessionsPanel
 * has no way to produce on its own, since it requires a scenario to already
 * be picked. Two at-a-glance bar charts (worst-first, independently per
 * metric) plus the full per-stage table (same columns/formatting as
 * LatencySessionsPanel, one row per simulation instead of per session) so a
 * slow scenario's bottleneck stage is visible without a second lookup.
 * "View sessions" on a row drives the session-wise panel mounted directly
 * below this one.
 *
 * Each row is that simulation's SINGLE MOST RECENT session, not a
 * whole-window average — a real production investigation found that a
 * multi-session average can make a scenario look systemically slow when
 * it's really just one old, anomalous session (a disconnect, a paused
 * client, a one-off provider stall) dragging the mean up. Latest-session
 * answers "is this slow today", at the cost of being a one-session sample
 * rather than an average.
 */
export const LatencyByScenarioPanel = ({
  query,
  language,
  onSelectScenario,
}: LatencyByScenarioPanelProps) => {
  const [page, setPage] = useState(0);
  const languageParam = language || undefined;
  const { data, isLoading, isError, refetch } = useGetVoiceLatencyByScenarioQuery({
    ...query,
    language: languageParam,
  });

  // A new window or language narrows/widens the ranking — start over at the
  // first page rather than showing a stale offset into a different list.
  useEffect(() => {
    setPage(0);
  }, [query, languageParam]);

  const rows = data?.rows ?? [];
  const bars = buildVoiceLatencyByScenarioBars(rows);
  const totalTurns = rows.reduce((sum, r) => sum + r.turnCount, 0);
  const scenarioWindow = windowLabel(data?.window);

  const responseLatencyOptions = hBarOpts({
    leftTitle: "",
    bottomTitle: "Seconds",
    colorScale: single("Avg response latency", PALETTE.red),
  });
  const llmTtftOptions = hBarOpts({
    leftTitle: "",
    bottomTitle: "Seconds",
    colorScale: single("Avg LLM TTFT", PALETTE.orange),
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE + PAGE_SIZE, rows.length);

  const source = buildSource({
    derivation: "Live pipeline turn metrics, each simulation's most recent session",
    window: scenarioWindow,
    n: totalTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Worst simulations — response latency"
          caption={`Each simulation's most recent session. Top ${bars.avgResponseLatency.length} of ${bars.totalScenarios} simulations, slowest first.`}
          source={source}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load latency by simulation"
          errorSubtitle="There was a problem fetching turn-latency metrics."
          empty={!isLoading && bars.avgResponseLatency.length === 0}
        >
          <SimpleBarChart data={bars.avgResponseLatency} options={responseLatencyOptions} />
        </ChartCard>
        <ChartCard
          title="Worst simulations — LLM TTFT"
          caption={`Each simulation's most recent session. Top ${bars.avgLlmTtft.length} of ${bars.totalScenarios} simulations, slowest first. Ranked independently of the chart beside it — a simulation can be bad on one and fine on the other.`}
          source={source}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load latency by simulation"
          errorSubtitle="There was a problem fetching turn-latency metrics."
          empty={!isLoading && bars.avgLlmTtft.length === 0}
        >
          <SimpleBarChart data={bars.avgLlmTtft} options={llmTtftOptions} />
        </ChartCard>
      </div>

      <ChartCard
        title="Every simulation, worst-first"
        caption="Each simulation's most recent session, full per-stage breakdown, so a slow simulation's bottleneck stage is visible without a second lookup. Click 'View sessions' to see that simulation's worst individual sessions below."
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load latency by simulation"
        errorSubtitle="There was a problem fetching per-simulation latency metrics."
        empty={!isLoading && rows.length === 0}
        emptyText="No pipeline turns in the current window (and language, if set)."
      >
        <div className="flex flex-col gap-3">
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">Simulation</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Latest session</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Turns</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Response (avg)</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Response (p50)</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Response (p95)</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">EOU</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">STT finalize</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">LLM TTFT</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Knowledge retrieval</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Process events</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Branching</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Orchestration</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">LLM response</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">TTS TTFB</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Behaviors</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium"></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map(row => (
                <TableRow
                  key={row.scenarioId}
                  className="border-b border-border-light text-sm text-typography-900"
                >
                  <TableCell className="py-3 pr-4">{row.scenarioTitle}</TableCell>
                  <TableCell className="py-3 pr-4">
                    {row.occurredAt ? formatDate(row.occurredAt) : "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4">{row.turnCount}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgResponseLatencyMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.p50ResponseLatencyMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.p95ResponseLatencyMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgEouDelayMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgSttFinalizeMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgLlmTtftMs)}</TableCell>
                  <TableCell className="py-3 pr-4">
                    {formatMs(row.avgKnowledgeRetrievalMs)}
                  </TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgProcessEventsMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgBranchingMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgOrchestrationMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgLlmResponseMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgTtsTtfbMs)}</TableCell>
                  <TableCell className="py-3 pr-4">{formatMs(row.avgBehaviorsMs)}</TableCell>
                  <TableCell className="py-3 pr-4">
                    <Button
                      variant={ButtonVariant.SECONDARY}
                      onClick={() => onSelectScenario(row.scenarioId)}
                      className="h-[32px] px-3 text-xs"
                    >
                      View sessions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
            <span className="text-sm text-typography-700">
              Showing {rangeStart}–{rangeEnd} of {rows.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-[36px] px-4"
              >
                Previous
              </Button>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="h-[36px] px-4"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};
