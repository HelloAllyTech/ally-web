import { useMemo, useState } from "react";

import { GroupedBarChart } from "@carbon/charts-react";

import { Tooltip } from "@ally-ui-mono/ui-shared";

import { useGetGoalsXpQuery } from "@api";

import { TooltipIcon } from "@assets";

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

const TITLE = "Utilization Actual Versus Goal";

/**
 * The measurement detail that used to sit under the title as a caption — plus the
 * per-period notes and the provenance line that used to sit on the card face —
 * all folded behind the help tooltip beside the title, so the card itself stays
 * minimal: just the plot. These two paragraphs are the static part (what the
 * bars mean and how XP is earned); the notes and source line are appended per
 * render because they depend on the data.
 */
const XP_HELP_STATIC = (
  <>
    <p>
      Actual XP earned each period against the goal set for that period. Goals are seeded
      in the database, not set here — a period with no goal shows no goal bar, and a future
      period with a goal shows its target before any actual XP is in. Platform-wide, all time.
    </p>
    <p className="mt-2">
      XP rewards learner effort, not a session&rsquo;s score: 1 per practice minute, +10 for
      completing a session, daily depth bonuses (10/20/40 at 15/30/60 minutes), 5&ndash;30 for
      completing a track item by type, +15 for starting a debrief thread, +5 per substantive
      peer comment, and +100 for practising 4+ days in a week. Per-source daily caps apply, up
      to 250 XP a day.
    </p>
  </>
);

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
    defaultControlsFor(["xp"], { xp: { grain: "quarter" } }),
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

  const source = buildSource({
    derivation: "SUM(xp_events.xp) per period vs. analytics_xp_goals.targetXp",
    window: "All time",
    n: points.length,
    nUnit: "periods shown",
    extra: "Platform-wide — no tenant scope",
    asOf: asOfStamp(data?.computedAt),
  });

  // Everything the card used to show around the plot — the how-it-works copy, the
  // per-period notes, and the provenance line — folded into the one help tooltip so
  // the card face stays minimal. The full provenance still shows on the card in the
  // expanded detail view below.
  const help = (
    <div style={{ maxWidth: "22rem" }} className="text-xs leading-relaxed">
      {XP_HELP_STATIC}
      {noGoalNote && <p className="mt-2">{noGoalNote}</p>}
      {upcomingNote && <p className="mt-2">{upcomingNote}</p>}
      <p className="mt-2 text-typography-400">{source}</p>
    </div>
  );

  return (
    <>
      <ChartCard
        wide
        title={TITLE}
        titleHelp={
          <Tooltip label={help} align="bottom">
            <button
              type="button"
              className="cursor-pointer inline-flex items-center"
              aria-label="How this chart and XP are calculated"
            >
              <TooltipIcon />
            </button>
          </Tooltip>
        }
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
        <ScrollableChart data={series}>
          <GroupedBarChart data={series} options={opts} />
        </ScrollableChart>
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
