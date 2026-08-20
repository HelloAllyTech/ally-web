import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetOrgEngagementQuery } from "@api";

import { PLATFORM_WIDE_NOTE } from "../analyticsFilters";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  KpiTile,
  ScrollableChart,
  buildSource,
  integerTickValues,
  lineOpts,
} from "../chartKit";
import { FunnelBars } from "../FunnelBars";
import {
  ORG_ACTIVITY_SCALE,
  ORG_LADDER_CAVEAT,
  ORG_SHARE_SCALE,
  buildOrgActivitySeries,
  buildOrgFunnelStages,
  periodLabel,
} from "../ladderChart";

/** The trailing windows the "active recently" headline may be read over. */
const WINDOW_ITEMS: { id: 7 | 28 | 90; label: string }[] = [
  { id: 7, label: "Last 7 days" },
  { id: 28, label: "Last 28 days" },
  { id: 90, label: "Last 90 days" },
];

/**
 * Orgs — how far each account has got, and how many are still alive.
 *
 * ## Platform-wide, always
 *
 * Every figure here counts ORGS, so the page's tenant filter cannot narrow it to
 * anything meaningful ("1 of 1 orgs is active" answers nothing). The endpoint
 * ignores `tenantId` and names the sections in `scoping.unscopedSections`; this
 * tab badges them rather than letting a reader believe a filter applied.
 *
 * ## Two windows, said out loud
 *
 * The headline is a TRAILING window ending now; the trend below is per CALENDAR
 * MONTH. They are near neighbours and not the same number, so both captions name
 * their own grain. Quietly implying the last trend point equals the headline is
 * the kind of small dishonesty that costs a reader an afternoon.
 */
export const OrgEngagementSubTab = () => {
  const [activityDays, setActivityDays] = useState<7 | 28 | 90>(28);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useGetOrgEngagementQuery({ activityDays });

  const funnel = useMemo(() => buildOrgFunnelStages(data), [data]);
  const activity = useMemo(() => buildOrgActivitySeries(data), [data]);

  const asOf = data?.computedAt ? new Date(data.computedAt).toLocaleDateString() : undefined;
  const loading = isLoading && !data;

  const windowPicker = (
    <div className="w-36 shrink-0">
      <Dropdown
        id="org-activity-window"
        size="sm"
        titleText="Window"
        hideLabel
        label="Window"
        items={WINDOW_ITEMS}
        selectedItem={WINDOW_ITEMS.find(i => i.id === activityDays) ?? WINDOW_ITEMS[1]}
        itemToString={item => item?.label ?? ""}
        onChange={({ selectedItem }) => {
          if (selectedItem) setActivityDays(selectedItem.id);
        }}
      />
    </div>
  );

  return (
    <>
      <div className="mt-8 mb-3 flex items-center justify-between gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-typography-500">
          Active accounts
        </h3>
        {/* The window control sits on the KPI strip it actually governs. Putting
            it in a chart header below would imply it re-scoped that chart, which
            is per calendar month and does not move. */}
        {windowPicker}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiTile
          label={`Orgs active in the last ${activityDays} days`}
          value={data ? data.activeOrgs.toLocaleString() : "—"}
          n={data?.eligibleOrgs}
          nUnit="orgs eligible"
          loading={loading}
          description={`At least one completed simulation. ${PLATFORM_WIDE_NOTE}`}
        />

        <KpiTile
          label="Share of orgs active"
          value={data?.activeSharePct === null || !data ? "—" : `${data.activeSharePct}%`}
          n={data?.eligibleOrgs}
          nUnit="orgs eligible"
          loading={loading}
          description="Of the orgs that existed before this window opened — see the note below."
        />

        <KpiTile
          label="Orgs on the platform"
          value={data ? data.orgs.toLocaleString() : "—"}
          loading={loading}
          description="Non-test, non-deleted tenants. The funnel's top row."
        />
      </div>

      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-typography-500">
        The denominator counts only orgs created BEFORE the window opened. An account signed up
        three days ago has not had the chance to be inactive for {activityDays}, and counting it as
        a miss would make this share fall every time a deal closed.
      </p>

      <SubHeading>Engagement ladder</SubHeading>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Org created → L1 → L4"
          caption={ORG_LADDER_CAVEAT}
          source={buildSource({
            derivation: "Total practice minutes across each org's learners",
            window: "all time",
            n: data?.orgs,
            nUnit: "orgs",
            asOf,
            extra: PLATFORM_WIDE_NOTE,
          })}
          loading={loading}
          error={Boolean(error)}
          empty={!isLoading && !funnel.length}
          errorSubtitle="There was a problem fetching org engagement."
          onRetry={() => void refetch()}
          height="auto"
        >
          <FunnelBars stages={funnel} unit="orgs" />
        </ChartCard>

        {/* Count and share together. Either alone misleads: a rising count with
            a falling share means we are signing orgs faster than we activate
            them, which reads as growth on one and decline on the other. */}
        <ChartCard
          title="Orgs active per month"
          caption={
            "A point is an org with at least one completed simulation IN that " +
            "calendar month — a different measurement from the trailing-window " +
            "headline above, not the same number at a different grain."
          }
          source={buildSource({
            derivation: "Distinct orgs with a completed simulation, per calendar month",
            window: "last 12 months",
            n: data?.orgs,
            nUnit: "orgs",
            asOf,
            extra: PLATFORM_WIDE_NOTE,
          })}
          loading={loading}
          error={Boolean(error)}
          empty={!isLoading && !activity.counts.some(d => (d.value ?? 0) > 0)}
          emptyText="No org has completed a simulation yet"
          errorSubtitle="There was a problem fetching org activity."
          onRetry={() => void refetch()}
          onExpand={() => setExpanded("activity")}
        >
          <ScrollableChart data={activity.counts}>
            <LineChart
              data={activity.counts}
              options={lineOpts({
                colorScale: ORG_ACTIVITY_SCALE,
                leftTitle: "Orgs",
                bottomTitle: "Month",
                legend: true,
                valueTicks: integerTickValues(
                  Math.max(0, ...activity.counts.map(d => d.value ?? 0)),
                ),
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard
          title="Share of orgs active each month"
          caption={
            "The same months as a percentage of the orgs that existed by each " +
            "month's end. Null — a gap in the line — before any org existed, " +
            "rather than 0%."
          }
          source={buildSource({
            derivation: "Active orgs / orgs existing that month",
            window: "last 12 months",
            asOf,
            extra: PLATFORM_WIDE_NOTE,
          })}
          loading={loading}
          error={Boolean(error)}
          empty={!isLoading && !activity.shares.some(d => d.value !== null)}
          errorSubtitle="There was a problem fetching org activity."
          onRetry={() => void refetch()}
          onExpand={() => setExpanded("share")}
          wide
        >
          <ScrollableChart data={activity.shares}>
            <LineChart
              data={activity.shares}
              options={lineOpts({
                colorScale: ORG_SHARE_SCALE,
                leftTitle: "% of orgs",
                bottomTitle: "Month",
                domain: [0, 100],
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      <ChartDetailModal
        open={expanded === "activity" || expanded === "share"}
        onClose={() => setExpanded(null)}
        title="Orgs active per month"
        caption="Count and share side by side, with the population each month."
        render={({ height }) => (
          <LineChart
            data={activity.counts}
            options={lineOpts({
              colorScale: ORG_ACTIVITY_SCALE,
              leftTitle: "Orgs",
              bottomTitle: "Month",
              legend: true,
              height,
            })}
          />
        )}
        table={{
          columns: ["Month", "Active orgs", "All orgs", "Active share"],
          rows: (data?.activityTrend ?? []).map(p => [
            periodLabel(p.month, "month"),
            p.activeOrgs,
            p.totalOrgs,
            p.activeSharePct === null ? "—" : `${p.activeSharePct}%`,
          ]),
        }}
        exportContext={[
          "Active = at least one completed simulation in that calendar month",
          "Platform-wide: counting orgs cannot be narrowed to one org",
        ]}
        exportFilename="org-activity"
      />
    </>
  );
};

const SubHeading = ({ children }: { children: string }) => (
  <h3 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-typography-500">
    {children}
  </h3>
);
