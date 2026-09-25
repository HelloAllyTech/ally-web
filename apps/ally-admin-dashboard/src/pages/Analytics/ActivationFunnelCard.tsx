import { useMemo } from "react";

import { useGetActivationQuery } from "@api";

import { asOfStamp } from "./analyticsFilters";
import { ChartCard, buildSource } from "./chartKit";
import { FunnelBars } from "./FunnelBars";
import { buildActivationFunnelStages } from "./testingChart";

/**
 * New-learner activation funnel (AAQ-035) — relocated to Highlights → Priority
 * from the Usage levels sub-tab's "Activation" section, reading the same
 * `activation` endpoint with no window and no grain.
 *
 * All-time by construction (a question about accounts, not a period) and
 * platform-wide like the rest of Priority; on Usage levels it followed the
 * page's tenant filter. Its companion, Time to first practice, stays there.
 */
export const ActivationFunnelCard = () => {
  const { data, isLoading, isError, refetch } = useGetActivationQuery({});
  const stages = useMemo(() => buildActivationFunnelStages(data?.funnel), [data]);
  const loading = isLoading && !data;

  return (
    <ChartCard
      title="New-learner activation funnel"
      caption={`Of every ${data?.funnel.denominatorLabel ?? "learner account"}, how many reached each step, platform-wide. The first bar is 100% by construction — it is the population, not a measurement. All-time: this is a question about accounts, not about a period.`}
      collapseMeta
      source={buildSource({
        derivation: "users joined to completed sessions, all time",
        window: "all time",
        n: data?.summary.registeredLearners,
        nUnit: "learner accounts",
        extra: "Platform-wide",
        asOf: asOfStamp(data?.computedAt),
      })}
      loading={loading}
      error={isError}
      onRetry={refetch}
      empty={!loading && stages.length === 0}
      height="auto"
      chartId="AAQ-035"
    >
      <FunnelBars stages={stages} unit="learners" />
    </ChartCard>
  );
};
