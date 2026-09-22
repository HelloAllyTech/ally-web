import { useMemo, useState } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetCoachingLoopQuery, useGetScribeAdoptionQuery } from "@api";
import { AnalyticsBucket, AnalyticsGrain } from "@types";

import { AnalyticsTabFilters, asOf, windowLabel } from "../analyticsFilters";
import {
  DEFAULT_GROUPING,
  bucketTitle,
  grainAsBucket,
  groupingNote,
  inProgressCaption,
  isBusy,
  isInProgress,
  useChartGrouping,
  useGrainQueries,
  withoutInProgress,
} from "../analyticsGrouping";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTileProps,
  ScrollableChart,
  buildSource,
  lineOpts,
  timeBarOpts,
} from "../chartKit";
import {
  SCRIBE_ORGS_SCALE,
  SCRIBE_SESSIONS_SCALE,
  SHARED_SCALE,
  TURNAROUND_SCALE,
  buildScribeOrgsSeries,
  buildScribeSessionsSeries,
  buildSharedSessionsSeries,
  buildTurnaroundSeries,
  formatCount,
  formatHours,
  formatPct,
} from "../testingChart";

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/**
 * Both panels here are time series, and each pair shares one grain: the two
 * coaching charts are two readings of the same review, and the two Scribe charts
 * are breadth and volume of the same sessions. Letting the halves of a pair
 * disagree about their axis would invite a comparison across different periods.
 */
type ChartId = "coaching" | "scribeAdoption";

// `DEFAULT_GROUPING` is typed `AnalyticsGrain` (Phase 1 widening); `useChartGrouping`
// is mechanism B, migrated in a later phase, and stays bucket-only.
const DEFAULT_GROUPINGS: Record<ChartId, AnalyticsBucket> = {
  coaching: grainAsBucket(DEFAULT_GROUPING),
  scribeAdoption: grainAsBucket(DEFAULT_GROUPING),
};

/**
 * Every SQL-bucketable grain plus "All time" (Phase 4 mechanism-B migration).
 * Both endpoints' `summary` is already a genuine whole-window aggregate —
 * computed in its own unbucketed pass, never folded from the bucketed rows
 * (see each service's doc: a median of medians, or a summed distinct count,
 * is not the real figure) — so both pairs of charts get a real KPI tile in
 * All-time mode, not a placeholder.
 */
const ALL_TIME_GRAINS: AnalyticsGrain[] = ["day", "week", "month", "quarter", "year", "allTime"];

/**
 * Coaching & support — the human loop around the product.
 *
 * Everything on the sibling sub-tabs is a learner practising alone with the
 * simulator. These two panels measure the people beside them: a trainer reviewing
 * a shared session, and a counsellor running Scribe on a live call. They are one
 * sub-tab because they answer the same shape of question — is the human half of
 * the platform actually being used, and does it respond — not because they share
 * a data source, which they do not.
 *
 * Scribe here is ADOPTION only: how many orgs use it at all, with volume as
 * context. Failure rates and provider reliability stay on the Scribe tab, which
 * is an operational view rather than a leadership one.
 */
export const CoachingSupportSubTab = ({ query }: AnalyticsTabFilters) => {
  const { groupingFor, setGrouping } = useChartGrouping<ChartId>(
    DEFAULT_GROUPINGS,
    grainAsBucket(DEFAULT_GROUPING),
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  /**
   * "All time" isn't a bucket `useChartGrouping` can store — that hook stays
   * bucket-only (see its file doc) — so it is tracked here as a flag layered
   * on top, per chart. A chart's real bucket (`groupingFor`) is left exactly
   * where it was when the reader last picked one, so flipping All-time back
   * off returns to that grain rather than resetting to the default.
   */
  const [allTimeCharts, setAllTimeCharts] = useState<Set<ChartId>>(new Set());
  const grainFor = (chart: ChartId): AnalyticsGrain =>
    allTimeCharts.has(chart) ? "allTime" : groupingFor(chart);
  const setGrain = (chart: ChartId, grouping: AnalyticsGrain) => {
    const isAllTime = grouping === "allTime";
    setAllTimeCharts(prev => {
      if (prev.has(chart) === isAllTime) return prev;
      const next = new Set(prev);
      if (isAllTime) next.add(chart);
      else next.delete(chart);
      return next;
    });
    if (!isAllTime) setGrouping(chart, grouping);
  };

  const grain = {
    coaching: grainFor("coaching"),
    scribeAdoption: grainFor("scribeAdoption"),
  };

  /**
   * The real SQL bucket each pair's response is actually fetched at, even in
   * All-time mode: neither endpoint has an unbucketed "whole window" query of
   * its own, so All-time reads its KPIs off the SAME bucketed response's
   * `summary` (see `ALL_TIME_GRAINS`'s doc).
   */
  const coachingBucket = grainAsBucket(grain.coaching);
  const scribeBucket = grainAsBucket(grain.scribeAdoption);

  const coachingQ = useGrainQueries(useGetCoachingLoopQuery, query, new Set([coachingBucket]));
  const scribeQ = useGrainQueries(useGetScribeAdoptionQuery, query, new Set([scribeBucket]));

  const coaching = coachingQ[coachingBucket];
  const scribe = scribeQ[scribeBucket];

  const coachingIsAllTime = grain.coaching === "allTime";
  const scribeIsAllTime = grain.scribeAdoption === "allTime";

  const picker = (chart: ChartId) => (
    <GroupingPicker
      id={`coaching-grouping-${chart}`}
      value={grainFor(chart)}
      onChange={g => setGrain(chart, g)}
      options={ALL_TIME_GRAINS}
    />
  );

  /* ------------------------------ plotted series --------------------------- */

  const cl = coaching.data;
  const coachingInProgress = cl?.window.inProgressBucket;
  const coachingPoints = useMemo(
    () => withoutInProgress(cl?.points ?? [], p => p.bucket, coachingInProgress),
    [cl, coachingInProgress],
  );
  const sharedSeries = useMemo(() => buildSharedSessionsSeries(coachingPoints), [coachingPoints]);
  const turnaroundSeries = useMemo(() => buildTurnaroundSeries(coachingPoints), [coachingPoints]);

  const sa = scribe.data;
  const scribeInProgress = sa?.window.inProgressBucket;
  const scribePoints = useMemo(
    () => withoutInProgress(sa?.points ?? [], p => p.bucket, scribeInProgress),
    [sa, scribeInProgress],
  );
  const scribeOrgsSeries = useMemo(() => buildScribeOrgsSeries(scribePoints), [scribePoints]);
  const scribeSessionsSeries = useMemo(
    () => buildScribeSessionsSeries(scribePoints),
    [scribePoints],
  );

  /* --------------------------------- options ------------------------------- */

  const sharedOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Sessions shared",
        bottomTitle: bucketTitle(grain.coaching),
        colorScale: SHARED_SCALE,
      }),
    [grain.coaching],
  );
  const turnaroundOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Hours to first comment",
        bottomTitle: bucketTitle(grain.coaching),
        colorScale: TURNAROUND_SCALE,
        legend: false,
      }),
    [grain.coaching],
  );
  const scribeOrgsOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Organisations",
        bottomTitle: bucketTitle(grain.scribeAdoption),
        colorScale: SCRIBE_ORGS_SCALE,
      }),
    [grain.scribeAdoption],
  );
  const scribeSessionsOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Sessions",
        bottomTitle: bucketTitle(grain.scribeAdoption),
        colorScale: SCRIBE_SESSIONS_SCALE,
        legend: false,
      }),
    [grain.scribeAdoption],
  );

  const rowKey = (bucket: string, inProgress?: string | null) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  const exportLines = (
    window: string,
    grouping: AnalyticsGrain,
    inProgress?: string | null,
    ...extra: string[]
  ) => [
    `Window: ${window}`,
    `Grouping: ${bucketTitle(grouping)}`,
    ...(inProgress
      ? [`${inProgress} is still accruing — provisional, and omitted from the chart`]
      : []),
    ...extra,
  ];

  /* --------------------------- All-time KPI tiles -------------------------- */
  //
  // Both `cl.summary` and `sa.summary` are genuine whole-window aggregates —
  // each service computes them in their own unbucketed pass (see
  // `ALL_TIME_GRAINS`'s doc) — so both pairs get real figures, read off the
  // SAME bucketed response the trend above them uses.

  const sharedSessionsKpi: KpiTileProps = {
    label: "Sessions shared for review",
    description: `${formatPct(cl?.summary.sharePct)} of completed sessions shared for review, all time.`,
    value: formatCount(cl?.summary.sharedSessions),
    n: cl?.summary.completedSessions,
    nUnit: "completed sessions",
  };

  const turnaroundKpi: KpiTileProps = {
    label: "Time to first comment (median)",
    description: `Median hours from a session being shared to its first comment, all time. Periods — and this figure — need at least ${cl?.minSampleSize ?? 5} commented reviews to be stated.`,
    value: formatHours(cl?.summary.medianHoursToFirstComment),
    n: cl?.summary.reviewsWithComment,
    nUnit: "reviews with a comment",
  };

  const scribeOrgsKpi: KpiTileProps = {
    label: "Organisations using Scribe",
    description: "Distinct orgs with at least one Scribe session, all time.",
    value: formatCount(sa?.summary.orgs),
    n: sa?.summary.counsellors,
    nUnit: "counsellors, all time",
  };

  const scribeSessionsKpi: KpiTileProps = {
    label: "Scribe sessions",
    description: "Total Scribe sessions across the whole window.",
    value: formatCount(sa?.summary.sessions),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* --------------------------- Coaching loop ------------------------ */}
      <SubHeading>Coaching loop</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Sessions shared for review"
          caption={`How much of the human feedback loop is being used. Paired with the turnaround panel beside it rather than drawn on a second axis — a count and a duration on one pair of axes invite a correlation the data does not support.${inProgressCaption(
            grain.coaching,
            coachingInProgress,
          )}`}
          source={buildSource({
            derivation: "Reviews created per period",
            window: windowLabel(cl?.window),
            n: cl?.summary.sharedSessions,
            nUnit: "sessions shared",
            extra: `${groupingNote(grain.coaching)} · ${formatPct(
              cl?.summary.sharePct,
            )} of completed sessions`,
            asOf: asOf(cl?.window),
          })}
          loading={coachingIsAllTime ? false : isBusy(coaching)}
          error={coachingIsAllTime ? false : coaching.isError}
          onRetry={coaching.refetch}
          empty={coachingIsAllTime ? false : !isBusy(coaching) && sharedSeries.length === 0}
          controls={picker("coaching")}
          onExpand={() => setExpanded("coaching")}
          kpi={coachingIsAllTime ? sharedSessionsKpi : undefined}
        >
          <ScrollableChart data={sharedSeries}>
            <SimpleBarChart data={sharedSeries} options={sharedOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Time to first comment"
          caption={`Median hours from a session being shared to the first comment on it from someone else. Periods with fewer than ${
            cl?.minSampleSize ?? 5
          } reviews carry no median — a median over two reviews is a name, not a statistic. Aggregate only: this panel never breaks down by trainer.`}
          source={buildSource({
            derivation: "Median hours from review created to first comment by another person",
            window: windowLabel(cl?.window),
            n: cl?.summary.reviewsWithComment,
            nUnit: "reviews with a comment",
            extra: groupingNote(grain.coaching),
            asOf: asOf(cl?.window),
          })}
          takeaway={
            cl?.summary.medianHoursToFirstComment !== null &&
            cl?.summary.medianHoursToFirstComment !== undefined
              ? `Half of commented reviews get their first reply within ${formatHours(
                  cl.summary.medianHoursToFirstComment,
                )}`
              : undefined
          }
          loading={coachingIsAllTime ? false : isBusy(coaching)}
          error={coachingIsAllTime ? false : coaching.isError}
          onRetry={coaching.refetch}
          empty={
            coachingIsAllTime
              ? false
              : !isBusy(coaching) && turnaroundSeries.every(d => d.value === null)
          }
          emptyText="No review has enough comments to state a turnaround"
          kpi={coachingIsAllTime ? turnaroundKpi : undefined}
        >
          <ScrollableChart data={turnaroundSeries}>
            <LineChart data={turnaroundSeries} options={turnaroundOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ---------------------- Live support (Scribe) --------------------- */}
      <SubHeading>Live support (Scribe) adoption</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Organisations using Scribe"
          caption={`Breadth, not volume: one enthusiastic org can carry a session count on its own, so the question is how many customers use it at all. Failure rates and provider reliability stay on the Scribe tab.${inProgressCaption(
            grain.scribeAdoption,
            scribeInProgress,
          )}`}
          source={buildSource({
            derivation: "Distinct orgs with >=1 scribe session per period",
            window: windowLabel(sa?.window),
            n: sa?.summary.orgs,
            nUnit: "orgs, all time",
            extra: groupingNote(grain.scribeAdoption),
            asOf: asOf(sa?.window),
          })}
          loading={scribeIsAllTime ? false : isBusy(scribe)}
          error={scribeIsAllTime ? false : scribe.isError}
          onRetry={scribe.refetch}
          empty={scribeIsAllTime ? false : !isBusy(scribe) && scribeOrgsSeries.length === 0}
          controls={picker("scribeAdoption")}
          onExpand={() => setExpanded("scribe")}
          kpi={scribeIsAllTime ? scribeOrgsKpi : undefined}
        >
          <ScrollableChart data={scribeOrgsSeries}>
            <SimpleBarChart data={scribeOrgsSeries} options={scribeOrgsOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Scribe sessions"
          caption="Volume beside the breadth panel, in grey: it is context for the org count rather than the subject. A rising line over a flat org count is deepening use by the same customers."
          source={buildSource({
            derivation: "Scribe sessions per period",
            window: windowLabel(sa?.window),
            n: sa?.summary.sessions,
            nUnit: "sessions",
            extra: groupingNote(grain.scribeAdoption),
            asOf: asOf(sa?.window),
          })}
          loading={scribeIsAllTime ? false : isBusy(scribe)}
          error={scribeIsAllTime ? false : scribe.isError}
          onRetry={scribe.refetch}
          empty={scribeIsAllTime ? false : !isBusy(scribe) && scribeSessionsSeries.length === 0}
          kpi={scribeIsAllTime ? scribeSessionsKpi : undefined}
        >
          <ScrollableChart data={scribeSessionsSeries}>
            <LineChart data={scribeSessionsSeries} options={scribeSessionsOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ------------------------- Detail / export ------------------------ */}

      <ChartDetailModal
        open={expanded === "coaching"}
        onClose={() => setExpanded(null)}
        title="Coaching loop"
        caption="Sharing and responsiveness side by side, never on one axis."
        source={buildSource({
          derivation: "Reviews created and hours to first comment, per period",
          window: windowLabel(cl?.window),
          extra: groupingNote(grain.coaching),
          asOf: asOf(cl?.window),
        })}
        render={({ height }) => (
          <SimpleBarChart data={sharedSeries} options={{ ...sharedOpts, height }} />
        )}
        table={{
          columns: [
            bucketTitle(grain.coaching),
            "Shared",
            "Completed sessions",
            "Share %",
            "With a comment",
            "Median hours",
            "p90 hours",
            "Comments",
          ],
          rows: (cl?.points ?? []).map(p => [
            rowKey(p.bucket, coachingInProgress),
            p.sharedSessions,
            p.completedSessions,
            p.sharePct,
            p.reviewsWithComment,
            p.medianHoursToFirstComment,
            p.p90HoursToFirstComment,
            p.comments,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(cl?.window),
          grain.coaching,
          coachingInProgress,
          `Turnaround percentiles are blank below ${cl?.minSampleSize ?? 5} reviews in the period`,
        )}
        exportFilename="coaching-loop"
      />

      <ChartDetailModal
        open={expanded === "scribe"}
        onClose={() => setExpanded(null)}
        title="Scribe adoption"
        caption="Orgs and counsellors using Scribe, with session volume as context."
        source={buildSource({
          derivation: "Distinct orgs, counsellors and sessions per period",
          window: windowLabel(sa?.window),
          extra: groupingNote(grain.scribeAdoption),
          asOf: asOf(sa?.window),
        })}
        render={({ height }) => (
          <SimpleBarChart data={scribeOrgsSeries} options={{ ...scribeOrgsOpts, height }} />
        )}
        table={{
          columns: [bucketTitle(grain.scribeAdoption), "Orgs", "Counsellors", "Sessions"],
          rows: (sa?.points ?? []).map(p => [
            rowKey(p.bucket, scribeInProgress),
            p.orgs,
            p.counsellors,
            p.sessions,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(sa?.window),
          grain.scribeAdoption,
          scribeInProgress,
          "Archived sessions are excluded",
        )}
        exportFilename="scribe-adoption"
      />
    </div>
  );
};
