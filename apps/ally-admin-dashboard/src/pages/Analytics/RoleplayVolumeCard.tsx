import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { useGetRoleplayVolumeQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, barOpts, buildSource } from "./chartKit";
import {
  bandLabels,
  buildRoleplayVolumeBars,
  buildRoleplayVolumeScale,
  buildRoleplayVolumeSeries,
  buildRoleplayVolumeTable,
  roleplayVolumeTakeaway,
  sharesSuppressed,
  volumePopulation,
} from "./roleplayVolumeChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Lifetime roleplay volume per learner.
 *
 * The question: of all our learners, how many have completed one roleplay, a
 * handful, or dozens — and how many have never completed any? The volume charts
 * above say how much roleplay happened; neither they nor the practice-minutes
 * line can tell you whether it came from the population or from thirty
 * enthusiasts, and a mean would hide the same thing (the distribution is heavily
 * skewed, so the average learner does not exist).
 *
 * A histogram of counts rather than a share chart: the bars are numbers of
 * people, the axis starts at zero, and comparing two bar heights is comparing two
 * groups of learners. Shares live in the takeaway and the table, next to the
 * counts they came from.
 *
 * Honesty rules on the surface, not in a tooltip:
 *  - **The zero band is a residual, and it says so.** A learner who never
 *    practised has no session row; that bar is the population minus the ones who
 *    do, which is why it is grey rather than the palest step of a volume ramp.
 *  - **Small populations get counts and no percentages** — "50% of learners have
 *    never practised" over four learners names them.
 *  - **Lifetime and all-time**, so it cannot honour the page's date range and
 *    states that rather than ignoring the filter silently. A 30-day window would
 *    put nearly every learner in the lowest bands whatever their real depth.
 */
export const RoleplayVolumeCard = ({ tenantId }: { tenantId?: string }) => {
  const { data, isLoading, isError, refetch } = useGetRoleplayVolumeQuery({ tenantId });
  const [expanded, setExpanded] = useState(false);

  const labels = useMemo(() => bandLabels(data), [data]);
  const bars = useMemo(() => buildRoleplayVolumeBars(data), [data]);
  const series = useMemo(() => buildRoleplayVolumeSeries(bars), [bars]);
  const scale = useMemo(() => buildRoleplayVolumeScale(labels), [labels]);
  const table = useMemo(() => buildRoleplayVolumeTable(bars), [bars]);

  const population = volumePopulation(data);
  const suppressed = sharesSuppressed(data);
  const takeaway = roleplayVolumeTakeaway(data);

  const opts = useMemo(
    () =>
      barOpts({
        leftTitle: "Learners",
        bottomTitle: "Completed roleplays (lifetime)",
        colorScale: scale,
        height: "340px",
      }),
    [scale],
  );

  const caption =
    "Learners grouped by how many roleplays they have completed in total. Bands are inclusive " +
    'on both ends — "3–5" means 3, 4 or 5. Lifetime and all-time: not affected by the date ' +
    "range above, because over a short window nearly every learner lands in the lowest bands " +
    "whatever their real depth. Bars are numbers of learners, so the two ends of the axis are " +
    "directly comparable.";

  const source = buildSource({
    derivation:
      "Completed scenario_sessions per LEARNER account (eventStatus COMPLETED, by counselorId), banded",
    window: "All time",
    n: population,
    nUnit: "learners",
    asOf: asOfStamp(data?.computedAt),
  });

  return (
    <>
      <ChartCard
        wide
        title="Roleplay volume — learners by lifetime roleplays completed"
        caption={caption}
        takeaway={takeaway ?? undefined}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && population === 0}
        emptyText="No learner accounts in scope yet."
        onExpand={() => setExpanded(true)}
        height="340px"
      >
        <div className="flex flex-col gap-4">
          <SimpleBarChart data={series} options={opts} />

          <div className="flex flex-col gap-1 text-xs text-typography-500">
            <span>
              The grey &quot;{data?.zeroBandLabel ?? "0"}&quot; bar is learners who have never
              completed a roleplay — the absence of a volume level, not the lowest one. It is
              derived as the learner population minus the learners who have completed at least one,
              because a learner with no session has no row to count.
            </span>
            {suppressed && (
              <span>
                Percentages are withheld: fewer than {data?.minPopulationSize} learners are in
                scope, and a share over a handful of people names them. The counts stand.
              </span>
            )}
          </div>
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title="Roleplay volume — learners by lifetime roleplays completed"
          caption="Counts with their shares, which the chart's axis cannot show at both ends of a skewed distribution."
          source={source}
          table={table}
          exportContext={[
            "Window: all time (lifetime completed roleplays per learner)",
            "Population: LEARNER-group accounts, excluding test organisations",
            "Bands are inclusive on both bounds; the 0 band is a residual of the population",
            `Learners in scope: ${population.toLocaleString()}`,
            `Completed roleplays in scope: ${(data?.totalCompletedRoleplays ?? 0).toLocaleString()}`,
            ...(suppressed
              ? [`Shares withheld: fewer than ${data?.minPopulationSize ?? 5} learners in scope`]
              : []),
          ]}
          render={({ height }) => <SimpleBarChart data={series} options={{ ...opts, height }} />}
        />
      )}
    </>
  );
};
