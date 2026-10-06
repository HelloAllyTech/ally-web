import { useMemo, useState } from "react";

import { LineChart, ScatterChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetCompetencyMapQuery,
  useGetSkillGrowthLearnersQuery,
  useGetSkillGrowthQuery,
} from "@api";
import { SkillGrowthLearnersQuery } from "@types";

import { AnalyticsTabFilters, asOfStamp } from "../analyticsFilters";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  KpiTile,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  lineOpts,
  scatterOpts,
  stackedBarOpts,
} from "../chartKit";
import { LearnerSkillPanel } from "../LearnerSkillPanel";
import {
  MIN_LEARNERS_FOR_SHARE,
  TREND_LABELS,
  TREND_SCALE,
  bandSentence,
  buildTrendMixSeries,
  classifiedShareValue,
  formatBand,
  formatDelta,
  learnerName,
  learnerTableRows,
  trendMixTakeaway,
} from "../skillGrowthChart";
import {
  SKILL_GROWTH_VARIANTS,
  SkillGrowthVariant,
  SKILL_GROWTH_SCALE,
  buildCompetencyScatter,
  buildSkillGrowthSeries,
  competencyPointLabel,
  competencyScale,
  competencyTakeaway,
  formatCount,
  formatLevel,
  ordinalLabel,
  plottableOrdinals,
  skillGrowthTakeaway,
  unscoredCompetencyLines,
} from "../testingChart";

/**
 * The rubric's 1–4, used only until a response arrives — every plotted axis
 * reads `scoreDomain` off its own response.
 */
const DEFAULT_DOMAIN: [number, number] = [1, 4];

const PAGE_SIZE = 20;

const SORT_ITEMS: { id: NonNullable<SkillGrowthLearnersQuery["sort"]>; label: string }[] = [
  { id: "delta", label: "Biggest movers" },
  { id: "evaluatedSessions", label: "Most slices" },
  { id: "lastSessionAt", label: "Most recent" },
];

/**
 * The quiet line that has to be on the face of the tab, not in a doc: these
 * card ids and titles existed before 2026-10 measuring something else, and
 * screenshots of the old charts are in decks.
 */
export const SKILL_GROWTH_RULER_NOTE =
  "Until October 2026 these charts showed the AI judge's score of the AI client, not the learner. They now read the same helping-skills slices as the Helping skills tab, so earlier screenshots are not comparable.";

/**
 * Skill growth — does practising on this platform make people better?
 *
 * ## The ruler
 *
 * Since 2026-10 every number here is the LEARNER's helping-skills score: their
 * roleplay speech cut into 5,000-character slices, each slice scored 1–4 on the
 * fixed foundational helping skills rubric by an AI judge — the slices the
 * Helping skills sub-tab reads. Before that the same cards plotted the AI
 * judge's 0–100 score of the AI actor, which said nothing about the learner;
 * {@link SKILL_GROWTH_RULER_NOTE} says so on the face of the tab.
 *
 * Four altitudes of ONE question, which is why they share a sub-tab rather
 * than being scattered across Highlights:
 *
 *  1. **The curve** — the population's median score at each learner's Nth
 *     slice. Answers "does the product work" and nothing about any person.
 *  2. **The mix** — how many individuals improved against their OWN start.
 *     The curve cannot answer this: it is a median, so one learner climbing
 *     while another slides nets out of it entirely.
 *  3. **The competencies** — which skills the practice is actually landing on,
 *     volume against the learners' level on the skill each tag names.
 *  4. **The learner** — one person's timeline, opened from the list.
 *
 * ## Self against self, never learner against learner
 *
 * Nothing here ranks people. The list sorts by movement so a leader can find
 * who needs coaching, but the movement is always a learner against their own
 * first slices, and no cohort median or percentile is shown beside it.
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
  // All-time like the curve, and for the same reason: a competency total is a
  // lifetime count of practice, not a figure a window would narrow.
  const competencyMap = useGetCompetencyMapQuery(tenantOnly);
  const learners = useGetSkillGrowthLearnersQuery({
    tenantId,
    limit: PAGE_SIZE,
    offset,
    sort,
    order: "desc",
  });

  const data = growth.data;
  const mix = data?.trendMix;
  const domain = data?.scoreDomain ?? DEFAULT_DOMAIN;
  const variantDef = SKILL_GROWTH_VARIANTS.find(v => v.key === variant) ?? SKILL_GROWTH_VARIANTS[0];

  const curveSeries = useMemo(
    () => buildSkillGrowthSeries(data?.ordinals ?? [], variant),
    [data?.ordinals, variant],
  );
  const mixSeries = useMemo(() => buildTrendMixSeries(mix?.months ?? []), [mix?.months]);

  const cm = competencyMap.data;
  const cmDomain = cm?.scoreDomain ?? DEFAULT_DOMAIN;
  const cmMin = cm?.minSampleSize ?? MIN_N_FOR_SCORE;
  const competencyPoints = useMemo(() => buildCompetencyScatter(cm?.competencies ?? []), [cm]);
  const competencyUnscored = useMemo(
    () => unscoredCompetencyLines(cm?.competencies ?? [], cmMin),
    [cm, cmMin],
  );
  const competencyOpts = useMemo(
    () =>
      scatterOpts({
        leftTitle: `Mean skill level (${cmDomain[0]}–${cmDomain[1]})`,
        bottomTitle: "Completed sessions",
        colorScale: competencyScale(competencyPoints),
        domain: cmDomain,
        // The point's group is the skill it reads; say so in the tooltip.
        extra: { tooltip: { groupLabel: "Skill" } },
      }),
    [competencyPoints, cmDomain],
  );

  const curveOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: `Helping-skills score (${domain[0]}–${domain[1]})`,
        bottomTitle: "Learner's Nth scored slice",
        colorScale: SKILL_GROWTH_SCALE,
        domain,
      }),
    [domain],
  );

  const mixOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Learners",
        bottomTitle: "Month they reached enough slices to classify",
        colorScale: TREND_SCALE,
      }),
    [],
  );

  const asOf = asOfStamp(data?.computedAt);
  const curveSource = buildSource({
    derivation: data?.provenance.derivation ?? "Helping-skills score per scored slice",
    window: "all time",
    n: data?.summary.evaluatedSessions,
    nUnit: "scored slices",
    extra: data ? `rubric ${data.rubricVersion}` : undefined,
    asOf,
  });
  const mixSource = buildSource({
    derivation: "each learner's first half of scored slices vs their last half, noise-sized band",
    window: "all time",
    n: mix?.classifiedLearners,
    nUnit: "classified learners",
    asOf,
  });

  const cutAttribution = cm?.cutAttribution;
  const attributionNote = cutAttribution
    ? cutAttribution.singleScenarioPct === null
      ? ` Too few scored slices (${formatCount(cutAttribution.scoredCuts)}) to say how many ran a single scenario.`
      : ` ${cutAttribution.singleScenarioPct}% of scored slices ran a single scenario and can be credited to its tags; slices spanning scenarios are not counted here.`
    : "";
  const competencySource = buildSource({
    derivation:
      "Completed sessions per competency tag, against the mean level of the rubric skill it names over single-scenario slices",
    window: "All time",
    n: cutAttribution?.singleScenarioCuts,
    nUnit: "single-scenario slices",
    extra:
      cm && cm.unattributed.completedSessions > 0
        ? `${formatCount(cm.unattributed.completedSessions)} sessions ran scenarios with no competency tagged and are excluded`
        : undefined,
    asOf: asOfStamp(cm?.computedAt),
  });

  const rows = learners.data?.rows ?? [];
  const total = learners.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-4xl text-xs leading-relaxed text-typography-500">
        {SKILL_GROWTH_RULER_NOTE}
      </p>

      {/* KPI strip: the numbers the rest of the tab elaborates. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Learners improving"
          description={
            mix
              ? `Share of learners with ${mix.thresholds.minSessions}+ scored slices whose helping-skills score rose beyond slice-to-slice noise against their own start`
              : "Against their own first slices"
          }
          value={mix ? classifiedShareValue(mix) : "—"}
          n={mix?.classifiedLearners}
          nUnit="classified learners"
          minN={MIN_LEARNERS_FOR_SHARE}
          loading={growth.isLoading}
          error={growth.isError}
          onRetry={growth.refetch}
          chartId="AAQ-042"
        />
        <KpiTile
          label="Classified learners"
          description={
            mix
              ? `Have ${mix.thresholds.minSessions}+ scored slices and a noise estimate; ${mix.insufficientLearners} have fewer`
              : "Enough history to read a trend"
          }
          value={mix ? mix.classifiedLearners.toLocaleString() : "—"}
          loading={growth.isLoading}
          error={growth.isError}
          onRetry={growth.refetch}
          chartId="AAQ-043"
        />
        <KpiTile
          label="Median first slice"
          description={`Helping-skills score (${domain[0]}–${domain[1]}) of learners' first ${(data?.cutSizeLearnerChars ?? 5000).toLocaleString()} characters of roleplay speech — where they start`}
          value={formatLevel(data?.summary.firstOrdinalMedian)}
          loading={growth.isLoading}
          error={growth.isError}
          onRetry={growth.refetch}
          chartId="AAQ-044"
        />
        <KpiTile
          label="Scored slices"
          description="Helping-skills slices behind every number on this tab"
          value={data ? data.summary.evaluatedSessions.toLocaleString() : "—"}
          loading={growth.isLoading}
          error={growth.isError}
          onRetry={growth.refetch}
          chartId="AAQ-045"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 1. The population curve. */}
        <ChartCard
          title="Helping-skills score by Nth slice"
          caption={`Median helping-skills score with its interquartile range at each learner's own Nth slice — slice N is their Nth ${(data?.cutSizeLearnerChars ?? 5000).toLocaleString()} characters of roleplay speech, so every step is the same amount of practice. ${variantDef.label}: ${variantDef.description(data?.experiencedMinSessions ?? 0)}. All time — a slice is a position in someone's history, not a date. ${boundedDomainNote(domain)}`}
          source={curveSource}
          takeaway={
            data
              ? skillGrowthTakeaway(data.ordinals, variant, data.minSampleSize, domain)
              : undefined
          }
          loading={growth.isLoading}
          error={growth.isError}
          empty={!growth.isLoading && curveSeries.length === 0}
          emptyText="No slice index has scores from enough learners yet"
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
              selectedItem={variantDef}
              onChange={({
                selectedItem,
              }: {
                selectedItem: (typeof SKILL_GROWTH_VARIANTS)[number];
              }) => selectedItem && setVariant(selectedItem.key)}
            />
          }
          chartId="AAQ-046"
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
              ? `Each learner against their OWN start: the mean of the last half of their scored slices against the first half. ${bandSentence(mix.thresholds)} Bucketed by the month they reached ${mix.thresholds.minSessions} scored slices, so each learner appears once. Same learners and classes as the Helping skills tab.`
              : "Each learner against their own first slices."
          }
          source={mixSource}
          takeaway={mix ? trendMixTakeaway(mix) : undefined}
          loading={growth.isLoading}
          error={growth.isError}
          empty={!growth.isLoading && mixSeries.length === 0}
          emptyText="No learner has enough scored slices to classify yet"
          onRetry={growth.refetch}
          onExpand={() => setExpanded("mix")}
          chartId="AAQ-047"
        >
          <ScrollableChart data={mixSeries}>
            <StackedBarChart data={mixSeries} options={mixOpts} />
          </ScrollableChart>
        </ChartCard>

        {/* 3. WHERE the practice is landing. Wide, because a scatter needs the
            room to separate its points. Unscored competencies are listed
            under the plot by reason, never drawn at the bottom of the axis. */}
        <ChartCard
          wide
          title="Competency map — practice volume against learner skill level"
          caption={`One point per competency, named by the rubric skill it maps to: how much it is practised (completed sessions on scenarios carrying the tag) against the mean level learners reached on that skill, over slices practised wholly on one tagged scenario where the skill had a chance to show. High volume with a low level is a teaching gap; low volume is a coverage gap.${attributionNote} ${boundedDomainNote(cmDomain)}`}
          source={competencySource}
          takeaway={competencyTakeaway(cm?.competencies ?? [])}
          loading={competencyMap.isLoading && !cm}
          error={competencyMap.isError}
          onRetry={competencyMap.refetch}
          empty={!competencyMap.isLoading && (cm?.competencies.length ?? 0) === 0}
          emptyText="No scenario with a competency tag has been practised yet"
          onExpand={() => setExpanded("competency")}
          chartId="AAQ-048"
        >
          {competencyPoints.length > 0 ? (
            <ScatterChart data={competencyPoints} options={competencyOpts} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500">
              No competency yet has {cmMin} scored slices on its skill
            </div>
          )}
          {competencyUnscored.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-xs text-typography-500">
              {competencyUnscored.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      {/* 4. The learner list — the drill-down. */}
      <ChartCard
        title="Learners"
        caption="Every learner with a scored slice, and how their own helping-skills score moved: the mean of the last half of their slices against the first half, and the band that change had to clear (narrower the more slices they have). Select a learner for their slice-by-slice timeline. Sorted by movement, never by level — no learner is ranked against another."
        source={buildSource({
          derivation: "own first half vs last half of scored slices, per learner",
          window: "all time",
          n: total,
          nUnit: "learners",
          asOf: asOfStamp(learners.data?.computedAt),
        })}
        loading={learners.isLoading}
        error={learners.isError}
        empty={!learners.isLoading && rows.length === 0}
        emptyText="No learners with a scored slice yet"
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
        chartId="AAQ-049"
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-typography-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Learner</th>
                <th className="py-2 pr-3 font-medium">Slices</th>
                <th className="py-2 pr-3 font-medium">First half → last half</th>
                <th className="py-2 pr-3 font-medium">Change</th>
                <th className="py-2 pr-3 font-medium">Band</th>
                <th className="py-2 pr-3 font-medium">Trend</th>
                <th className="py-2 font-medium">Last slice</th>
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
                      : `${formatLevel(r.firstWindowMean)} → ${formatLevel(r.lastWindowMean)}`}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{formatDelta(r.delta)}</td>
                  <td className="py-2 pr-3 tabular-nums text-typography-500">
                    {formatBand(r.band)}
                  </td>
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
        title="Helping-skills score by Nth slice"
        caption="Median with the interquartile range, at each learner's own Nth scored slice. The n is the learners with a scored slice at that index."
        source={curveSource}
        render={({ height }) => <LineChart data={curveSeries} options={{ ...curveOpts, height }} />}
        table={{
          columns: ["Slice", "Median", "p25", "p75", "Learners"],
          rows: plottableOrdinals(data?.ordinals ?? [], variant).map(o => [
            ordinalLabel(o.ordinal),
            o[variant].median,
            o[variant].p25,
            o[variant].p75,
            o[variant].n,
          ]),
        }}
        exportContext={[
          `Helping-skills score, ${domain[0]}–${domain[1]}, rubric ${data?.rubricVersion ?? ""}`,
          SKILL_GROWTH_RULER_NOTE,
          data?.provenance.note ?? "",
        ]}
        exportFilename="skill-growth-curve"
      />

      <ChartDetailModal
        open={expanded === "mix"}
        onClose={() => setExpanded(null)}
        title="Learners improving, holding steady or declining"
        caption={
          mix
            ? `Each learner against their own start, bucketed by the month they became classifiable. ${mix.thresholds.bandRule}`
            : "Each learner against their own start, bucketed by the month they became classifiable."
        }
        source={mixSource}
        render={({ height }) => (
          <StackedBarChart data={mixSeries} options={{ ...mixOpts, height }} />
        )}
        table={{
          columns: ["Month", "Improving", "Holding steady", "Declining"],
          rows: (mix?.months ?? []).map(m => [m.month, m.improving, m.flat, m.declining]),
        }}
        exportContext={[
          mix ? `Classification rule: ${mix.thresholds.bandRule}` : "",
          SKILL_GROWTH_RULER_NOTE,
          data?.provenance.note ?? "",
        ]}
        exportFilename="skill-improvement-mix"
      />

      <ChartDetailModal
        open={expanded === "learners"}
        onClose={() => setExpanded(null)}
        title="Learners"
        caption="Own-start movement per learner, on the helping-skills score. This page only."
        render={() => null}
        table={{
          columns: [
            "Learner",
            "Scored slices",
            "First half mean",
            "Last half mean",
            "Change",
            "Band",
            "Trend",
            "Last slice",
          ],
          rows: learnerTableRows(rows),
        }}
        exportContext={[
          learners.data ? `Classification rule: ${learners.data.thresholds.bandRule}` : "",
          SKILL_GROWTH_RULER_NOTE,
          data?.provenance.note ?? "",
        ]}
        exportFilename="skill-growth-learners"
      />

      <ChartDetailModal
        open={expanded === "competency"}
        onClose={() => setExpanded(null)}
        title="Competency map — practice volume against learner skill level"
        caption="The table names every competency, scored or not. A scenario tagged with several competencies counts towards each, so the session column can sum to more than the platform total."
        source={competencySource}
        render={({ height }) =>
          competencyPoints.length > 0 ? (
            <ScatterChart data={competencyPoints} options={{ ...competencyOpts, height }} />
          ) : null
        }
        table={{
          columns: [
            "Competency",
            "Rubric skill",
            "Completed sessions",
            "Slices with a chance to show the skill",
            "Mean skill level",
            "Learners scored",
            "Scenarios",
          ],
          rows: [
            ...(cm?.competencies ?? []).map(r => [
              r.name,
              r.skillName ?? "no rubric skill",
              r.completedSessions,
              r.scoreUnavailable === "noRubricSkill" ? null : r.scoredCuts,
              r.score !== null
                ? r.score
                : r.scoreUnavailable === "noRubricSkill"
                  ? "no rubric skill"
                  : `n = ${r.scoredCuts} · need ${cmMin}`,
              r.scoreUnavailable === "noRubricSkill" ? null : r.scoreLearners,
              r.scenarios,
            ]),
            ...(cm && cm.unattributed.completedSessions > 0
              ? [
                  [
                    cm.unattributed.label,
                    null,
                    cm.unattributed.completedSessions,
                    cm.unattributed.scoredCuts,
                    null,
                    null,
                    null,
                  ],
                ]
              : []),
          ],
        }}
        exportContext={[
          "Window: All time",
          `Mean skill level (${cmDomain[0]}–${cmDomain[1]}, rubric ${cm?.rubricVersion ?? ""}) is blank below ${cmMin} single-scenario slices that gave the skill a chance`,
          cutAttribution?.singleScenarioPct != null
            ? `${cutAttribution.singleScenarioPct}% of scored slices ran a single scenario`
            : "",
          "Multi-competency scenarios count towards every competency they are tagged with",
          SKILL_GROWTH_RULER_NOTE,
          ...(cm ? [cm.provenance.note] : []),
          ...(competencyPoints.length
            ? [
                `Plotted: ${(cm?.competencies ?? [])
                  .filter(r => r.score !== null)
                  .map(competencyPointLabel)
                  .join(", ")}`,
              ]
            : []),
        ]}
        exportFilename="competency-map"
      />

      <LearnerSkillPanel learnerId={openLearner} onClose={() => setOpenLearner(null)} />
    </div>
  );
};
