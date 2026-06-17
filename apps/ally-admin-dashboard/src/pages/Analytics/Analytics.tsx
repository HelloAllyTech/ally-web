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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Theme,
  Tile,
} from "@carbon/react";

import "@carbon/charts/styles.css";
import "./analytics-carbon.scss";

import { useGetAnalyticsOverviewQuery, useGetVoiceLatencyQuery } from "@api";
import { AnalyticsBucket, AnalyticsRange } from "@types";

import { buildVoiceLatencySeries, latencyBucketTitle, LATENCY_GROUPS } from "./latencyChart";

import { ConversationDrift } from "../ConversationDrift/ConversationDrift";

const CHART_HEIGHT = "320px";

type RangeItem = { id: AnalyticsRange; label: string };

const RANGE_ITEMS: RangeItem[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

type BucketItem = { id: AnalyticsBucket; label: string };

const LATENCY_BUCKET_ITEMS: BucketItem[] = [
  { id: "day", label: "Day-wise" },
  { id: "week", label: "Week-wise" },
  { id: "month", label: "Month-wise" },
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
  const [latencyBucket, setLatencyBucket] = useState<AnalyticsBucket>("day");
  const { data, isLoading, isError, refetch } = useGetAnalyticsOverviewQuery({ range });
  const {
    data: latency,
    isLoading: latencyLoading,
    isError: latencyError,
    refetch: refetchLatency,
  } = useGetVoiceLatencyQuery({ range, bucket: latencyBucket });

  const bucketTitle = range === "12m" ? "Month" : "Week";

  // Latency comes back in ms split by source; chart it in seconds, one line
  // per (source × {avg, p95}). Buckets with no turns are simply absent.
  const latencyData = useMemo(() => buildVoiceLatencySeries(latency?.points ?? []), [latency]);

  const latencyAxisTitle = useMemo(() => latencyBucketTitle(latency?.bucket), [latency]);

  const latencyOptions = useMemo(
    () => ({
      title: "Voice-to-voice latency (avg & p95)",
      axes: {
        left: {
          mapsTo: "value",
          scaleType: ScaleTypes.LINEAR,
          title: "Seconds",
          thresholds: [
            {
              value: (latency?.targetMs ?? 1500) / 1000,
              label: "Target",
              fillColor: COLORS.green,
            },
          ],
        },
        bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: latencyAxisTitle },
      },
      curve: "curveMonotoneX",
      height: CHART_HEIGHT,
      color: {
        scale: {
          [LATENCY_GROUPS.pipelineAvg]: COLORS.blue,
          [LATENCY_GROUPS.pipelineP95]: COLORS.cyan,
          [LATENCY_GROUPS.transcriptAvg]: COLORS.purple,
          [LATENCY_GROUPS.transcriptP95]: COLORS.teal,
        },
      },
      toolbar: { enabled: false },
    }),
    [latency, latencyAxisTitle],
  );

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

  const selectedItem = RANGE_ITEMS.find(item => item.id === range) ?? RANGE_ITEMS[0];
  const selectedLatencyBucket =
    LATENCY_BUCKET_ITEMS.find(item => item.id === latencyBucket) ?? LATENCY_BUCKET_ITEMS[0];
  const showSkeletons = isLoading && !data;

  return (
    <div className="font-primary pr-1">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Heading className="text-2xl">Analytics</Heading>
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

          <Tabs>
            <TabList aria-label="Analytics sections">
              <Tab>Overview</Tab>
              <Tab>Latency</Tab>
              <Tab>Drift</Tab>
              <Tab>Tokens</Tab>
            </TabList>
            <TabPanels>
              {/* Overview — everything except the voice-to-voice latency chart. */}
              <TabPanel>
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
                )}
              </TabPanel>

              {/* Latency — voice-to-voice latency, with its own granularity + query state. */}
              <TabPanel>
                <Tile>
                  <div className="flex justify-end mb-2">
                    <div className="w-44">
                      <Dropdown
                        id="latency-bucket"
                        size="sm"
                        titleText="Granularity"
                        hideLabel
                        label="Granularity"
                        items={LATENCY_BUCKET_ITEMS}
                        selectedItem={selectedLatencyBucket}
                        itemToString={item => item?.label ?? ""}
                        onChange={({ selectedItem }) => {
                          if (selectedItem) setLatencyBucket(selectedItem.id);
                        }}
                      />
                    </div>
                  </div>
                  {latencyLoading && !latency ? (
                    <SkeletonPlaceholder className="analytics-chart-skeleton" />
                  ) : latencyError ? (
                    <div className="flex flex-col items-start gap-4">
                      <InlineNotification
                        kind="error"
                        lowContrast
                        hideCloseButton
                        title="Couldn't load voice-to-voice latency"
                        subtitle="There was a problem fetching turn-latency metrics."
                      />
                      <Button kind="tertiary" size="sm" onClick={() => refetchLatency()}>
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <LineChart data={latencyData} options={latencyOptions} />
                  )}
                </Tile>
              </TabPanel>

              {/* Drift — the conversation-drift analytics, its own filters + charts. */}
              <TabPanel>
                <ConversationDrift />
              </TabPanel>

              {/* Tokens — placeholder until token-usage metrics are wired up. */}
              <TabPanel>
                <p className="text-typography-600 py-8">
                  Token usage analytics are coming soon.
                </p>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Section>
      </Theme>
    </div>
  );
};
