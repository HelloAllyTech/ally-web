import { useMemo, useState } from "react";

import { LineChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetRoleplayCostQuery } from "@api";

import { PLATFORM_WIDE_NOTE, windowLabel } from "../analyticsFilters";
import {
  bucketTitle,
  groupingNote,
  inProgressCaption,
  withoutInProgress,
} from "../analyticsGrouping";
import { defaultControlsFor, RANGE_SHORT, RangePicker, useChartControls } from "../chartControls";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTile,
  ScrollableChart,
  buildSource,
  lineOpts,
  stackedBarOpts,
} from "../chartKit";
import {
  COST_AREA_SCALE,
  COST_SERVICE_SCALE,
  COST_SPLITS,
  CostSplit,
  UNIT_COST_SCALE,
  attributableSharePct,
  buildCostByAreaSeries,
  buildCostByServiceSeries,
  buildUnitCostSeries,
  formatUsd,
  unpricedNote,
} from "../unitCostChart";

type ChartId = "unitCost" | "costSplit";

const CHARTS: readonly ChartId[] = ["unitCost", "costSplit"];

/**
 * What ten minutes of roleplay costs us.
 *
 * The unit-economics question the existing "cost per completed simulation" chart
 * cannot answer: a simulation is not a fixed amount of product, so that figure
 * moves whenever session length moves and a reader cannot tell efficiency from
 * behaviour. Per-minute normalises that away.
 *
 * ## What is in the numerator, and what is deliberately not
 *
 * Only spend a LEARNER caused: the live agent's turns, its speech recognition
 * and its voice; the evaluation, summary and memory fold that follow a session;
 * quiz grading. Judges, studio authoring, copilot, translation and internal
 * tooling are real money and are reported SEPARATELY, not shared out — averaging
 * them in would make practice look more expensive in a week when nobody practised
 * but somebody authored ten scenarios.
 *
 * The tab therefore states, on its face, what share of total AI spend the unit
 * cost actually covers. A reader who takes "$0.02 per 10 minutes" for the whole
 * AI bill has been misled by omission.
 *
 * ## Why every number here says "estimate"
 *
 * Cost is derived at read time from a hand-maintained price list that ignores
 * prompt-cache discounts and negotiated rates. Worse, calls whose model has no
 * price entry contribute $0 — so the total is an UNDERSTATEMENT by an unknown
 * amount whenever `unpricedCalls` is non-zero, and the caption says so rather
 * than presenting an incomplete figure as complete.
 *
 * USD only: there is no exchange-rate source in the platform, and inventing one
 * would put a second layer of estimate on top of the first.
 */
/**
 * Takes no props: every figure on this panel is platform-wide by construction
 * (`llm_usage` is largely tenantless, so a tenant-filtered cost would be a
 * fraction of real spend presented as the whole). Accepting a tenant filter it
 * could not honour would be a control that silently does nothing.
 */
export const UnitEconomicsSubTab = () => {
  const [split, setSplit] = useState<CostSplit>("area");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { controlsFor, setRange, setBucket, hydrating } = useChartControls<ChartId>(
    "highlights.cost",
    // Both charts open monthly: the numerator is spend and the denominator is
    // practice minutes, and on a daily axis one long session whose evaluation
    // landed after midnight visibly moves the ratio.
    defaultControlsFor(CHARTS, {
      unitCost: { bucket: "month" },
      costSplit: { bucket: "month" },
    }),
  );

  const unitControls = controlsFor("unitCost");
  const splitControls = controlsFor("costSplit");

  // Two hooks, one per chart, each with its own window and grain. RTK Query
  // dedupes them into a single request whenever the two happen to agree — which
  // is the common case, since they open on the same defaults.
  const unitCost = useGetRoleplayCostQuery(
    { range: unitControls.range, bucket: unitControls.bucket },
    { skip: hydrating },
  );
  const splitCost = useGetRoleplayCostQuery(
    { range: splitControls.range, bucket: splitControls.bucket },
    { skip: hydrating },
  );

  const u = unitCost.data;
  const c = splitCost.data;

  // The still-accruing period comes off the PLOT only; the detail table and the
  // export below read the full arrays and flag that row.
  const unitPoints = useMemo(
    () => withoutInProgress(u?.points ?? [], p => p.bucket, u?.window.inProgressBucket),
    [u],
  );
  const unitSeries = useMemo(() => buildUnitCostSeries(unitPoints), [unitPoints]);

  const splitPoints = useMemo(
    () => withoutInProgress(c?.points ?? [], p => p.bucket, c?.window.inProgressBucket),
    [c],
  );
  const splitSeries = useMemo(
    () =>
      split === "area" ? buildCostByAreaSeries(splitPoints) : buildCostByServiceSeries(splitPoints),
    [splitPoints, split],
  );

  const attributableShare = attributableSharePct(u);
  const asOf = u?.computedAt ? new Date(u.computedAt).toLocaleDateString() : undefined;
  const splitMeta = COST_SPLITS.find(s => s.key === split) ?? COST_SPLITS[0];

  const splitPicker = (
    <div className="w-32 shrink-0">
      <Dropdown
        id="cost-split"
        size="sm"
        titleText="Split"
        hideLabel
        label="Split"
        items={COST_SPLITS.map(s => ({ id: s.key, label: s.label }))}
        selectedItem={{ id: splitMeta.key, label: splitMeta.label }}
        itemToString={item => item?.label ?? ""}
        onChange={({ selectedItem }) => {
          if (selectedItem) setSplit(selectedItem.id as CostSplit);
        }}
      />
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiTile
          label={`USD per ${u?.perMinutes ?? 10} min of practice`}
          value={formatUsd(u?.overallCostPer10MinUsd)}
          loading={hydrating || (unitCost.isLoading && !u)}
          error={Boolean(unitCost.error)}
          onRetry={() => void unitCost.refetch()}
          description="Learner-caused AI spend over practice minutes, across the window."
        />

        <KpiTile
          label="Learner-caused AI spend"
          value={formatUsd(u?.totalAttributableCostUsd)}
          loading={hydrating || (unitCost.isLoading && !u)}
          error={Boolean(unitCost.error)}
          onRetry={() => void unitCost.refetch()}
          description="Live roleplay, feedback and quiz grading."
        />

        <KpiTile
          label="Other AI spend"
          value={formatUsd(u?.totalExcludedCostUsd)}
          loading={hydrating || (unitCost.isLoading && !u)}
          error={Boolean(unitCost.error)}
          onRetry={() => void unitCost.refetch()}
          description="Judges, authoring, copilot, translation, internal tooling. Excluded from the ratio."
        />

        <KpiTile
          label="Practice minutes"
          value={u ? Math.round(u.totalPracticeMinutes).toLocaleString() : "—"}
          loading={hydrating || (unitCost.isLoading && !u)}
          error={Boolean(unitCost.error)}
          onRetry={() => void unitCost.refetch()}
          description="The denominator — the same measurement the practice-minutes chart uses."
        />
      </div>

      {attributableShare !== null && (
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-typography-500">
          The unit cost covers <strong>{attributableShare}%</strong> of all AI spend in this window.
          The rest is not caused by anyone practising, so it is reported beside the ratio rather
          than shared into it.
        </p>
      )}

      <div className="mt-6">
        <ChartCard
          title={`AI cost per ${u?.perMinutes ?? 10} minutes of roleplay`}
          caption={
            `Learner-caused AI spend divided by practice minutes. A period with no ` +
            `practice has NO unit cost and breaks the line — a ratio with no ` +
            `denominator is not zero.` +
            inProgressCaption(unitControls.bucket, u?.window.inProgressBucket) +
            unpricedNote(u)
          }
          source={buildSource({
            derivation: "Priced llm_usage (LLM + STT + TTS) / user_daily_scores minutes",
            window: `${RANGE_SHORT[unitControls.range]}, ${groupingNote(unitControls.bucket)}`,
            asOf,
            extra: `estimate · USD · ${PLATFORM_WIDE_NOTE}`,
          })}
          loading={hydrating || (unitCost.isLoading && !u)}
          error={Boolean(unitCost.error)}
          empty={!unitCost.isLoading && !unitSeries.some(d => d.value !== null)}
          emptyText="No practice in this window, so there is no unit cost"
          errorSubtitle="There was a problem fetching cost metrics."
          onRetry={() => void unitCost.refetch()}
          controls={
            <div className="flex items-center gap-2">
              <RangePicker
                id="unit-cost-range"
                value={unitControls.range}
                onChange={range => setRange("unitCost", range)}
              />
              <GroupingPicker
                id="unit-cost-grouping"
                value={unitControls.bucket}
                onChange={bucket => setBucket("unitCost", bucket)}
              />
            </div>
          }
          onExpand={() => setExpanded("unitCost")}
          wide
        >
          <ScrollableChart data={unitSeries}>
            <LineChart
              data={unitSeries}
              options={lineOpts({
                colorScale: UNIT_COST_SCALE,
                leftTitle: `USD per ${u?.perMinutes ?? 10} min`,
                bottomTitle: bucketTitle(unitControls.bucket),
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      <div className="mt-4">
        {/* Stacked, unlike the ladder series: the three areas (and the three
            services) each PARTITION attributable spend, so they genuinely sum to
            the total and a stack is the honest reading. */}
        <ChartCard
          title="Where the spend goes"
          caption={
            `Learner-caused AI spend ${splitMeta.description}. The parts sum to the ` +
            `total, so the stack is exact rather than indicative.` +
            inProgressCaption(splitControls.bucket, c?.window.inProgressBucket) +
            unpricedNote(c)
          }
          source={buildSource({
            derivation: "Priced llm_usage, grouped by task and service",
            window: `${RANGE_SHORT[splitControls.range]}, ${groupingNote(splitControls.bucket)}`,
            asOf: c?.computedAt ? new Date(c.computedAt).toLocaleDateString() : undefined,
            extra: `estimate · USD · ${PLATFORM_WIDE_NOTE}`,
          })}
          loading={hydrating || (splitCost.isLoading && !c)}
          error={Boolean(splitCost.error)}
          empty={!splitCost.isLoading && !splitSeries.some(d => (d.value ?? 0) > 0)}
          emptyText="No learner-caused AI spend in this window"
          errorSubtitle="There was a problem fetching cost metrics."
          onRetry={() => void splitCost.refetch()}
          controls={
            <div className="flex items-center gap-2">
              {splitPicker}
              <RangePicker
                id="cost-split-range"
                value={splitControls.range}
                onChange={range => setRange("costSplit", range)}
              />
              <GroupingPicker
                id="cost-split-grouping"
                value={splitControls.bucket}
                onChange={bucket => setBucket("costSplit", bucket)}
              />
            </div>
          }
          onExpand={() => setExpanded("costSplit")}
          wide
        >
          <ScrollableChart data={splitSeries}>
            <StackedBarChart
              data={splitSeries}
              options={stackedBarOpts({
                colorScale: split === "area" ? COST_AREA_SCALE : COST_SERVICE_SCALE,
                leftTitle: "USD",
                bottomTitle: bucketTitle(splitControls.bucket),
                legend: true,
              })}
            />
          </ScrollableChart>
        </ChartCard>
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-typography-500">
        {u?.estimateNote}
      </p>

      <ChartDetailModal
        open={expanded === "unitCost"}
        onClose={() => setExpanded(null)}
        title={`AI cost per ${u?.perMinutes ?? 10} minutes of roleplay`}
        caption="The ratio with both of its inputs, so a move can be attributed to one of them."
        render={({ height }) => (
          <LineChart
            data={unitSeries}
            options={lineOpts({
              colorScale: UNIT_COST_SCALE,
              leftTitle: `USD per ${u?.perMinutes ?? 10} min`,
              bottomTitle: bucketTitle(unitControls.bucket),
              height,
            })}
          />
        )}
        table={{
          columns: [
            bucketTitle(unitControls.bucket),
            `USD per ${u?.perMinutes ?? 10} min`,
            "Learner-caused spend",
            "Practice minutes",
            "Other AI spend",
            "Unpriced calls",
            "Provisional",
          ],
          rows: (u?.points ?? []).map(p => [
            p.bucket,
            p.costPer10MinUsd === null ? "—" : formatUsd(p.costPer10MinUsd),
            formatUsd(p.attributableCostUsd),
            Math.round(p.practiceMinutes),
            formatUsd(p.excludedCostUsd),
            p.unpricedCalls,
            p.bucket === u?.window.inProgressBucket ? "still accruing" : "",
          ]),
        }}
        exportContext={[
          u?.estimateNote ?? "",
          "Only learner-caused AI spend is in the ratio; other spend is a separate column",
          `Window: ${windowLabel(u?.window) ?? ""}`,
        ].filter(Boolean)}
        exportFilename="roleplay-unit-cost"
      />

      <ChartDetailModal
        open={expanded === "costSplit"}
        onClose={() => setExpanded(null)}
        title="Where the spend goes"
        caption="Both splits of the same total, side by side."
        render={({ height }) => (
          <StackedBarChart
            data={splitSeries}
            options={stackedBarOpts({
              colorScale: split === "area" ? COST_AREA_SCALE : COST_SERVICE_SCALE,
              leftTitle: "USD",
              bottomTitle: bucketTitle(splitControls.bucket),
              legend: true,
              height,
            })}
          />
        )}
        table={{
          columns: [
            bucketTitle(splitControls.bucket),
            "Live roleplay",
            "Feedback & summary",
            "Quiz grading",
            "LLM",
            "Speech-to-text",
            "Text-to-speech",
            "Total",
          ],
          rows: (c?.points ?? []).map(p => [
            p.bucket,
            formatUsd(p.breakdown.roleplay),
            formatUsd(p.breakdown.feedback),
            formatUsd(p.breakdown.quiz),
            formatUsd(p.breakdown.llm),
            formatUsd(p.breakdown.stt),
            formatUsd(p.breakdown.tts),
            formatUsd(p.attributableCostUsd),
          ]),
        }}
        exportContext={[
          c?.estimateNote ?? "",
          "Areas and services are two splits of the same attributable total",
        ].filter(Boolean)}
        exportFilename="roleplay-cost-split"
      />
    </>
  );
};
