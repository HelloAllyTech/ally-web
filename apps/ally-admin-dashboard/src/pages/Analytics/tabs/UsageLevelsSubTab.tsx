import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import {
  useGetActivationQuery,
  useGetPracticeStickinessQuery,
  useGetQualifiedSessionsQuery,
} from "@api";

import { AnalyticsTabFilters, asOfStamp, windowLabel } from "../analyticsFilters";
import {
  GROUPINGS,
  bucketTitle,
  grainAsBucket,
  groupingNote,
  inProgressCaption,
  withoutInProgress,
} from "../analyticsGrouping";
import { defaultControlsFor, RANGE_SHORT, RangePicker, useChartControls } from "../chartControls";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTileProps,
  ScrollableChart,
  barOpts,
  buildSource,
  integerTickValues,
  single,
  timeBarOpts,
} from "../chartKit";
import { buildStickinessStages, stickinessPlateau } from "../engagementChart";
import { FunnelBars } from "../FunnelBars";
import {
  TESTING_GROUPS,
  buildTimeToFirstBars,
  buildTimeToFirstScale,
  formatCount,
} from "../testingChart";

/**
 * Charts on this sub-tab that carry a full window+grain control.
 *
 * Only the qualifying-session trend does. Everything else here reads a LIFETIME
 * quantity — an activated account, an ever-returned funnel — where a window would not
 * narrow the metric but change it, so those cards carry their own fixed-window
 * note instead of a picker that would lie about what it does.
 */
type WindowedChart = "qualifiedSessions";

const WINDOWED_CHARTS: readonly WindowedChart[] = ["qualifiedSessions"];

/**
 * Usage — whether learners start, whether they come back, and how much of it counts.
 *
 * Three panels off three endpoints. The organising idea is that "engagement" is
 * separate questions and this tab answers each separately rather than averaging
 * them into one number:
 *
 *  - **Activation**: whether a learner ever starts. The time-to-first-practice
 *    histogram is the entry to everything below. (The activation funnel,
 *    AAQ-035, moved to Highlights → Priority.)
 *  - **Return**: the stickiness funnel, on days rather than minutes. A learner
 *    with one enormous session is deep but not sticky, and the two failure modes
 *    need different fixes.
 *  - **Volume**: completed sessions long enough to count as practice.
 *
 * Levels on Analytics are XP levels only (see the Goals sub-tab); the former
 * lifetime-minutes L1–L5 ladder was removed so "L1" never means two things.
 *
 * ## Why most of this tab has no date picker
 *
 * Time to first practice counts accounts, and the stickiness funnel asks whether
 * someone ever came back. Windowing either would not narrow it — it would
 * report every recent signup as churned. So the cards say "all time" on their
 * face, and the one genuinely windowed chart (sessions of 5+ minutes) carries
 * the picker.
 */
export const UsageLevelsSubTab = ({ query }: AnalyticsTabFilters) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const {
    controlsFor,
    setRange,
    setGrain: setSessionGrain,
    hydrating,
  } = useChartControls<WindowedChart>(
    "highlights.levels",
    // A count per bucket is readable at any grain, so this opens where the rest
    // of the tab does rather than needing an override.
    defaultControlsFor(WINDOWED_CHARTS),
  );

  const stickiness = useGetPracticeStickinessQuery(pickTenant(query));
  // Time to first practice is an all-time count over learner ACCOUNTS, so this
  // asks for no window and no grain: the bucketed series off the same endpoint
  // is the north star on the Platform sub-tab, not anything drawn here.
  const activation = useGetActivationQuery(pickTenant(query));

  const sessionControls = controlsFor("qualifiedSessions");
  const sessions = useGetQualifiedSessionsQuery(
    {
      ...pickTenant(query),
      range: sessionControls.range,
      bucket: grainAsBucket(sessionControls.grain),
    },
    // Waiting for hydration stops every chart fetching its default window and
    // then immediately re-fetching the saved one.
    { skip: hydrating },
  );

  const s = stickiness.data;
  const q = sessions.data;
  const act = activation.data;

  /* ------------------------------- series ---------------------------------- */

  const stickinessStages = useMemo(() => buildStickinessStages(s), [s]);
  const plateau = useMemo(() => stickinessPlateau(s), [s]);

  // Memoised rather than a bare `?? []`, which would be a new array every render
  // and would defeat the memo below.
  const sessionPoints = useMemo(() => q?.points ?? [], [q?.points]);
  const sessionSeries = useMemo(
    () =>
      withoutInProgress(sessionPoints, p => p.bucket, q?.window.inProgressBucket).map(p => ({
        group: "Sessions of 5+ min",
        key: p.bucket,
        value: p.qualifiedSessions,
      })),
    [sessionPoints, q?.window.inProgressBucket],
  );

  // All-time: `totalQualifiedSessions`/`totalCompletedSessions` are already
  // whole-window totals (not per-bucket), so the KPI tile is a read of fields
  // this same query already returns — no separate overall endpoint needed.
  const isSessionsAllTime = sessionControls.grain === "allTime";
  const qualifiedShare =
    q && q.totalCompletedSessions > 0
      ? Math.round((q.totalQualifiedSessions / q.totalCompletedSessions) * 100)
      : null;
  const qualifiedSessionsKpi: KpiTileProps = {
    label: `Sessions of ${q?.qualifyingMinutes ?? 5}+ min`,
    value: q ? q.totalQualifiedSessions.toLocaleString() : "—",
    n: q?.totalCompletedSessions,
    nUnit: "completed sessions",
    description:
      qualifiedShare !== null
        ? `${qualifiedShare}% of completed sessions qualified, ${RANGE_SHORT[sessionControls.range]}.`
        : "Completed sessions long enough to count as practice.",
  };

  const ttfBars = useMemo(() => buildTimeToFirstBars(act?.timeToFirstPractice), [act]);
  const ttfScale = useMemo(() => buildTimeToFirstScale(act?.timeToFirstPractice), [act]);
  const ttfOpts = useMemo(
    () =>
      barOpts({
        leftTitle: "Learners",
        bottomTitle: "Days to first session",
        colorScale: ttfScale,
      }),
    [ttfScale],
  );
  const activationLoading = activation.isLoading && !act;

  return (
    <>
      {/* First: whether a learner starts at all. Return and volume are only
          readable for someone who got past their first session. The activation
          funnel (AAQ-035) moved to Priority; time to first practice stays here. */}
      <SubHeading>Activation — getting to a first session</SubHeading>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Time to first practice"
          caption={`Days from signing up to completing a first session, as counts of learners. ${
            act?.timeToFirstPractice.boundsNote ?? ""
          } "${TESTING_GROUPS.neverPractised}" is a residual — a learner who has never practised has no first session to measure — so it is greyed as context rather than coloured as the slowest band.`}
          source={buildSource({
            derivation: "users.createdAt to first completed session, all time",
            window: "all time",
            n: act?.summary.registeredLearners,
            nUnit: "learner accounts",
            asOf: asOfStamp(act?.computedAt),
          })}
          takeaway={
            act && act.summary.registeredLearners > 0
              ? `${formatCount(act.timeToFirstPractice.neverPractised)} of ${formatCount(
                  act.summary.registeredLearners,
                )} learner accounts have never completed a session`
              : undefined
          }
          loading={activationLoading}
          error={activation.isError}
          onRetry={activation.refetch}
          empty={!activationLoading && ttfBars.length === 0}
          onExpand={() => setExpanded("timeToFirst")}
          chartId="AAQ-036"
        >
          <ScrollableChart data={ttfBars} on="group">
            <SimpleBarChart data={ttfBars} options={ttfOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      <SubHeading>Return — do learners come back</SubHeading>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Do they come back?"
          caption={
            `A step is a DAY carrying ${s?.qualifyingMinutes ?? 5}+ minutes of ` +
            `practice, so several sessions in one evening count once — this measures ` +
            `returning, not session length. All time: a learner whose second visit ` +
            `was a year later did come back.` +
            (s && s.beyondLastStep > 0
              ? ` ${s.beyondLastStep.toLocaleString()} learners are past the last step shown.`
              : "")
          }
          takeaway={plateau ? `${plateau.pct}% still practising on day ${plateau.step}` : undefined}
          source={buildSource({
            derivation: "Distinct days with 5+ practice minutes, per learner",
            window: "all time",
            n: stickinessStages[0]?.reached,
            nUnit: "learners who practised",
            asOf: s?.computedAt ? new Date(s.computedAt).toLocaleDateString() : undefined,
            extra:
              s && (stickinessStages[0]?.reached ?? 0) < s.minPopulation
                ? "shares hidden below minimum group size"
                : undefined,
          })}
          loading={stickiness.isLoading && !s}
          error={Boolean(stickiness.error)}
          empty={!stickiness.isLoading && !(stickinessStages[0]?.reached ?? 0)}
          emptyText="Nobody has recorded a qualifying practice day yet"
          errorSubtitle="There was a problem fetching stickiness."
          onRetry={() => void stickiness.refetch()}
          height="auto"
          chartId="AAQ-040"
        >
          <FunnelBars stages={stickinessStages} unit="learners" />
        </ChartCard>
      </div>

      <SubHeading>Volume — sessions long enough to be practice</SubHeading>

      <ChartCard
        title={`Roleplay sessions of ${q?.qualifyingMinutes ?? 5}+ minutes`}
        caption={
          `Completed roleplays that ran at least ${q?.qualifyingMinutes ?? 5} minutes. ` +
          `Shorter sessions are someone opening a simulation and closing it. ` +
          `Compare with all completed sessions in the expanded view: a fall here ` +
          `means something different when total sessions fell with it.` +
          (isSessionsAllTime
            ? ""
            : inProgressCaption(sessionControls.grain, q?.window.inProgressBucket))
        }
        takeaway={
          q && q.totalCompletedSessions > 0
            ? `${Math.round((q.totalQualifiedSessions / q.totalCompletedSessions) * 100)}% of completed sessions qualified`
            : undefined
        }
        source={buildSource({
          derivation: "Completed sessions by call duration",
          window: `${RANGE_SHORT[sessionControls.range]}, ${groupingNote(sessionControls.grain)}`,
          n: q?.totalQualifiedSessions,
          nUnit: "qualifying sessions",
          asOf: q?.computedAt ? new Date(q.computedAt).toLocaleDateString() : undefined,
          extra: windowLabel(q?.window),
        })}
        loading={hydrating || (sessions.isLoading && !q)}
        error={Boolean(sessions.error)}
        empty={!sessions.isLoading && !q?.totalQualifiedSessions}
        errorSubtitle="There was a problem fetching session volume."
        onRetry={() => void sessions.refetch()}
        controls={
          <div className="flex items-center gap-2">
            <RangePicker
              id="qualified-sessions-range"
              value={sessionControls.range}
              onChange={range => setRange("qualifiedSessions", range)}
            />
            <GroupingPicker
              id="qualified-sessions-grouping"
              value={sessionControls.grain}
              onChange={grain => setSessionGrain("qualifiedSessions", grain)}
              options={GROUPINGS}
            />
          </div>
        }
        onExpand={() => setExpanded("qualifiedSessions")}
        kpi={isSessionsAllTime ? qualifiedSessionsKpi : undefined}
        wide
        chartId="AAQ-041"
      >
        <ScrollableChart data={sessionSeries}>
          <SimpleBarChart
            data={sessionSeries}
            options={timeBarOpts({
              colorScale: single("Sessions of 5+ min"),
              leftTitle: "Sessions",
              bottomTitle: bucketTitle(sessionControls.grain),
              valueTicks: integerTickValues(Math.max(0, ...sessionSeries.map(d => d.value ?? 0))),
            })}
          />
        </ScrollableChart>
      </ChartCard>

      {/* ------------------------------ detail ------------------------------ */}

      <ChartDetailModal
        open={expanded === "qualifiedSessions"}
        onClose={() => setExpanded(null)}
        title={`Roleplay sessions of ${q?.qualifyingMinutes ?? 5}+ minutes`}
        caption="Qualifying sessions against all completed ones, so a fall can be read."
        render={({ height }) => (
          <SimpleBarChart
            data={sessionSeries}
            options={timeBarOpts({
              colorScale: single("Sessions of 5+ min"),
              leftTitle: "Sessions",
              bottomTitle: bucketTitle(sessionControls.grain),
              height,
            })}
          />
        )}
        table={{
          columns: [
            bucketTitle(sessionControls.grain),
            "Sessions of 5+ min",
            "All completed",
            "Qualifying share",
            "Provisional",
          ],
          rows: sessionPoints.map(p => [
            p.bucket,
            p.qualifiedSessions,
            p.completedSessions,
            p.qualifiedSharePct === null ? "—" : `${p.qualifiedSharePct}%`,
            p.bucket === q?.window.inProgressBucket ? "still accruing" : "",
          ]),
        }}
        exportFilename="qualified-sessions"
      />

      <ChartDetailModal
        open={expanded === "timeToFirst"}
        onClose={() => setExpanded(null)}
        title="Time to first practice"
        caption={act?.timeToFirstPractice.boundsNote}
        source={buildSource({
          derivation: "users.createdAt to first completed session",
          window: "all time",
          n: act?.summary.registeredLearners,
          nUnit: "learner accounts",
          asOf: asOfStamp(act?.computedAt),
        })}
        render={({ height }) => <SimpleBarChart data={ttfBars} options={{ ...ttfOpts, height }} />}
        table={{
          columns: ["Days to first session", "Learners", "Cumulative activated", "% activated"],
          rows: [
            ...(act?.timeToFirstPractice.bands ?? []).map((b, i) => {
              const cumulative = act?.timeToFirstPractice.cumulative.find(
                cp => cp.days === (b.maxDays ?? b.minDays),
              );
              return [
                b.label,
                act?.timeToFirstPractice.learnersByBand[i] ?? 0,
                cumulative?.activated ?? null,
                cumulative?.activatedPct ?? null,
              ];
            }),
            [
              TESTING_GROUPS.neverPractised,
              act?.timeToFirstPractice.neverPractised ?? 0,
              null,
              null,
            ],
          ],
        }}
        exportContext={[
          "Window: All time",
          `Bands: ${act?.timeToFirstPractice.boundsNote ?? ""}`,
          `"${TESTING_GROUPS.neverPractised}" is a residual: learner accounts minus learners who ever completed a session`,
        ]}
        exportFilename="time-to-first-practice"
      />
    </>
  );
};

/**
 * The tenant filter, and nothing else, from the page's shared query.
 *
 * These endpoints take no window — passing `range`/`bucket` through would send
 * params they ignore, and RTK Query keys its cache on the argument object, so it
 * would also fragment the cache across requests that are actually identical.
 */
const pickTenant = ({ tenantId }: { tenantId?: string }) => (tenantId ? { tenantId } : {});

const SubHeading = ({ children }: { children: string }) => (
  <h3 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-typography-500">
    {children}
  </h3>
);
