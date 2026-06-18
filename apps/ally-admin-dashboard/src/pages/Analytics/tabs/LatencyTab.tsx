import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";
import { Dropdown } from "@carbon/react";

import { useGetVoiceLatencyQuery } from "@api";
import { AnalyticsBucket, AnalyticsRange } from "@types";

import { ChartCard, PALETTE, lineOpts } from "../chartKit";
import { buildVoiceLatencySeries, latencyBucketTitle, LATENCY_GROUPS } from "../latencyChart";

const BUCKET_ITEMS: { id: AnalyticsBucket; label: string }[] = [
  { id: "day", label: "Day-wise" },
  { id: "week", label: "Week-wise" },
  { id: "month", label: "Month-wise" },
];

/** Voice-to-voice latency (avg & p95), Live vs Historical. Uses the shared range
 * + language, plus its own granularity picker. */
export const LatencyTab = ({ range, language }: { range: AnalyticsRange; language: string }) => {
  const [bucket, setBucket] = useState<AnalyticsBucket>("day");
  const { data, isLoading, isError, refetch } = useGetVoiceLatencyQuery({
    range,
    bucket,
    language: language || undefined,
  });

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
    </div>
  );
};
