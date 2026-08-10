import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetRoadmapDeliveryQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, stackedBarOpts } from "./chartKit";
import {
  ROADMAP_TYPE_FILTERS,
  RoadmapTypeFilter,
  buildRoadmapDeliveryMonths,
  buildRoadmapDeliveryScale,
  buildRoadmapDeliverySeries,
  buildRoadmapDeliveryTable,
  measureOf,
  partialFootnote,
  partialMonth,
  plottedMonths,
  roadmapDeliveryEmptyText,
  roadmapDeliveryTakeaway,
  typeFilterMeta,
  undatedNote,
  visibleOwners,
} from "./roadmapDeliveryChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "Coins shipped per month, by owner";

/**
 * Coin-weighted delivery out of the internal product roadmap.
 *
 * The sentence the reader should be able to say after looking: "we shipped 180
 * coins' worth of demand in June, and most of it was Ajey's." That is a different
 * question from "how many things shipped", which weighs a 3-coin nicety like a
 * 90-coin blocker — the coin weighting is what makes a bar a measure of demand
 * satisfied rather than of throughput.
 *
 * Owns its own query: all-time and month-grained by construction, taking neither
 * the page's range nor a tenant, and it says so on its face.
 */
export const RoadmapDeliveryCard = () => {
  const { data, isLoading, isError, refetch } = useGetRoadmapDeliveryQuery();
  const [filter, setFilter] = useState<RoadmapTypeFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const months = useMemo(() => buildRoadmapDeliveryMonths(data, filter), [data, filter]);
  const owners = useMemo(() => visibleOwners(data, months), [data, months]);
  const series = useMemo(() => buildRoadmapDeliverySeries(months, owners), [months, owners]);
  const scale = useMemo(() => buildRoadmapDeliveryScale(data, owners), [data, owners]);
  const table = useMemo(() => buildRoadmapDeliveryTable(months, owners), [months, owners]);

  const plotted = plottedMonths(months);
  const inProgress = partialMonth(months);
  const takeaway = roadmapDeliveryTakeaway(months, owners);
  const missing = undatedNote(data, filter);
  const emptyText = roadmapDeliveryEmptyText(data, months, filter);
  const meta = typeFilterMeta(filter);
  const totals = data ? measureOf(data.plotted, filter) : undefined;

  const items = useMemo(() => ROADMAP_TYPE_FILTERS.map((f, id) => ({ id, ...f })), []);
  const selectedItem = items.find(i => i.key === filter) ?? items[0];

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Coins",
        bottomTitle: "Release month",
        colorScale: scale,
        height: "340px",
      }),
    [scale],
  );

  const caption =
    `Every opportunity released in a month, weighted by its COINS — the sum of every ` +
    `voter's allocation over every period, the same priority score the roadmap board ` +
    `shows. Coins are counted whole, not just the ones cast in the release month: an ` +
    `item accrues backing while it waits, and shipping it satisfies all of it. Counting ` +
    `${meta.description}, bucketed on the date the item moved into Released. All-time and ` +
    `monthly — not affected by any date range.`;

  const source = buildSource({
    derivation:
      "SUM(roadmap_allocations.coins) per released roadmap_opportunity, bucketed on releasedAt by month and split by owner",
    window: "All time",
    n: totals?.opportunities,
    nUnit: "released items plotted",
    extra: "Ally's own roadmap — platform-wide, no tenant scope",
    asOf: asOfStamp(data?.computedAt),
  });

  return (
    <>
      <ChartCard
        wide
        title={TITLE}
        caption={caption}
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && plotted.length === 0}
        emptyText={emptyText}
        onExpand={() => setExpanded(true)}
        height="340px"
      >
        <div className="flex flex-col gap-4">
          {/* `relative` is load-bearing: Carbon's Dropdown renders its open list
              as an absolutely-positioned child, which escapes a `static` scroll
              container and inflates an ancestor's scrollHeight into a phantom
              second scrollbar. */}
          <div className="relative w-80">
            <Dropdown
              id="roadmap-delivery-type"
              size="md"
              titleText="Counting"
              label="Counting"
              items={items}
              selectedItem={selectedItem}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem: picked }) => {
                if (picked) setFilter(picked.key);
              }}
            />
          </div>

          <ScrollableChart data={series}>
            <StackedBarChart data={series} options={opts} />
          </ScrollableChart>

          <div className="flex flex-col gap-1 text-xs text-typography-500">
            {/* Spells out the asterisk on the axis. Carbon truncates a tick label
                past 14 characters, so the marker has to be short and its meaning
                has to live here in prose. */}
            {inProgress && <span>{partialFootnote(inProgress)}</span>}
            {/* The coverage line is the most important sentence on this panel:
                without it the plotted total reads as everything ever shipped. */}
            {missing && <span>{missing}</span>}
            {data && owners.includes(data.unassignedOwnerLabel) && (
              <span>
                &quot;{data.unassignedOwnerLabel}&quot; is released work with no owner set — grey
                because it is the absence of an owner, not one. It is kept in the stack rather than
                dropped, so the monthly totals still add up.
              </span>
            )}
            {data && owners.includes(data.otherOwnerLabel) && (
              <span>
                &quot;{data.otherOwnerLabel}&quot; rolls up everyone past the top {data.maxOwners}{" "}
                by all-time coins — past about eight bands a stack stops being readable. Membership
                is fixed on all-time totals, so it does not change as you switch what is counted.
              </span>
            )}
          </div>
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Release counts beside the coin totals, which the chart cannot show: 180 coins is one blocker or twelve small wins, and those are different months."
          source={source}
          table={table}
          exportContext={[
            "Window: all time, monthly, bucketed on releasedAt",
            `Counting ${meta.description}`,
            "Coins = SUM of every voter's allocation over every period (the board's priority score)",
            ...(inProgress ? [`${inProgress.plainLabel} is still in progress`] : []),
            ...(missing ? [missing] : []),
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
