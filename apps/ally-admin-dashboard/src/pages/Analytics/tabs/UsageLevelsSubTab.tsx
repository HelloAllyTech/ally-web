import { useMemo, useState } from "react";

import { GroupedBarChart, LineChart, SimpleBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetPracticeStickinessQuery,
  useGetQualifiedSessionsQuery,
  useGetUsageLadderQuery,
} from "@api";
import { UsageLadderGrain } from "@types";

import { AnalyticsTabFilters, windowLabel } from "../analyticsFilters";
import {
  bucketTitle,
  groupingNote,
  inProgressCaption,
  withoutInProgress,
} from "../analyticsGrouping";
import { defaultControlsFor, RANGE_SHORT, RangePicker, useChartControls } from "../chartControls";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  integerTickValues,
  lineOpts,
  single,
  timeBarOpts,
} from "../chartKit";
import { FunnelBars } from "../FunnelBars";
import {
  buildAttainmentSeries,
  buildCumulativeLadderSeries,
  buildLadderFunnelStages,
  buildStickinessStages,
  hasLadderData,
  ladderScale,
  ladderVsCertificationNote,
  periodLabel,
  stickinessPlateau,
} from "../ladderChart";

/**
 * Charts on this sub-tab that carry a full window+grain control.
 *
 * Only the qualifying-session trend does. Everything else here reads a LIFETIME
 * quantity — a ladder rung, an ever-returned funnel — where a window would not
 * narrow the metric but change it, so those cards carry their own fixed-window
 * note instead of a picker that would lie about what it does.
 */
type WindowedChart = "qualifiedSessions";

const WINDOWED_CHARTS: readonly WindowedChart[] = ["qualifiedSessions"];

const GRAIN_ITEMS: { id: UsageLadderGrain; label: string }[] = [
  { id: "month", label: "By month" },
  { id: "quarter", label: "By quarter" },
];

/**
 * Usage levels — how deep into the product learners actually get.
 *
 * Five panels off three endpoints. The organising idea is that "engagement" is
 * two different questions and this tab answers both separately rather than
 * averaging them into one number:
 *
 *  - **Depth**: the L1–L5 ladder, by lifetime practice minutes. Its flow series
 *    ("how many L3s did we produce this quarter") and its stock series ("how
 *    many L3s exist") are deliberately two charts, because a healthy platform
 *    can have a flat stock and a busy flow only if it is also losing people —
 *    and one chart cannot show that.
 *  - **Return**: the stickiness funnel, on days rather than minutes. A learner
 *    with one enormous session is deep but not sticky, and the two failure modes
 *    need different fixes.
 *
 * ## Why most of this tab has no date picker
 *
 * Every ladder rung is a LIFETIME minute total, and the stickiness funnel asks
 * whether someone ever came back. Windowing either would not narrow it — it
 * would move each learner's crossing date and report every recent signup as
 * churned. So the cards say "all time" on their face, and the one genuinely
 * windowed chart (sessions of 5+ minutes) carries the picker.
 */
export const UsageLevelsSubTab = ({ query }: AnalyticsTabFilters) => {
  const [grain, setGrain] = useState<UsageLadderGrain>("month");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { controlsFor, setRange, setBucket, hydrating } = useChartControls<WindowedChart>(
    "highlights.levels",
    // A count per bucket is readable at any grain, so this opens where the rest
    // of the tab does rather than needing an override.
    defaultControlsFor(WINDOWED_CHARTS),
  );

  const ladder = useGetUsageLadderQuery({ ...pickTenant(query), grain });
  const stickiness = useGetPracticeStickinessQuery(pickTenant(query));

  const sessionControls = controlsFor("qualifiedSessions");
  const sessions = useGetQualifiedSessionsQuery(
    {
      ...pickTenant(query),
      range: sessionControls.range,
      bucket: sessionControls.bucket,
    },
    // Waiting for hydration stops every chart fetching its default window and
    // then immediately re-fetching the saved one.
    { skip: hydrating },
  );

  const l = ladder.data;
  const s = stickiness.data;
  const q = sessions.data;

  /* ------------------------------- series ---------------------------------- */

  const levelLabels = useMemo(() => (l?.levels ?? []).map(lv => lv.label), [l]);
  const scale = useMemo(() => ladderScale(levelLabels), [levelLabels]);

  const attainment = useMemo(() => buildAttainmentSeries(l), [l]);
  const cumulative = useMemo(() => buildCumulativeLadderSeries(l), [l]);
  const ladderFunnel = useMemo(() => buildLadderFunnelStages(l), [l]);
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

  const ladderEmpty = !hasLadderData(l);
  const asOf = l?.computedAt ? new Date(l.computedAt).toLocaleDateString() : undefined;

  const grainNoun = grain === "quarter" ? "quarter" : "month";

  /* ------------------------------- controls -------------------------------- */

  const grainPicker = (
    <div className="w-36 shrink-0">
      <Dropdown
        id="usage-ladder-grain"
        size="sm"
        titleText="Grain"
        hideLabel
        label="Grain"
        items={GRAIN_ITEMS}
        selectedItem={GRAIN_ITEMS.find(i => i.id === grain) ?? GRAIN_ITEMS[0]}
        itemToString={item => item?.label ?? ""}
        onChange={({ selectedItem }) => {
          if (selectedItem) setGrain(selectedItem.id);
        }}
      />
    </div>
  );

  return (
    <>
      <SubHeading>Depth — the L1–L5 ladder</SubHeading>

      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-typography-500">
        {l ? ladderVsCertificationNote(l.certificationMinMinutes) : ""}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* FLOW. Grouped bars, never stacked: the rungs are nested, so a
            learner who climbed three of them in one quarter is in all three
            series and a stack would present them as three people. */}
        <ChartCard
          title={`New levels reached per ${grainNoun}`}
          caption={
            `Learners reaching each rung for the FIRST time. A learner who climbed ` +
            `several rungs in one ${grainNoun} counts once in each — the bars are ` +
            `grouped, not stacked, because they do not sum to a headcount.` +
            ` The current ${grainNoun} is still accruing and is left off the plot.`
          }
          source={buildSource({
            derivation: "First crossing of each lifetime-minutes rung",
            window: "all time",
            n: l?.accounts,
            nUnit: "learner accounts",
            asOf,
          })}
          loading={ladder.isLoading && !l}
          error={Boolean(ladder.error)}
          empty={!ladder.isLoading && ladderEmpty}
          emptyText="No learner has reached a usage level yet"
          errorSubtitle="There was a problem fetching usage levels."
          onRetry={() => void ladder.refetch()}
          controls={grainPicker}
          onExpand={() => setExpanded("attainment")}
        >
          <ScrollableChart data={attainment}>
            <GroupedBarChart
              data={attainment}
              options={timeBarOpts({
                colorScale: scale,
                leftTitle: "Learners",
                bottomTitle: grain === "quarter" ? "Quarter" : "Month",
                legend: true,
                valueTicks: integerTickValues(Math.max(0, ...attainment.map(d => d.value ?? 0))),
              })}
            />
          </ScrollableChart>
        </ChartCard>

        {/* STOCK. Monotonic by construction — a rung is never lost — so a dip
            here would be a bug, not a finding. */}
        <ChartCard
          title="Learners holding each level"
          caption={
            `Cumulative count at or past each rung. Rises or stays flat only: a ` +
            `level is earned from lifetime practice and never lost. Flat with a ` +
            `busy chart beside it means new learners are replacing ones who stopped.`
          }
          source={buildSource({
            derivation: "Running total of first crossings",
            window: "all time",
            n: l?.accounts,
            nUnit: "learner accounts",
            asOf,
          })}
          loading={ladder.isLoading && !l}
          error={Boolean(ladder.error)}
          empty={!ladder.isLoading && ladderEmpty}
          emptyText="No learner has reached a usage level yet"
          errorSubtitle="There was a problem fetching usage levels."
          onRetry={() => void ladder.refetch()}
          onExpand={() => setExpanded("cumulative")}
        >
          <ScrollableChart data={cumulative}>
            <LineChart
              data={cumulative}
              options={lineOpts({
                colorScale: scale,
                leftTitle: "Learners",
                bottomTitle: grain === "quarter" ? "Quarter" : "Month",
                legend: true,
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      <SubHeading>Conversion — where learners stop climbing</SubHeading>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Account → L1 → L5"
          caption={
            `Nested: each step counts learners at or past that rung, so it can only ` +
            `narrow. The right-hand figure is the conversion from the step above — ` +
            `where people are actually lost.`
          }
          source={buildSource({
            derivation: "Lifetime practice minutes per learner, as of now",
            window: "all time",
            n: l?.accounts,
            nUnit: "learner accounts",
            asOf,
          })}
          loading={ladder.isLoading && !l}
          error={Boolean(ladder.error)}
          empty={!ladder.isLoading && !ladderFunnel.length}
          errorSubtitle="There was a problem fetching the usage funnel."
          onRetry={() => void ladder.refetch()}
          height="auto"
        >
          <FunnelBars stages={ladderFunnel} unit="accounts" />
        </ChartCard>

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
          inProgressCaption(sessionControls.bucket, q?.window.inProgressBucket)
        }
        takeaway={
          q && q.totalCompletedSessions > 0
            ? `${Math.round((q.totalQualifiedSessions / q.totalCompletedSessions) * 100)}% of completed sessions qualified`
            : undefined
        }
        source={buildSource({
          derivation: "Completed sessions by call duration",
          window: `${RANGE_SHORT[sessionControls.range]}, ${groupingNote(sessionControls.bucket)}`,
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
              value={sessionControls.bucket}
              onChange={bucket => setBucket("qualifiedSessions", bucket)}
            />
          </div>
        }
        onExpand={() => setExpanded("qualifiedSessions")}
        wide
      >
        <ScrollableChart data={sessionSeries}>
          <SimpleBarChart
            data={sessionSeries}
            options={timeBarOpts({
              colorScale: single("Sessions of 5+ min"),
              leftTitle: "Sessions",
              bottomTitle: bucketTitle(sessionControls.bucket),
              valueTicks: integerTickValues(Math.max(0, ...sessionSeries.map(d => d.value ?? 0))),
            })}
          />
        </ScrollableChart>
      </ChartCard>

      {/* ------------------------------ detail ------------------------------ */}

      <ChartDetailModal
        open={expanded === "attainment"}
        onClose={() => setExpanded(null)}
        title={`New levels reached per ${grainNoun}`}
        caption="One row per period. The current period is flagged: it is still accruing."
        render={({ height }) => (
          <GroupedBarChart
            data={attainment}
            options={timeBarOpts({
              colorScale: scale,
              leftTitle: "Learners",
              bottomTitle: grain === "quarter" ? "Quarter" : "Month",
              legend: true,
              height,
            })}
          />
        )}
        table={{
          columns: [grain === "quarter" ? "Quarter" : "Month", ...levelLabels, "Provisional"],
          rows: (l?.periods ?? []).map(p => [
            periodLabel(p.period, grain),
            ...p.newlyReached,
            p.partial ? "still accruing" : "",
          ]),
        }}
        exportFilename="usage-ladder-attainment"
      />

      <ChartDetailModal
        open={expanded === "cumulative"}
        onClose={() => setExpanded(null)}
        title="Learners holding each level"
        caption="Cumulative and monotonic. The current period is flagged."
        render={({ height }) => (
          <LineChart
            data={cumulative}
            options={lineOpts({
              colorScale: scale,
              leftTitle: "Learners",
              bottomTitle: grain === "quarter" ? "Quarter" : "Month",
              legend: true,
              height,
            })}
          />
        )}
        table={{
          columns: [grain === "quarter" ? "Quarter" : "Month", ...levelLabels, "Provisional"],
          rows: (l?.periods ?? []).map(p => [
            periodLabel(p.period, grain),
            ...p.cumulative,
            p.partial ? "still accruing" : "",
          ]),
        }}
        exportFilename="usage-ladder-holders"
      />

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
              bottomTitle: bucketTitle(sessionControls.bucket),
              height,
            })}
          />
        )}
        table={{
          columns: [
            bucketTitle(sessionControls.bucket),
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
