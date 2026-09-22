import { useMemo, useState } from "react";

import { GroupedBarChart } from "@carbon/charts-react";

import { useGetBugHunterVolumeQuery } from "@api";
import { AnalyticsBucket } from "@types";

import { bucketTitle, withoutInProgress } from "./analyticsGrouping";
import {
  BUG_HUNTER_VOLUME_SCALE,
  buildBugHunterVolumeSeries,
  buildBugHunterVolumeTable,
  bugHunterVolumeEmptyText,
  bugHunterVolumeTakeaway,
} from "./bugHunterVolumeChart";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  integerTickValues,
  timeBarOpts,
} from "./chartKit";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** Grains this chart offers — day/week/month/year, matching the ally-be
 *  endpoint's accepted `bucket` values (no `quarter` — this endpoint extends
 *  the shared `AnalyticsWindowQueryDto`, which doesn't offer it). Opens on
 *  week: Bug Hunter's find/fix rhythm is naturally weekly-shaped, the same
 *  reason the sibling Bug Agent Performance tab fixes its own trends to a
 *  week bucket. */
const GRAIN_OPTIONS: AnalyticsBucket[] = ["day", "week", "month", "year"];

const TITLE = "Bug Hunter find vs. fix volume";

/**
 * How much moves through each half of Bug Hunter's pipeline, per period —
 * "is the agent keeping up with what it finds", read alongside the
 * code-shipped chart rather than the accuracy/precision metrics already on
 * Bug Agent Performance (this chart answers neither how accurate Bug Hunter
 * is nor how fast a fix lands, only volume).
 *
 * Grouped bars, not stacked: found and fixed are independent counts, not
 * parts of one whole. `BugAgentPerformance.tsx`'s five trend charts are all
 * RATE lines (%, medians) rather than volumes, so this borrows the grouped-
 * bar convention from the sibling counts charts (`GoalsXpCard`,
 * `UsageLevelsSubTab`'s "New levels reached") instead.
 */
export const BugHunterVolumeCard = () => {
  const [grain, setGrain] = useState<AnalyticsBucket>("week");
  const { data, isLoading, isError, refetch } = useGetBugHunterVolumeQuery({ bucket: grain });
  const [expanded, setExpanded] = useState(false);

  const allPoints = data?.points ?? [];
  const inProgressBucket = data?.window.inProgressBucket;
  const plottedPoints = useMemo(
    () => withoutInProgress(allPoints, p => p.bucket, inProgressBucket),
    [allPoints, inProgressBucket],
  );

  const series = useMemo(() => buildBugHunterVolumeSeries(plottedPoints), [plottedPoints]);
  const table = useMemo(
    () => buildBugHunterVolumeTable(allPoints, inProgressBucket),
    [allPoints, inProgressBucket],
  );
  const emptyText = bugHunterVolumeEmptyText(plottedPoints);
  const takeaway = bugHunterVolumeTakeaway(allPoints, inProgressBucket);

  const opts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Findings",
        bottomTitle: bucketTitle(grain),
        colorScale: BUG_HUNTER_VOLUME_SCALE,
        legend: true,
        valueTicks: integerTickValues(Math.max(0, ...series.map(d => d.value ?? 0))),
      }),
    [grain, series],
  );

  const caption =
    `How much moves through each half of Bug Hunter's pipeline. "Found" is AUTONOMOUS ` +
    `discoveries only — a human "Report a bug" filing is never counted as found. "Fixed" ` +
    `is any finding that reached merged (or later), from either source, counted by when ` +
    `the fix landed on master where that is known precisely. Not a measure of accuracy or ` +
    `fix speed — see Bug Agent Performance for those. Platform-internal, no tenant scope. ` +
    `The current ${bucketTitle(grain).toLowerCase()} is still accruing and is left off ` +
    `the plot.`;

  const source = buildSource({
    derivation:
      "bug_findings (found) + bug_findings/bug_hunt_events (fixed = merged or later), bucketed",
    window: data?.window.label,
    n: plottedPoints.length,
    nUnit: "periods shown",
    extra: "Platform-internal — no tenant scope",
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
        controls={
          <GroupingPicker
            id="bug-hunter-volume-grain"
            value={grain}
            onChange={setGrain}
            options={GRAIN_OPTIONS}
          />
        }
        onExpand={() => setExpanded(true)}
        height="340px"
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
          caption="Exact found/fixed counts per period, including the current one, flagged as still accruing."
          source={source}
          table={table}
          exportContext={[
            `Grouped by ${bucketTitle(grain).toLowerCase()}`,
            "Found = autonomous discoveries only; Fixed = merged or later, any source",
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
