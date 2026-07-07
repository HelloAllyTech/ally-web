import { useMemo, useState } from "react";

import { LineChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetStartLatencyQuery, useGetVoiceLatencyQuery } from "@api";
import { AnalyticsBucket, AnalyticsRange } from "@types";

import { ChartCard, PALETTE, lineOpts, stackedBarOpts } from "../chartKit";
import {
  buildStartLatencySeries,
  buildVoiceLatencySeries,
  latencyBucketTitle,
  LATENCY_GROUPS,
  START_LATENCY_GROUPS,
} from "../latencyChart";

const BUCKET_ITEMS: { id: AnalyticsBucket; label: string }[] = [
  { id: "day", label: "Day-wise" },
  { id: "week", label: "Week-wise" },
  { id: "month", label: "Month-wise" },
];

/** Voice-to-voice latency (avg & p95) plus simulation start latency ("time to
 * first word", stacked by startup segment). Both use the shared range +
 * language and a single granularity picker. */
export const LatencyTab = ({ range, language }: { range: AnalyticsRange; language: string }) => {
  const [bucket, setBucket] = useState<AnalyticsBucket>("day");
  const languageParam = language || undefined;

  const { data, isLoading, isError, refetch } = useGetVoiceLatencyQuery({
    range,
    bucket,
    language: languageParam,
  });

  const {
    data: startData,
    isLoading: startLoading,
    isError: startError,
    refetch: refetchStart,
  } = useGetStartLatencyQuery({ range, bucket, language: languageParam });

  const series = useMemo(() => buildVoiceLatencySeries(data?.points ?? []), [data]);
  const axisTitle = useMemo(() => latencyBucketTitle(data?.bucket), [data]);
  const selectedBucket = BUCKET_ITEMS.find(b => b.id === bucket) ?? BUCKET_ITEMS[0];

  const options = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: {
          [LATENCY_GROUPS.pipelineAvg]: PALETTE.blue,
          [LATENCY_GROUPS.pipelineP95]: PALETTE.cyan,
          [LATENCY_GROUPS.transcriptAvg]: PALETTE.purple,
          [LATENCY_GROUPS.transcriptP95]: PALETTE.teal,
        },
        extra: {
          axes: {
            left: {
              mapsTo: "value",
              scaleType: "linear",
              title: "Seconds",
              thresholds: [
                {
                  value: (data?.targetMs ?? 1500) / 1000,
                  label: "Target",
                  fillColor: PALETTE.green,
                },
              ],
            },
            bottom: { mapsTo: "key", scaleType: "labels", title: axisTitle },
          },
        },
      }),
    [data, axisTitle],
  );

  const startSeries = useMemo(() => buildStartLatencySeries(startData?.points ?? []), [startData]);
  const startAxisTitle = useMemo(() => latencyBucketTitle(startData?.bucket), [startData]);

  const startOptions = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Seconds",
        bottomTitle: startAxisTitle,
        colorScale: {
          [START_LATENCY_GROUPS.configure]: PALETTE.blue,
          [START_LATENCY_GROUPS.initialize]: PALETTE.cyan,
          [START_LATENCY_GROUPS.connect]: PALETTE.teal,
          [START_LATENCY_GROUPS.prep]: PALETTE.purple,
          [START_LATENCY_GROUPS.transcriptTotal]: PALETTE.magenta,
        },
        extra: {
          axes: {
            left: {
              mapsTo: "value",
              scaleType: "linear",
              stacked: true,
              title: "Seconds",
              thresholds: [
                {
                  value: (startData?.targetMs ?? 4000) / 1000,
                  label: "Target",
                  fillColor: PALETTE.green,
                },
              ],
            },
            bottom: { mapsTo: "key", scaleType: "labels", title: startAxisTitle },
          },
        },
      }),
    [startData, startAxisTitle],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex justify-end">
        <div className="w-44">
          <Dropdown
            id="latency-bucket"
            size="sm"
            titleText="Granularity"
            hideLabel
            label="Granularity"
            items={BUCKET_ITEMS}
            selectedItem={selectedBucket}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) setBucket(selectedItem.id);
            }}
          />
        </div>
      </div>
      <ChartCard
        title="Voice-to-voice latency (avg & p95)"
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load voice-to-voice latency"
        errorSubtitle="There was a problem fetching turn-latency metrics."
      >
        <LineChart data={series} options={options} />
      </ChartCard>
      <ChartCard
        title="Simulation start latency — time to first word (by startup segment)"
        loading={startLoading && !startData}
        error={startError}
        onRetry={refetchStart}
        errorTitle="Couldn't load start latency"
        errorSubtitle="There was a problem fetching start-latency metrics."
      >
        <StackedBarChart data={startSeries} options={startOptions} />
      </ChartCard>
    </div>
  );
};
