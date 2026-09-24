import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetShipVolumeQuery } from "@api";

import { GROUPING_LABEL, bucketTitle } from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  stackedBarOpts,
} from "./chartKit";
import {
  SHIP_VOLUME_GROUPINGS,
  buildShipVolumeScale,
  buildShipVolumeSeries,
  buildShipVolumeTable,
  buildShipVolumeWeeks,
  formatLines,
  partialFootnote,
  partialWeek,
  plottedWeeks,
  rollUpShipVolume,
  shipVolumeEmptyText,
  shipVolumePeriodNoun,
  shipVolumeTakeaway,
  unavailableNote,
} from "./shipVolumeChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "Changed Lines Shipped by Repo";

type ChartId = "ship";

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
 * small well-abstracted change routinely beats a large one. Its outcome
 * counterpart — votes shipped — lives on the Product Management tab, not
 * beside it here: this card moved to Highlights → Goals so leadership meets
 * "how much did we build this period" alongside the other pace-of-the-business
 * charts, without implying the two tabs measure the same thing.
 *
 * **Deliberately not split by author.** GitHub would hand that over in the same
 * call, and a per-person line count is the canonical way this metric does
 * damage. The repo split is the cut that answers the question worth asking —
 * collective output, never individual.
 *
 * Like the rest of this tab: the whole history, and only a grouping control.
 * GitHub gives weekly totals only, so the grouping offers Week through
 * All-time but no Day ({@link SHIP_VOLUME_GROUPINGS}), and the coarser grains
 * are sums of whole weeks ({@link rollUpShipVolume}).
 */
export const ShipVolumeCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.ship",
    defaultControlsFor(["ship"], { ship: { grain: "month" } }),
  );
  const grain = controlsFor("ship").grain;
  const noun = shipVolumePeriodNoun(grain);

  const { data, isLoading, isError, refetch } = useGetShipVolumeQuery({ span: "all" });
  const [expanded, setExpanded] = useState(false);

  const weeks = useMemo(() => rollUpShipVolume(buildShipVolumeWeeks(data), grain), [data, grain]);
  const repos = useMemo(() => data?.repos ?? [], [data]);
  const series = useMemo(() => buildShipVolumeSeries(weeks, repos), [weeks, repos]);
  const scale = useMemo(() => buildShipVolumeScale(repos), [repos]);
  const table = useMemo(
    () => buildShipVolumeTable(weeks, repos, bucketTitle(grain)),
    [weeks, repos, grain],
  );

  const plotted = plottedWeeks(weeks);
  const inProgress = partialWeek(weeks);
  const takeaway = grain === "allTime" ? undefined : shipVolumeTakeaway(weeks, noun);
  const missing = unavailableNote(data);
  const emptyText = shipVolumeEmptyText(data, weeks);

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Changed lines",
        bottomTitle: grain === "week" ? "Week beginning" : GROUPING_LABEL[grain],
        colorScale: scale,
        height: "340px",
      }),
    [scale, grain],
  );

  const caption =
    `Lines added plus lines removed on each repo's default branch, per week — ` +
    `GitHub's own weekly statistics for ally-be, ally-web, ally-ai, ally-ai-learn, ` +
    `ally-mobile, infra and the developer wiki. CHURN, not net: a week that removes ` +
    `40,000 lines did real work that a net figure would show as almost nothing. ` +
    `This measures how much code MOVED — it is a capacity signal, not a ` +
    `productivity one, and it says nothing about whether the right thing moved; ` +
    `see the Product Management tab's votes-shipped chart for that outcome ` +
    `counterpart. Weeks begin on Sunday, matching GitHub's own buckets; GitHub ` +
    `counts weekly only, so there is no Day grouping, and a week that straddles ` +
    `a month boundary counts toward the month it started in. There is ` +
    `deliberately no split by author.`;

  const source = buildSource({
    derivation:
      "GitHub /stats/code_frequency per repo (additions + deletions on the default branch), summed weekly",
    window: "All time, Sunday-anchored weeks",
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
        collapseMeta
        metaExtra={
          <div className="flex flex-col gap-1">
            {inProgress && <span>{partialFootnote(inProgress, noun)}</span>}
            {data && data.plotted.churn > 0 && (
              <span>
                {formatLines(data.plotted.added)} added and {formatLines(data.plotted.deleted)}{" "}
                removed across the window. Lockfiles and build output are not excluded here —
                GitHub&apos;s statistics count every line on the branch — so a week with a big
                dependency bump reads higher than the hand-written work in it.
              </span>
            )}
          </div>
        }
        takeaway={takeaway}
        source={source}
        loading={hydrating || (isLoading && !data)}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && plotted.length === 0}
        emptyText={emptyText}
        onExpand={() => setExpanded(true)}
        controls={
          <GroupingPicker
            id="goals-ship-grain"
            value={grain}
            onChange={g => setGrain("ship", g)}
            options={SHIP_VOLUME_GROUPINGS}
          />
        }
        height="340px"
        chartId="AAQ-008"
      >
        <div className="flex flex-col gap-4">
          <ScrollableChart data={series}>
            <StackedBarChart data={series} options={opts} />
          </ScrollableChart>

          {/* The routine footnotes (partial-week marker, churn breakdown) are folded
              into the help tooltip via metaExtra. The coverage warning stays on the
              face on purpose: when a repo fails to load it shortens every bar with
              nothing on the chart to show it happened, so it must not hide in a hover. */}
          {missing && <p className="text-xs text-support-warning-inverse">{missing}</p>}
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
            "Window: all time, Sunday-anchored weeks (GitHub's own week boundary)",
            `Grouped by ${GROUPING_LABEL[grain].toLowerCase()}`,
            "Churn = lines added + lines removed on each repo's default branch",
            "An output measure: how much code moved, not whether the right thing moved",
            "No author split, by design",
            "Includes lockfiles and generated files, which GitHub's statistics do not separate",
            ...(inProgress ? [`${inProgress.plainLabel} is the ${noun} in progress`] : []),
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
