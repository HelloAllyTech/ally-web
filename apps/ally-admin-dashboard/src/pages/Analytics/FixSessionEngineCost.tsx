import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetFixSessionEngineCostQuery } from "@api";

import { asOf } from "./analyticsFilters";
import { CHART_HEIGHT, ChartCard, ScrollableChart, barOpts, buildSource } from "./chartKit";
import {
  buildFixSessionEngineCostBars,
  ENGINE_COST_SCALE,
  rangeEndingToday,
} from "./fixSessionEngineCostChart";
import { formatUsd } from "./tokenChart";

/**
 * How many days back to compare, independent of the tab-wide 30d/90d/12m
 * range picker above.
 *
 * Deliberately its own control rather than reusing the shared one: this
 * chart's whole point only exists because Gemini support (and two real bugs
 * in its cost reporting) landed within the last few days, so the SHARED
 * range's smallest option — 30 days — would still average clean, correct
 * recent runs together with broken pre-fix ones from the same window,
 * silently diluting the very comparison this chart exists to show. A
 * chart-local, finer day count is how a reader actually isolates "since it
 * was fixed" from "since Gemini existed at all". Same reasoning as
 * BugHunter/AccuracyPanel.tsx's own local WINDOWS control.
 */
const DAY_OPTIONS = [3, 7, 14, 30] as const;
type Days = (typeof DAY_OPTIONS)[number];

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
export const FixSessionEngineCost = () => {
  const [days, setDays] = useState<Days>(7);
  const { data, isLoading, isError, refetch } = useGetFixSessionEngineCostQuery(
    rangeEndingToday(days),
  );

  const byEngine = useMemo(() => data?.byEngine ?? [], [data]);
  const bars = useMemo(() => buildFixSessionEngineCostBars(byEngine), [byEngine]);

  const lowSampleEngines = byEngine.filter(row => row.sessionCount > 0 && row.sessionCount < 5);

  const options = useMemo(
    () => barOpts({ leftTitle: "Avg cost per session (USD)", colorScale: ENGINE_COST_SCALE }),
    [],
  );

  const source = buildSource({
    derivation: "bug_hunt_runs.totalTokenCostUsd, averaged across completed fix sessions",
    window: `last ${days} day${days === 1 ? "" : "s"}`,
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

  const dayItems = DAY_OPTIONS.map(d => ({ id: d, label: `Last ${d} days` }));

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
      controls={
        <div className="w-32 shrink-0">
          <Dropdown
            id="fix-session-engine-cost-days"
            size="sm"
            titleText="Days"
            hideLabel
            label="Days"
            items={dayItems}
            selectedItem={dayItems.find(i => i.id === days) ?? dayItems[1]}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) setDays(selectedItem.id);
            }}
          />
        </div>
      }
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
