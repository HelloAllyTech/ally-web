import { useMemo, useState } from "react";

import { StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetScenarioCalibrationQuery,
  useGetScenarioOpportunityCoverageQuery,
  useGetScenarioProgressionQuery,
  useGetScenarioRepeatImprovementQuery,
} from "@api";
import { AnalyticsGrain } from "@types";

import { AnalyticsTabFilters, asOfStamp, windowLabel } from "./analyticsFilters";
import { bucketTitle, grainAsBucket, groupingNote, inProgressCaption } from "./analyticsGrouping";
import { RangePicker, defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  ScrollableChart,
  buildSource,
  stackedBarOpts,
} from "./chartKit";
import { CONTEXT, PALETTE } from "./chartScales";
import { changeColor, pct } from "./foundationalSkillsProgressChart";
import {
  CalibrationRowView,
  PROGRESSION_SCALE,
  bandScale,
  calibrationBelowFloor,
  calibrationRows,
  calibrationTable,
  calibrationTakeaway,
  progressionSeries,
  progressionTable,
  progressionTakeaway,
  thinBuckets,
  untrackedNote,
} from "./scenarioCalibrationChart";
import {
  CoverageColumn,
  OPPORTUNITY_LEGEND,
  ScenarioOpportunityRow,
  ScenarioRepeatLearner,
  ScenarioRepeatRow,
  TAGGED_OUTLINE,
  belowFloorText,
  coverageCell,
  coverageColumns,
  coverageTable,
  coverageTakeaway,
  opportunityCellStyle,
  repeatPickerItems,
  repeatTable,
  repeatTakeaway,
  scoringEditNote,
  selectedRow,
  singleScenarioNote,
  slopeAxis,
  tagGapRows,
  tagGapTakeaway,
  tierSpans,
  versionLabel,
} from "./scenarioEffectivenessChart";

const NOT_DEPLOYED = (what: string) =>
  `The ${what} endpoint did not respond — it may not be deployed yet.`;

/** Copied from the Course impact tab rather than shared: that one is local to its file. */
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

/* -------------------------------------------------------------------------- */
/* Bodies                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Scenarios × the 14 helping skills: the share of each scenario's slices in
 * which the judge found a chance to show the skill. A tagged cell (the scenario
 * claims to exercise the skill) is outlined, so a pale outlined cell is a tag
 * the scenario does not deliver.
 *
 * A local table in the {@link SkillCutGrid} style rather than SkillCutGrid
 * itself: that grid is skills × cuts on the 1–4 level scale, and this one is
 * scenarios × skills on 0–100%, with an outline it has no slot for. Every cell
 * carries its number as text, so colour is the overview and never the only
 * reading.
 */
export const OpportunityGrid = ({
  rows,
  columns,
}: {
  rows: ScenarioOpportunityRow[];
  columns: CoverageColumn[];
}) => (
  <div className="overflow-auto">
    <table className="w-full border-separate border-spacing-[2px] text-xs">
      <caption className="sr-only">
        Share of each scenario&apos;s slices with a chance at each helping skill; outlined cells are
        skills the scenario is tagged with
      </caption>
      <thead>
        <tr className="text-[11px] text-typography-500">
          <th />
          {tierSpans(columns).map(t => (
            <th
              key={t.tier}
              colSpan={t.span}
              className="pb-0.5 text-center font-semibold uppercase tracking-wide"
            >
              {t.label}
            </th>
          ))}
        </tr>
        <tr className="text-typography-500">
          <th className="py-1 pr-3 text-left font-medium">Scenario</th>
          {columns.map(c => (
            <th
              key={c.skill}
              title={c.name}
              className="min-w-[44px] px-1 py-1 text-center text-[11px] font-medium"
            >
              {c.short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.scenarioId}>
            <th className="py-1 pr-3 text-left font-normal">
              <span className="flex flex-col">
                <span className="text-typography-700">{r.title}</span>
                <span className="text-[11px] text-typography-500">
                  {r.cuts} slices · {r.learners} learners
                </span>
              </span>
            </th>
            {columns.map(c => {
              const cell = coverageCell(r, c);
              const style = opportunityCellStyle(cell.value);
              return (
                <td
                  key={c.skill}
                  title={cell.title}
                  className="rounded-sm px-1 py-1 text-center tabular-nums"
                  style={{
                    background: style.background,
                    color: style.color,
                    boxShadow: cell.tagged ? `inset 0 0 0 2px ${TAGGED_OUTLINE}` : undefined,
                  }}
                >
                  {cell.value === null ? "—" : Math.round(cell.value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-typography-500">
      <span>Share of slices with a chance:</span>
      {OPPORTUNITY_LEGEND.map(l => (
        <span key={l.label} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: opportunityCellStyle(l.sample).background }}
          />
          {l.label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          className="inline-block h-3 w-4 rounded-sm"
          style={{ boxShadow: `inset 0 0 0 2px ${TAGGED_OUTLINE}` }}
        />
        tagged on the scenario
      </span>
    </div>
  </div>
);

/**
 * One faint line per learner from their first to their latest play of the
 * same scenario version, with the group mean drawn over them — the
 * {@link BenchmarkSlope} form on raw session points. Session scores have no
 * fixed scale (each scenario sets its own), so the axis is fitted to the data
 * with round ends, and zero kept in view when the scores straddle it.
 */
export const ScoreSlope = ({
  learners,
  row,
  height = 260,
}: {
  learners: ScenarioRepeatLearner[];
  row: ScenarioRepeatRow | null;
  height?: number;
}) => {
  const values = [
    ...learners.flatMap(l => [l.first, l.latest]),
    ...(row?.firstAvg !== null && row?.firstAvg !== undefined ? [row.firstAvg] : []),
    ...(row?.latestAvg !== null && row?.latestAvg !== undefined ? [row.latestAvg] : []),
  ];
  const { domain, ticks } = slopeAxis(values);
  const [lo, hi] = domain;
  const pad = 28;
  const w = 360;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  const xs = [pad + 48, w - pad - 40];
  const meanColor =
    row && row.detectable ? changeColor({ change: row.change, detectable: true }) : PALETTE.blue;
  const avg = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      role="img"
      aria-label={`First vs latest session score for ${learners.length} learners who replayed this scenario`}
      className="w-full max-w-[520px]"
    >
      {ticks.map(t => (
        <g key={t}>
          <line
            x1={pad + 8}
            x2={w - pad}
            y1={y(t)}
            y2={y(t)}
            stroke={t === 0 ? CONTEXT.line : CONTEXT.faint}
            strokeWidth={0.5}
          />
          <text x={pad + 2} y={y(t) + 3} fontSize={10} textAnchor="end" fill={CONTEXT.strong}>
            {t}
          </text>
        </g>
      ))}
      <text x={xs[0]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        First play
      </text>
      <text x={xs[1]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        Latest play
      </text>
      {learners.map(l => (
        <line
          key={l.learnerId}
          x1={xs[0]}
          x2={xs[1]}
          y1={y(l.first)}
          y2={y(l.latest)}
          stroke={CONTEXT.line}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {row && row.firstAvg !== null && row.latestAvg !== null && (
        <>
          <line
            x1={xs[0]}
            x2={xs[1]}
            y1={y(row.firstAvg)}
            y2={y(row.latestAvg)}
            stroke={meanColor}
            strokeWidth={3}
          />
          <circle cx={xs[0]} cy={y(row.firstAvg)} r={4} fill={PALETTE.blue} />
          <circle cx={xs[1]} cy={y(row.latestAvg)} r={4} fill={PALETTE.blue} />
          <text
            x={xs[0] - 8}
            y={y(row.firstAvg) + 4}
            fontSize={11}
            textAnchor="end"
            fill={CONTEXT.strong}
          >
            {avg(row.firstAvg)}
          </text>
          <text x={xs[1] + 8} y={y(row.latestAvg) + 4} fontSize={11} fill={CONTEXT.strong}>
            {avg(row.latestAvg)}
          </text>
        </>
      )}
    </svg>
  );
};

/** A colour legend for one band set. */
const BandLegend = ({
  title,
  bands,
}: {
  title: string;
  bands: { key: string; label: string }[];
}) => {
  const scale = bandScale(bands);
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-typography-500">
      <span>{title}</span>
      {bands.map(b => (
        <span key={b.key} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: scale[b.key] }}
          />
          {b.label}
        </span>
      ))}
    </div>
  );
};

/**
 * One 100%-stacked row per scenario version: where its session scores land,
 * beside its authored difficulty label. Plain HTML because scenario titles are
 * long, and because rows mix two band sets (shares of a scoring range, or raw
 * points when there is no usable range) that one Carbon stack could not label
 * honestly. The shares are the server's; empty bands are left out of the bar.
 */
export const CalibrationRows = ({ rows }: { rows: CalibrationRowView[] }) => (
  <div className="flex flex-col">
    {rows.map(r => (
      <div
        key={r.key}
        className="grid grid-cols-1 items-center gap-1 border-t border-[#f0f0f0] py-1.5 sm:grid-cols-[minmax(9rem,16rem)_1fr_11rem] sm:gap-3"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-typography-900">{r.label}</span>
          <span className="text-[11px] text-typography-500">{r.sublabel}</span>
        </span>
        <span
          className="flex h-5 overflow-hidden rounded"
          style={{ backgroundColor: "#f0f0f0" }}
          role="img"
          aria-label={`${r.label}: ${r.segments.map(seg => `${seg.label} ${pct(seg.pct)}`).join(", ")}`}
        >
          {r.segments.map(seg => (
            <span
              key={seg.key}
              title={`${seg.label}: ${seg.count} sessions (${pct(seg.pct)})`}
              style={{ width: `${seg.pct}%`, background: seg.color }}
            />
          ))}
        </span>
        <span className="flex flex-col text-xs text-typography-700">
          <span>
            {r.difficulty ? `Labelled ${r.difficulty.toLowerCase()}` : "No difficulty label"}
          </span>
          {r.notes.map(note => (
            <span key={note} className="text-[11px] font-medium text-typography-900">
              {note}
            </span>
          ))}
        </span>
      </div>
    ))}
  </div>
);

/** The calendar card here, as a `useChartControls` key (stored as `curriculum.scenarioProgression`). */
const WINDOWED = ["scenarioProgression"] as const;
type WindowedChart = (typeof WINDOWED)[number];
const DEFAULT_CONTROLS = defaultControlsFor(WINDOWED, {
  scenarioProgression: { range: "12m", grain: "month" },
});
/** A share per bucket needs sessions in it: day grain would be mostly withheld. */
const PROGRESSION_GRAINS: AnalyticsGrain[] = ["week", "month", "quarter"];

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Curriculum → Scenarios as practice content: does each scenario give learners
 * a chance at the skills it is tagged with (AAQ-214), which tags are the
 * content team's fix list (AAQ-215), does replaying a scenario raise its score
 * (AAQ-216), does each version's difficulty land where its label says
 * (AAQ-227), and do sessions move the client through the states (AAQ-228)?
 *
 * All but one card are all-time by construction — a slice is "the learner's Nth
 * 5,000 characters", a replay pair is "this learner's first and latest play",
 * and calibration is a property of the scenario — so they carry no period
 * control. State progression is a calendar trend and has its own window and
 * grain, saved per user.
 */
export const ScenarioContentSection = ({ query }: Pick<AnalyticsTabFilters, "query">) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<number | undefined>(undefined);

  const tenant = useMemo(
    () => (query.tenantId ? { tenantId: query.tenantId } : {}),
    [query.tenantId],
  );
  const coverageQ = useGetScenarioOpportunityCoverageQuery(tenant);
  const repeatQ = useGetScenarioRepeatImprovementQuery({
    ...tenant,
    ...(scenarioId ? { scenarioId } : {}),
  });
  const calibrationQ = useGetScenarioCalibrationQuery(tenant);

  const { controlsFor, setRange, setGrain, hydrating } = useChartControls<WindowedChart>(
    "curriculum",
    DEFAULT_CONTROLS,
  );
  const progControls = controlsFor("scenarioProgression");
  const progBucket = grainAsBucket(progControls.grain);
  // Waiting for hydration stops the card fetching its default window and then
  // immediately re-fetching the saved one.
  const progressionQ = useGetScenarioProgressionQuery(
    { ...tenant, range: progControls.range, bucket: progBucket },
    { skip: hydrating },
  );

  /* ---------------------------- AAQ-214 / 215 ----------------------------- */
  const cov = coverageQ.data;
  const columns = useMemo(() => coverageColumns(cov?.skills ?? []), [cov]);
  const gaps = useMemo(() => (cov ? tagGapRows(cov) : []), [cov]);
  const covMinN = cov?.minSampleSize ?? 20;
  const below = cov ? belowFloorText(cov) : null;
  const coverageSource = buildSource({
    derivation: "Judge-found opportunities in single-scenario slices, one fixed rubric",
    window: "All time",
    n: cov?.singleScenarioCuts,
    nUnit: "single-scenario slices",
    asOf: asOfStamp(cov?.computedAt),
  });
  const coverageEmpty =
    cov && cov.belowFloor.length > 0
      ? `No scenario has ${covMinN} single-scenario slices yet — ${cov.belowFloor.length} ${
          cov.belowFloor.length === 1 ? "has" : "have"
        } fewer (the most is ${cov.belowFloor[0].cuts})`
      : "No single-scenario slice has been scored yet";

  /* ------------------------------- AAQ-216 -------------------------------- */
  const rep = repeatQ.data;
  // RTK keeps the previous scenario's data while a new pick loads; the picker
  // follows the response, so it never shows a choice the chart has not drawn.
  const pickerItems = useMemo(() => (rep ? repeatPickerItems(rep) : []), [rep]);
  const shownId = rep?.selected ? String(rep.selected.scenarioId) : undefined;
  const row = rep ? selectedRow(rep) : null;
  const sel = rep?.selected ?? null;
  const repMinN = rep?.minSampleSize ?? 20;
  const editNote = row ? scoringEditNote(row) : null;
  const repeatSource = buildSource({
    derivation: "Same learner, same scenario version, first vs latest play",
    window: "All time",
    n: sel?.pairs,
    nUnit: "paired learners",
    asOf: asOfStamp(rep?.computedAt),
  });
  const repeatCaption = `Each line is one learner's first and latest scored play of the same scenario version, at least ${Math.round(
    (rep?.thresholds.minSpanHours ?? 24) / 24,
  )} day apart; the bold line is the average, coloured only when its 95% interval excludes zero. Session scores are on each scenario's own scale and compare only within one scenario version — a new version starts the pairing again. Learners practise other scenarios between plays, so a rise is associated with replaying, not caused by it, and it shows improvement on this case rather than on new ones.`;

  /* ------------------------------- AAQ-227 -------------------------------- */
  const cal = calibrationQ.data;
  const calRows = useMemo(() => (cal ? calibrationRows(cal) : []), [cal]);
  const calMinN = cal?.minSampleSize ?? 20;
  const calBelow = cal ? calibrationBelowFloor(cal) : null;
  const hasRawRows = !!cal && cal.rows.some(r => r.rangeSource === "raw");
  const calibrationSource = buildSource({
    derivation: "Session scores against each version's attainable range",
    window: "All time",
    n: cal?.totals.sessions,
    nUnit: "scored sessions",
    asOf: asOfStamp(cal?.computedAt),
  });

  /* ------------------------------- AAQ-228 -------------------------------- */
  const prog = progressionQ.data;
  const progSeries = useMemo(() => (prog ? progressionSeries(prog) : []), [prog]);
  const progMinN = prog?.minSampleSize ?? 20;
  const progThin = prog ? thinBuckets(prog) : 0;
  const progUntracked = prog ? untrackedNote(prog) : null;
  const progOptions = (height?: string) =>
    stackedBarOpts({
      leftTitle: "Share of tracked sessions (%)",
      bottomTitle: bucketTitle(progBucket),
      colorScale: PROGRESSION_SCALE,
      domain: [0, 100],
      ...(height ? { height } : {}),
    });
  const progressionSource = buildSource({
    derivation: "Simulation state reached per session, by session end",
    window: windowLabel(prog?.window),
    n: prog?.totals.sessions,
    nUnit: "tracked sessions",
    extra: groupingNote(progControls.grain),
    asOf: asOfStamp(prog?.computedAt),
  });

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        wide
        title="Which skills each scenario exercises"
        caption={`For each scenario with ${covMinN}+ slices that played only it: the share in which the judge found a chance to show each helping skill. Outlined cells are skills the scenario is tagged with, so a pale outlined cell is a tag the scenario does not deliver. A chance is the judge's call, and some skills depend on what the persona says — a self-harm cue exists only if the persona raises one. ${
          cov ? singleScenarioNote(cov) : ""
        }`}
        source={coverageSource}
        takeaway={cov ? coverageTakeaway(cov) : undefined}
        loading={coverageQ.isLoading && !cov}
        error={coverageQ.isError}
        onRetry={coverageQ.refetch}
        errorSubtitle={NOT_DEPLOYED("opportunity-coverage")}
        empty={!coverageQ.isLoading && !!cov && cov.scenarios.length === 0}
        emptyText={coverageEmpty}
        onExpand={() => setExpanded("coverage")}
        chartId="AAQ-214"
      >
        {cov && (
          <div className="flex flex-col gap-2">
            <OpportunityGrid rows={cov.scenarios} columns={columns} />
            {below && <p className="text-[11px] leading-snug text-typography-500">{below}</p>}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Scenario tags that rarely get a chance"
          caption={`The content team's fix list: a scenario tagged with a skill that gets a chance in under ${
            cov?.thresholds.maxOpportunityPct ?? 30
          }% of its slices (over at least ${
            cov?.thresholds.minCuts ?? 20
          }), most-played scenarios first. Either the scenario needs content that invites the skill, or the tag should go.`}
          source={coverageSource}
          takeaway={cov ? tagGapTakeaway(cov) : undefined}
          loading={coverageQ.isLoading && !cov}
          error={coverageQ.isError}
          onRetry={coverageQ.refetch}
          errorSubtitle={NOT_DEPLOYED("opportunity-coverage")}
          empty={!coverageQ.isLoading && !!cov && gaps.length === 0}
          emptyText={
            cov && cov.scenarios.length > 0
              ? `Every tagged skill gets a chance in at least ${cov.thresholds.maxOpportunityPct}% of its scenario's slices`
              : coverageEmpty
          }
          chartId="AAQ-215"
        >
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Tagged skills that rarely get a chance, most-played scenarios first
              </caption>
              <thead>
                <tr className="text-left text-typography-500">
                  <th className="py-1 pr-3 font-medium">Scenario</th>
                  <th className="py-1 pr-3 font-medium">Tagged skill</th>
                  <th className="py-1 pr-3 text-right font-medium">Chance in</th>
                  <th className="py-1 pr-3 text-right font-medium">Slices</th>
                  <th className="py-1 text-right font-medium">Sessions played</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map(g => (
                  <tr key={g.key} className="border-t border-[#f0f0f0] text-typography-700">
                    <td className="py-1.5 pr-3">{g.scenario}</td>
                    <td className="py-1.5 pr-3">{g.skill}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{pct(g.opportunityPct)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{g.cuts}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {g.sessionsPlayed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          title="Same-scenario repeat improvement"
          caption={repeatCaption}
          source={repeatSource}
          takeaway={rep ? repeatTakeaway(rep) : undefined}
          loading={repeatQ.isLoading && !rep}
          error={repeatQ.isError}
          onRetry={repeatQ.refetch}
          errorSubtitle={NOT_DEPLOYED("repeat-improvement")}
          // The slope list is withheld below the floor; the counts say how far off it is.
          {...(sel && sel.learners === null
            ? { n: sel.pairs, nUnit: "paired learners", minN: repMinN }
            : {})}
          empty={!repeatQ.isLoading && !!rep && (rep.scenarios.length === 0 || !sel)}
          emptyText={
            rep && rep.repeatGroups > 0
              ? `${rep.repeatGroups} learner${rep.repeatGroups === 1 ? " has" : "s have"} replayed a scenario, but none a day or more after their first play yet`
              : "Nobody has replayed a scenario yet"
          }
          controls={
            pickerItems.length > 0 ? (
              <InlinePicker
                id="curriculum-repeat-scenario"
                label="Scenario"
                items={pickerItems}
                selected={shownId}
                onChange={id => setScenarioId(Number(id))}
              />
            ) : null
          }
          onExpand={() => setExpanded("repeat")}
          chartId="AAQ-216"
        >
          {sel && sel.learners && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-typography-500">
                {sel.title ?? "This scenario"} {versionLabel(sel.versionNumber)} · {sel.pairs}{" "}
                paired of {sel.repeaters} who replayed it
              </p>
              <ScoreSlope learners={sel.learners} row={row} />
              {editNote && (
                <p className="text-[11px] font-medium leading-snug text-typography-900">
                  {editNote}
                </p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard
        wide
        title="Scenario difficulty calibration"
        caption={`Where each scenario version's session scores land, as bands of the most a session can earn under its current scoring, beside its authored difficulty label. A version with no usable range falls back to raw points. Flagged too easy above ${
          cal?.thresholds.tooEasyTopBandPct ?? 80
        }% of sessions in the top band, too hard above ${
          cal?.thresholds.tooHardBelowZeroPct ?? 50
        }% below 0. Difficulty is an authoring label; this measures how scores land, which depends on the scoring and on who plays. Shown from ${calMinN} scored sessions per version${
          cal && cal.totals.unresolvedExcluded > 0
            ? `; ${cal.totals.unresolvedExcluded.toLocaleString()} sessions with an unresolved 0 score are left out`
            : ""
        }.`}
        source={calibrationSource}
        takeaway={cal ? calibrationTakeaway(cal) : undefined}
        loading={calibrationQ.isLoading && !cal}
        error={calibrationQ.isError}
        onRetry={calibrationQ.refetch}
        errorSubtitle={NOT_DEPLOYED("calibration")}
        empty={!calibrationQ.isLoading && !!cal && calRows.length === 0}
        emptyText={
          cal && cal.belowFloor.length > 0
            ? `No scenario version has ${calMinN} scored sessions yet — ${cal.belowFloor.length} ${
                cal.belowFloor.length === 1 ? "has" : "have"
              } fewer: ${calBelow}`
            : "No scored session yet"
        }
        onExpand={() => setExpanded("calibration")}
        chartId="AAQ-227"
      >
        {cal && (
          <div className="flex flex-col gap-2">
            <BandLegend title="Share of the scoring range:" bands={cal.bandDefinitions.derived} />
            {hasRawRows && (
              <BandLegend title="Raw points (no usable range):" bands={cal.bandDefinitions.raw} />
            )}
            <CalibrationRows rows={calRows} />
            {calBelow && (
              <p className="text-[11px] leading-snug text-typography-500">
                Under {calMinN} scored sessions, so not banded: {calBelow}.
              </p>
            )}
          </div>
        )}
      </ChartCard>

      <ChartCard
        wide
        title="Did the learner move the client?"
        caption={`Share of sessions that reached the scenario's last state, advanced at least one state, or never got past the opening state, by when they ended. States move as the session score crosses each state's window, so this tracks learner progress only as far as the scenario's scoring tracks good helping. Sessions with no usable state are counted under the chart, not plotted; a period needs ${progMinN} tracked sessions for its shares.${inProgressCaption(
          progControls.grain,
          prog?.window.inProgressBucket,
        )}`}
        source={progressionSource}
        takeaway={prog ? progressionTakeaway(prog) : undefined}
        loading={hydrating || (progressionQ.isLoading && !prog)}
        error={progressionQ.isError}
        onRetry={progressionQ.refetch}
        errorSubtitle={NOT_DEPLOYED("progression")}
        empty={!progressionQ.isLoading && !!prog && progSeries.length === 0}
        emptyText={
          prog && prog.totals.sessions > 0
            ? `No ${bucketTitle(progBucket).toLowerCase()} has ${progMinN} tracked sessions yet (${prog.totals.sessions} in the period)`
            : prog && prog.totals.untracked > 0
              ? `No session in the period carries a simulation state (${prog.totals.untracked} ran without one)`
              : "No completed session in the period"
        }
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <RangePicker
              id="curriculum-range-scenarioProgression"
              value={progControls.range}
              onChange={r => setRange("scenarioProgression", r)}
            />
            <GroupingPicker
              id="curriculum-grouping-scenarioProgression"
              value={progControls.grain}
              onChange={g => setGrain("scenarioProgression", g)}
              options={PROGRESSION_GRAINS}
            />
          </div>
        }
        onExpand={() => setExpanded("progression")}
        chartId="AAQ-228"
      >
        <div className="flex flex-col gap-2">
          <ScrollableChart data={progSeries}>
            <StackedBarChart data={progSeries} options={progOptions()} />
          </ScrollableChart>
          {progThin > 0 && (
            <p className="text-[11px] text-typography-500">
              {progThin} {bucketTitle(progBucket).toLowerCase()}
              {progThin === 1 ? " has" : "s have"} sessions but fewer than {progMinN}: no bar.
            </p>
          )}
          {progUntracked && (
            <p className="text-[11px] leading-snug text-typography-500">{progUntracked}</p>
          )}
        </div>
      </ChartCard>

      {/* ------------------------- Detail / export ------------------------ */}

      <ChartDetailModal
        open={expanded === "coverage"}
        onClose={() => setExpanded(null)}
        title="Which skills each scenario exercises"
        caption="Every scenario with enough single-scenario slices, with its tags — including tags that map to no helping skill, and custom tags (counted, not named)."
        source={coverageSource}
        render={() => (cov ? <OpportunityGrid rows={cov.scenarios} columns={columns} /> : null)}
        table={cov ? coverageTable(cov) : undefined}
        exportContext={[
          "Window: All time",
          cov ? singleScenarioNote(cov) : "",
          `Scenarios need ${covMinN} single-scenario slices for a row`,
        ].filter(Boolean)}
        exportFilename="scenario-opportunity-coverage"
      />

      <ChartDetailModal
        open={expanded === "repeat"}
        onClose={() => setExpanded(null)}
        title="Same-scenario repeat improvement"
        caption="Every scenario version with a learner who replayed it. Points compare only within one row."
        source={repeatSource}
        render={() =>
          sel && sel.learners ? <ScoreSlope learners={sel.learners} row={row} height={360} /> : null
        }
        table={rep ? repeatTable(rep) : undefined}
        exportContext={[
          "Window: All time",
          `Averages withheld below ${repMinN} pairs`,
          "Scores are raw points on each scenario version's own scale",
        ]}
        exportFilename="scenario-repeat-improvement"
      />

      <ChartDetailModal
        open={expanded === "calibration"}
        onClose={() => setExpanded(null)}
        title="Scenario difficulty calibration"
        caption="Every scenario version with enough scored sessions: its range, ceiling, when its scoring last changed, and every band's share and count."
        source={calibrationSource}
        render={() => <CalibrationRows rows={calRows} />}
        table={cal ? calibrationTable(cal) : undefined}
        exportContext={[
          "Window: All time",
          `Versions need ${calMinN} scored sessions`,
          cal
            ? `${cal.totals.unresolvedExcluded} sessions with an unresolved 0 score excluded`
            : "",
        ].filter(Boolean)}
        exportFilename="scenario-calibration"
      />

      <ChartDetailModal
        open={expanded === "progression"}
        onClose={() => setExpanded(null)}
        title="Did the learner move the client?"
        caption="By scenario over the whole period. Sessions without a usable state are counted, not shared out."
        source={progressionSource}
        render={({ height }) => <StackedBarChart data={progSeries} options={progOptions(height)} />}
        table={prog ? progressionTable(prog) : undefined}
        exportContext={[
          `Window: ${windowLabel(prog?.window)}`,
          `Grouping: ${bucketTitle(progBucket)}`,
          `Shares withheld below ${progMinN} tracked sessions`,
          ...(prog?.window.inProgressBucket
            ? [`${prog.window.inProgressBucket} is still accruing and is left off the chart`]
            : []),
          progUntracked ?? "",
        ].filter(Boolean)}
        exportFilename="scenario-progression"
      />
    </div>
  );
};
