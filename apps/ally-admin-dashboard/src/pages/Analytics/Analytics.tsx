import { useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { DonutChart, LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
import {
  Button,
  Dropdown,
  Heading,
  InlineNotification,
  Section,
  SkeletonPlaceholder,
  SkeletonText,
  Theme,
  Tile,
} from "@carbon/react";

import "@carbon/charts/styles.css";
import "./analytics-carbon.scss";

import { useGetAnalyticsOverviewQuery } from "@api";
import { AnalyticsRange } from "@types";

const CHART_HEIGHT = "320px";

type RangeItem = { id: AnalyticsRange; label: string };

const RANGE_ITEMS: RangeItem[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

// Carbon-palette hexes reused across the chart color scales.
const COLORS = {
  blue: "#0f62fe",
  purple: "#8a3ffc",
  teal: "#08bdba",
  green: "#42be65",
  cyan: "#33b1ff",
};

export const Analytics = () => {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery({ range });

  const bucketTitle = range === "12m" ? "Month" : "Week";

  const growthData = useMemo(
    () =>
      (data?.userGrowth ?? []).flatMap(point => [
        { group: "New users", key: point.date, value: point.newUsers },
        { group: "Cumulative users", key: point.date, value: point.cumulativeUsers },
      ]),
    [data],
  );

  const activeData = useMemo(
    () =>
      (data?.activeUsers ?? []).flatMap(point => [
        { group: "DAU", key: point.date, value: point.dau },
        { group: "WAU", key: point.date, value: point.wau },
        { group: "MAU", key: point.date, value: point.mau },
      ]),
    [data],
  );

  const simsData = useMemo(
    () =>
      (data?.simulationsCompleted ?? []).map(point => ({
        group: "Simulations",
        key: point.weekStart,
        value: point.count,
      })),
    [data],
  );

  const retentionData = useMemo(
    () =>
      (data?.retention ?? []).flatMap(point => [
        { group: "New", key: point.weekStart, value: point.newUsers },
        { group: "Returning", key: point.weekStart, value: point.returningUsers },
      ]),
    [data],
  );

  const rolesData = useMemo(
    () => (data?.usersByRole ?? []).map(point => ({ group: point.role, value: point.count })),
    [data],
  );

  const growthOptions = {
    title: "User growth",
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Users" },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: bucketTitle },
    },
    curve: "curveMonotoneX",
    height: CHART_HEIGHT,
    color: { scale: { "New users": COLORS.purple, "Cumulative users": COLORS.blue } },
    toolbar: { enabled: false },
  };

  const activeOptions = {
    title: "Active users (DAU / WAU / MAU)",
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Distinct users" },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "Day" },
    },
    curve: "curveMonotoneX",
    points: { enabled: false },
    height: CHART_HEIGHT,
    color: { scale: { DAU: COLORS.blue, WAU: COLORS.teal, MAU: COLORS.purple } },
    toolbar: { enabled: false },
  };

  const simsOptions = {
    title: "Simulations completed per week",
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Completed" },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "Week" },
    },
    height: CHART_HEIGHT,
    color: { scale: { Simulations: COLORS.blue } },
    legend: { enabled: false },
    toolbar: { enabled: false },
  };

  const retentionOptions = {
    title: "Weekly retention (new vs returning)",
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, stacked: true, title: "Active users" },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "Week" },
    },
    height: CHART_HEIGHT,
    color: { scale: { New: COLORS.green, Returning: COLORS.blue } },
    toolbar: { enabled: false },
  };

  const rolesOptions = {
    title: "Users by role",
    resizable: true,
    donut: { center: { label: "Users" } },
    height: CHART_HEIGHT,
    toolbar: { enabled: false },
  };

  const kpis = [
    { label: "Total users", value: data ? data.summary.totalUsers.toLocaleString() : undefined },
    {
      label: "Active users (30d)",
      value: data ? data.summary.activeUsers30d.toLocaleString() : undefined,
    },
    {
      label: "Simulations this week",
      value: data ? data.summary.simsThisWeek.toLocaleString() : undefined,
    },
    {
      label: "Retention rate (30d)",
      value: data ? `${data.summary.retentionRatePct}%` : undefined,
    },
  ];

  const selectedItem = RANGE_ITEMS.find(item => item.id === range) ?? RANGE_ITEMS[0];
  const showSkeletons = isLoading && !data;

  return (
    <div className="analytics-carbon font-primary h-full overflow-y-auto pr-1">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Heading className="text-2xl">Platform analytics</Heading>
          <div className="w-56">
            <Dropdown
              id="analytics-range"
              size="md"
              titleText="Time range"
              hideLabel
              label="Time range"
              items={RANGE_ITEMS}
              selectedItem={selectedItem}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem }) => {
                if (selectedItem) setRange(selectedItem.id);
              }}
            />
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-start gap-4">
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn't load analytics"
              subtitle="There was a problem fetching platform metrics."
            />
            <Button kind="tertiary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {kpis.map(kpi => (
                <Tile key={kpi.label} className="analytics-kpi">
                  <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
                  {showSkeletons || kpi.value === undefined ? (
                    <SkeletonText heading width="60%" />
                  ) : (
                    <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
                  )}
                </Tile>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Tile className="xl:col-span-2">
                {showSkeletons ? (
                  <SkeletonPlaceholder className="analytics-chart-skeleton" />
                ) : (
                  <LineChart data={growthData} options={growthOptions} />
                )}
              </Tile>
              <Tile>
                {showSkeletons ? (
                  <SkeletonPlaceholder className="analytics-chart-skeleton" />
                ) : (
                  <LineChart data={activeData} options={activeOptions} />
                )}
              </Tile>
              <Tile>
                {showSkeletons ? (
                  <SkeletonPlaceholder className="analytics-chart-skeleton" />
                ) : (
                  <SimpleBarChart data={simsData} options={simsOptions} />
                )}
              </Tile>
              <Tile>
                {showSkeletons ? (
                  <SkeletonPlaceholder className="analytics-chart-skeleton" />
                ) : (
                  <StackedBarChart data={retentionData} options={retentionOptions} />
                )}
              </Tile>
              <Tile>
                {showSkeletons ? (
                  <SkeletonPlaceholder className="analytics-chart-skeleton" />
                ) : (
                  <DonutChart data={rolesData} options={rolesOptions} />
                )}
              </Tile>
            </div>
          </>
        )}
        </Section>
      </Theme>
    </div>
  );
};
