import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { useGetXpByTenantQuery } from "@api";

import { GROUPING_LABEL, inProgressCaption } from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  stackedBarOpts,
} from "./chartKit";
import {
  DEFAULT_XP_BY_TENANT_GROUPING,
  XP_BY_TENANT_GROUPINGS,
  XP_BY_TENANT_WINDOW_LABEL,
  XpByTenantWindow,
  buildXpByTenantScale,
  buildXpByTenantSeries,
  buildXpByTenantTable,
  isGrouped,
  toXpByTenantGrain,
  xpByTenantAxisTitle,
  xpByTenantEmptyText,
  xpByTenantInProgress,
  xpByTenantTakeaway,
} from "./xpByTenantChart";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const TITLE = "XP by Tenant";

type ChartId = "xpByTenant";

/**
 * Total platform XP, split by tenant. The top 8 tenants over the whole window
 * are named individually; the rest roll into "Other tenants".
 *
 * Opens on All time — ONE bar, answering who carried the platform's XP. The
 * grouping picker re-reads the same window as one stacked bar per
 * day/week/month/quarter/year, answering how each tenant's share moved. The
 * named set stays the whole-window top 8 at every grain, so a tenant keeps one
 * band and one colour across the bars rather than drifting in and out of
 * "Other". Re-grouping is a server query, like every other grain control here.
 *
 * Pinned to all time, with no window control: this card never scopes the data
 * to a trailing period.
 */
export const XpByTenantCard = () => {
  const window: XpByTenantWindow = "all";
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.xpByTenant",
    defaultControlsFor(["xpByTenant"], {
      xpByTenant: { grain: DEFAULT_XP_BY_TENANT_GROUPING },
    }),
  );
  const grain = controlsFor("xpByTenant").grain;
  // `currentData`, not `data`: on a grain switch `data` keeps the previous
  // grain's bars on screen under the new axis title until the new ones land.
  const {
    currentData: data,
    isFetching,
    isError,
    refetch,
  } = useGetXpByTenantQuery({ window, grain: toXpByTenantGrain(grain) }, { skip: hydrating });
  const [expanded, setExpanded] = useState(false);

  const series = useMemo(() => buildXpByTenantSeries(data), [data]);
  const scale = useMemo(() => buildXpByTenantScale(data), [data]);
  const table = useMemo(() => buildXpByTenantTable(data), [data]);
  const inProgress = xpByTenantInProgress(data);
  const emptyText = xpByTenantEmptyText(data);
  const takeaway = xpByTenantTakeaway(data);
  // From the response, not the picker — see `isGrouped`.
  const grouped = data ? isGrouped(data) : grain !== "allTime";

  const opts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "XP",
        bottomTitle: grouped ? xpByTenantAxisTitle(grain) : "",
        colorScale: scale,
        height: "340px",
      }),
    [scale, grain, grouped],
  );

  const caption =
    `Total XP earned, split by tenant — the top 8 over the whole window named ` +
    `individually, the rest rolled into "Other tenants". Test tenants are excluded ` +
    `entirely, even from the "Other" total. ` +
    (grouped
      ? `Grouped by ${GROUPING_LABEL[grain].toLowerCase()}: the same 8 tenants are ` +
        `named in every bar, so a tenant that led one period but not the window ` +
        `counts toward Other there.` +
        (grain === "week" ? " Weeks begin on Monday." : "") +
        inProgressCaption(grain, inProgress?.periodStart)
      : `All time is one bar: who carried the platform's XP. Group by a period to ` +
        `see how each tenant's share moved.`);

  const source = buildSource({
    derivation: grouped
      ? `SUM(xp_events.xp) per tenant per ${grain}, top 8 over the window named`
      : "SUM(xp_events.xp) per tenant within the window, top 8 named",
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
        loading={hydrating || (isFetching && !data)}
        error={isError}
        onRetry={refetch}
        empty={!isFetching && Boolean(emptyText)}
        emptyText={emptyText}
        controls={
          <GroupingPicker
            id="goals-xp-by-tenant-grain"
            value={grain}
            onChange={g => setGrain("xpByTenant", g)}
            options={XP_BY_TENANT_GROUPINGS}
          />
        }
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
          caption={
            grouped
              ? "Exact XP per tenant per period, with each period's total. The period in progress is included here though left off the plot."
              : "Exact per-tenant XP and share of the window's total."
          }
          source={source}
          table={table}
          exportContext={[
            `Window: ${data?.window.label ?? XP_BY_TENANT_WINDOW_LABEL[window]}`,
            `Grouped by ${GROUPING_LABEL[grain].toLowerCase()}`,
            "Top 8 tenants over the whole window named individually; the rest rolled into Other tenants",
            "Test tenants excluded entirely, including from Other tenants",
            ...(inProgress ? [`${inProgress.periodLabel} is still in progress`] : []),
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
