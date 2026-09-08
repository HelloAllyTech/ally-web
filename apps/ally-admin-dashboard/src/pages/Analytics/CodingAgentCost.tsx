import { useMemo } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetCodingAgentCostQuery } from "@api";

import { AnalyticsTabFilters, asOf, windowLabel } from "./analyticsFilters";
import {
  CHART_HEIGHT,
  ChartCard,
  ScrollableChart,
  barOpts,
  buildSource,
  lineOpts,
} from "./chartKit";
import { buildCodingAgentTrend, buildModelBreakdown, CODING_AGENT_SCALE } from "./codingAgentChart";
import { buildColorScale, formatUsd, formatUsdCompact } from "./tokenChart";

/**
 * Bug Hunter + Builder cost, specifically.
 *
 * The platform-wide "AI cost" chart above this one (`TokenConsumption`) has no
 * filter to isolate one feature and no time axis at all — one snapshot for
 * the whole window. This is the dedicated view for the two autonomous coding
 * agents: a trend comparing them over time, plus what each spends it on.
 *
 * `service` is NOT the discriminator — both features write `service: 'llm'`;
 * the backend classifies by `task` instead (see `CodingAgentCostAnalyticsService`).
 */
export const CodingAgentCost = ({ query }: AnalyticsTabFilters) => {
  const { data, isLoading, isError, refetch } = useGetCodingAgentCostQuery(query);

  const points = useMemo(() => data?.points ?? [], [data]);
  const trendData = useMemo(() => buildCodingAgentTrend(points), [points]);

  const modelBreakdown = useMemo(() => data?.modelBreakdown ?? [], [data]);
  const bugHunterModels = useMemo(
    () => buildModelBreakdown(modelBreakdown, "bug-hunter"),
    [modelBreakdown],
  );
  const builderModels = useMemo(
    () => buildModelBreakdown(modelBreakdown, "builder"),
    [modelBreakdown],
  );

  const window = windowLabel(data?.window);
  const totalCostUsd = data?.totalCostUsd ?? { "bug-hunter": 0, builder: 0 };
  const grandTotal = totalCostUsd["bug-hunter"] + totalCostUsd.builder;
  const unpricedCalls = data?.unpricedCalls ?? 0;

  // `extra` on the chartKit factories replaces a whole top-level key rather
  // than deep-merging it, so a compact-currency tick formatter — the one
  // thing every factory's defaults don't offer — has to be added by hand
  // onto the built options' own `axes.left`, not passed through `extra`.
  const withUsdTicks = <T extends { axes: { left: Record<string, unknown> } }>(options: T): T => ({
    ...options,
    axes: {
      ...options.axes,
      left: {
        ...options.axes.left,
        ticks: { formatter: (tick: number | Date) => formatUsdCompact(Number(tick)) },
      },
    },
  });

  const trendOptions = useMemo(
    () =>
      withUsdTicks(lineOpts({ leftTitle: "Estimated cost (USD)", colorScale: CODING_AGENT_SCALE })),
    [],
  );

  const breakdownOptionsFor = (data: { group: string; value: number }[]) =>
    withUsdTicks(
      barOpts({
        bottomTitle: "Model",
        colorScale: buildColorScale(data.map(d => d.group)),
      }),
    );

  const source = buildSource({
    derivation: "llm_usage, priced at read time from the pricing table — not a billed figure",
    window,
    extra:
      unpricedCalls > 0
        ? `${unpricedCalls.toLocaleString()} calls have no pricing entry and count as $0 — the real total is higher`
        : "every call in this window was priced",
    asOf: asOf(data?.window),
  });

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title="Bug Hunter vs Builder cost over time"
        caption="Estimated AI spend for the two autonomous coding agents, day by day."
        takeaway={
          <span>
            {formatUsd(grandTotal)} estimated across the window —{" "}
            {formatUsd(totalCostUsd["bug-hunter"])} Bug Hunter, {formatUsd(totalCostUsd.builder)}{" "}
            Builder
          </span>
        }
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load coding-agent cost"
        errorSubtitle="There was a problem fetching Bug Hunter/Builder usage."
        empty={trendData.length === 0}
        emptyText="No Bug Hunter or Builder usage recorded for this window"
        wide
      >
        <ScrollableChart data={trendData}>
          <LineChart data={trendData} options={trendOptions} />
        </ScrollableChart>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard
          title="Bug Hunter spend by model"
          caption="Whole-window total, not bucketed by time."
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load Bug Hunter's breakdown"
          empty={bugHunterModels.length === 0}
          emptyText="No Bug Hunter spend recorded for this window"
          height={CHART_HEIGHT}
        >
          <ScrollableChart data={bugHunterModels} on="group">
            <SimpleBarChart data={bugHunterModels} options={breakdownOptionsFor(bugHunterModels)} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Builder spend by model"
          caption="Whole-window total, not bucketed by time."
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load Builder's breakdown"
          empty={builderModels.length === 0}
          emptyText="No Builder spend recorded for this window"
          height={CHART_HEIGHT}
        >
          <ScrollableChart data={builderModels} on="group">
            <SimpleBarChart data={builderModels} options={breakdownOptionsFor(builderModels)} />
          </ScrollableChart>
        </ChartCard>
      </div>
    </div>
  );
};
