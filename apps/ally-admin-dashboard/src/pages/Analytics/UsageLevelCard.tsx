import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetUsageLevelsQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, stackedBarOpts } from "./chartKit";
import {
  UsageDenominator,
  USAGE_DENOMINATORS,
  bandLabels,
  buildUsageLevelMonths,
  buildUsageLevelScale,
  buildUsageLevelSeries,
  buildUsageLevelTable,
  denominatorMeta,
  latestUsagePopulation,
  plottableUsageMonths,
  suppressedUsageMonths,
  usageLevelTakeaway,
} from "./usageLevelChart";

/** Shares are a 0–100 scale by construction — never a data-fitted axis. */
const SHARE_DOMAIN: [number, number] = [0, 100];

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Monthly usage-level mix.
 *
 * The question: what share of our learners practise how much, month by month — and
 * is the mix shifting up? The practice-minutes line next to it says how much
 * practice happened in total, which a handful of very heavy users can carry on
 * their own; this says who it came from, and whether the middle of the population
 * is deepening or thinning.
 *
 * A 100% stacked bar because the bands partition the population exactly: every
 * learner is in one and only one band each month, so the bar's height means the
 * same thing in every period.
 *
 * Honesty rules on the surface, not in a tooltip:
 *  - **The denominator is a choice, so the reader makes it.** "Percentage of
 *    users" can mean every registered learner or only those who ever practised;
 *    both are on the panel, both come from one response over one set of band
 *    counts, and the caption names the one in force.
 *  - **The current month is left off.** It is still accruing minutes, so its low
 *    bands are overstated; the table keeps it, flagged.
 *  - **Small populations show counts, not shares** — a breakdown over four
 *    learners names them.
 *  - **The window is fixed and monthly** and cannot honour the page's date range,
 *    so it says so rather than silently ignoring the filter.
 */
export const UsageLevelCard = ({ tenantId }: { tenantId?: string }) => {
  const { data, isLoading, isError, refetch } = useGetUsageLevelsQuery({ tenantId });
  const [denominator, setDenominator] = useState<UsageDenominator>("registered");
  const [expanded, setExpanded] = useState(false);

  const labels = useMemo(() => bandLabels(data), [data]);
  const months = useMemo(() => buildUsageLevelMonths(data, denominator), [data, denominator]);
  const series = useMemo(() => buildUsageLevelSeries(months, labels), [months, labels]);
  const scale = useMemo(() => buildUsageLevelScale(labels), [labels]);
  const table = useMemo(() => buildUsageLevelTable(months, labels), [months, labels]);

  const plotted = plottableUsageMonths(months);
  const suppressed = suppressedUsageMonths(months);
  const takeaway = usageLevelTakeaway(months);
  const population = latestUsagePopulation(months);
  const meta = denominatorMeta(denominator);

  const items = useMemo(() => USAGE_DENOMINATORS.map((d, id) => ({ id, ...d })), []);
  const selectedItem = items.find(i => i.key === denominator) ?? items[0];

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "% of learners",
        bottomTitle: "Month",
        colorScale: scale,
        domain: SHARE_DOMAIN,
        height: "340px",
      }),
    [scale],
  );

  const windowLabel = `Last ${data?.completeMonths ?? 12} complete months`;

  const caption =
    `Each month's learners split by how many minutes they practised in it. Bands are ` +
    `lower-inclusive (a learner on exactly 25 minutes is in "25–50"). Percentages are of ` +
    `${meta.description}. Monthly and fixed-window — not affected by the date range above. ` +
    `The current month is still accruing minutes, so it is left off the chart and shown in the ` +
    `table instead.`;

  const source = buildSource({
    derivation:
      "Per-learner monthly sums of user_daily_scores.minutesPlayed over LEARNER accounts, banded",
    window: windowLabel,
    n: population,
    nUnit: `learners in the latest complete month (${meta.label.toLowerCase()})`,
    asOf: asOfStamp(data?.computedAt),
  });

  return (
    <>
      <ChartCard
        wide
        title="Usage levels — monthly practice-time mix"
        caption={caption}
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && plotted.length === 0}
        emptyText="No completed month has enough learners to show a mix yet."
        onExpand={() => setExpanded(true)}
        height="340px"
      >
        <div className="flex flex-col gap-4">
          {/* `relative` is load-bearing: Carbon's Dropdown renders its open list as
              an absolutely-positioned child, and a `static` ancestor is not a
              containing block — the list escapes any scroll container and inflates
              its scrollHeight into a phantom second scrollbar. */}
          <div className="relative w-80">
            <Dropdown
              id="usage-level-denominator"
              size="md"
              titleText="Percentage of"
              label="Percentage of"
              items={items}
              selectedItem={selectedItem}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem: picked }) => {
                if (picked) setDenominator(picked.key);
              }}
            />
          </div>

          <ScrollableChart data={series}>
            <StackedBarChart data={series} options={opts} />
          </ScrollableChart>

          <div className="flex flex-col gap-1 text-xs text-typography-500">
            <span>
              Segments stack bottom-up from &quot;{data?.zeroBandLabel ?? "0 min"}&quot; through
              rising usage. The grey base is learners who did not practise that month — the absence
              of a usage level, not the lowest one.
            </span>
            {suppressed.length > 0 && (
              <span>
                {suppressed.length} {suppressed.length === 1 ? "month is" : "months are"} left off:
                fewer than {data?.minPopulationSize} learners, where a share names the individuals.
                Their counts are in the table.
              </span>
            )}
          </div>
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title="Usage levels — monthly practice-time mix"
          caption="Counts per band, which the chart cannot show: a share is only readable next to the number of people it is over."
          source={source}
          table={table}
          exportContext={[
            `Window: ${windowLabel} plus the current, in-progress month`,
            `Percentages are of ${meta.description}`,
            `Bands are lower-inclusive, upper-exclusive, over per-learner monthly practice minutes`,
            `Months with fewer than ${data?.minPopulationSize ?? 5} learners show counts only`,
          ]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <StackedBarChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
