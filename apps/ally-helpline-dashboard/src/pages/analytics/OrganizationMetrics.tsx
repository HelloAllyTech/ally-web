import { FunctionComponent, ReactNode, useMemo, useState } from "react";

import "@carbon/charts/styles.css";
import "./organization-metrics.scss";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { InlineNotification, SkeletonText, Tile, logger } from "@ally-ui-mono/ui-shared";
import {
  useGetOrganizationMetricsQuery,
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  userAPI,
} from "@api";
import { ToggleButtonGroup } from "@components";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { store } from "@store";
import { OrganizationMetricsRange, ORGANIZATION_METRICS_RANGES } from "@types";

import { ChartCard, PALETTE, lineOpts, timeBarOpts } from "./chartKit";
import { CourseUsageTable } from "./CourseUsageTable";
import { LearnerUsageTable } from "./LearnerUsageTable";
import { SortableMetricBlock } from "./SortableMetricBlock";

/**
 * The 6 reorderable chart/table blocks below the fixed KPI strip. The KPI
 * strip itself stays a fixed summary row (not reorderable) — see the "Reorder
 * scope" decision in the org-metrics-drag-reorder plan.
 */
const ORG_METRICS_BLOCK_IDS = [
  "simulationsTrend",
  "activeUsersTrend",
  "newLearnersTrend",
  "mostUsedSimulations",
  "learnerUsage",
  "courseUsage",
] as const;
type OrgMetricsBlockId = (typeof ORG_METRICS_BLOCK_IDS)[number];

// Blocks that stay full-width regardless of position, same as their previous
// hardcoded layout (ranked list + the two data tables read better wide; the
// 3 trend charts stay half-width tiles).
const WIDE_BLOCK_IDS = new Set<OrgMetricsBlockId>([
  "mostUsedSimulations",
  "learnerUsage",
  "courseUsage",
]);

/**
 * Resolves a saved block order into a full render order: drops any id that
 * isn't a current block (stale/corrupt preference), then appends any current
 * block missing from the saved order (e.g. a block added after the user last
 * saved a layout) at the end, in default order.
 */
const resolveLayout = (saved: string[] | undefined): OrgMetricsBlockId[] => {
  const known = new Set<string>(ORG_METRICS_BLOCK_IDS);
  const validSaved = (saved ?? []).filter((id): id is OrgMetricsBlockId => known.has(id));
  const missing = ORG_METRICS_BLOCK_IDS.filter(id => !validSaved.includes(id));
  return [...validSaved, ...missing];
};

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

  // Analytics.tsx only mounts this component for holders of the permission
  // (see canViewNativeOrgMetrics there). This check is a second, independent
  // line of defense against the metrics API 403ing if that ever changes:
  // it's tenant-admin only, so show a notice instead of firing a request
  // that would fail.
  const canView = !!permissions?.includes(Permissions.VIEW_ORGANIZATION_METRICS);

  const { data, isFetching, isError, refetch } = useGetOrganizationMetricsQuery(
    { range },
    { skip: !canView },
  );

  // Per-user saved order of the 6 chart/table blocks below — same
  // per-user preferences store the admin dashboard uses for its sidebar
  // nav order (admin_sidebar_order). No layout saved yet → default order.
  const { data: preferences } = useGetUserPreferencesQuery(undefined, { skip: !canView });
  const [updateUserPreferences] = useUpdateUserPreferencesMutation();
  const order = resolveLayout(preferences?.data?.org_metrics_layout);

  // Press-and-drag from the block's grip button only (see SortableMetricBlock)
  // — mirrors the sidebar reorder's activation distance so a stray click on
  // the handle doesn't misfire as a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  /**
   * Autosaves a new block order: optimistically patches the RTK Query cache
   * so the layout reorders immediately (no explicit Save button), then rolls
   * back and toasts on a failed save. Mirrors reorderSidebar in
   * ally-admin-dashboard's useUser.ts, the identical pattern for the sidebar
   * nav's own per-user order.
   */
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as OrgMetricsBlockId);
    const newIndex = order.indexOf(over.id as OrgMetricsBlockId);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(order, oldIndex, newIndex);

    const patch = store.dispatch(
      userAPI.util.updateQueryData("getUserPreferences", undefined, draft => {
        // getUserPreferences may still be pending when a drag finishes right
        // after the page loads (the draggable blocks render regardless of
        // its status) — the cache draft is undefined until it resolves, so
        // there's nothing to optimistically patch yet. Skip it; the mutation
        // below still saves the new order.
        if (!draft?.data) return;
        draft.data.org_metrics_layout = nextOrder;
      }),
    );
    try {
      await updateUserPreferences({ org_metrics_layout: nextOrder }).unwrap();
    } catch (error) {
      patch.undo();
      toast.error(t("organizationMetrics.states.reorderFailed"));
      logger.info(`Failed to save org metrics layout: ${error}`);
    }
  };

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

  // Content for each reorderable block, keyed by id — built here (not in JSX)
  // so both the default markup and resolveLayout's saved order render the
  // exact same block regardless of position.
  const blocks: Record<OrgMetricsBlockId, ReactNode> = {
    simulationsTrend: (
      <div data-testid="organization-metrics-block-simulations-trend">
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
      </div>
    ),
    activeUsersTrend: (
      <div data-testid="organization-metrics-block-active-users-trend">
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
      </div>
    ),
    newLearnersTrend: (
      <div data-testid="organization-metrics-block-new-learners-trend">
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
    ),
    mostUsedSimulations: (
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
    ),
    learnerUsage: (
      <Tile className="border border-border-light" data-testid="organization-metrics-learner-usage">
        <LearnerUsageTable range={range} />
      </Tile>
    ),
    courseUsage: (
      <Tile className="border border-border-light" data-testid="organization-metrics-course-usage">
        <CourseUsageTable />
      </Tile>
    ),
  };

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div
            className="grid grid-cols-1 xl:grid-cols-2 gap-4"
            data-testid="organization-metrics-charts"
          >
            {order.map(id => (
              <SortableMetricBlock key={id} id={id} wide={WIDE_BLOCK_IDS.has(id)}>
                {blocks[id]}
              </SortableMetricBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

// Default export so Analytics.tsx can React.lazy() this section — the Carbon
// charts bundle+CSS then only loads when the Organization Metrics toggle is
// actually opened.
export default OrganizationMetrics;
