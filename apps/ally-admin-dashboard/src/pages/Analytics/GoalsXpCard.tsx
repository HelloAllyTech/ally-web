import { useMemo, useState } from "react";

import { GroupedBarChart } from "@carbon/charts-react";

import { useGetGoalsXpQuery } from "@api";

import { GROUPING_LABEL } from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, timeBarOpts } from "./chartKit";
import {
  XP_GOAL_GRAIN_OPTIONS,
  buildGoalsXpSeries,
  buildGoalsXpTable,
  goalsXpEmptyText,
  goalsXpNoGoalNote,
  goalsXpScale,
  goalsXpTakeaway,
  goalsXpUpcomingNote,
  toXpGoalGrain,
} from "./goalsXpChart";

type ChartId = "xp";

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
 * From a fixed April 2026 floor through today (not the platform's all-time
 * data floor) and platform-wide (no tenant filter) — the grain is the chart's
 * own control, not the page's range picker (there is no page-level range on
 * Goals at all).
 *
 * ## Grain, and why there's no "All-time"
 *
 * Uses the shared {@link GroupingPicker}/{@link useChartControls}, narrowed via
 * `options` to {@link XP_GOAL_GRAIN_OPTIONS} — the endpoint only understands
 * month/quarter/year, because a goal row is seeded at one of those three
 * grains and a day/week axis would have nothing under it.
 *
 * No "All-time" option either, deliberately: the endpoint returns no
 * whole-window total, only per-period points. Summing `actualXp` across the
 * currently-displayed points would work (a sum is associative), but the
 * "Goal" side would not be an honest whole-window target — it would be a fold
 * of whichever grain happened to be selected, silently changing value if a
 * reader switched from monthly to quarterly first. That is exactly the
 * "fold of bucketed data" the rest of this platform's All-time tiles are
 * built to avoid, so this card leaves it out rather than fake a number.
 */
export const GoalsXpCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.xp",
    defaultControlsFor(["xp"], { xp: { grain: "month" } }),
  );
  const grain = controlsFor("xp").grain;
  const xpGrain = toXpGoalGrain(grain);
  const { data, isLoading, isError, refetch } = useGetGoalsXpQuery(
    { grain: xpGrain },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = data?.points ?? [];
  const series = useMemo(() => buildGoalsXpSeries(data?.points ?? []), [data]);
  const table = useMemo(() => buildGoalsXpTable(data?.points ?? []), [data]);
  const takeaway = goalsXpTakeaway(points);
  const noGoalNote = goalsXpNoGoalNote(points);
  const upcomingNote = goalsXpUpcomingNote(points);
  const emptyText = goalsXpEmptyText(points);

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "XP",
        bottomTitle: GROUPING_LABEL[grain],
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
        loading={(isLoading || hydrating) && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && Boolean(emptyText)}
        emptyText={emptyText}
        controls={
          <GroupingPicker
            id="goals-xp-grain"
            value={grain}
            onChange={g => setGrain("xp", g)}
            options={XP_GOAL_GRAIN_OPTIONS}
          />
        }
        onExpand={() => setExpanded(true)}
        height="340px"
        chartId="AAQ-001"
      >
        <div className="flex flex-col gap-4">
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
            `Grouped by ${GROUPING_LABEL[grain].toLowerCase()}`,
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
