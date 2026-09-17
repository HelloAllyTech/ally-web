import { useMemo } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { useGetFixSessionEngineCostQuery } from "@api";

import { AnalyticsTabFilters, asOf, windowLabel } from "./analyticsFilters";
import { CHART_HEIGHT, ChartCard, ScrollableChart, barOpts, buildSource } from "./chartKit";
import { buildFixSessionEngineCostBars, ENGINE_COST_SCALE } from "./fixSessionEngineCostChart";
import { formatUsd } from "./tokenChart";

/**
 * "Same job, cheaper model, here's the delta" — average cost per COMPLETED
 * Bug Hunter fix session, Claude vs Gemini, side by side.
 *
 * Deliberately not a per-model spend TOTAL (the chart above already shows
 * that): Bug Hunter has run its two engines a very different number of
 * times, so whichever ran less often would always show the smaller total
 * regardless of which is actually cheaper per fix. Averaging per session is
 * the fair comparison.
 */
export const FixSessionEngineCost = ({ query }: AnalyticsTabFilters) => {
  const { data, isLoading, isError, refetch } = useGetFixSessionEngineCostQuery(query);

  const byEngine = useMemo(() => data?.byEngine ?? [], [data]);
  const bars = useMemo(() => buildFixSessionEngineCostBars(byEngine), [byEngine]);

  const window = windowLabel(data?.window);
  const lowSampleEngines = byEngine.filter(row => row.sessionCount > 0 && row.sessionCount < 5);

  const options = useMemo(
    () => barOpts({ leftTitle: "Avg cost per session (USD)", colorScale: ENGINE_COST_SCALE }),
    [],
  );

  const source = buildSource({
    derivation: "bug_hunt_runs.totalTokenCostUsd, averaged across completed fix sessions",
    window,
    extra:
      byEngine.length > 0
        ? byEngine
            .map(
              row =>
                `${row.sessionCount} ${row.engine} session${row.sessionCount === 1 ? "" : "s"}`,
            )
            .join(", ")
        : undefined,
    asOf: asOf(data?.window),
  });

  return (
    <ChartCard
      title="Fix session cost — Claude vs Gemini"
      caption="Average real cost per completed fix session on each engine — the fair comparison a per-model spend total can't give, since the two run a very different number of times."
      takeaway={
        bars.length > 0 ? (
          <span>{bars.map(b => `${b.group} ${formatUsd(b.value)}`).join(" · ")}</span>
        ) : undefined
      }
      source={source}
      loading={isLoading && !data}
      error={isError}
      onRetry={refetch}
      errorTitle="Couldn't load fix-session cost by engine"
      errorSubtitle="There was a problem fetching Bug Hunter's fix-session cost."
      empty={bars.length === 0}
      emptyText="No completed fix session has both an engine and a cost recorded yet for this window"
      height={CHART_HEIGHT}
    >
      {lowSampleEngines.length > 0 && (
        <p className="text-xs text-typography-600 mb-2">
          {lowSampleEngines
            .map(
              row =>
                `${row.engine} is only ${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"} so far`,
            )
            .join("; ")}{" "}
          — treat this average as early, not a trend yet.
        </p>
      )}
      <ScrollableChart data={bars} on="group">
        <SimpleBarChart data={bars} options={options} />
      </ScrollableChart>
    </ChartCard>
  );
};
