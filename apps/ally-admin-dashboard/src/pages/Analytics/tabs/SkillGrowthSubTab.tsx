import { useMemo, useState } from "react";

import { LineChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetSkillGrowthLearnersQuery, useGetSkillGrowthQuery } from "@api";
import { SkillGrowthLearnersQuery } from "@types";

import { AnalyticsTabFilters, asOfStamp } from "../analyticsFilters";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  KpiTile,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  lineOpts,
  stackedBarOpts,
} from "../chartKit";
import { LearnerSkillPanel } from "../LearnerSkillPanel";
import {
  MIN_LEARNERS_FOR_SHARE,
  TREND_LABELS,
  TREND_SCALE,
  buildTrendMixSeries,
  classifiedShareValue,
  formatDelta,
  learnerName,
  learnerTableRows,
  trendMixTakeaway,
} from "../skillGrowthChart";
import {
  SKILL_GROWTH_VARIANTS,
  SkillGrowthVariant,
  SKILL_GROWTH_SCALE,
  buildSkillGrowthSeries,
  ordinalLabel,
  plottableOrdinals,
  skillGrowthTakeaway,
} from "../testingChart";

const PAGE_SIZE = 20;

const SORT_ITEMS: { id: NonNullable<SkillGrowthLearnersQuery["sort"]>; label: string }[] = [
  { id: "delta", label: "Biggest movers" },
  { id: "evaluatedSessions", label: "Most sessions" },
  { id: "lastSessionAt", label: "Most recent" },
];

/**
 * Skill growth — does practising on this platform make people better?
 *
 * Three altitudes of ONE question, which is why they share a sub-tab rather
 * than being scattered across Highlights:
 *
 *  1. **The curve** — the population's median score at each learner's Nth
 *     session. Answers "does the product work" and nothing about any person.
 *  2. **The mix** — how many individuals improved against their OWN baseline.
 *     The curve cannot answer this: it is a median, so one learner climbing
 *     while another slides nets out of it entirely, and a platform where half
 *     improve and half decline draws the same flat line as one where nobody
 *     changes.
 *  3. **The learner** — one person's timeline, opened from the list.
 *
 * ## Self against self, never learner against learner
 *
 * Nothing here ranks people. The list sorts by movement so a leader can find
 * who needs coaching, but the movement is always a learner against their own
 * first sessions, and no cohort median or percentile is shown beside it. That
 * was a deliberate framing choice: a mastery-oriented view sustains practice,
 * where a peer ranking discourages exactly the learners who most need to keep
 * going.
 *
 * ## All-time, and no date picker
 *
 * Both aggregate charts are indexed to each learner's own history rather than
 * to the calendar, so a window would not narrow them — it would change what
 * they mean. The one calendar axis on the tab (the mix by month) buckets
 * learners by when they became CLASSIFIABLE, so each person appears in exactly
 * one bar and the bars sum to the population.
 */
export const SkillGrowthSubTab = ({ query }: AnalyticsTabFilters) => {
  const tenantId = query.tenantId;
  const tenantOnly = useMemo(() => ({ tenantId }), [tenantId]);

  const [variant, setVariant] = useState<SkillGrowthVariant>("all");
  const [sort, setSort] = useState<NonNullable<SkillGrowthLearnersQuery["sort"]>>("delta");
  const [offset, setOffset] = useState(0);
  const [openLearner, setOpenLearner] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const growth = useGetSkillGrowthQuery(tenantOnly);
  const learners = useGetSkillGrowthLearnersQuery({
    tenantId,
    limit: PAGE_SIZE,
    offset,
    sort,
    order: sort === "delta" ? "desc" : "desc",
  });

  const data = growth.data;
  const mix = data?.trendMix;
  const domain = data?.scoreDomain ?? [0, 100];

  const curveSeries = useMemo(
    () => buildSkillGrowthSeries(data?.ordinals ?? [], variant),
    [data?.ordinals, variant],
  );
  const mixSeries = useMemo(() => buildTrendMixSeries(mix?.months ?? []), [mix?.months]);

  const curveOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: "Learner's Nth evaluated session",
        colorScale: SKILL_GROWTH_SCALE,
        domain,
      }),
    [domain],
  );

  const mixOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Learners",
        bottomTitle: "Month they reached enough sessions to classify",
        colorScale: TREND_SCALE,
      }),
    [],
  );

  const asOf = asOfStamp(data?.computedAt);
  const curveSource = buildSource({
    derivation: data?.provenance.derivation ?? "LLM judge composite score",
    window: "all time",
    n: data?.summary.evaluatedSessions,
    nUnit: "evaluated sessions",
    asOf,
  });
  const mixSource = buildSource({
    derivation: mix
      ? `last ${mix.thresholds.window} sessions vs first ${mix.thresholds.window}, flat within ±${mix.thresholds.flatBand} points`
      : "own-baseline comparison",
    window: "all time",
    n: mix?.classifiedLearners,
    nUnit: "classified learners",
    asOf,
  });

  const rows = learners.data?.rows ?? [];
  const total = learners.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip: the two numbers the rest of the tab elaborates. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Learners improving"
          description={
            mix
              ? `Share of learners with ${mix.thresholds.minSessions}+ evaluated sessions scoring above their own first ${mix.thresholds.window}`
              : "Against their own first sessions"
          }
          value={mix ? classifiedShareValue(mix) : "—"}
          n={mix?.classifiedLearners}
          nUnit="classified learners"
          minN={MIN_LEARNERS_FOR_SHARE}
          loading={growth.isLoading}
        />
        <KpiTile
          label="Classified learners"
          description={
            mix
              ? `Have reached ${mix.thresholds.minSessions} evaluated sessions; ${mix.insufficientLearners} have fewer`
              : "Enough history to read a trend"
          }
          value={mix ? mix.classifiedLearners.toLocaleString() : "—"}
          loading={growth.isLoading}
        />
        <KpiTile
          label="Median first session"
          description="Where learners start, before any practice on the platform"
          value={
            data?.summary.firstOrdinalMedian !== null &&
            data?.summary.firstOrdinalMedian !== undefined
              ? String(data.summary.firstOrdinalMedian)
              : "—"
          }
          loading={growth.isLoading}
        />
        <KpiTile
          label="Evaluated sessions"
          description="Judged sessions behind every number on this tab"
          value={data ? data.summary.evaluatedSessions.toLocaleString() : "—"}
          loading={growth.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 1. The population curve. */}
        <ChartCard
          title="Score by Nth evaluated session"
          caption={`The platform's median score at each learner's own Nth session. All time — an ordinal is a position in someone's history, not a date. ${boundedDomainNote(domain)}`}
          source={curveSource}
          takeaway={
            data ? skillGrowthTakeaway(data.ordinals, variant, data.minSampleSize) : undefined
          }
          loading={growth.isLoading}
          error={growth.isError}
          empty={!growth.isLoading && curveSeries.length === 0}
          emptyText="No evaluated sessions yet"
          onRetry={growth.refetch}
          onExpand={() => setExpanded("curve")}
          controls={
            <Dropdown
              id="skill-growth-variant"
              size="sm"
              type="inline"
              label="Population"
              titleText=""
              hideLabel
              items={SKILL_GROWTH_VARIANTS}
              itemToString={(i: (typeof SKILL_GROWTH_VARIANTS)[number]) => i?.label ?? ""}
              selectedItem={SKILL_GROWTH_VARIANTS.find(v => v.key === variant)}
              onChange={({
                selectedItem,
              }: {
                selectedItem: (typeof SKILL_GROWTH_VARIANTS)[number];
              }) => selectedItem && setVariant(selectedItem.key)}
            />
          }
        >
          <ScrollableChart data={curveSeries}>
            <LineChart data={curveSeries} options={curveOpts} />
          </ScrollableChart>
        </ChartCard>

        {/* 2. The mix — the per-person answer the median hides. */}
        <ChartCard
          title="Learners improving, holding steady or declining"
          caption={
            mix
              ? `Each learner against their OWN baseline: mean of their last ${mix.thresholds.window} evaluated sessions vs their first ${mix.thresholds.window}, counted flat within ±${mix.thresholds.flatBand} points. Bucketed by the month they reached ${mix.thresholds.minSessions} sessions, so each learner appears once.`
              : "Each learner against their own first sessions."
          }
          source={mixSource}
          takeaway={mix ? trendMixTakeaway(mix) : undefined}
          loading={growth.isLoading}
          error={growth.isError}
          empty={!growth.isLoading && mixSeries.length === 0}
          emptyText="No learner has enough evaluated sessions to classify yet"
          onRetry={growth.refetch}
          onExpand={() => setExpanded("mix")}
        >
          <ScrollableChart data={mixSeries}>
            <StackedBarChart data={mixSeries} options={mixOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* 3. The learner list — the drill-down. */}
      <ChartCard
        title="Learners"
        caption="Every learner with an evaluated session, and how their own scores moved. Select a learner for their full timeline. No cross-learner ranking is shown — the movement is always against that person's own first sessions."
        source={buildSource({
          derivation: "own-baseline movement per learner",
          window: "all time",
          n: total,
          nUnit: "learners",
          asOf: asOfStamp(learners.data?.computedAt),
        })}
        loading={learners.isLoading}
        error={learners.isError}
        empty={!learners.isLoading && rows.length === 0}
        emptyText="No learners with an evaluated session yet"
        onRetry={learners.refetch}
        onExpand={() => setExpanded("learners")}
        controls={
          <Dropdown
            id="skill-growth-sort"
            size="sm"
            type="inline"
            label="Sort"
            titleText=""
            hideLabel
            items={SORT_ITEMS}
            itemToString={(i: (typeof SORT_ITEMS)[number]) => i?.label ?? ""}
            selectedItem={SORT_ITEMS.find(s => s.id === sort)}
            onChange={({ selectedItem }: { selectedItem: (typeof SORT_ITEMS)[number] }) => {
              if (!selectedItem) return;
              setSort(selectedItem.id);
              // A re-sort with a stale offset shows page 3 of a different
              // ordering, which reads as missing rows.
              setOffset(0);
            }}
          />
        }
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-typography-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Learner</th>
                <th className="py-2 pr-3 font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">First → last</th>
                <th className="py-2 pr-3 font-medium">Change</th>
                <th className="py-2 pr-3 font-medium">Trend</th>
                <th className="py-2 font-medium">Last session</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.learnerId} className="border-t border-[#e0e0e0]">
                  <td className="py-2 pr-3">
                    {/* The named control is the button in the cell, not the row:
                        a role="button" on a <TableRow> yields unnamed buttons. */}
                    <button
                      type="button"
                      className="cursor-pointer text-left text-[#264D8E] underline-offset-2 hover:underline"
                      onClick={() => setOpenLearner(r.learnerId)}
                    >
                      {learnerName(r)}
                    </button>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{r.evaluatedSessions}</td>
                  <td className="py-2 pr-3 tabular-nums text-typography-500">
                    {r.firstWindowMean === null
                      ? "—"
                      : `${r.firstWindowMean} → ${r.lastWindowMean}`}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{formatDelta(r.delta)}</td>
                  <td className="py-2 pr-3">{TREND_LABELS[r.trend]}</td>
                  <td className="py-2 text-typography-500">
                    {r.lastSessionAt ? r.lastSessionAt.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between text-xs text-typography-500">
            <span>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="cursor-pointer disabled:cursor-default disabled:opacity-40"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                type="button"
                className="cursor-pointer disabled:cursor-default disabled:opacity-40"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </span>
          </div>
        )}
      </ChartCard>

      {data && (
        <p className="max-w-4xl text-[11px] leading-relaxed text-typography-500">
          {data.provenance.note}
        </p>
      )}

      <ChartDetailModal
        open={expanded === "curve"}
        onClose={() => setExpanded(null)}
        title="Score by Nth evaluated session"
        caption="Median with the interquartile range, at each learner's own Nth judged session."
        source={curveSource}
        render={({ height }) => <LineChart data={curveSeries} options={{ ...curveOpts, height }} />}
        table={{
          columns: ["Session", "Median", "p25", "p75", "n"],
          rows: plottableOrdinals(data?.ordinals ?? [], variant).map(o => [
            ordinalLabel(o.ordinal),
            o[variant].median,
            o[variant].p25,
            o[variant].p75,
            o[variant].n,
          ]),
        }}
        exportContext={[data?.provenance.note ?? ""]}
        exportFilename="skill-growth-curve"
      />

      <ChartDetailModal
        open={expanded === "mix"}
        onClose={() => setExpanded(null)}
        title="Learners improving, holding steady or declining"
        caption="Each learner against their own baseline, bucketed by the month they became classifiable."
        source={mixSource}
        render={({ height }) => (
          <StackedBarChart data={mixSeries} options={{ ...mixOpts, height }} />
        )}
        table={{
          columns: ["Month", "Improving", "Holding steady", "Declining"],
          rows: (mix?.months ?? []).map(m => [m.month, m.improving, m.flat, m.declining]),
        }}
        exportContext={[
          mix
            ? `Classified against own baseline: last ${mix.thresholds.window} vs first ${mix.thresholds.window} evaluated sessions, flat within ±${mix.thresholds.flatBand} points, minimum ${mix.thresholds.minSessions} sessions.`
            : "",
          data?.provenance.note ?? "",
        ]}
        exportFilename="skill-improvement-mix"
      />

      <ChartDetailModal
        open={expanded === "learners"}
        onClose={() => setExpanded(null)}
        title="Learners"
        caption="Own-baseline movement per learner. This page only."
        render={() => null}
        table={{
          columns: [
            "Learner",
            "Evaluated sessions",
            "First window mean",
            "Last window mean",
            "Change",
            "Trend",
            "Last session",
          ],
          rows: learnerTableRows(rows),
        }}
        exportContext={[data?.provenance.note ?? ""]}
        exportFilename="skill-growth-learners"
      />

      <LearnerSkillPanel learnerId={openLearner} onClose={() => setOpenLearner(null)} />
    </div>
  );
};
