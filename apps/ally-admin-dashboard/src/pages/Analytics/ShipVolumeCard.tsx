import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetShipVolumeQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, stackedBarOpts } from "./chartKit";
import {
  DEFAULT_SHIP_VOLUME_WEEKS,
  SHIP_VOLUME_WINDOWS,
  buildShipVolumeScale,
  buildShipVolumeSeries,
  buildShipVolumeTable,
  buildShipVolumeWeeks,
  formatLines,
  partialFootnote,
  partialWeek,
  plottedWeeks,
  shipVolumeEmptyText,
  shipVolumeTakeaway,
  unavailableNote,
} from "./shipVolumeChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "Changed lines shipped per week, by repo";

/**
 * How much code lands across the Ally repos each week.
 *
 * The sentence the reader should be able to say after looking: "we're moving
 * about 65,000 lines a week, and last week most of it was ally-web." That is a
 * question about CAPACITY — is the rate changing, and which part of the system is
 * absorbing the effort.
 *
 * **It is an output measure and the card says so twice**, in the caption and in
 * the takeaway's phrasing, because churn invites a reading it cannot support.
 * Lines say how much code moved, never whether the right thing moved, and a
 * small well-abstracted change routinely beats a large one. The outcome
 * counterpart is the votes-shipped chart directly above it on this tab, which is
 * why this one sits second: a reader meets "did we ship what was wanted" before
 * "how much did we move".
 *
 * **Deliberately not split by author.** GitHub would hand that over in the same
 * call, and a per-person line count is the canonical way this metric does
 * damage. The repo split is the cut that answers the question worth asking.
 *
 * Owns its own window control rather than taking a page-level range, matching
 * the tab's other card: a weekly axis wider than about a year stops being
 * readable long before "all time" would, so this chart's window is a property of
 * this chart.
 */
export const ShipVolumeCard = () => {
  const [weeksWindow, setWeeksWindow] = useState(DEFAULT_SHIP_VOLUME_WEEKS);
  const { data, isLoading, isError, refetch } = useGetShipVolumeQuery({ weeks: weeksWindow });
  const [expanded, setExpanded] = useState(false);

  const weeks = useMemo(() => buildShipVolumeWeeks(data), [data]);
  const repos = useMemo(() => data?.repos ?? [], [data]);
  const series = useMemo(() => buildShipVolumeSeries(weeks, repos), [weeks, repos]);
  const scale = useMemo(() => buildShipVolumeScale(repos), [repos]);
  const table = useMemo(() => buildShipVolumeTable(weeks, repos), [weeks, repos]);

  const plotted = plottedWeeks(weeks);
  const inProgress = partialWeek(weeks);
  const takeaway = shipVolumeTakeaway(weeks);
  const missing = unavailableNote(data);
  const emptyText = shipVolumeEmptyText(data, weeks);

  const items = useMemo(() => SHIP_VOLUME_WINDOWS.map((w, id) => ({ id, ...w })), []);
  const selectedItem = items.find(i => i.weeks === weeksWindow) ?? items[0];

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Changed lines",
        bottomTitle: "Week beginning",
        colorScale: scale,
        height: "340px",
      }),
    [scale],
  );

  const caption =
    `Lines added plus lines removed on each repo's default branch, per week — ` +
    `GitHub's own weekly statistics for ally-be, ally-web, ally-ai, ally-ai-learn, ` +
    `ally-mobile, infra and the developer wiki. CHURN, not net: a week that removes ` +
    `40,000 lines did real work that a net figure would show as almost nothing. ` +
    `This measures how much code MOVED — it is a capacity signal, not a ` +
    `productivity one, and it says nothing about whether the right thing moved; ` +
    `the votes-shipped chart above is the outcome counterpart. Weeks begin on ` +
    `Sunday, matching GitHub's own buckets, and there is deliberately no split by ` +
    `author.`;

  const source = buildSource({
    derivation:
      "GitHub /stats/code_frequency per repo (additions + deletions on the default branch), summed weekly",
    window: `Last ${data?.weeksRequested ?? weeksWindow} weeks, Sunday-anchored`,
    n: data?.plotted.churn,
    nUnit: "changed lines plotted",
    extra: "Ally's own engineering output — platform-wide, no tenant scope",
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
              id="ship-volume-window"
              size="md"
              titleText="Window"
              label="Window"
              items={items}
              selectedItem={selectedItem}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem: picked }) => {
                if (picked) setWeeksWindow(picked.weeks);
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
            {/* The coverage line is the most important sentence on this panel when
                it appears: a repo that failed to load shortens every bar with
                nothing on the chart to show that it happened. */}
            {missing && <span className="text-support-warning-inverse">{missing}</span>}
            {data && data.plotted.churn > 0 && (
              <span>
                {formatLines(data.plotted.added)} added and {formatLines(data.plotted.deleted)}{" "}
                removed across the window. Lockfiles and build output are not excluded here —
                GitHub&apos;s statistics count every line on the branch — so a week with a big
                dependency bump reads higher than the hand-written work in it.
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
          caption="Added and removed split out, with the net beside them: 40,000 changed lines is a week of building or a week of deleting, and those are different weeks."
          source={source}
          table={table}
          exportContext={[
            `Window: last ${data?.weeksRequested ?? weeksWindow} weeks, Sunday-anchored (GitHub's own week boundary)`,
            "Churn = lines added + lines removed on each repo's default branch",
            "An output measure: how much code moved, not whether the right thing moved",
            "No author split, by design",
            "Includes lockfiles and generated files, which GitHub's statistics do not separate",
            ...(inProgress ? [`${inProgress.plainLabel} is the week in progress`] : []),
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
