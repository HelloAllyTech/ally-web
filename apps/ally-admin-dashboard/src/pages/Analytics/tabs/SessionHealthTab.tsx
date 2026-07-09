import { useMemo, useState } from "react";

import { DonutChart, LineChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetAgentJoinReliabilityQuery } from "@api";
import { AnalyticsBucket, AnalyticsRange } from "@types";

import { ChartCard, PALETTE, donutOpts, lineOpts } from "../chartKit";
import {
  buildJoinLatencySeries,
  buildOutcomeMixData,
  buildReliabilitySeries,
  JOIN_LATENCY_GROUPS,
  reliabilityBucketTitle,
  RELIABILITY_GROUPS,
} from "../joinReliabilityChart";

const BUCKET_ITEMS: { id: AnalyticsBucket; label: string }[] = [
  { id: "day", label: "Day-wise" },
  { id: "week", label: "Week-wise" },
  { id: "month", label: "Month-wise" },
];

/** Reference ceiling for the join-failure rate (%). */
const FAILURE_RATE_TARGET_PCT = 2;

/**
 * Session reliability: agent-join failure rate + mid-session drop rate (%),
 * dispatch->join latency (p50/p95), and the overall session outcome mix. An
 * absent AGENT_JOINED is a join failure; AGENT_JOINED followed by AGENT_LEFT is
 * a mid-session drop.
 */
export const SessionHealthTab = ({ range }: { range: AnalyticsRange }) => {
  const [bucket, setBucket] = useState<AnalyticsBucket>("day");

  const { data, isLoading, isError, refetch } = useGetAgentJoinReliabilityQuery({
    range,
    bucket,
  });

  const points = data?.points ?? [];
  const axisTitle = useMemo(() => reliabilityBucketTitle(data?.bucket), [data]);
  const selectedBucket = BUCKET_ITEMS.find(b => b.id === bucket) ?? BUCKET_ITEMS[0];

  const rateSeries = useMemo(() => buildReliabilitySeries(points), [points]);
  const latencySeries = useMemo(() => buildJoinLatencySeries(points), [points]);
  const outcomeData = useMemo(() => buildOutcomeMixData(data?.outcomeMix), [data]);

  const rateOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Percent",
        bottomTitle: axisTitle,
        colorScale: {
          [RELIABILITY_GROUPS.joinFailure]: PALETTE.red,
          [RELIABILITY_GROUPS.midDrop]: PALETTE.orange,
        },
        extra: {
          axes: {
            left: {
              mapsTo: "value",
              scaleType: "linear",
              title: "Percent",
              thresholds: [
                {
                  value: FAILURE_RATE_TARGET_PCT,
                  label: "Target",
                  fillColor: PALETTE.green,
                },
              ],
            },
            bottom: { mapsTo: "key", scaleType: "labels", title: axisTitle },
          },
        },
      }),
    [axisTitle],
  );

  const latencyOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: {
          [JOIN_LATENCY_GROUPS.p50]: PALETTE.blue,
          [JOIN_LATENCY_GROUPS.p95]: PALETTE.cyan,
        },
      }),
    [axisTitle],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex justify-end">
        <div className="w-44">
          <Dropdown
            id="join-reliability-bucket"
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
        title="Session outcomes"
        caption="COMPLETED = ended with a transcript · NO_CONVERSATION = ended empty (includes agent-never-joined)"
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load session outcomes"
        errorSubtitle="There was a problem fetching reliability metrics."
      >
        <DonutChart data={outcomeData} options={donutOpts({ centerLabel: "Sessions" })} />
      </ChartCard>

      <ChartCard
        title="Agent-join failure & mid-session drop rate"
        caption="Join failure = agent never joined · Mid-session drop = agent joined then left"
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load join reliability"
        errorSubtitle="There was a problem fetching reliability metrics."
      >
        <LineChart data={rateSeries} options={rateOptions} />
      </ChartCard>

      <ChartCard
        title="Agent-join latency (dispatch → join, p50 & p95)"
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        errorTitle="Couldn't load join latency"
        errorSubtitle="There was a problem fetching reliability metrics."
      >
        <LineChart data={latencySeries} options={latencyOptions} />
      </ChartCard>
    </div>
  );
};
