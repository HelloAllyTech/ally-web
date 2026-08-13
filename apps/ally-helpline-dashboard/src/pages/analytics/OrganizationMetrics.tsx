import { FunctionComponent, useMemo, useState } from "react";

import "@carbon/charts/styles.css";
import "./organization-metrics.scss";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";
import { useTranslation } from "react-i18next";

import { InlineNotification, SkeletonText, Tile } from "@ally-ui-mono/ui-shared";
import { useGetOrganizationMetricsQuery } from "@api";
import { ToggleButtonGroup } from "@components";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { OrganizationMetricsRange, ORGANIZATION_METRICS_RANGES } from "@types";

import { ChartCard, PALETTE, lineOpts, timeBarOpts } from "./chartKit";
import { CourseUsageTable } from "./CourseUsageTable";
import { LearnerUsageTable } from "./LearnerUsageTable";

interface KpiTileConfig {
  key: string;
  label: string;
  caption: string;
  /** undefined = still loading; null = loaded but not enough data to show; number = the value. */
  value: number | null | undefined;
}

/**
 * Organization Metrics — the native (Carbon charts) replacement for the old
 * Metabase "Organization Metrics" dashboard. Rendered inside the Session
 * Metrics page when a tenant admin picks the Organization Metrics toggle; the
 * other toggles (Real call logs / Simulations) stay Metabase-embedded.
 *
 * Metrics on this dashboard (per Ally_Metrics_Reference.xlsx, "Revised
 * Implementation Plan"): simulations completed, active users, new learners
 * onboarded, total registered learners (all-time), avg sessions/practice-time
 * per active learner, avg time to first session, and the most-practiced
 * simulations. `avgSessionsPerActiveLearner`, `avgPracticeMinutesPerLearner`,
 * and `avgDaysToFirstSession` come back `null` (not 0) when their denominator
 * is empty — rendered as "not enough data" rather than a misleading number.
 *
 * Extending: new headline numbers go into the `kpis` array; new trend charts
 * are a `ChartCard` + option factory from ./chartKit; new ranked lists follow
 * the mostUsedSimulations pattern below — all fed by extra fields on the
 * organization-metrics response (see GetOrganizationMetricsResponse).
 */
export const OrganizationMetrics: FunctionComponent = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const [range, setRange] = useState<OrganizationMetricsRange>("30d");

  // Analytics.tsx only mounts this component for Ally staff who also hold
  // the permission (see canViewNativeOrgMetrics there — that's the staging
  // gate). This check is a second, independent line of defense against the
  // metrics API 403ing if that ever changes: it's tenant-admin only, so show
  // a notice instead of firing a request that would fail.
  const canView = !!permissions?.includes(Permissions.VIEW_ORGANIZATION_METRICS);

  const { data, isFetching, isError, refetch } = useGetOrganizationMetricsQuery(
    { range },
    { skip: !canView },
  );

  const rangeOptions = useMemo(
    () =>
      ORGANIZATION_METRICS_RANGES.map(value => ({
        value,
        label: t(`organizationMetrics.ranges.${value}`),
      })),
    [t],
  );

  const kpis: KpiTileConfig[] = [
    {
      key: "simulationsCompleted",
      label: t("organizationMetrics.kpis.simulationsCompleted"),
      caption: t("organizationMetrics.kpis.simulationsCompletedCaption"),
      value: data?.summary.simulationsCompleted,
    },
    {
      key: "activeUsers",
      label: t("organizationMetrics.kpis.activeUsers"),
      caption: t("organizationMetrics.kpis.activeUsersCaption"),
      value: data?.summary.activeUsers,
    },
    {
      key: "newLearnersOnboarded",
      label: t("organizationMetrics.kpis.newLearnersOnboarded"),
      caption: t("organizationMetrics.kpis.newLearnersOnboardedCaption"),
      value: data?.summary.newLearnersOnboarded,
    },
    {
      key: "totalRegisteredLearners",
      label: t("organizationMetrics.kpis.totalRegisteredLearners"),
      caption: t("organizationMetrics.kpis.totalRegisteredLearnersCaption"),
      value: data?.summary.totalRegisteredLearners,
    },
    {
      key: "avgSessionsPerActiveLearner",
      label: t("organizationMetrics.kpis.avgSessionsPerActiveLearner"),
      caption: t("organizationMetrics.kpis.avgSessionsPerActiveLearnerCaption"),
      value: data ? data.summary.avgSessionsPerActiveLearner : undefined,
    },
    {
      key: "avgPracticeMinutesPerLearner",
      label: t("organizationMetrics.kpis.avgPracticeMinutesPerLearner"),
      caption: t("organizationMetrics.kpis.avgPracticeMinutesPerLearnerCaption"),
      value: data ? data.summary.avgPracticeMinutesPerLearner : undefined,
    },
    {
      key: "avgDaysToFirstSession",
      label: t("organizationMetrics.kpis.avgDaysToFirstSession"),
      caption: t("organizationMetrics.kpis.avgDaysToFirstSessionCaption", {
        count: data?.summary.learnersWithFirstSessionCount ?? 0,
      }),
      value: data ? data.summary.avgDaysToFirstSession : undefined,
    },
  ];

  const simulationsSeries = t("organizationMetrics.charts.simulationsSeries");
  const activeUsersSeries = t("organizationMetrics.charts.activeUsersSeries");
  const newLearnersSeries = t("organizationMetrics.charts.newLearnersSeries");
  const bucketTitle = data ? t(`organizationMetrics.charts.axis.${data.bucket}`) : "";

  const simulationsData = useMemo(
    () =>
      (data?.simulationsCompletedTrend ?? []).map(point => ({
        group: simulationsSeries,
        key: point.bucket,
        value: point.count,
      })),
    [data, simulationsSeries],
  );

  const activeUsersData = useMemo(
    () =>
      (data?.activeUsersTrend ?? []).map(point => ({
        group: activeUsersSeries,
        key: point.bucket,
        value: point.count,
      })),
    [data, activeUsersSeries],
  );

  const newLearnersData = useMemo(
    () =>
      (data?.newLearnersOnboardedTrend ?? []).map(point => ({
        group: newLearnersSeries,
        key: point.bucket,
        value: point.count,
      })),
    [data, newLearnersSeries],
  );

  const mostUsedSimulations = data?.mostUsedSimulations ?? [];

  const chartStates = {
    loading: isFetching,
    error: isError,
    onRetry: refetch,
    errorTitle: t("organizationMetrics.states.errorTitle"),
    errorSubtitle: t("organizationMetrics.states.errorSubtitle"),
    retryLabel: t("organizationMetrics.states.retry"),
    emptyText: t("organizationMetrics.states.empty"),
  };

  if (!canView) {
    return (
      <div className="py-4" data-testid="organization-metrics-no-access">
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t("organizationMetrics.states.noAccess")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4" data-testid="organization-metrics-section">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-testid="organization-metrics-header"
      >
        <p className="text-typography-600 text-sm">{t("organizationMetrics.subtitle")}</p>
        <ToggleButtonGroup
          data-testid="organization-metrics-range-toggle"
          value={range}
          onValueChange={value => setRange(value as OrganizationMetricsRange)}
          items={rangeOptions}
        />
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="organization-metrics-kpis"
      >
        {kpis.map(kpi => (
          <Tile key={kpi.key} data-testid={`organization-metrics-kpi-${kpi.key}`}>
            <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
            {isFetching || kpi.value === undefined ? (
              <SkeletonText heading width="80px" />
            ) : kpi.value === null ? (
              <p
                className="text-lg font-medium text-typography-600"
                data-testid={`organization-metrics-kpi-${kpi.key}-not-enough-data`}
              >
                {t("organizationMetrics.states.notEnoughData")}
              </p>
            ) : (
              <p className="text-3xl font-medium text-typography-900">
                {kpi.value.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-typography-500 mt-1">{kpi.caption}</p>
          </Tile>
        ))}
      </div>

      <div
        className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        data-testid="organization-metrics-charts"
      >
        <ChartCard
          title={t("organizationMetrics.charts.simulationsTrend")}
          empty={!simulationsData.some(point => point.value > 0)}
          {...chartStates}
        >
          <SimpleBarChart
            data={simulationsData}
            options={timeBarOpts({
              leftTitle: t("organizationMetrics.charts.axis.simulations"),
              bottomTitle: bucketTitle,
              colorScale: { [simulationsSeries]: PALETTE.blue },
            })}
          />
        </ChartCard>

        <ChartCard
          title={t("organizationMetrics.charts.activeUsersTrend")}
          caption={t("organizationMetrics.kpis.activeUsersCaption")}
          empty={!activeUsersData.some(point => point.value > 0)}
          {...chartStates}
        >
          <LineChart
            data={activeUsersData}
            options={lineOpts({
              leftTitle: t("organizationMetrics.charts.axis.users"),
              bottomTitle: bucketTitle,
              legend: false,
              colorScale: { [activeUsersSeries]: PALETTE.purple },
            })}
          />
        </ChartCard>

        <ChartCard
          title={t("organizationMetrics.charts.newLearnersTrend")}
          caption={t("organizationMetrics.kpis.newLearnersOnboardedCaption")}
          empty={!newLearnersData.some(point => point.value > 0)}
          {...chartStates}
        >
          <SimpleBarChart
            data={newLearnersData}
            options={timeBarOpts({
              leftTitle: t("organizationMetrics.charts.axis.newLearners"),
              bottomTitle: bucketTitle,
              colorScale: { [newLearnersSeries]: PALETTE.teal },
            })}
          />
        </ChartCard>
      </div>

      <div data-testid="organization-metrics-most-used">
        <ChartCard
          title={t("organizationMetrics.mostUsedSimulations.title")}
          caption={t("organizationMetrics.mostUsedSimulations.caption")}
          empty={mostUsedSimulations.length === 0}
          {...chartStates}
        >
          <ol className="flex flex-col gap-2" data-testid="organization-metrics-most-used-list">
            {mostUsedSimulations.map((simulation, index) => (
              <li
                key={simulation.scenarioId}
                className="flex items-center justify-between gap-3 border-b border-border-light pb-2 last:border-b-0 last:pb-0"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-background-tertiary text-xs font-medium text-typography-700">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm text-typography-900">{simulation.title}</span>
                </span>
                <span className="flex-shrink-0 text-sm text-typography-600">
                  {t("organizationMetrics.mostUsedSimulations.sessions", {
                    count: simulation.sessionCount,
                  })}
                </span>
              </li>
            ))}
          </ol>
        </ChartCard>
      </div>

      <div data-testid="organization-metrics-learner-usage">
        <LearnerUsageTable range={range} />
      </div>

      <div data-testid="organization-metrics-course-usage">
        <CourseUsageTable />
      </div>
    </div>
  );
};

// Default export so Analytics.tsx can React.lazy() this section — the Carbon
// charts bundle+CSS then only loads when the Organization Metrics toggle is
// actually opened.
export default OrganizationMetrics;
