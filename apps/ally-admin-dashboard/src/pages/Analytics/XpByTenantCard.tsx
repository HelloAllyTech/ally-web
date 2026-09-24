import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetXpByTenantQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, stackedBarOpts } from "./chartKit";
import {
  XP_BY_TENANT_WINDOW_LABEL,
  XpByTenantWindow,
  buildXpByTenantScale,
  buildXpByTenantSeries,
  buildXpByTenantTable,
  xpByTenantEmptyText,
  xpByTenantTakeaway,
} from "./xpByTenantChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "XP by tenant";

/**
 * Total platform XP earned within a trailing window, split by tenant — ONE
 * bar, not a trend, because the question is who carried the XP this period,
 * not how it moved. The top 8 tenants are named individually; the rest roll
 * into "Other tenants".
 *
 * Pinned to all time, with no window control: this card never scopes the data
 * to a trailing period, and it has no per-chart grain either (one bar, not a
 * trend), so it carries no control at all.
 */
export const XpByTenantCard = () => {
  const window: XpByTenantWindow = "all";
  const { data, isLoading, isError, refetch } = useGetXpByTenantQuery({ window });
  const [expanded, setExpanded] = useState(false);

  const series = useMemo(() => buildXpByTenantSeries(data), [data]);
  const scale = useMemo(() => buildXpByTenantScale(data), [data]);
  const table = useMemo(() => buildXpByTenantTable(data), [data]);
  const emptyText = xpByTenantEmptyText(data);
  const takeaway = xpByTenantTakeaway(data);

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "XP",
        colorScale: scale,
        height: "340px",
      }),
    [scale],
  );

  const caption =
    `Total XP earned within a trailing window, split by tenant — the top 8 named ` +
    `individually, the rest rolled into "Other tenants". Test tenants are excluded ` +
    `entirely, even from the "Other" total. One bar, not a trend: this answers who ` +
    `carried the platform's XP this period, not how it moved.`;

  const source = buildSource({
    derivation: "SUM(xp_events.xp) per tenant within the window, top 8 named",
    window: data?.window.label,
    n: data ? data.segments.length + (data.otherXp > 0 ? 1 : 0) : undefined,
    nUnit: "segments shown",
    extra: "Test tenants excluded",
    asOf: asOfStamp(data?.computedAt),
  });

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        collapseMeta
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        empty={!isLoading && Boolean(emptyText)}
        emptyText={emptyText}
        onExpand={() => setExpanded(true)}
        height="340px"
        chartId="AAQ-010"
      >
        <div className="flex flex-col gap-4">
          <ScrollableChart data={series}>
            <StackedBarChart data={series} options={opts} />
          </ScrollableChart>
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Exact per-tenant XP and share of the window's total."
          source={source}
          table={table}
          exportContext={[
            `Window: ${data?.window.label ?? XP_BY_TENANT_WINDOW_LABEL[window]}`,
            "Top 8 tenants named individually; the rest rolled into Other tenants",
            "Test tenants excluded entirely, including from Other tenants",
          ]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <StackedBarChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
