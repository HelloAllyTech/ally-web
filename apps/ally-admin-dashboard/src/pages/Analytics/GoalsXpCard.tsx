import { useMemo, useState } from "react";

import { GroupedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetGoalsXpQuery } from "@api";
import { XpGoalGrain } from "@types";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, timeBarOpts } from "./chartKit";
import {
  GOALS_XP_GRAINS,
  buildGoalsXpSeries,
  buildGoalsXpTable,
  goalsXpEmptyText,
  goalsXpNoGoalNote,
  goalsXpScale,
  goalsXpTakeaway,
  goalsXpUpcomingNote,
} from "./goalsXpChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "XP earned vs. goal";

/**
 * Actual platform XP earned per period against a goal for that period, where
 * one has been set.
 *
 * Goals are NOT editable here or anywhere in the admin console — they are
 * seeded directly into `analytics_xp_goals` by migration (see
 * `CreateAnalyticsXpGoals` in ally-be). A period with no goal row is never
 * shown as a target of zero: its Goal bar is simply absent, and
 * {@link goalsXpNoGoalNote} plus the detail table both say so in words.
 *
 * All-time by construction (from the platform data floor through today) and
 * platform-wide (no tenant filter) — the grain (month/quarter/year) is the
 * chart's own control, not the page's range picker.
 */
export const GoalsXpCard = () => {
  const [grain, setGrain] = useState<XpGoalGrain>("month");
  const { data, isLoading, isError, refetch } = useGetGoalsXpQuery({ grain });
  const [expanded, setExpanded] = useState(false);

  const points = data?.points ?? [];
  const series = useMemo(() => buildGoalsXpSeries(data?.points ?? []), [data]);
  const table = useMemo(() => buildGoalsXpTable(data?.points ?? []), [data]);
  const takeaway = goalsXpTakeaway(points);
  const noGoalNote = goalsXpNoGoalNote(points);
  const upcomingNote = goalsXpUpcomingNote(points);
  const emptyText = goalsXpEmptyText(points);

  const items = GOALS_XP_GRAINS;
  const selectedItem = items.find(i => i.key === grain) ?? items[0];

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "XP",
        bottomTitle: GOALS_XP_GRAINS.find(g => g.key === grain)?.label ?? "Period",
        colorScale: goalsXpScale,
        height: "340px",
      }),
    [grain],
  );

  const caption =
    "Actual XP earned per period, from the same xp_events ledger as the Highlights " +
    "cumulative-XP chart, against a goal for that period where one has been recorded. " +
    "Goals are set directly in the database, not through this console — a period with " +
    "no target is shown with no Goal bar rather than a target of zero. Extends past " +
    "today when a future period already has a goal set, shown as an upcoming target " +
    "with no Actual bar. Platform-wide, all time.";

  const source = buildSource({
    derivation: "SUM(xp_events.xp) per period vs. analytics_xp_goals.targetXp",
    window: "All time",
    n: points.length,
    nUnit: "periods shown",
    extra: "Platform-wide — no tenant scope",
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
        empty={!isLoading && Boolean(emptyText)}
        emptyText={emptyText}
        onExpand={() => setExpanded(true)}
        height="340px"
      >
        <div className="flex flex-col gap-4">
          {/* `relative` is load-bearing: Carbon's Dropdown renders its open list as
              an absolutely-positioned child, which escapes a `static` scroll
              container and inflates an ancestor's scrollHeight into a phantom
              second scrollbar (see RoadmapDeliveryCard for the same note). */}
          <div className="relative w-40">
            <Dropdown
              id="goals-xp-grain"
              size="md"
              titleText="Group by"
              hideLabel
              label="Group by"
              items={items}
              selectedItem={selectedItem}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem: picked }) => {
                if (picked) setGrain(picked.key);
              }}
            />
          </div>

          <ScrollableChart data={series}>
            <GroupedBarChart data={series} options={opts} />
          </ScrollableChart>

          {noGoalNote && <p className="text-xs text-typography-500">{noGoalNote}</p>}
          {upcomingNote && <p className="text-xs text-typography-500">{upcomingNote}</p>}
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Exact XP totals beside each period's goal — 'No goal set' means no row exists in analytics_xp_goals for that period, not a target of zero."
          source={source}
          table={table}
          exportContext={[
            "Window: all time",
            `Grouped by ${GOALS_XP_GRAINS.find(g => g.key === grain)?.label.toLowerCase()}`,
            ...(noGoalNote ? [noGoalNote] : []),
            ...(upcomingNote ? [upcomingNote] : []),
          ]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <GroupedBarChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
