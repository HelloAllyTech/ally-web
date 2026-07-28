import { useMemo, useState } from "react";

import { LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import {
  useGetAnalyticsHighlightsQuery,
  useGetAnalyticsOverviewQuery,
  useGetScribeOverviewQuery,
} from "@api";

import {
  AnalyticsTabFilters,
  PLATFORM_WIDE_NOTE,
  asOf,
  isUnscoped,
  windowLabel,
} from "../analyticsFilters";
import { ChartDetailModal, ChartTableData } from "../ChartDetailModal";
import {
  ChartCard,
  KpiTile,
  MIN_N_FOR_SCORE,
  boundedDomainNote,
  buildSource,
  hBarOpts,
  lineOpts,
  stackedBarOpts,
  timeBarOpts,
} from "../chartKit";
import { CONTEXT } from "../chartScales";
import { FunnelBars } from "../FunnelBars";
import {
  CSAT_SCALE,
  COST_PER_SIM_SCALE,
  CUMULATIVE_USERS_SCALE,
  NEW_USERS_SCALE,
  PRACTICE_SCALE,
  QUALITY_SCALE,
  RATING_DOMAIN,
  RETENTION_SCALE,
  SCORE_DOMAIN,
  TOTAL_COST_SCALE,
  buildActiveUserMultiples,
  buildCostPerSimSeries,
  buildCsatTrendSeries,
  buildCumulativeUsersSeries,
  buildNewUsersSeries,
  buildPracticeMinutesSeries,
  buildQualityTrendSeries,
  buildRetentionSeries,
  buildRoleBars,
  buildSimulationsSeries,
  buildTopOrgBars,
  buildTotalCostSeries,
  buildTrackFunnelStages,
  delta,
  formatKpi,
  peakActiveLearners,
  sparkValues,
  totalUnpricedCalls,
} from "../highlightsChart";
import { latencyBucketTitle } from "../latencyChart";

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/** Note appended to a panel that stayed platform-wide under a tenant filter. */
const scopeNote = (unscoped: boolean) => (unscoped ? ` · ${PLATFORM_WIDE_NOTE}` : "");

/**
 * Highlights — the whole platform picture on one tab.
 *
 * This absorbed the former separate "Overview" tab. The two had four charts in
 * common, rendered identically from the same data, which meant a reader could
 * compare a number with itself and think they had corroborated it. Each chart now
 * lives in exactly one place.
 *
 * The tab is organised into five sections with **one focal tile each** and the
 * supporting tiles in greys: if every panel shouts, the page has no focus, and
 * salience has to be budgeted across the whole screen rather than per chart.
 *
 * Every KPI carries its sample size and, when the server was asked for a
 * comparison window, its change against a NAMED basis — "+12%" with nothing
 * beside it is not a fact about anything.
 */
export const HighlightsTab = ({ query }: AnalyticsTabFilters) => {
  // `compare: "prev"` is requested here because this tab owns the KPI strip; the
  // extra query is only paid for where a delta is actually rendered.
  const highlights = useGetAnalyticsHighlightsQuery({ ...query, compare: "prev" });
  const overview = useGetAnalyticsOverviewQuery({ ...query, compare: "prev" });
  const scribe = useGetScribeOverviewQuery({ ...query, compare: "prev" });
  const [expanded, setExpanded] = useState<string | null>(null);

  const highlightsLoading = highlights.isLoading && !highlights.data;
  const overviewLoading = overview.isLoading && !overview.data;
  const scribeLoading = scribe.isLoading && !scribe.data;

  const h = highlights.data;
  const o = overview.data;
  const s = scribe.data;
  const summary = h?.summary;
  const prev = h?.previous;
  const overviewSummary = o?.summary;
  const overviewPrev = o?.previous;
  const scribeSummary = s?.summary;
  const scribePrev = s?.previous;

  const bucketTitle = latencyBucketTitle(h?.bucket);
  const overviewBucketTitle = latencyBucketTitle(o?.window?.bucket);
  const basis = h?.previousLabel ? `vs ${h.previousLabel}` : undefined;
  const overviewBasis = o?.previousLabel ? `vs ${o.previousLabel}` : undefined;
  const scribeBasis = s?.previousLabel ? `vs ${s.previousLabel}` : undefined;

  const hWindow = windowLabel(h?.window);
  const oWindow = windowLabel(o?.window);
  const sWindow = windowLabel(s?.window);

  const costUnscoped = isUnscoped("costPerSim", h?.scoping);
  const orgsUnscoped = isUnscoped("topOrgs", h?.scoping);

  /* ----------------------------- series ----------------------------------- */

  const newUsers = useMemo(() => buildNewUsersSeries(o?.userGrowth ?? []), [o]);
  const cumulativeUsers = useMemo(() => buildCumulativeUsersSeries(o?.userGrowth ?? []), [o]);
  const activeMultiples = useMemo(() => buildActiveUserMultiples(o?.activeUsers ?? []), [o]);
  const retention = useMemo(() => buildRetentionSeries(o?.retention ?? []), [o]);
  const sims = useMemo(() => buildSimulationsSeries(o?.simulationsCompleted ?? []), [o]);
  const roles = useMemo(() => buildRoleBars(o?.usersByRole ?? []), [o]);

  const practice = useMemo(() => buildPracticeMinutesSeries(h?.practiceMinutes ?? []), [h]);
  const learners = useMemo(() => peakActiveLearners(h?.practiceMinutes ?? []), [h]);
  const quality = useMemo(() => buildQualityTrendSeries(h?.qualityTrend ?? []), [h]);
  const csat = useMemo(() => buildCsatTrendSeries(h?.csatTrend ?? []), [h]);
  const costPerSim = useMemo(() => buildCostPerSimSeries(h?.costPerSim ?? []), [h]);
  const totalCost = useMemo(() => buildTotalCostSeries(h?.costPerSim ?? []), [h]);
  const unpriced = useMemo(() => totalUnpricedCalls(h?.costPerSim ?? []), [h]);
  const topOrgs = useMemo(() => buildTopOrgBars(h?.topOrgs ?? [], h?.topOrgsBelowFloor), [h]);
  const funnelStages = useMemo(() => buildTrackFunnelStages(h?.trackFunnel), [h]);

  /* ------------------------------- KPIs ----------------------------------- */

  const kpis = [
    {
      label: "Total users",
      value: formatKpi(overviewSummary?.totalUsers),
      delta: delta(overviewSummary?.totalUsers, overviewPrev?.totalUsers),
      comparisonLabel: overviewBasis,
      deltaDecimals: 0,
      spark: sparkValues(cumulativeUsers),
      loading: overviewLoading,
    },
    {
      label: "Active users",
      value: formatKpi(overviewSummary?.activeUsers),
      delta: delta(overviewSummary?.activeUsers, overviewPrev?.activeUsers),
      comparisonLabel: overviewBasis,
      deltaDecimals: 0,
      loading: overviewLoading,
    },
    {
      label: "Active orgs",
      value: formatKpi(summary?.activeOrgs),
      delta: delta(summary?.activeOrgs, prev?.activeOrgs),
      comparisonLabel: basis,
      deltaDecimals: 0,
      loading: highlightsLoading,
    },
    {
      label: "Completed sims",
      value: formatKpi(summary?.completedSimulations),
      delta: delta(summary?.completedSimulations, prev?.completedSimulations),
      comparisonLabel: basis,
      deltaDecimals: 0,
      spark: sparkValues(sims),
      loading: highlightsLoading,
    },
    {
      label: "Practice minutes",
      value: formatKpi(summary?.practiceMinutes),
      delta: delta(summary?.practiceMinutes, prev?.practiceMinutes),
      comparisonLabel: basis,
      deltaDecimals: 0,
      spark: sparkValues(practice),
      loading: highlightsLoading,
    },
    {
      label: "Avg quality score",
      value: formatKpi(summary?.avgCompositeScore, { decimals: 1 }),
      // Below the documented minimum this tile shows "not enough data" instead:
      // a one-decimal mean of a handful of LLM-judged sessions is noise wearing
      // a decimal point.
      n: summary?.evaluatedSessions,
      nUnit: "evaluated sessions",
      minN: MIN_N_FOR_SCORE,
      delta: delta(summary?.avgCompositeScore, prev?.avgCompositeScore),
      comparisonLabel: basis,
      spark: sparkValues(quality),
      loading: highlightsLoading,
    },
    {
      label: "Avg rating",
      value: formatKpi(summary?.avgCsat, { decimals: 2 }),
      n: summary?.csatResponses,
      nUnit: "responses",
      minN: MIN_N_FOR_SCORE,
      delta: delta(summary?.avgCsat, prev?.avgCsat),
      comparisonLabel: basis,
      deltaDecimals: 2,
      spark: sparkValues(csat),
      loading: highlightsLoading,
    },
    {
      label: "Scribe success rate",
      value: formatKpi(scribeSummary?.successRatePct, { suffix: "%" }),
      // Sourced from a third endpoint over its own window, hence its own basis.
      n: scribeSummary?.totalSessions,
      nUnit: `sessions · ${sWindow}`,
      delta: delta(scribeSummary?.successRatePct, scribePrev?.successRatePct),
      comparisonLabel: scribeBasis,
      deltaSuffix: "pp",
      loading: scribeLoading,
    },
    {
      label: "AI cost / sim",
      value: formatKpi(summary?.costPerCompletedSimUsd, { prefix: "$", decimals: 2 }),
      delta: delta(summary?.costPerCompletedSimUsd, prev?.costPerCompletedSimUsd),
      comparisonLabel: basis,
      deltaDecimals: 2,
      deltaSuffix: "",
      // Cheaper is better for cost, so a rise is bad — the arrow and colour have
      // to follow the metric, not assume "up is good".
      higherIsBetter: false,
      spark: sparkValues(costPerSim),
      loading: highlightsLoading,
    },
  ];

  /* ------------------------------ options --------------------------------- */

  const newUsersOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "New users",
        bottomTitle: overviewBucketTitle,
        colorScale: NEW_USERS_SCALE,
      }),
    [overviewBucketTitle],
  );
  const cumulativeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Users",
        bottomTitle: overviewBucketTitle,
        colorScale: CUMULATIVE_USERS_SCALE,
        legend: false,
      }),
    [overviewBucketTitle],
  );
  const retentionOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Active users",
        bottomTitle: "Week",
        colorScale: RETENTION_SCALE,
      }),
    [],
  );
  const simsOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Completed",
        bottomTitle: "Week",
        colorScale: { Simulations: CONTEXT.line },
      }),
    [],
  );
  const rolesOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Users",
        colorScale: {
          ...roles.bars.reduce(
            (acc, b, i) => ({ ...acc, [b.group]: i === 0 ? "#264D8E" : CONTEXT.line }),
            {},
          ),
        },
      }),
    [roles],
  );
  const practiceOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Minutes",
        bottomTitle: bucketTitle,
        colorScale: PRACTICE_SCALE,
        legend: false,
      }),
    [bucketTitle],
  );
  const qualityOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle,
        colorScale: QUALITY_SCALE,
        legend: false,
        domain: SCORE_DOMAIN,
      }),
    [bucketTitle],
  );
  const qualityZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle,
        colorScale: QUALITY_SCALE,
        legend: false,
      }),
    [bucketTitle],
  );
  const csatOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Rating",
        bottomTitle: bucketTitle,
        colorScale: CSAT_SCALE,
        legend: false,
        domain: RATING_DOMAIN,
      }),
    [bucketTitle],
  );
  const csatZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Rating",
        bottomTitle: bucketTitle,
        colorScale: CSAT_SCALE,
        legend: false,
      }),
    [bucketTitle],
  );
  const orgsOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Completed simulations",
        colorScale: topOrgs.reduce(
          (acc, b, i) => ({ ...acc, [b.group]: i === 0 ? "#264D8E" : CONTEXT.line }),
          {},
        ),
      }),
    [topOrgs],
  );
  const costPerSimOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "USD per simulation",
        bottomTitle: bucketTitle,
        colorScale: COST_PER_SIM_SCALE,
        legend: false,
      }),
    [bucketTitle],
  );
  const totalCostOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "USD",
        bottomTitle: bucketTitle,
        colorScale: TOTAL_COST_SCALE,
      }),
    [bucketTitle],
  );

  /* --------------------------- detail tables ------------------------------ */

  const table = (
    series: { key: string; value: number | null }[],
    keyHeader: string,
    valueHeader: string,
  ): ChartTableData => ({
    columns: [keyHeader, valueHeader],
    rows: series.map(d => [d.key, d.value]),
  });

  const costUnpricedNote =
    unpriced > 0
      ? ` · ${unpriced.toLocaleString()} calls had no pricing entry, so this UNDERSTATES real spend`
      : " · every call in this window was priced";

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip. Sample sizes and comparison bases live on the tiles, not in
          tooltips — a caveat that only appears on hover never reaches the
          screenshot that ends up in a board deck. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ------------------------- Growth & reach ------------------------- */}
      <SubHeading>Growth &amp; reach</SubHeading>
      {overview.isError ? (
        <ChartCard
          error
          onRetry={overview.refetch}
          errorTitle="Couldn't load platform metrics"
          errorSubtitle="There was a problem fetching growth and activity."
        >
          <div />
        </ChartCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard
            title="New users per period"
            caption="Registrations in each period — the growth signal."
            source={buildSource({
              derivation: "users.createdAt, bucketed",
              window: oWindow,
              asOf: asOf(o?.window),
            })}
            loading={overviewLoading}
            empty={!overviewLoading && newUsers.length === 0}
            onExpand={() => setExpanded("newUsers")}
          >
            <SimpleBarChart data={newUsers} options={newUsersOpts} />
          </ChartCard>

          <ChartCard
            title="Cumulative users"
            caption="Running total. Shown separately because it is two orders of magnitude larger than the per-period figure — on one axis it flattens the chart beside it."
            source={buildSource({
              derivation: "Running total of registrations",
              window: oWindow,
              asOf: asOf(o?.window),
            })}
            loading={overviewLoading}
            empty={!overviewLoading && cumulativeUsers.length === 0}
            onExpand={() => setExpanded("cumulative")}
          >
            <LineChart data={cumulativeUsers} options={cumulativeOpts} />
          </ChartCard>

          <ChartCard
            title="Weekly active users — new vs returning"
            caption="Stacked because the two partition the week's active users."
            source={buildSource({
              derivation: "Distinct active users per ISO week, split by account age",
              window: oWindow,
              asOf: asOf(o?.window),
            })}
            loading={overviewLoading}
            empty={!overviewLoading && retention.length === 0}
            onExpand={() => setExpanded("retention")}
          >
            <StackedBarChart data={retention} options={retentionOpts} />
          </ChartCard>

          <ChartCard
            title="Users by role"
            caption={
              roles.otherRoles > 0
                ? `Top 4 roles; the remaining ${roles.otherRoles} are grouped as "Other".`
                : "All roles."
            }
            source={buildSource({
              derivation: "Group membership, current (not windowed)",
              asOf: asOf(o?.window),
            })}
            loading={overviewLoading}
            empty={!overviewLoading && roles.bars.length === 0}
          >
            <SimpleBarChart data={roles.bars} options={rolesOpts} />
          </ChartCard>
        </div>
      )}

      {/* --------------------------- Engagement --------------------------- */}
      <SubHeading>Engagement</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Practice minutes"
          caption="Total minutes learners spent practising. Zero periods are real zeros, not missing data."
          source={buildSource({
            derivation: "Sum of user_daily_scores.minutesPlayed",
            window: hWindow,
            n: learners,
            nUnit: "learners at peak",
            asOf: asOf(h?.window),
          })}
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          empty={!highlightsLoading && practice.length === 0}
          onExpand={() => setExpanded("practice")}
        >
          <LineChart data={practice} options={practiceOpts} />
        </ChartCard>

        <ChartCard
          title="Completed simulations per week"
          caption="Volume context for the quality and cost figures."
          source={buildSource({
            derivation: "Sessions with eventStatus COMPLETED, per ISO week",
            window: oWindow,
            asOf: asOf(o?.window),
          })}
          loading={overviewLoading}
          empty={!overviewLoading && sims.length === 0}
          onExpand={() => setExpanded("sims")}
        >
          <SimpleBarChart data={sims} options={simsOpts} />
        </ChartCard>
      </div>

      {/* Active users as small multiples: DAU/WAU/MAU are nested windows, so on
          one axis MAU dominates and the volatile DAU shape is unreadable. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeMultiples.map(m => (
          <ChartCard
            key={m.label}
            title={`Active users — ${m.label}`}
            caption="Each window has its own vertical scale; they are nested, so they are not comparable by height."
            source={buildSource({
              derivation: "Distinct users with session activity in the trailing window",
              window: oWindow,
            })}
            loading={overviewLoading}
            empty={!overviewLoading && m.series.length === 0}
          >
            <LineChart
              data={m.series}
              options={lineOpts({
                leftTitle: "Distinct users",
                bottomTitle: "Day",
                colorScale: m.scale,
                legend: false,
                extra: { points: { enabled: false } },
              })}
            />
          </ChartCard>
        ))}
      </div>

      {/* ----------------------- Outcomes & quality ----------------------- */}
      <SubHeading>Outcomes &amp; quality</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Roleplay quality"
          caption={`Mean composite evaluation score. ${boundedDomainNote(SCORE_DOMAIN)} Gaps are periods with no evaluated sessions.`}
          source={buildSource({
            derivation: "Mean of scenario_session_details.compositeScore (LLM-judged)",
            window: hWindow,
            n: summary?.evaluatedSessions,
            nUnit: "evaluated sessions",
            asOf: asOf(h?.window),
          })}
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          n={summary?.evaluatedSessions}
          nUnit="evaluated sessions"
          minN={MIN_N_FOR_SCORE}
          empty={!highlightsLoading && quality.every(d => d.value === null)}
          onExpand={() => setExpanded("quality")}
        >
          <LineChart data={quality} options={qualityOpts} />
        </ChartCard>

        <ChartCard
          title="Learner satisfaction"
          caption={`Mean post-session rating. ${boundedDomainNote(RATING_DOMAIN)} Gaps are periods with no ratings.`}
          source={buildSource({
            derivation: "Mean of scenario_session_feedbacks.rating",
            window: hWindow,
            n: summary?.csatResponses,
            nUnit: "responses",
            asOf: asOf(h?.window),
          })}
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          n={summary?.csatResponses}
          nUnit="responses"
          minN={MIN_N_FOR_SCORE}
          empty={!highlightsLoading && csat.every(d => d.value === null)}
          onExpand={() => setExpanded("csat")}
        >
          <LineChart data={csat} options={csatOpts} />
        </ChartCard>
      </div>

      <ChartCard
        title="Learning track funnel"
        caption="Enrollments created in this window. Recent cohorts have had less time to finish, so a low completion share here is not necessarily a drop-off."
        source={buildSource({
          derivation: "track_enrollments cohort created in window",
          window: hWindow,
          n: h?.trackFunnel.enrolled,
          nUnit: "enrollments",
          asOf: asOf(h?.window),
        })}
        loading={highlightsLoading}
        empty={!highlightsLoading && !funnelStages.some(st => st.reached > 0)}
        wide
      >
        <div className="flex flex-col gap-4">
          <FunnelBars stages={funnelStages} unit="enrollments" />
          {h?.trackFunnel && h.trackFunnel.quizAttempts > 0 && (
            <p className="text-xs" style={{ color: CONTEXT.strong }}>
              Quiz pass rate: {formatKpi(h.trackFunnel.quizPassRatePct, { suffix: "%" })} (
              {h.trackFunnel.quizPassed.toLocaleString()} of{" "}
              {h.trackFunnel.quizAttempts.toLocaleString()} graded attempts)
            </p>
          )}
        </div>
      </ChartCard>

      {/* ---------------------------- Adoption ---------------------------- */}
      <SubHeading>Adoption</SubHeading>
      <ChartCard
        title="Completed simulations by organisation"
        caption={
          h?.topOrgsBelowFloor && h.topOrgsBelowFloor.orgs > 0
            ? `Top orgs by volume. ${h.topOrgsBelowFloor.orgs} smaller orgs are grouped unnamed — naming an org with a handful of sessions identifies its learners.`
            : "Top orgs by volume."
        }
        source={
          buildSource({
            derivation: "Completed sessions grouped by tenant",
            window: hWindow,
            asOf: asOf(h?.window),
          }) + scopeNote(orgsUnscoped)
        }
        loading={highlightsLoading}
        error={highlights.isError}
        onRetry={highlights.refetch}
        empty={!highlightsLoading && topOrgs.length === 0}
        wide
      >
        <SimpleBarChart data={topOrgs} options={orgsOpts} />
      </ChartCard>

      {/* ------------------------- Unit economics ------------------------- */}
      <SubHeading>Unit economics</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="AI cost per completed simulation"
          caption="All platform AI spend (LLM + STT + TTS) divided by completed simulations. Gaps are periods with no completed simulations."
          source={
            buildSource({
              derivation: "Estimated from the pricing table at read time — not a billed figure",
              window: hWindow,
              asOf: asOf(h?.window),
            }) +
            costUnpricedNote +
            scopeNote(costUnscoped)
          }
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          errorTitle="Couldn't load AI cost"
          errorSubtitle="There was a problem fetching cost metrics."
          empty={!highlightsLoading && costPerSim.every(d => d.value === null)}
          onExpand={() => setExpanded("costPerSim")}
        >
          <LineChart data={costPerSim} options={costPerSimOpts} />
        </ChartCard>

        <ChartCard
          title="Total AI spend"
          caption="Absolute spend per period. Separate from cost-per-sim because the two differ by orders of magnitude."
          source={
            buildSource({
              derivation: "Estimated from the pricing table at read time — not a billed figure",
              window: hWindow,
              asOf: asOf(h?.window),
            }) +
            costUnpricedNote +
            scopeNote(costUnscoped)
          }
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          empty={!highlightsLoading && totalCost.length === 0}
          onExpand={() => setExpanded("totalCost")}
        >
          <SimpleBarChart data={totalCost} options={totalCostOpts} />
        </ChartCard>
      </div>

      {/* ---------------------------- Detail views ------------------------- */}

      {expanded === "newUsers" && (
        <ChartDetailModal
          open={expanded === "newUsers"}
          onClose={() => setExpanded(null)}
          title="New users per period"
          source={buildSource({ derivation: "users.createdAt, bucketed", window: oWindow })}
          table={table(newUsers, overviewBucketTitle, "New users")}
          exportContext={[`Window: ${oWindow}`]}
          render={({ height }) => (
            <SimpleBarChart data={newUsers} options={{ ...newUsersOpts, height }} />
          )}
        />
      )}

      {expanded === "cumulative" && (
        <ChartDetailModal
          open={expanded === "cumulative"}
          onClose={() => setExpanded(null)}
          title="Cumulative users"
          source={buildSource({ derivation: "Running total of registrations", window: oWindow })}
          table={table(cumulativeUsers, overviewBucketTitle, "Cumulative users")}
          exportContext={[`Window: ${oWindow}`]}
          render={({ height }) => (
            <LineChart data={cumulativeUsers} options={{ ...cumulativeOpts, height }} />
          )}
        />
      )}

      {expanded === "retention" && (
        <ChartDetailModal
          open={expanded === "retention"}
          onClose={() => setExpanded(null)}
          title="Weekly active users — new vs returning"
          source={buildSource({
            derivation: "Distinct active users per ISO week, split by account age",
            window: oWindow,
          })}
          table={{
            columns: ["Week", "New", "Returning"],
            rows: (o?.retention ?? []).map(p => [p.weekStart, p.newUsers, p.returningUsers]),
          }}
          exportContext={[`Window: ${oWindow}`]}
          render={({ height }) => (
            <StackedBarChart data={retention} options={{ ...retentionOpts, height }} />
          )}
        />
      )}

      {expanded === "sims" && (
        <ChartDetailModal
          open={expanded === "sims"}
          onClose={() => setExpanded(null)}
          title="Completed simulations per week"
          source={buildSource({
            derivation: "Sessions with eventStatus COMPLETED, per ISO week",
            window: oWindow,
          })}
          table={table(sims, "Week", "Completed")}
          exportContext={[`Window: ${oWindow}`]}
          render={({ height }) => <SimpleBarChart data={sims} options={{ ...simsOpts, height }} />}
        />
      )}

      {expanded === "practice" && (
        <ChartDetailModal
          open={expanded === "practice"}
          onClose={() => setExpanded(null)}
          title="Practice minutes"
          source={buildSource({
            derivation: "Sum of user_daily_scores.minutesPlayed",
            window: hWindow,
            n: learners,
            nUnit: "learners at peak",
          })}
          table={{
            columns: [bucketTitle, "Minutes", "Active learners"],
            rows: (h?.practiceMinutes ?? []).map(p => [p.bucket, p.minutes, p.activeLearners]),
          }}
          exportContext={[`Window: ${hWindow}`]}
          render={({ height }) => (
            <LineChart data={practice} options={{ ...practiceOpts, height }} />
          )}
        />
      )}

      {expanded === "quality" && (
        <ChartDetailModal
          open={expanded === "quality"}
          onClose={() => setExpanded(null)}
          title="Roleplay quality"
          caption="Sample size per period is the column the chart cannot show — a mean over three sessions moves for reasons that are not quality."
          source={buildSource({
            derivation: "Mean of scenario_session_details.compositeScore (LLM-judged)",
            window: hWindow,
            n: summary?.evaluatedSessions,
            nUnit: "evaluated sessions",
          })}
          zoomable
          zoomNote={`Axis zoomed to the data instead of the full ${SCORE_DOMAIN[0]}–${SCORE_DOMAIN[1]} scale. This magnifies small changes — read the shape, not the height.`}
          table={{
            columns: [bucketTitle, "Avg composite score", "Evaluated sessions"],
            rows: (h?.qualityTrend ?? []).map(p => [
              p.bucket,
              p.avgCompositeScore,
              p.evaluatedSessions,
            ]),
          }}
          exportContext={[`Window: ${hWindow}`, `Minimum n for a stated score: ${MIN_N_FOR_SCORE}`]}
          render={({ height, zoomed }) => (
            <LineChart
              data={quality}
              options={{ ...(zoomed ? qualityZoomedOpts : qualityOpts), height }}
            />
          )}
        />
      )}

      {expanded === "csat" && (
        <ChartDetailModal
          open={expanded === "csat"}
          onClose={() => setExpanded(null)}
          title="Learner satisfaction"
          caption="Response count per period is the column the chart cannot show."
          source={buildSource({
            derivation: "Mean of scenario_session_feedbacks.rating",
            window: hWindow,
            n: summary?.csatResponses,
            nUnit: "responses",
          })}
          zoomable
          zoomNote={`Axis zoomed to the data instead of the full ${RATING_DOMAIN[0]}–${RATING_DOMAIN[1]} scale. This magnifies small changes — read the shape, not the height.`}
          table={{
            columns: [bucketTitle, "Avg rating", "Responses"],
            rows: (h?.csatTrend ?? []).map(p => [p.bucket, p.avgRating, p.responses]),
          }}
          exportContext={[`Window: ${hWindow}`, `Minimum n for a stated score: ${MIN_N_FOR_SCORE}`]}
          render={({ height, zoomed }) => (
            <LineChart data={csat} options={{ ...(zoomed ? csatZoomedOpts : csatOpts), height }} />
          )}
        />
      )}

      {expanded === "costPerSim" && (
        <ChartDetailModal
          open={expanded === "costPerSim"}
          onClose={() => setExpanded(null)}
          title="AI cost per completed simulation"
          caption="Unpriced calls contribute $0, so a period with many of them understates cost."
          source={buildSource({
            derivation: "Estimated from the pricing table at read time — not a billed figure",
            window: hWindow,
          })}
          table={{
            columns: [bucketTitle, "Cost / sim (USD)", "Total (USD)", "Sims", "Unpriced calls"],
            rows: (h?.costPerSim ?? []).map(p => [
              p.bucket,
              p.costPerSimUsd,
              p.estimatedCostUsd,
              p.completedSimulations,
              p.unpricedCalls,
            ]),
          }}
          exportContext={[
            `Window: ${hWindow}`,
            "Costs are estimated from the pricing table at read time, not billed figures",
            `Unpriced calls in window: ${unpriced.toLocaleString()}`,
          ]}
          render={({ height }) => (
            <LineChart data={costPerSim} options={{ ...costPerSimOpts, height }} />
          )}
        />
      )}

      {expanded === "totalCost" && (
        <ChartDetailModal
          open={expanded === "totalCost"}
          onClose={() => setExpanded(null)}
          title="Total AI spend"
          source={buildSource({
            derivation: "Estimated from the pricing table at read time — not a billed figure",
            window: hWindow,
          })}
          table={table(totalCost, bucketTitle, "Total (USD)")}
          exportContext={[
            `Window: ${hWindow}`,
            `Unpriced calls in window: ${unpriced.toLocaleString()}`,
          ]}
          render={({ height }) => (
            <SimpleBarChart data={totalCost} options={{ ...totalCostOpts, height }} />
          )}
        />
      )}
    </div>
  );
};
