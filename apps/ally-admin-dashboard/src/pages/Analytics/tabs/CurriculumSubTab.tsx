import { useMemo, useState } from "react";

import { SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { useGetLanguageMixQuery, useGetScenarioUsageQuery, useGetTrackDropoffQuery } from "@api";
import { AnalyticsBucket } from "@types";

import { AnalyticsTabFilters, asOf, asOfStamp, windowLabel } from "../analyticsFilters";
import {
  DEFAULT_GROUPING,
  bucketTitle,
  groupingNote,
  inProgressCaption,
  isBusy,
  isInProgress,
  useChartGrouping,
  useGrainQueries,
  withoutInProgress,
} from "../analyticsGrouping";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  hBarOpts,
  stackedBarOpts,
} from "../chartKit";
import { CONTEXT, PALETTE } from "../chartScales";
import {
  PCT_DOMAIN,
  buildItemTypeBars,
  buildItemTypeScale,
  buildLanguageMixScale,
  buildLanguageMixSeries,
  itemTypeLabel,
  itemTypeTakeaway,
  suppressedItemTypes,
} from "../testingChart";

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/**
 * The one chart here with a time axis. Track drop-off is a lifetime rate per
 * format and the scenario rankings are all-time counts: neither has a period to
 * re-grain, and a control that changes nothing reads as a control that is broken.
 */
type ChartId = "languageMix";

const DEFAULT_GROUPINGS: Record<ChartId, AnalyticsBucket> = { languageMix: DEFAULT_GROUPING };

/**
 * Curriculum — what learners practise, and what they finish.
 *
 * Content questions rather than learner questions: the sibling sub-tabs ask how
 * far people get and how well they do, and this one asks what the platform put
 * in front of them. Format completion and scenario demand are the two levers a
 * content owner can actually pull, so they sit together rather than beside the
 * outcome panels they influence.
 *
 * Language mix is here for the same reason: it is a statement about which
 * catalogue is being used, not about how well any session went. The judge-based
 * per-language error rates stay on the Language tab, which is where a quality
 * question belongs.
 *
 * All-time by default, with a grain control on the one series that has a time
 * axis — the convention this whole tab follows.
 */
export const CurriculumSubTab = ({ query }: AnalyticsTabFilters) => {
  const { groupingFor, setGrouping } = useChartGrouping<ChartId>(
    DEFAULT_GROUPINGS,
    DEFAULT_GROUPING,
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const grain = { languageMix: groupingFor("languageMix") };

  const languageQ = useGrainQueries(useGetLanguageMixQuery, query, new Set([grain.languageMix]));
  const languageMix = languageQ[grain.languageMix];

  // All-time endpoints: their quantity is a lifetime measure, so a window would
  // change what is being counted rather than narrow it.
  const tenantOnly = useMemo(() => ({ tenantId: query.tenantId }), [query.tenantId]);
  const trackDropoff = useGetTrackDropoffQuery(tenantOnly);
  const scenarioUsage = useGetScenarioUsageQuery(tenantOnly);

  const picker = (chart: ChartId) => (
    <GroupingPicker
      id={`curriculum-grouping-${chart}`}
      value={groupingFor(chart)}
      onChange={g => setGrouping(chart, g)}
    />
  );

  /* ------------------------------ plotted series --------------------------- */

  const td = trackDropoff.data;
  const itemBars = useMemo(() => buildItemTypeBars(td?.itemTypes ?? []), [td]);
  const itemScale = useMemo(() => buildItemTypeScale(itemBars), [itemBars]);
  const itemHeld = useMemo(() => suppressedItemTypes(td?.itemTypes ?? []), [td]);

  const lm = languageMix.data;
  const languageInProgress = lm?.window.inProgressBucket;
  const languageTotals = useMemo(
    () => withoutInProgress(lm?.bucketTotals ?? [], t => t.bucket, languageInProgress),
    [lm, languageInProgress],
  );
  const languageSeries = useMemo(
    () => buildLanguageMixSeries(lm?.labels ?? [], lm?.points ?? [], languageTotals),
    [lm, languageTotals],
  );
  const languageScaleMap = useMemo(() => buildLanguageMixScale(lm?.labels ?? []), [lm]);

  // Platform-wide most/least-used scenarios — the org-scoped sibling lives on
  // the tenant-admin Organization Metrics dashboard, not here. Horizontal bars,
  // one row per scenario, matching the "top orgs" ranking chart: a ranking is
  // read down a sorted list, not off value labels on every bar.
  const su = scenarioUsage.data;
  const mostUsedBars = useMemo(
    () => (su?.mostUsed ?? []).map(r => ({ group: r.title, value: r.sessionCount })),
    [su],
  );
  const leastUsedBars = useMemo(
    () => (su?.leastUsed ?? []).map(r => ({ group: r.title, value: r.sessionCount })),
    [su],
  );
  // Highlight the notable row (the biggest/smallest), grey the rest: the order
  // is the point, not which bar is which colour.
  const rankingScale = (bars: { group: string }[]) =>
    bars.reduce<Record<string, string>>(
      (acc, b, i) => ({ ...acc, [b.group]: i === 0 ? PALETTE.blue : CONTEXT.line }),
      {},
    );
  const mostUsedScale = useMemo(() => rankingScale(mostUsedBars), [mostUsedBars]);
  const leastUsedScale = useMemo(() => rankingScale(leastUsedBars), [leastUsedBars]);

  /* --------------------------------- options ------------------------------- */

  const itemOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Completed of reached (%)",
        colorScale: itemScale,
        domain: PCT_DOMAIN,
      }),
    [itemScale],
  );
  const languageOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of sessions (%)",
        bottomTitle: bucketTitle(grain.languageMix),
        colorScale: languageScaleMap,
        domain: PCT_DOMAIN,
      }),
    [grain.languageMix, languageScaleMap],
  );

  const rowKey = (bucket: string, inProgress?: string | null) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  return (
    <div className="flex flex-col gap-4">
      {/* --------------------------- Track content -------------------------- */}
      <SubHeading>Track content</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Track drop-off by item format"
          caption={`Of the track items learners actually reached, the share they finished — by format, in the platform's own order. Position in a track is confounded with format; format is the lever anyone can pull.${
            itemHeld.length > 0
              ? ` ${itemHeld.length} format${itemHeld.length === 1 ? "" : "s"} not plotted: too few learners to state a rate over identifiable people. Sizes are in the expanded view.`
              : ""
          }`}
          source={buildSource({
            derivation: "track_item_progress completed / reached, by item type",
            window: "All time",
            n: td?.summary.learners,
            nUnit: "enrolled learners",
            asOf: asOfStamp(td?.computedAt),
          })}
          takeaway={itemTypeTakeaway(td?.itemTypes ?? [])}
          loading={trackDropoff.isLoading && !td}
          error={trackDropoff.isError}
          onRetry={trackDropoff.refetch}
          empty={!trackDropoff.isLoading && itemBars.length === 0}
          emptyText="No track progress recorded yet"
          onExpand={() => setExpanded("itemTypes")}
        >
          <SimpleBarChart data={itemBars} options={itemOpts} />
        </ChartCard>

        <ChartCard
          title="Language mix of completed sessions"
          caption={`Share of completed sessions by language — is the mix shifting? Shares hide their own base, so the session count per period travels in the expanded table. The tail beyond ${
            lm?.maxSeries ?? 8
          } languages is pooled into "Other" on the server, in grey with "Unknown".${inProgressCaption(
            grain.languageMix,
            languageInProgress,
          )}`}
          source={buildSource({
            derivation: "Completed sessions by configured language",
            window: windowLabel(lm?.window),
            n: lm?.summary.totalSessions,
            nUnit: "completed sessions",
            extra: groupingNote(grain.languageMix),
            asOf: asOf(lm?.window),
          })}
          loading={isBusy(languageMix)}
          error={languageMix.isError}
          onRetry={languageMix.refetch}
          empty={!isBusy(languageMix) && languageSeries.length === 0}
          controls={picker("languageMix")}
          onExpand={() => setExpanded("languageMix")}
        >
          <ScrollableChart data={languageSeries}>
            <StackedBarChart data={languageSeries} options={languageOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* -------------------------- Scenario usage -------------------------- */}
      <SubHeading>Scenario usage</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Most-practised scenarios"
          caption="Top scenarios by completed-session count, all-time, across every non-test tenant. The org-scoped sibling of this list lives on each tenant's Organization Metrics dashboard, not here."
          source={buildSource({
            derivation: "scenario_sessions grouped by scenario, completed, all time",
            window: "All time",
            asOf: asOfStamp(su?.computedAt),
          })}
          loading={scenarioUsage.isLoading && !su}
          error={scenarioUsage.isError}
          onRetry={scenarioUsage.refetch}
          empty={!scenarioUsage.isLoading && mostUsedBars.length === 0}
          emptyText="No completed sessions yet"
        >
          <ScrollableChart data={mostUsedBars} on="group">
            <SimpleBarChart
              data={mostUsedBars}
              options={hBarOpts({ bottomTitle: "Sessions", colorScale: mostUsedScale })}
            />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Least-practised scenarios"
          caption="Bottom scenarios by completed-session count, among scenarios with >=1 completed session — a never-completed scenario has no row to rank."
          source={buildSource({
            derivation: "scenario_sessions grouped by scenario, completed, all time",
            window: "All time",
            asOf: asOfStamp(su?.computedAt),
          })}
          loading={scenarioUsage.isLoading && !su}
          error={scenarioUsage.isError}
          onRetry={scenarioUsage.refetch}
          empty={!scenarioUsage.isLoading && leastUsedBars.length === 0}
          emptyText="No completed sessions yet"
        >
          <ScrollableChart data={leastUsedBars} on="group">
            <SimpleBarChart
              data={leastUsedBars}
              options={hBarOpts({ bottomTitle: "Sessions", colorScale: leastUsedScale })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ------------------------- Detail / export ------------------------ */}

      <ChartDetailModal
        open={expanded === "itemTypes"}
        onClose={() => setExpanded(null)}
        title="Track drop-off by item format"
        caption="Formats held back from the chart keep their counts here."
        source={buildSource({
          derivation: "track_item_progress completed / reached, by item type",
          window: "All time",
          n: td?.summary.learners,
          nUnit: "enrolled learners",
          asOf: asOfStamp(td?.computedAt),
        })}
        render={({ height }) => (
          <SimpleBarChart data={itemBars} options={{ ...itemOpts, height }} />
        )}
        table={{
          columns: ["Format", "Reached", "Completed", "Rate %", "Learners", "Plotted"],
          rows: (td?.itemTypes ?? []).map(r => [
            itemTypeLabel(r.type),
            r.reached,
            r.completed,
            r.belowFloor ? null : r.completionRatePct,
            r.learners,
            r.belowFloor
              ? `no — n = ${r.learners}, need ${td?.minGroupSize}`
              : r.completionRatePct === null
                ? "no — nothing reached"
                : "yes",
          ]),
        }}
        exportContext={[
          "Window: All time",
          `Rates are suppressed for formats with fewer than ${td?.minGroupSize ?? 5} learners; the counts still stand`,
        ]}
        exportFilename="track-dropoff-by-format"
      />

      <ChartDetailModal
        open={expanded === "languageMix"}
        onClose={() => setExpanded(null)}
        title="Language mix of completed sessions"
        caption="The session counts behind the shares — the denominator the stacked view hides."
        source={buildSource({
          derivation: "Completed sessions by configured language",
          window: windowLabel(lm?.window),
          extra: groupingNote(grain.languageMix),
          asOf: asOf(lm?.window),
        })}
        render={({ height }) => (
          <StackedBarChart data={languageSeries} options={{ ...languageOpts, height }} />
        )}
        table={{
          columns: [bucketTitle(grain.languageMix), ...(lm?.labels ?? []), "Total"],
          rows: (lm?.bucketTotals ?? []).map(t => [
            rowKey(t.bucket, languageInProgress),
            ...(lm?.labels ?? []).map(
              label =>
                (lm?.points ?? []).find(p => p.bucket === t.bucket && p.label === label)
                  ?.sessions ?? 0,
            ),
            t.sessions,
          ]),
        }}
        exportContext={[
          `Window: ${windowLabel(lm?.window)}`,
          `Grouping: ${bucketTitle(grain.languageMix)}`,
          ...(languageInProgress
            ? [`${languageInProgress} is still accruing — provisional, and omitted from the chart`]
            : []),
          `Languages beyond the top ${(lm?.maxSeries ?? 8) - 1} are pooled into "Other"`,
        ]}
        exportFilename="language-mix"
      />
    </div>
  );
};
