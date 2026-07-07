import { useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { StackedBarChart } from "@carbon/charts-react";

import "@carbon/charts/styles.css";
import "./analytics-carbon.scss";

import {
  Button,
  CarbonDropdown as Dropdown,
  Heading,
  InlineNotification,
  Section,
  SkeletonPlaceholder,
  Theme,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { useGetTokenConsumptionQuery } from "@api";
import { AnalyticsRange } from "@types";

import {
  buildColorScale,
  buildTokenCostData,
  formatUsd,
  formatUsdCompact,
  TokenDim,
} from "./tokenChart";

const CHART_HEIGHT = "360px";

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

// `range` comes from the shared time-range selector at the top of the Analytics
// page — no separate range dropdown here (mirrors ConversationDrift).
export const TokenConsumption = ({ range }: { range: AnalyticsRange }) => {
  const [dim, setDim] = useState<TokenDim>("service");
  const { data, isLoading, isError, refetch } = useGetTokenConsumptionQuery({ range });

  const points = useMemo(() => data?.points ?? [], [data]);
  const chartData = useMemo(() => buildTokenCostData(points, dim), [points, dim]);

  // Colour scale keyed by the stacked segment (group) for the current toggle.
  const colorScale = useMemo(() => buildColorScale(chartData.map(d => d.group)), [chartData]);

  const totalCost = data?.totalEstimatedCostUsd ?? 0;
  const xAxisTitle = X_AXIS_TITLE[dim];

  const options = useMemo(
    () => ({
      title: "Estimated AI cost (USD)",
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
  const empty = chartData.length === 0;

  return (
    // No own scroll container — flows inside the Analytics page's scroll area.
    <div className="analytics-carbon font-primary mt-8">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Heading className="text-2xl">AI cost</Heading>
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

          {isError ? (
            <div className="flex flex-col items-start gap-4">
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn't load AI cost"
                subtitle="There was a problem fetching AI-usage metrics."
              />
              <Button kind="tertiary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <SkeletonPlaceholder className="analytics-chart-skeleton" />
          ) : (
            <Tile className="p-6">
              <p className="text-sm font-medium text-typography-900">
                {dim === "service"
                  ? "Estimated cost by service (stacked by provider)"
                  : dim === "model"
                    ? "Estimated cost by model (stacked by task)"
                    : "Estimated cost by task (stacked by service)"}
              </p>
              <p className="text-xs text-typography-500 mb-2">
                Estimated USD cost across LLM (tokens), STT (audio) and TTS (characters), from
                per-service pricing — an approximation, not a billed figure. Total for range:{" "}
                {formatUsd(totalCost)}.
              </p>
              {empty ? (
                <div
                  className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500"
                  style={{ height: CHART_HEIGHT }}
                >
                  No AI usage recorded for this range
                </div>
              ) : (
                <StackedBarChart data={chartData} options={options} />
              )}
            </Tile>
          )}
        </Section>
      </Theme>
    </div>
  );
};
