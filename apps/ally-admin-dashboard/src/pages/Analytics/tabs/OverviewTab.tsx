import { useMemo } from "react";

import { DonutChart, LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { useGetAgentJoinReliabilityQuery, useGetAnalyticsOverviewQuery } from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, PALETTE, barOpts, donutOpts, lineOpts, stackedBarOpts } from "../chartKit";
import { buildOutcomeMixData } from "../joinReliabilityChart";

/** Platform overview — users, activity, simulations, retention, roles. Not
 * language-scoped, so it only takes the shared time range. */
export const OverviewTab = ({ range }: { range: AnalyticsRange }) => {
  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery({ range });
  const loading = isLoading && !data;
  const bucketTitle = range === "12m" ? "Month" : "Week";

  // Session outcomes headline — a range-total mix (bucket-independent), surfaced
  // here as a platform-health KPI. The reliability time-series live on the
  // Latency & reliability tab.
  const {
    data: reliabilityData,
    isLoading: outcomeLoading,
    isError: outcomeError,
    refetch: refetchOutcomes,
  } = useGetAgentJoinReliabilityQuery({ range, bucket: "week" });
  const outcomeData = useMemo(
    () => buildOutcomeMixData(reliabilityData?.outcomeMix),
    [reliabilityData],
  );

  const growthData = useMemo(
    () =>
      (data?.userGrowth ?? []).flatMap(p => [
        { group: "New users", key: p.date, value: p.newUsers },
        { group: "Cumulative users", key: p.date, value: p.cumulativeUsers },
      ]),
    [data],
  );
  const activeData = useMemo(
    () =>
      (data?.activeUsers ?? []).flatMap(p => [
        { group: "DAU", key: p.date, value: p.dau },
        { group: "WAU", key: p.date, value: p.wau },
        { group: "MAU", key: p.date, value: p.mau },
      ]),
    [data],
  );
  const simsData = useMemo(
    () =>
      (data?.simulationsCompleted ?? []).map(p => ({
        group: "Simulations",
        key: p.weekStart,
        value: p.count,
      })),
    [data],
  );
  const retentionData = useMemo(
    () =>
      (data?.retention ?? []).flatMap(p => [
        { group: "New", key: p.weekStart, value: p.newUsers },
        { group: "Returning", key: p.weekStart, value: p.returningUsers },
      ]),
    [data],
  );
  const rolesData = useMemo(
    () => (data?.usersByRole ?? []).map(p => ({ group: p.role, value: p.count })),
    [data],
  );

  if (isError) {
    return (
      <ChartCard
        error
        onRetry={refetch}
        errorTitle="Couldn't load analytics"
        errorSubtitle="There was a problem fetching platform metrics."
      >
        <div />
      </ChartCard>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard title="User growth" loading={loading} wide>
        <LineChart
          data={growthData}
          options={lineOpts({
            leftTitle: "Users",
            bottomTitle: bucketTitle,
            colorScale: { "New users": PALETTE.purple, "Cumulative users": PALETTE.blue },
          })}
        />
      </ChartCard>
      <ChartCard title="Active users (DAU / WAU / MAU)" loading={loading}>
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
      <ChartCard title="Simulations completed per week" loading={loading}>
        <SimpleBarChart
          data={simsData}
          options={barOpts({
            leftTitle: "Completed",
            bottomTitle: "Week",
            colorScale: { Simulations: PALETTE.blue },
          })}
        />
      </ChartCard>
      <ChartCard title="Weekly retention (new vs returning)" loading={loading}>
        <StackedBarChart
          data={retentionData}
          options={stackedBarOpts({
            leftTitle: "Active users",
            bottomTitle: "Week",
            colorScale: { New: PALETTE.green, Returning: PALETTE.blue },
          })}
        />
      </ChartCard>
      <ChartCard title="Users by role" loading={loading}>
        <DonutChart data={rolesData} options={donutOpts({ centerLabel: "Users" })} />
      </ChartCard>
      <ChartCard
        title="Session outcomes"
        caption="COMPLETED = ended with a transcript · NO_CONVERSATION = ended empty (includes agent-never-joined)"
        loading={outcomeLoading && !reliabilityData}
        error={outcomeError}
        onRetry={refetchOutcomes}
        errorTitle="Couldn't load session outcomes"
        errorSubtitle="There was a problem fetching reliability metrics."
      >
        <DonutChart data={outcomeData} options={donutOpts({ centerLabel: "Sessions" })} />
      </ChartCard>
    </div>
  );
};
