import { ReactNode, useEffect, useMemo, useState } from "react";

import { ComboChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetActivationQuery,
  useGetCourseImpactQuery,
  useGetEffectivenessCostPerImprovementQuery,
  useGetEffectivenessFunnelQuery,
  useGetFoundationalSkillsProgressQuery,
  useGetFoundationalSkillsSegmentsQuery,
  useGetFoundationalSkillsTimeToCompetenceQuery,
  useGetTenantsQuery,
} from "@api";

import { asOfStamp } from "../analyticsFilters";
import { ChangeWhiskers } from "../ChangeWhiskers";
import {
  RANGE_LABEL,
  RANGE_SHORT,
  RangePicker,
  defaultControlsFor,
  useChartControls,
} from "../chartControls";
import { ChartDetailModal } from "../ChartDetailModal";
import { ChartCard, KpiTile, buildSource, scatterOpts } from "../chartKit";
import {
  COST_CEILING_CAVEAT,
  ChainTile,
  DIMENSION_LABELS,
  DIMENSION_NOTES,
  DOSE_AXIS_LABELS,
  DOSE_SCALE,
  DoseAxis,
  FIT_SERIES,
  OUTCOME_ACCENT,
  ProgressWithDose,
  SegmentDimension,
  activationTile,
  clampNote,
  compositeTile,
  competenceTile,
  costDescription,
  courseLiftTile,
  doseAxisItems,
  doseFit,
  doseGateText,
  doseSeries,
  doseTable,
  doseTakeaway,
  funnelStages,
  funnelTakeaway,
  measurableTile,
  segmentDimensionItems,
  segmentRows,
  segmentTable,
  segmentsTakeaway,
  selfHarmTile,
  trendParts,
  trendTile,
  unhelpfulTile,
  withheldText,
} from "../effectivenessChart";
import { ALL_ORGS, orgFilterItems, pct } from "../foundationalSkillsProgressChart";
import { FunnelBars } from "../FunnelBars";
import { formatUsd } from "../unitCostChart";

/** The org list is a filter, not a directory: one page covers every live org. */
const TENANT_PAGE_SIZE = 200;
const NOT_DEPLOYED = "The endpoint did not respond — it may not be deployed yet.";
const DOSE_CAVEAT = "More practice is self-selected; people who improve may keep going.";
/** Per-card window, saved per user (stored as `effectiveness.costPerImprovement`). */
const COST_CHARTS = ["costPerImprovement"] as const;
type CostChart = (typeof COST_CHARTS)[number];

const Section = ({
  title,
  blurb,
  controls,
  children,
}: {
  title: string;
  blurb: string;
  controls?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-typography-900">{title}</h3>
        <p className="max-w-4xl text-xs leading-relaxed text-typography-500">{blurb}</p>
      </div>
      {controls}
    </div>
    {children}
  </section>
);

const InlinePicker = <T extends { id: string; label: string }>({
  id,
  label,
  items,
  selected,
  onChange,
}: {
  id: string;
  label: string;
  items: T[];
  selected: T["id"] | undefined;
  onChange: (id: T["id"]) => void;
}) => (
  <Dropdown
    id={id}
    size="sm"
    type="inline"
    label={label}
    // Visually hidden, but it names the control for a screen reader.
    titleText={label}
    hideLabel
    items={items}
    itemToString={(i: T) => i?.label ?? ""}
    selectedItem={items.find(i => i.id === selected) ?? null}
    onChange={({ selectedItem }: { selectedItem: T }) => selectedItem && onChange(selectedItem.id)}
  />
);

/**
 * One group of the chain strip. The outcome group is the one framed: per
 * Stacks "Prioritize final outcomes over enabling metrics", the enablers come
 * first because the chain runs that way, but they are means, not the end.
 */
const TileGroup = ({
  label,
  primary = false,
  className = "",
  cols,
  children,
}: {
  label: string;
  primary?: boolean;
  className?: string;
  cols: string;
  children: ReactNode;
}) => (
  <div
    className={`flex flex-col gap-2 rounded border p-2 ${className}`}
    style={{ borderColor: primary ? OUTCOME_ACCENT : "transparent" }}
  >
    <p
      className={
        primary
          ? "text-xs font-semibold text-typography-900"
          : "text-xs font-medium text-typography-500"
      }
    >
      {label}
    </p>
    <div className={`grid grid-cols-1 gap-3 ${cols}`}>{children}</div>
  </div>
);

interface QueryLike<T> {
  currentData?: T;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * A query's own state, read off `currentData` — the response to THESE
 * arguments. `data` would keep the previous org's number on a tile while the
 * new org loads, under the new org's name.
 */
const stateOf = <T,>(q: QueryLike<T>) => {
  const data = q.currentData;
  return {
    data,
    loading: !data && (q.isLoading || q.isFetching),
    error: !data && q.isError && !q.isFetching,
    onRetry: q.refetch,
  };
};

/** A tile that answers from its own query: loading, error and thin states are its own. */
const ChainKpi = ({
  label,
  tile,
  state,
  newEndpoint = false,
}: {
  label: string;
  tile: ChainTile;
  state: { loading: boolean; error: boolean; onRetry: () => void };
  /** Endpoints shipped with this tab: a failure most likely means "not deployed yet". */
  newEndpoint?: boolean;
}) => (
  <KpiTile
    label={label}
    chartId="AAQ-202"
    value={tile.value}
    description={
      state.error && newEndpoint ? `${NOT_DEPLOYED} ${tile.description}` : tile.description
    }
    n={tile.n}
    nUnit={tile.nUnit}
    minN={tile.minN}
    loading={state.loading}
    error={state.error}
    onRetry={state.onRetry}
  />
);

/**
 * Highlights → Effectiveness: does practice on Ally change how people help?
 *
 * A summary of the chain from reaching a learner to a measured change in how
 * they help — every number is another tab's definition, read from the endpoint
 * that owns it, so the strip cannot drift from the detail it points to. Each
 * tile loads on its own query: one endpoint failing leaves the rest of the
 * chain readable. Below it, where learners fall out of the chain, whether the
 * change differs by segment, whether more practice goes with more change
 * (AAQ-217, read off the strip's own progress response), and what one
 * improvement costs at most (AAQ-218).
 *
 * All-time, like Helping skills: every link is a lifetime property of a person,
 * and a date window would only measure who binged inside it. No page filters
 * reach it; its own org filter narrows every card but the cost tile, which is
 * a calendar window (spend accrues by date) and platform-wide by construction.
 */
export const EffectivenessSubTab = () => {
  const [tenantId, setTenantId] = useState<string>(ALL_ORGS);
  const [dimension, setDimension] = useState<SegmentDimension>("language");
  const [expanded, setExpanded] = useState<"funnel" | "segments" | "dose" | null>(null);
  const [doseAxis, setDoseAxis] = useState<DoseAxis>("cuts");

  // A failed or forbidden org list leaves only "All orgs" — the tab still works.
  const { data: tenantData } = useGetTenantsQuery({ limit: TENANT_PAGE_SIZE });
  const orgItems = useMemo(() => orgFilterItems(tenantData?.data ?? []), [tenantData]);
  const orgName = tenantId ? orgItems.find(o => o.id === tenantId)?.label : undefined;
  const allTime = orgName ? `All time · ${orgName} only` : "All time";
  const org = tenantId ? { tenantId } : {};

  // The activation summary's counts are all-time whatever the window; the
  // 90-day weekly window only feeds the "practised last week" clause.
  const activation = stateOf(useGetActivationQuery({ range: "90d", bucket: "week", ...org }));
  // The same arguments the Helping skills tab opens on, so the two share a cache entry.
  const progress = stateOf(useGetFoundationalSkillsProgressQuery({ baselineFrom: 1, ...org }));
  const courseImpact = stateOf(useGetCourseImpactQuery(org));
  const competence = stateOf(useGetFoundationalSkillsTimeToCompetenceQuery(org));
  const funnelQ = useGetEffectivenessFunnelQuery(org);
  const funnel = stateOf(funnelQ);
  const segmentsQ = useGetFoundationalSkillsSegmentsQuery({ dimension, ...org });
  const segments = stateOf(segmentsQ);

  // AAQ-218 is the one calendar-window card: AI spend accrues by date. Its
  // window persists per user; the endpoint is platform-wide whatever the org.
  const { controlsFor, setRange, hydrating } = useChartControls<CostChart>(
    "effectiveness",
    defaultControlsFor(COST_CHARTS),
  );
  const costRange = controlsFor("costPerImprovement").range;
  const costQ = useGetEffectivenessCostPerImprovementQuery(
    { range: costRange },
    { skip: hydrating },
  );
  const cost = stateOf(costQ);

  const f = funnel.data;
  const s = segments.data;

  // AAQ-217 reads the strip's own progress response — no second request.
  const dose = (progress.data as ProgressWithDose | undefined)?.doseResponse;
  const scatter = (progress.data as ProgressWithDose | undefined)?.learnersScatter ?? null;
  const doseItems = doseAxisItems(dose);
  // An org whose minutes were not fitted cannot stay on the hours axis.
  useEffect(() => {
    if (doseAxis === "hours" && progress.data && !dose?.minutesFit) setDoseAxis("cuts");
  }, [doseAxis, dose, progress.data]);
  const fit = doseFit(dose, doseAxis);
  const dosePoints = useMemo(
    () => (scatter ? doseSeries(scatter, fit, doseAxis) : []),
    [scatter, fit, doseAxis],
  );
  const doseOpts = useMemo(
    () => ({
      ...scatterOpts({
        leftTitle: "Own change, first half → last half (1–4)",
        bottomTitle: doseAxis === "hours" ? "Practice hours" : "Scored slices",
        colorScale: DOSE_SCALE,
        legend: true,
      }),
      // Dots by class, the fitted line over them, on the same two linear axes.
      comboChartTypes: [
        {
          type: "scatter",
          correspondingDatasets: Object.keys(DOSE_SCALE).filter(k => k !== FIT_SERIES),
        },
        { type: "line", correspondingDatasets: [FIT_SERIES] },
      ],
      curve: "curveLinear",
    }),
    [doseAxis],
  );
  // The picker's list from whichever response is to hand, so it never empties
  // while a newly picked dimension loads.
  const dimensionItems = segmentDimensionItems((s ?? segmentsQ.data)?.dimensions);

  const funnelSource = buildSource({
    derivation: "Learner accounts → countable sessions → scored slices, one fixed rubric",
    window: allTime,
    n: f?.stages[0]?.reached,
    nUnit: "learner accounts",
    extra: "Test orgs excluded",
    asOf: asOfStamp(f?.computedAt),
  });
  const segmentsSource = buildSource({
    derivation: "Same learners start → now, one fixed rubric",
    window: allTime,
    n: s?.panelLearners,
    nUnit: "learners in the panel",
    extra: s ? `Rubric ${s.rubricVersion} · test orgs excluded` : undefined,
    asOf: asOfStamp(s?.computedAt),
  });

  const minCuts = f?.trendMinCuts ?? 4;
  const funnelCaveat = `Improving uses the Helping skills noise band; a learner with fewer than ${minCuts} slices cannot be classified.`;
  const clamp = f ? clampNote(f.clamp) : undefined;
  const dimLabel = (DIMENSION_LABELS[dimension] ?? dimension).toLowerCase();
  const segmentCaveat =
    "Segments overlap; a gap between two is a hypothesis to check, not a finding.";

  const pickOrg = (id: string) => setTenantId(id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-typography-900">Org:</span>
        <InlinePicker
          id="effectiveness-org"
          label="Org"
          items={orgItems}
          selected={tenantId}
          onChange={pickOrg}
        />
        <span className="text-xs text-typography-500">{allTime}</span>
      </div>

      <Section
        title="The chain, link by link"
        blurb="From reaching a learner to a measured change in how they help, in the order the chain runs. The learning outcomes are what it is for; the enablers come first because nothing after them can move without them. Each tile names the tab that holds its detail."
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <TileGroup
            label="Enablers — reach and dose"
            className="xl:col-span-2"
            cols="sm:grid-cols-2"
          >
            <ChainKpi
              label="Activated learners"
              tile={activationTile(activation.data)}
              state={activation}
            />
            <ChainKpi
              label="Measurable learners"
              tile={measurableTile(progress.data)}
              state={progress}
            />
          </TileGroup>

          <TileGroup
            label="Outcomes — learning"
            primary
            className="xl:col-span-3"
            cols="sm:grid-cols-3"
          >
            <ChainKpi
              label="Helping skills, start → now"
              tile={compositeTile(progress.data)}
              state={progress}
            />
            <ChainKpi
              label="Learners beyond noise"
              tile={trendTile(progress.data)}
              state={progress}
            />
            <ChainKpi
              label="Unhelpful behaviour, start → now"
              tile={unhelpfulTile(progress.data)}
              state={progress}
            />
          </TileGroup>

          <TileGroup
            label="Transfer, safety and pace"
            className="xl:col-span-5"
            cols="sm:grid-cols-3"
          >
            <ChainKpi
              label="Course lift"
              tile={courseLiftTile(courseImpact.data)}
              state={courseImpact}
            />
            <ChainKpi
              label="Self-harm cues followed up"
              tile={selfHarmTile(progress.data)}
              state={progress}
            />
            <ChainKpi
              label="Practice to Engage competence"
              tile={competenceTile(competence.data)}
              state={competence}
              newEndpoint
            />
          </TileGroup>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Where learners fall out of the chain"
          caption={`Every learner from account to measured improvement. Each bar counts only learners in every bar above it, and a share of fewer than ${
            f?.minCohortSize ?? 5
          } people is withheld. ${funnelCaveat}`}
          source={funnelSource}
          takeaway={f ? funnelTakeaway(f) : undefined}
          loading={funnel.loading}
          error={funnel.error}
          onRetry={funnel.onRetry}
          errorSubtitle={`The effectiveness funnel endpoint did not respond — it may not be deployed yet.`}
          empty={!funnel.loading && !!f && (f.stages.length === 0 || f.stages[0].reached === 0)}
          emptyText="No learner accounts in this scope yet"
          onExpand={() => setExpanded("funnel")}
          height="auto"
          chartId="AAQ-203"
        >
          {f && (
            <div className="flex flex-col gap-3">
              <FunnelBars stages={funnelStages(f.stages)} unit="learners" />
              <div className="flex flex-col gap-1.5 border-t border-[#f0f0f0] pt-2">
                <p className="text-xs font-medium text-typography-700">
                  Of {f.trend.classifiable} classifiable learner
                  {f.trend.classifiable === 1 ? "" : "s"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-typography-700">
                  {trendParts(f.trend).map(p => (
                    <span key={p.key} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                        aria-hidden
                      />
                      {p.label}: <span className="font-medium tabular-nums">{p.value}</span>
                      {p.sharePct !== null && (
                        <span className="text-typography-500">({pct(p.sharePct)})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {clamp && <p className="text-[11px] leading-snug text-typography-500">{clamp}</p>}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Effectiveness by segment"
          caption={`The Helping skills start → now change (1–4 scale) for the same panel of learners, split by ${dimLabel}. Each row ± its 95% interval, coloured only when the interval clears zero; the first row is everyone. ${segmentCaveat}`}
          source={segmentsSource}
          takeaway={s ? segmentsTakeaway(s) : undefined}
          loading={segments.loading}
          error={segments.error}
          onRetry={segments.onRetry}
          errorSubtitle="The segments endpoint did not respond — it may not be deployed yet."
          empty={!segments.loading && !!s && s.panelLearners === 0}
          emptyText="No panel of learners with enough scored slices to compare yet"
          {...(s ? { n: s.overall.learners, nUnit: "learners", minN: s.minSampleSize } : {})}
          controls={
            <InlinePicker
              id="effectiveness-dimension"
              label="Split by"
              items={dimensionItems}
              selected={dimension}
              onChange={setDimension}
            />
          }
          onExpand={() => setExpanded("segments")}
          height="auto"
          chartId="AAQ-204"
        >
          {s && (
            <div className="flex flex-col gap-3">
              <ChangeWhiskers rows={segmentRows(s)} />
              {s.withheld.length > 0 && (
                <p className="text-[11px] leading-snug text-typography-500">
                  Too few learners to read (under {s.minSampleSize}): {withheldText(s.withheld)}.
                </p>
              )}
              <p className="text-[11px] leading-snug text-typography-500">
                {DIMENSION_NOTES[s.dimension] ?? ""}
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      <Section
        title="Dose and cost"
        blurb="Whether learners who practise more change more, and what one improvement costs at most. Both are associations: practice amount is chosen by the learner, and spend is not the only thing that moves a learner."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            wide
            title="Dose–response: change against practice amount"
            caption={`One dot per learner with ${
              progress.data?.thresholds.trendMinCuts ?? 4
            }+ scored slices: their own change (last half of their slices against their first half) against how much they practised, coloured by whether that change clears their own noise band. The line is the least-squares fit, with its slope and 95% interval above. ${DOSE_CAVEAT}`}
            source={buildSource({
              derivation: "Each classifiable learner's own change, one fixed rubric",
              window: allTime,
              n: dose?.classifiedLearners,
              nUnit: "classifiable learners",
              extra:
                doseAxis === "hours" && dose?.learnersWithMinutes != null
                  ? `${dose.learnersWithMinutes} with practice minutes`
                  : undefined,
              asOf: asOfStamp(progress.data?.computedAt),
            })}
            takeaway={doseTakeaway(fit)}
            loading={progress.loading}
            error={progress.error}
            onRetry={progress.onRetry}
            empty={!progress.loading && !!progress.data && (!dose || !dose.measurable || !scatter)}
            emptyText={doseGateText(dose)}
            controls={
              doseItems.length > 1 ? (
                <InlinePicker
                  id="effectiveness-dose-axis"
                  label="Practice measured as"
                  items={doseItems}
                  selected={doseAxis}
                  onChange={setDoseAxis}
                />
              ) : undefined
            }
            onExpand={scatter ? () => setExpanded("dose") : undefined}
            chartId="AAQ-217"
          >
            {scatter && <ComboChart data={dosePoints} options={doseOpts} />}
          </ChartCard>

          <ChartCard
            title="Cost per improved learner"
            caption={`Learner-caused AI spend in the window divided by the learners whose improvement beyond their own noise landed in it. ${COST_CEILING_CAVEAT}`}
            source={buildSource({
              derivation: "Priced learner-caused AI calls ÷ learners improving beyond noise",
              window: cost.data?.window.label ?? RANGE_SHORT[costRange],
              extra: "estimate · USD · platform-wide",
              asOf: asOfStamp(cost.data?.computedAt),
            })}
            loading={hydrating || cost.loading}
            error={cost.error}
            onRetry={cost.onRetry}
            errorSubtitle="The cost-per-improvement endpoint did not respond — it may not be deployed yet."
            controls={
              <RangePicker
                id="effectiveness-cost-range"
                value={costRange}
                onChange={range => setRange("costPerImprovement", range)}
              />
            }
            height="auto"
            chartId="AAQ-218"
            kpi={
              cost.data
                ? {
                    label: `USD per improved learner · ${RANGE_LABEL[costRange]}`,
                    value: formatUsd(cost.data.costPerImprovedLearnerUsd),
                    description: costDescription(cost.data, v => formatUsd(v), !!tenantId),
                    n: cost.data.improvedLearners,
                    nUnit: "improved learners",
                    minN: cost.data.minSampleSize,
                  }
                : undefined
            }
          />
        </div>
      </Section>

      {f && (
        <ChartDetailModal
          open={expanded === "funnel"}
          onClose={() => setExpanded(null)}
          title="Where learners fall out of the chain"
          caption={`${funnelCaveat}${clamp ? ` ${clamp}` : ""} Helping skills' own count over every measured learner, before this funnel's intersection: ${f.helpingSkillsTrend.improving} improving, ${f.helpingSkillsTrend.steady} within noise, ${f.helpingSkillsTrend.declining} declining, ${f.helpingSkillsTrend.tooEarly} too early to say.`}
          source={funnelSource}
          render={() => <FunnelBars stages={funnelStages(f.stages)} unit="learners" />}
          table={{
            columns: ["Stage", "Definition", "Learners", "% of first stage", "% of previous stage"],
            rows: [
              ...f.stages.map(st => [
                st.label,
                st.description,
                st.reached,
                st.ofEnteredPct,
                st.ofPreviousPct,
              ]),
              ...trendParts(f.trend).map(p => [
                `Classifiable: ${p.label.toLowerCase()}`,
                "",
                p.value,
                null,
                p.sharePct,
              ]),
              ["Measured but outside the funnel", "", f.clamp.outsideFunnel, null, null],
              ["…not a learner account in scope", "", f.clamp.notInPopulation, null, null],
              ["…fewer than two countable sessions", "", f.clamp.fewerThanTwoSessions, null, null],
            ],
          }}
          exportContext={[f.provenance.derivation, f.provenance.note, f.scoping.note]}
          exportFilename="effectiveness-funnel.csv"
        />
      )}

      {s && (
        <ChartDetailModal
          open={expanded === "segments"}
          onClose={() => setExpanded(null)}
          title={`Effectiveness by segment — ${DIMENSION_LABELS[s.dimension] ?? s.dimension}`}
          caption={`${segmentCaveat} ${DIMENSION_NOTES[s.dimension] ?? ""}`}
          source={segmentsSource}
          render={() => <ChangeWhiskers rows={segmentRows(s)} />}
          table={segmentTable(s)}
          exportContext={[s.provenance.derivation, s.provenance.note, s.scoping.note]}
          exportFilename={`effectiveness-by-${s.dimension}.csv`}
        />
      )}

      {scatter && (
        <ChartDetailModal
          open={expanded === "dose"}
          onClose={() => setExpanded(null)}
          title={`Dose–response — ${DOSE_AXIS_LABELS[doseAxis].toLowerCase()}`}
          caption={`${doseTakeaway(fit) ?? ""} ${DOSE_CAVEAT} Learner ids only; rows by own change.`}
          render={({ height }) => (
            <ComboChart data={dosePoints} options={{ ...doseOpts, height }} />
          )}
          table={doseTable(scatter)}
          exportContext={dose ? [dose.provenance.derivation, dose.provenance.note] : []}
          exportFilename={`effectiveness-dose-response-${doseAxis}.csv`}
        />
      )}
    </div>
  );
};
