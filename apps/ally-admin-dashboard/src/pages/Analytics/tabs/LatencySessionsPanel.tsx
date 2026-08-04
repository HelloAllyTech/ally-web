import {
  CarbonDropdown as Dropdown,
  InlineNotification,
  SkeletonPlaceholder,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { AnalyticsWindowQuery, useGetSimulationsQuery } from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { formatDate } from "@utils";

import { ChartCard } from "../chartKit";
import { useLatencySessions } from "./useLatencySessions";

/** Milliseconds -> "123 ms" / "1.23 s"; em-dash for null. */
const formatMs = (ms: number | null): string => {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
};

const STAGE_TILES: {
  key: keyof NonNullable<ReturnType<typeof useLatencySessions>["summary"]>;
  label: string;
}[] = [
  { key: "avgResponseLatencyMs", label: "Response (avg)" },
  { key: "avgEouDelayMs", label: "EOU delay" },
  { key: "avgSttFinalizeMs", label: "STT finalize" },
  { key: "avgLlmTtftMs", label: "LLM TTFT" },
  { key: "avgKnowledgeRetrievalMs", label: "Knowledge retrieval" },
  { key: "avgProcessEventsMs", label: "Process events" },
  { key: "avgTtsTtfbMs", label: "TTS TTFB" },
  { key: "avgBehaviorsMs", label: "Behaviors" },
];

interface LatencySessionsPanelProps {
  query: AnalyticsWindowQuery;
  language: string;
}

/**
 * Session-wise voice latency for one simulation — the tool this session's
 * ad-hoc Metabase latency-by-language/scenario investigation should have
 * been able to reach for instead of hand-written SQL. Composes with the
 * page-level Language filter (both `query`/`language` are shared with the
 * rest of the Latency tab); the Simulation picker below is local to this
 * panel.
 */
export const LatencySessionsPanel = ({ query, language }: LatencySessionsPanelProps) => {
  const { data: scenarios } = useGetSimulationsQuery({ limit: 200 });
  const {
    scenarioId,
    setScenarioId,
    rows,
    total,
    isLoading,
    isError,
    refetch,
    summary,
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  } = useLatencySessions(query, language);

  const scenarioItems = [
    { id: null as number | null, label: "Select a simulation" },
    ...(scenarios?.data ?? []).map(s => ({ id: s.id as number | null, label: s.title })),
  ];
  const selectedScenario =
    scenarioItems.find(i => i.id === (scenarioId ?? null)) ?? scenarioItems[0];

  return (
    <ChartCard
      title="Session-wise latency by simulation"
      caption="Worst-first per-session breakdown for a chosen simulation, plus its overall average — narrows further with the Language filter above."
    >
      <div className="flex flex-col gap-4">
        <div className="w-64">
          <Dropdown
            id="latency-sessions-scenario"
            size="sm"
            titleText="Simulation"
            hideLabel
            label="Select a simulation"
            items={scenarioItems}
            selectedItem={selectedScenario}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => setScenarioId(selectedItem?.id ?? undefined)}
          />
        </div>

        {!scenarioId ? (
          <EmptyState
            title="Pick a simulation"
            subtitle="Select a simulation above to see its session-wise latency breakdown."
            hideActionButton
          />
        ) : isError ? (
          <div className="flex flex-col items-start gap-4">
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn't load session latency"
              subtitle="There was a problem fetching this simulation's sessions."
            />
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={() => refetch()}
              className="h-[36px] px-4"
            >
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <SkeletonPlaceholder className="analytics-chart-skeleton" />
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {STAGE_TILES.map(({ key, label }) => (
                  <Tile key={key} className="analytics-kpi">
                    <p className="text-sm text-typography-600 mb-2">{label}</p>
                    <p className="text-2xl font-medium text-typography-900">
                      {formatMs(summary[key] as number | null)}
                    </p>
                  </Tile>
                ))}
              </div>
            )}

            {rows.length === 0 ? (
              <EmptyState
                title="No sessions found"
                subtitle="No pipeline turns for this simulation (and language, if set) in the current window."
                hideActionButton
              />
            ) : (
              <Table className="w-full text-left border-collapse">
                <TableHead>
                  <TableRow className="border-b border-border-light text-sm text-typography-700">
                    <TableHeader className="py-3 pr-4 font-medium">Session</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Started</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Turns</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Response</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">EOU</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">STT finalize</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">LLM TTFT</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Knowledge retrieval</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Process events</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">TTS TTFB</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Behaviors</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={row.scenarioSessionId}
                      className="border-b border-border-light text-sm text-typography-900"
                    >
                      <TableCell className="py-3 pr-4 font-mono text-xs">
                        {row.scenarioSessionId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        {row.occurredAt ? formatDate(row.occurredAt) : "—"}
                      </TableCell>
                      <TableCell className="py-3 pr-4">{row.turnCount}</TableCell>
                      <TableCell className="py-3 pr-4">
                        {formatMs(row.avgResponseLatencyMs)}
                      </TableCell>
                      <TableCell className="py-3 pr-4">{formatMs(row.avgEouDelayMs)}</TableCell>
                      <TableCell className="py-3 pr-4">{formatMs(row.avgSttFinalizeMs)}</TableCell>
                      <TableCell className="py-3 pr-4">{formatMs(row.avgLlmTtftMs)}</TableCell>
                      <TableCell className="py-3 pr-4">
                        {formatMs(row.avgKnowledgeRetrievalMs)}
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        {formatMs(row.avgProcessEventsMs)}
                      </TableCell>
                      <TableCell className="py-3 pr-4">{formatMs(row.avgTtsTtfbMs)}</TableCell>
                      <TableCell className="py-3 pr-4">{formatMs(row.avgBehaviorsMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {rows.length > 0 && (
              <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
                <span className="text-sm text-typography-700">
                  Showing {rangeStart}–{rangeEnd} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={goPrev}
                    disabled={!canPrev}
                    className="h-[36px] px-4"
                  >
                    Previous
                  </Button>
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={goNext}
                    disabled={!canNext}
                    className="h-[36px] px-4"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ChartCard>
  );
};
