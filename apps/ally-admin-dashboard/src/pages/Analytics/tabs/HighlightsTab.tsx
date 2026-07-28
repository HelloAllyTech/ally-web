import { useMemo } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import {
  useGetAnalyticsHighlightsQuery,
  useGetAnalyticsOverviewQuery,
  useGetScribeOverviewQuery,
} from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, KpiTile, PALETTE, barOpts, lineOpts } from "../chartKit";
import {
  buildCostPerSimSeries,
  buildCsatTrendSeries,
  buildPracticeMinutesSeries,
  buildQualityTrendSeries,
  buildTopOrgBars,
  buildTrackFunnelRows,
  formatKpi,
  HIGHLIGHTS_GROUPS,
} from "../highlightsChart";
import { latencyBucketTitle } from "../latencyChart";

const SubHeading = ({ children }: { children: string }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </p>
);

/**
 * Highlights — the leadership view. Composes three endpoints: the new
 * /analytics/highlights aggregates (org adoption, practice minutes, roleplay
 * quality, CSAT, track funnel, AI cost) alongside the existing platform
 * /overview and /scribe/overview series, so leadership sees growth, engagement,
 * outcomes and unit economics on one page. Each query renders its own
 * loading/error state so one failure never blanks the tab.
 */
export const HighlightsTab = ({ range }: { range: AnalyticsRange }) => {
  const highlights = useGetAnalyticsHighlightsQuery({ range });
  const overview = useGetAnalyticsOverviewQuery({ range });
  const scribe = useGetScribeOverviewQuery({ range });

  const highlightsLoading = highlights.isLoading && !highlights.data;
  const overviewLoading = overview.isLoading && !overview.data;
  const scribeLoading = scribe.isLoading && !scribe.data;

  const bucketTitle = latencyBucketTitle(highlights.data?.bucket);
  const overviewBucketTitle = range === "12m" ? "Month" : "Week";

  const h = highlights.data;
  const summary = h?.summary;
  const overviewSummary = overview.data?.summary;
  const scribeSummary = scribe.data?.summary;

  const kpis = [
    {
      label: "Total users",
      value: formatKpi(overviewSummary?.totalUsers),
    },
    { label: "Active orgs", value: formatKpi(summary?.activeOrgs) },
    {
      label: "Completed sims",
      value: formatKpi(summary?.completedSimulations),
    },
    {
      label: "Practice minutes",
      value: formatKpi(summary?.practiceMinutes),
    },
    {
      label: "Avg quality score",
      value: formatKpi(summary?.avgCompositeScore, { decimals: 1 }),
    },
    { label: "Avg rating", value: formatKpi(summary?.avgCsat, { decimals: 2 }) },
    {
      label: "Scribe success rate",
      value: formatKpi(scribeSummary?.successRatePct, { suffix: "%" }),
    },
    {
      label: "AI cost / sim",
      value: formatKpi(summary?.costPerCompletedSimUsd, { prefix: "$", decimals: 2 }),
    },
  ];

  // Growth + engagement series reused from the existing platform overview.
  const growthData = useMemo(
    () =>
      (overview.data?.userGrowth ?? []).flatMap(p => [
        { group: "New users", key: p.date, value: p.newUsers },
        { group: "Cumulative users", key: p.date, value: p.cumulativeUsers },
      ]),
    [overview.data],
  );
  const activeData = useMemo(
    () =>
      (overview.data?.activeUsers ?? []).flatMap(p => [
        { group: "DAU", key: p.date, value: p.dau },
        { group: "WAU", key: p.date, value: p.wau },
        { group: "MAU", key: p.date, value: p.mau },
      ]),
    [overview.data],
  );
  const simsData = useMemo(
    () =>
      (overview.data?.simulationsCompleted ?? []).map(p => ({
        group: "Simulations",
        key: p.weekStart,
        value: p.count,
      })),
    [overview.data],
  );
  const scribeSessionsData = useMemo(
    () =>
      (scribe.data?.sessionsTrend ?? []).map(p => ({
        group: "Sessions",
        key: p.bucket,
        value: p.count,
      })),
    [scribe.data],
  );

  const topOrgData = useMemo(() => buildTopOrgBars(h?.topOrgs ?? []), [h]);
  const practiceData = useMemo(() => buildPracticeMinutesSeries(h?.practiceMinutes ?? []), [h]);
  const qualityData = useMemo(() => buildQualityTrendSeries(h?.qualityTrend ?? []), [h]);
  const csatData = useMemo(() => buildCsatTrendSeries(h?.csatTrend ?? []), [h]);
  const costData = useMemo(() => buildCostPerSimSeries(h?.costPerSim ?? []), [h]);
  const funnelRows = useMemo(() => buildTrackFunnelRows(h?.trackFunnel), [h]);
  const funnelMax = Math.max(...funnelRows.map(r => r.reached), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KpiTile key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <SubHeading>Growth &amp; reach</SubHeading>

      {overview.isError ? (
        <ChartCard
          error
          onRetry={overview.refetch}
          errorTitle="Couldn't load platform metrics"
          errorSubtitle="There was a problem fetching user growth and activity."
        >
          <div />
        </ChartCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard
            title="User growth"
            caption="New and cumulative users"
            loading={overviewLoading}
          >
            <LineChart
              data={growthData}
              options={lineOpts({
                leftTitle: "Users",
                bottomTitle: overviewBucketTitle,
                colorScale: { "New users": PALETTE.purple, "Cumulative users": PALETTE.blue },
              })}
            />
          </ChartCard>
          <ChartCard
            title="Active users (DAU / WAU / MAU)"
            caption="Distinct learners with session activity"
            loading={overviewLoading}
          >
            <LineChart
              data={activeData}
              options={lineOpts({
                leftTitle: "Distinct users",
                bottomTitle: "Day",
                colorScale: { DAU: PALETTE.blue, WAU: PALETTE.teal, MAU: PALETTE.purple },
                extra: { points: { enabled: false } },
              })}
            />
          </ChartCard>
        </div>
      )}

      {highlights.isError ? (
        <ChartCard
          error
          onRetry={highlights.refetch}
          errorTitle="Couldn't load highlights"
          errorSubtitle="There was a problem fetching leadership metrics."
        >
          <div />
        </ChartCard>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Top organizations"
              caption="Completed simulations per org in this range (top 10)"
              loading={highlightsLoading}
              wide
              empty={!topOrgData.length}
            >
              <SimpleBarChart
                data={topOrgData}
                options={barOpts({
                  leftTitle: "Completed simulations",
                  bottomTitle: "Organization",
                  colorScale: {},
                })}
              />
            </ChartCard>
          </div>

          <SubHeading>Engagement</SubHeading>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Simulations completed"
              caption="Completed roleplay sessions per week"
              loading={overviewLoading}
              empty={!simsData.length}
            >
              <SimpleBarChart
                data={simsData}
                options={barOpts({
                  leftTitle: "Completed",
                  bottomTitle: "Week",
                  colorScale: { Simulations: PALETTE.blue },
                })}
              />
            </ChartCard>
            <ChartCard
              title="Practice minutes"
              caption="Total minutes learners spent practicing"
              loading={highlightsLoading}
              empty={!practiceData.length}
            >
              <LineChart
                data={practiceData}
                options={lineOpts({
                  leftTitle: "Minutes",
                  bottomTitle: bucketTitle,
                  colorScale: { [HIGHLIGHTS_GROUPS.practiceMinutes]: PALETTE.teal },
                  legend: false,
                  extra: { points: { enabled: false } },
                })}
              />
            </ChartCard>
            <ChartCard
              title="Learning track funnel"
              caption="Enrollments created in this range — recent cohorts have had less time to finish"
              loading={highlightsLoading}
              wide
              empty={!funnelRows.some(r => r.reached > 0)}
            >
              <div className="flex flex-col gap-2">
                {funnelRows.map(r => (
                  <div key={r.phase} className="flex items-center gap-3">
                    <div
                      className="text-sm text-typography-900 truncate"
                      style={{ flex: "0 0 25%" }}
                      title={r.phase}
                    >
                      {r.phase}
                    </div>
                    <div className="flex-1 h-3 rounded" style={{ background: "#f0f0f0" }}>
                      <div
                        className="h-3 rounded"
                        style={{
                          width: `${Math.round((r.reached / funnelMax) * 100)}%`,
                          background: r.phase === "Completed" ? PALETTE.teal : PALETTE.blue,
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-typography-900 w-12 text-right">
                      {r.reached}
                    </div>
                  </div>
                ))}
                {h?.trackFunnel && (
                  <p className="text-xs text-typography-500 mt-2">
                    Quiz pass rate: {formatKpi(h.trackFunnel.quizPassRatePct, { suffix: "%" })} (
                    {h.trackFunnel.quizPassed} of {h.trackFunnel.quizAttempts} graded attempts)
                  </p>
                )}
              </div>
            </ChartCard>
          </div>

          <SubHeading>Outcomes &amp; quality</SubHeading>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Roleplay performance"
              caption="Mean composite evaluation score (0-100) of evaluated sessions"
              loading={highlightsLoading}
              empty={!qualityData.length}
            >
              <LineChart
                data={qualityData}
                options={lineOpts({
                  leftTitle: "Avg score",
                  bottomTitle: bucketTitle,
                  colorScale: { [HIGHLIGHTS_GROUPS.qualityScore]: PALETTE.green },
                  legend: false,
                })}
              />
            </ChartCard>
            <ChartCard
              title="Learner satisfaction"
              caption={
                summary
                  ? `Mean post-session rating · ${summary.csatResponses.toLocaleString()} responses`
                  : "Mean post-session rating"
              }
              loading={highlightsLoading}
              empty={!csatData.length}
            >
              <LineChart
                data={csatData}
                options={lineOpts({
                  leftTitle: "Avg rating",
                  bottomTitle: bucketTitle,
                  colorScale: { [HIGHLIGHTS_GROUPS.csat]: PALETTE.gold },
                  legend: false,
                })}
              />
            </ChartCard>
          </div>
        </>
      )}

      <SubHeading>Operations &amp; unit economics</SubHeading>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Scribe sessions"
          caption="Counselor sessions created per period"
          loading={scribeLoading}
          error={scribe.isError}
          onRetry={scribe.refetch}
          errorTitle="Couldn't load scribe metrics"
          errorSubtitle="There was a problem fetching scribe session volume."
          empty={!scribeSessionsData.length}
        >
          <LineChart
            data={scribeSessionsData}
            options={lineOpts({
              leftTitle: "Sessions",
              bottomTitle: latencyBucketTitle(scribe.data?.bucket),
              colorScale: { Sessions: PALETTE.blue },
              legend: false,
              extra: { points: { enabled: false } },
            })}
          />
        </ChartCard>
        <ChartCard
          title="AI cost per completed simulation"
          caption="All platform AI spend (LLM + STT + TTS), estimated from the pricing table"
          loading={highlightsLoading}
          error={highlights.isError}
          onRetry={highlights.refetch}
          errorTitle="Couldn't load AI cost"
          errorSubtitle="There was a problem fetching cost metrics."
          empty={!costData.length}
        >
          <LineChart
            data={costData}
            options={lineOpts({
              leftTitle: "USD",
              bottomTitle: bucketTitle,
              colorScale: {
                [HIGHLIGHTS_GROUPS.costPerSim]: PALETTE.magenta,
                [HIGHLIGHTS_GROUPS.totalCost]: PALETTE.gray,
              },
              extra: { points: { enabled: false } },
            })}
          />
        </ChartCard>
      </div>
    </div>
  );
};
