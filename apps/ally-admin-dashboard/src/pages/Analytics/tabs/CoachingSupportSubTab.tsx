import { useMemo, useState } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetCoachingLoopQuery, useGetScribeAdoptionQuery } from "@api";
import { AnalyticsBucket } from "@types";

import { AnalyticsTabFilters, asOf, windowLabel } from "../analyticsFilters";
import {
  DEFAULT_GROUPING,
  bucketTitle,
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

const DEFAULT_GROUPINGS: Record<ChartId, AnalyticsBucket> = {
  coaching: DEFAULT_GROUPING,
  scribeAdoption: DEFAULT_GROUPING,
};

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
    DEFAULT_GROUPING,
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const grain = {
    coaching: groupingFor("coaching"),
    scribeAdoption: groupingFor("scribeAdoption"),
  };

  const coachingQ = useGrainQueries(useGetCoachingLoopQuery, query, new Set([grain.coaching]));
  const scribeQ = useGrainQueries(
    useGetScribeAdoptionQuery,
    query,
    new Set([grain.scribeAdoption]),
  );

  const coaching = coachingQ[grain.coaching];
  const scribe = scribeQ[grain.scribeAdoption];

  const picker = (chart: ChartId) => (
    <GroupingPicker
      id={`coaching-grouping-${chart}`}
      value={groupingFor(chart)}
      onChange={g => setGrouping(chart, g)}
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
    grouping: AnalyticsBucket,
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
          loading={isBusy(coaching)}
          error={coaching.isError}
          onRetry={coaching.refetch}
          empty={!isBusy(coaching) && sharedSeries.length === 0}
          controls={picker("coaching")}
          onExpand={() => setExpanded("coaching")}
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
          loading={isBusy(coaching)}
          error={coaching.isError}
          onRetry={coaching.refetch}
          empty={!isBusy(coaching) && turnaroundSeries.every(d => d.value === null)}
          emptyText="No review has enough comments to state a turnaround"
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
          loading={isBusy(scribe)}
          error={scribe.isError}
          onRetry={scribe.refetch}
          empty={!isBusy(scribe) && scribeOrgsSeries.length === 0}
          controls={picker("scribeAdoption")}
          onExpand={() => setExpanded("scribe")}
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
          loading={isBusy(scribe)}
          error={scribe.isError}
          onRetry={scribe.refetch}
          empty={!isBusy(scribe) && scribeSessionsSeries.length === 0}
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
