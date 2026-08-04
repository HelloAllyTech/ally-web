import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown, ContentSwitcher, Switch } from "@ally-ui-mono/ui-shared";
import { useGetCohortRetentionQuery } from "@api";

import { ChartCard, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import {
  CohortGridRow,
  buildCohortCurveScale,
  buildCohortCurves,
  buildCohortGrid,
  cellBackground,
  curvesOmitted,
  maxMonthIndex,
  monthOneTakeaway,
  thresholdIndex,
  totalCohortLearners,
} from "./cohortChart";

/** Carbon's `cds--tile` background — what the pinned cohort column sits on. */
const PINNED_BG = "bg-[#f4f4f4]";

/** The admin-facing wording for each server-declared minutes threshold. */
const thresholdLabel = (minutes: number) => `${minutes}+ min practised in the month`;

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** One heatmap cell. Prints its number so colour never carries the value alone. */
const GridCell = ({ cell }: { cell: CohortGridRow["cells"][number] }) => {
  if (!cell) {
    // Not yet happened. Blank, never zero — an unmeasured month rendered as 0%
    // is the most flattering possible way to be wrong.
    return <td className="border border-[#f4f4f4] bg-[#fafafa]" />;
  }

  if (cell.pct === null) {
    return (
      <td
        className="border border-[#e0e0e0] text-center text-typography-400"
        title="Cohort too small to show a rate"
      >
        ·
      </td>
    );
  }

  return (
    <td
      className={`border border-[#e0e0e0] text-center tabular-nums ${cell.partial ? "italic" : ""}`}
      style={{ backgroundColor: cellBackground(cell.pct) }}
      title={`${cell.activityMonth.slice(0, 7)} · ${cell.active} of the cohort${
        cell.partial ? " · month still in progress" : ""
      }`}
    >
      {Math.round(cell.pct)}%{cell.partial ? "*" : ""}
    </td>
  );
};

/**
 * Monthly learner cohort retention.
 *
 * The question: of the learners who joined in a given month, what share came
 * back and actually practised in each later month — and are newer cohorts doing
 * better than older ones?
 *
 * Two views of one dataset. The heatmap is the default because the triangle is
 * the form that answers the question directly and gives exact values per cell;
 * the curves view answers "is this improving?" across cohorts, which a grid of
 * numbers hides. Both read the same `active / learners` rate.
 *
 * Honesty rules on the surface, not in a tooltip:
 *  - **Month 0 is a definition, not a measurement.** The cohort is 100% of
 *    itself; measurement starts at month 1, and the caption says so.
 *  - **The current month is provisional** — flagged with `*` in the grid and
 *    dropped from the curves, where an unfinished month would read as a fall.
 *  - **Small cohorts show n, not a rate** — a percentage of four people both
 *    re-identifies them and is noise.
 *  - **The grid is all-time** and cannot honour the page's date range, so it
 *    says that rather than silently ignoring the filter.
 */
export const CohortRetentionCard = ({ tenantId }: { tenantId?: string }) => {
  const { data, isLoading, isError, refetch } = useGetCohortRetentionQuery({ tenantId });
  const [thresholdIdx, setThresholdIdx] = useState(0);
  const [view, setView] = useState<"grid" | "curves">("grid");

  const thresholds = data?.thresholds ?? [];
  const items = useMemo(
    () => thresholds.map((minutes, id) => ({ id, minutes, label: thresholdLabel(minutes) })),
    [thresholds],
  );
  // The server owns the threshold list, so a stale index from a previous
  // response can never point past the end of a new one.
  const safeIdx = thresholdIndex(thresholds, thresholds[thresholdIdx] ?? thresholds[0]);
  const selectedThreshold = thresholds[safeIdx];

  const rows = useMemo(() => buildCohortGrid(data, safeIdx), [data, safeIdx]);
  const columns = useMemo(() => maxMonthIndex(data?.cohorts ?? []), [data]);
  const curves = useMemo(() => buildCohortCurves(rows), [rows]);
  const curveScale = useMemo(() => buildCohortCurveScale(rows), [rows]);
  const omitted = useMemo(() => curvesOmitted(rows), [rows]);
  const plottedCohorts = useMemo(() => new Set(curves.map(c => c.group)).size, [curves]);
  const learners = totalCohortLearners(data);

  const takeaway = selectedThreshold ? monthOneTakeaway(rows, selectedThreshold) : null;
  const anyPartial = rows.some(r => r.cells.some(c => c?.partial));
  const anyBelowFloor = rows.some(r => r.belowFloor);

  const curveOpts = lineOpts({
    leftTitle: "% of cohort still practising",
    bottomTitle: "Months since signup",
    colorScale: curveScale,
    domain: [0, 100],
    height: "340px",
  });

  const caption =
    "Of the learners who joined in each month, the share who practised at least the selected " +
    "number of minutes in each later month. All-time and monthly — this grid is not affected by " +
    "the date range above. Month 0 is the cohort itself (100% by definition), so measurement " +
    "starts at month 1.";

  return (
    <ChartCard
      wide
      title="Learner cohort retention"
      caption={caption}
      takeaway={takeaway}
      source={buildSource({
        derivation:
          "LEARNER accounts by users.createdAt month, followed against monthly " +
          "sums of user_daily_scores.minutesPlayed",
        window: "All time",
        n: learners,
        nUnit: "learners",
        asOf: asOfStamp(data?.computedAt),
      })}
      loading={isLoading && !data}
      error={isError}
      onRetry={refetch}
      empty={!isLoading && rows.length === 0}
      emptyText="No learner accounts yet — cohorts appear once learners sign up."
      height="340px"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-72">
            <Dropdown
              id="cohort-active-definition"
              size="md"
              titleText="Active user means"
              label="Active user means"
              items={items}
              selectedItem={items[safeIdx]}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem }) => {
                if (selectedItem) setThresholdIdx(selectedItem.id);
              }}
            />
          </div>
          <div className="w-48">
            <ContentSwitcher
              size="sm"
              selectedIndex={view === "grid" ? 0 : 1}
              onChange={({ index }) => setView(index === 0 ? "grid" : "curves")}
            >
              <Switch name="grid" text="Grid" />
              <Switch name="curves" text="Curves" />
            </ContentSwitcher>
          </div>
        </div>

        {view === "grid" ? (
          // `relative` is load-bearing: Carbon's Dropdown renders its open list
          // as an absolutely-positioned child, and a `static` scroll container is
          // not a containing block — the list would escape it and inflate an
          // ancestor's scrollHeight into a phantom second scrollbar.
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-typography-500">
                  {/* The pinned column needs an opaque background so scrolled
                      cells pass behind it — matched to Carbon's tile grey, not
                      white, or it reads as a box drawn around the labels. */}
                  <th className={`sticky left-0 z-10 px-2 py-1 text-left font-medium ${PINNED_BG}`}>
                    Cohort
                  </th>
                  <th className="px-2 py-1 text-right font-medium">Learners</th>
                  {Array.from({ length: columns }, (_, i) => (
                    <th key={i} className="px-2 py-1 text-center font-medium whitespace-nowrap">
                      M{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.cohortMonth}>
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 px-2 py-1 text-left font-normal whitespace-nowrap text-typography-700 ${PINNED_BG}`}
                    >
                      {row.label}
                    </th>
                    <td className="px-2 py-1 text-right tabular-nums text-typography-700">
                      {row.learners === 0 ? (
                        <span className="text-typography-400">no signups</span>
                      ) : (
                        row.learners.toLocaleString()
                      )}
                    </td>
                    {Array.from({ length: columns }, (_, i) => (
                      <GridCell key={i} cell={row.cells[i]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : curves.length === 0 ? (
          <div className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500 h-[340px]">
            No cohort has a completed month yet.
          </div>
        ) : (
          // The curve view scrolls sideways for the same reason the grid beside it
          // does: both grow a column per month of history.
          <ScrollableChart data={curves}>
            <LineChart data={curves} options={curveOpts} />
          </ScrollableChart>
        )}

        <div className="flex flex-col gap-1 text-xs text-typography-500">
          {view === "grid" ? (
            <>
              <span>
                Columns are months since signup. A blank cell is a month that has not happened yet —
                not a zero.
              </span>
              {anyPartial && (
                <span>
                  * {data?.currentMonth?.slice(0, 7)} is still in progress; those figures can only
                  rise.
                </span>
              )}
              {anyBelowFloor && (
                <span>
                  · marks a cohort smaller than {data?.minCohortSize} learners — the size is shown,
                  the rate is not.
                </span>
              )}
            </>
          ) : (
            <>
              <span>
                Month 0 is 100% by definition, not a measurement. The current, unfinished month is
                left off — an incomplete month on a line reads as a fall.
              </span>
              <span>
                Showing the {plottedCohorts} most recent{" "}
                {plottedCohorts === 1 ? "cohort" : "cohorts"}
                {omitted > 0
                  ? `; ${omitted} older ${omitted === 1 ? "one is" : "ones are"} in the grid view`
                  : ""}
                .
              </span>
            </>
          )}
        </div>
      </div>
    </ChartCard>
  );
};
