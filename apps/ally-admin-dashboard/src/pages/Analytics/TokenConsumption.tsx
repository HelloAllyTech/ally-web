import { useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetTokenConsumptionQuery } from "@api";

import { AnalyticsTabFilters, asOf, windowLabel } from "./analyticsFilters";
import { ChartDetailModal } from "./ChartDetailModal";
import { CHART_HEIGHT, ChartCard, ScrollableChart, buildSource } from "./chartKit";
import { PALETTE } from "./chartScales";
import {
  TokenDim,
  buildColorScale,
  buildPromptCacheStats,
  buildTokenCostData,
  formatPercent,
  formatUsd,
  formatUsdCompact,
} from "./tokenChart";

const DIM_ITEMS: { id: TokenDim; label: string }[] = [
  { id: "service", label: "By service" },
  { id: "model", label: "By model" },
  { id: "task", label: "By task" },
];

const X_AXIS_TITLE: Record<TokenDim, string> = {
  service: "Service",
  model: "Model",
  task: "Task",
};

const SEGMENT_OF: Record<TokenDim, string> = {
  service: "provider",
  model: "task",
  task: "service",
};

/**
 * AI cost.
 *
 * Rendered as a normal tab body rather than its own page: it used to declare its
 * own `<Theme>`, `<Section>` and `<Heading className="text-2xl">AI cost</Heading>`
 * *inside* the Analytics page header, so the page had two competing titles and
 * the tab label ("Tokens") disagreed with both the heading and the axis (USD).
 * The tab is now labelled "AI cost" and this component contributes only panels.
 */
export const TokenConsumption = ({ query }: AnalyticsTabFilters) => {
  const [dim, setDim] = useState<TokenDim>("service");
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError, refetch } = useGetTokenConsumptionQuery(query);

  const points = useMemo(() => data?.points ?? [], [data]);
  const chartData = useMemo(() => buildTokenCostData(points, dim), [points, dim]);
  const colorScale = useMemo(() => buildColorScale(chartData.map(d => d.group)), [chartData]);

  const totalCost = data?.totalEstimatedCostUsd ?? 0;
  const totalTokens = data?.totalTokens ?? 0;
  const xAxisTitle = X_AXIS_TITLE[dim];
  const window = windowLabel(data?.window);

  /**
   * Rows whose model has no pricing entry contribute $0 to every total on this
   * tab. That makes the displayed cost an UNDERSTATEMENT by an unknown amount, so
   * the count of such rows belongs on the surface — not in a tooltip, and not
   * only in prose that says "approximation".
   */
  const unpricedRows = useMemo(() => points.filter(p => !p.priced), [points]);
  const unpricedCalls = useMemo(
    () => unpricedRows.reduce((sum, p) => sum + p.calls, 0),
    [unpricedRows],
  );
  const cacheStats = useMemo(() => buildPromptCacheStats(points), [points]);

  const options = useMemo(
    () => ({
      // No `title` here: ChartCard renders the heading. Setting both drew two
      // titles on one chart, each claiming to name it.
      axes: {
        left: {
          mapsTo: "value",
          scaleType: ScaleTypes.LINEAR,
          stacked: true,
          title: "Estimated cost (USD)",
          ticks: { formatter: (tick: number | Date) => formatUsdCompact(Number(tick)) },
        },
        bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: xAxisTitle },
      },
      height: CHART_HEIGHT,
      color: { scale: colorScale },
      legend: { enabled: true },
      tooltip: { valueFormatter: (value: number | Date) => formatUsd(Number(value)) },
      toolbar: { enabled: false },
    }),
    [colorScale, xAxisTitle],
  );

  const selectedDim = DIM_ITEMS.find(i => i.id === dim) ?? DIM_ITEMS[0];

  const unpricedNote =
    unpricedCalls > 0
      ? `${unpricedCalls.toLocaleString()} calls across ${unpricedRows.length} model(s) have no pricing entry and count as $0 — the real total is higher`
      : "every call in this window was priced";

  const source = buildSource({
    derivation: "llm_usage, priced at read time from the pricing table — not a billed figure",
    window,
    extra: unpricedNote,
    asOf: asOf(data?.window),
  });

  const takeaway = (
    <div className="flex flex-col gap-0.5">
      <span style={{ color: unpricedCalls > 0 ? PALETTE.orange : undefined }}>
        {formatUsd(totalCost)} estimated across {totalTokens.toLocaleString()} tokens
        {unpricedCalls > 0 ? " — an undercount, see below" : ""}
      </span>
      {cacheStats.promptTokens > 0 && (
        <span className="text-typography-700 font-normal">
          Prompt-cache hit rate: {formatPercent(cacheStats.hitRate)} (
          {cacheStats.cachedTokens.toLocaleString()} of {cacheStats.promptTokens.toLocaleString()}{" "}
          LLM prompt tokens)
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="w-44">
          <Dropdown
            id="token-dim"
            size="md"
            titleText="Breakdown"
            hideLabel
            label="Breakdown"
            items={DIM_ITEMS}
            selectedItem={selectedDim}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) setDim(selectedItem.id);
            }}
          />
        </div>
      </div>

      <ChartCard
        title={`Estimated cost by ${dim}, stacked by ${SEGMENT_OF[dim]}`}
        caption="LLM tokens, STT audio and TTS characters, priced from the per-service table at read time."
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load AI cost"
        errorSubtitle="There was a problem fetching AI-usage metrics."
        empty={chartData.length === 0}
        emptyText="No AI usage recorded for this window"
        onExpand={() => setExpanded(true)}
        wide
      >
        {/* "By model" is an open-ended axis — one category per model the platform
            has ever called, with long free-text names. */}
        <ScrollableChart data={chartData}>
          <StackedBarChart data={chartData} options={options} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={`Estimated cost by ${dim}, stacked by ${SEGMENT_OF[dim]}`}
          caption="Raw quantities are the source of truth; cost is derived. `Priced` false means the row contributed $0 regardless of its usage."
          source={source}
          table={{
            columns: [
              "Service",
              "Provider",
              "Model",
              "Task",
              "Calls",
              "Total tokens",
              "Cached tokens",
              "Audio ms",
              "Characters",
              "Est. cost (USD)",
              "Priced",
            ],
            rows: points.map(p => [
              p.service,
              p.provider,
              p.model,
              p.task,
              p.calls,
              p.totalTokens,
              p.service === "llm" ? p.cachedTokens : null,
              p.audioMs,
              p.characters,
              p.estimatedCostUsd,
              p.priced ? "yes" : "no",
            ]),
          }}
          exportContext={[
            `Window: ${window}`,
            "Costs are estimated from the pricing table at read time, not billed figures",
            `Unpriced calls in window: ${unpricedCalls.toLocaleString()}`,
          ]}
          render={({ height }) => (
            <ScrollableChart data={chartData}>
              <StackedBarChart data={chartData} options={{ ...options, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </div>
  );
};
