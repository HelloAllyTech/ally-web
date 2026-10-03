import { ReactNode, useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { AreaChart, DonutChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown, InlineNotification } from "@ally-ui-mono/ui-shared";
import {
  useGetFoundationalSkillsBenchmarkQuery,
  useGetFoundationalSkillsProgressQuery,
} from "@api";

import { asOfStamp } from "../analyticsFilters";
import { BenchmarkSlope } from "../BenchmarkSlope";
import { ChangeWhiskers } from "../ChangeWhiskers";
import { ChartDetailModal } from "../ChartDetailModal";
import { ChartCard, KpiTile, ScrollableChart, buildSource, donutOpts, lineOpts } from "../chartKit";
import { CONTEXT, ColorScale, PALETTE } from "../chartScales";
import { FoundationalSkillsLearnerPanel } from "../FoundationalSkillsLearnerPanel";
import {
  BEHAVIOUR_KIND_LABELS,
  COMPOSITE_SCALE,
  FhsBehaviourKind,
  FhsProgressLearner,
  LEVEL_SCALE,
  MEASURABILITY_LABELS,
  OPPORTUNITY_SCALE,
  TIER_LABELS,
  TREND_SCALE,
  UNHELPFUL_SCALE,
  WINDOW_LABELS,
  behaviourProfile,
  buildCompositeBand,
  buildLevelMix,
  buildOpportunity,
  buildTrendMix,
  buildUnhelpfulBand,
  changeVerdict,
  ciText,
  compositeTakeaway,
  credibleMoves,
  cutLabel,
  depthStages,
  hasPlotted,
  learnerName,
  level,
  levelMixWithheld,
  panelOptionLabel,
  pct,
  pValue,
  selfHarmSummary,
  signed,
  skillChangeRows,
  skillsByTier,
  testedMoves,
  trendTakeaway,
  unhelpfulTakeaway,
  windowLabel,
} from "../foundationalSkillsProgressChart";
import { FunnelBars } from "../FunnelBars";
import { SkillCutGrid } from "../SkillCutGrid";

const SKILL_ROWS_HEIGHT = "440px";
const PAGE_SIZE = 20;

type PanelOption = { cuts: number; learners: number };
type WindowKey = "early" | "late";
type SortKey = "change" | "cuts" | "flags" | "name";

const BASELINE_ITEMS: { id: "1" | "2"; label: string }[] = [
  { id: "1", label: "Start at cut 1" },
  { id: "2", label: "Start at cut 2 (skip warm-up)" },
];

const WINDOW_ITEMS: { id: WindowKey; label: string }[] = [
  { id: "early", label: WINDOW_LABELS.early },
  { id: "late", label: WINDOW_LABELS.late },
];

const KIND_ITEMS: { id: FhsBehaviourKind; label: string }[] = [
  { id: "basic", label: "Basic behaviours" },
  { id: "advanced", label: "Advanced behaviours" },
  { id: "unhelpful", label: "Unhelpful behaviours" },
];

const SORT_ITEMS: { id: SortKey; label: string }[] = [
  { id: "change", label: "Biggest own change" },
  { id: "flags", label: "Most coaching flags" },
  { id: "cuts", label: "Most practice" },
  { id: "name", label: "Name" },
];

/** A Carbon area chart with a 95% band (`min`..`max`) around the line. */
const bandOpts = (leftTitle: string, colorScale: ColorScale, domain: [number, number]) =>
  lineOpts({
    leftTitle,
    bottomTitle: "Cut (5,000 characters each; * = warm-up)",
    colorScale,
    domain,
    legend: false,
    extra: {
      bounds: { upperBoundMapsTo: "max", lowerBoundMapsTo: "min" },
      points: { enabled: true, radius: 4 },
      tooltip: {
        valueFormatter: (v: unknown) => (typeof v === "number" ? v.toFixed(2) : "—"),
      },
    },
  });

/** Horizontal stacked bars: one row per skill (`key`), segments by `group`. */
const hStackedOpts = (bottomTitle: string, colorScale: ColorScale, domain?: [number, number]) => ({
  height: SKILL_ROWS_HEIGHT,
  axes: {
    left: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "" },
    bottom: {
      mapsTo: "value",
      scaleType: ScaleTypes.LINEAR,
      stacked: true,
      title: bottomTitle,
      ...(domain ? { domain } : { includeZero: true }),
    },
  },
  color: { scale: colorScale },
  legend: { enabled: true },
  toolbar: { enabled: false },
});

const Section = ({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-semibold text-typography-900">{title}</h3>
      <p className="max-w-4xl text-xs leading-relaxed text-typography-500">{blurb}</p>
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
  selected: T["id"];
  onChange: (id: T["id"]) => void;
}) => (
  <Dropdown
    id={id}
    size="sm"
    type="inline"
    label={label}
    titleText=""
    hideLabel
    items={items}
    itemToString={(i: T) => i?.label ?? ""}
    selectedItem={items.find(i => i.id === selected)}
    onChange={({ selectedItem }: { selectedItem: T }) => selectedItem && onChange(selectedItem.id)}
  />
);

/** A small labelled number for the precision strip. */
const Stat = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="flex flex-col gap-0.5 rounded border border-[#e0e0e0] p-3">
    <span className="text-[11px] text-typography-500">{label}</span>
    <span className="text-lg font-semibold tabular-nums text-typography-900">{value}</span>
    <span className="text-[11px] leading-snug text-typography-500">{note}</span>
  </div>
);

/** A count bar: one segment per outcome, labelled in text so colour is never alone. */
const CountBar = ({ parts }: { parts: { label: string; value: number; color: string }[] }) => {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-sm" aria-hidden>
        {parts
          .filter(p => p.value > 0)
          .map(p => (
            <span
              key={p.label}
              style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
              className="h-full border-r-2 border-white last:border-r-0"
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-typography-700">
        {parts.map(p => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            {p.label}: <span className="tabular-nums font-medium">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const sortLearners = (rows: FhsProgressLearner[], sort: SortKey): FhsProgressLearner[] => {
  const copy = [...rows];
  if (sort === "cuts") copy.sort((a, b) => b.cutsReached - a.cutsReached || b.change - a.change);
  if (sort === "flags")
    copy.sort(
      (a, b) =>
        b.flags.filter(f => f.kind === "safety").length -
          a.flags.filter(f => f.kind === "safety").length || b.flags.length - a.flags.length,
    );
  if (sort === "name") copy.sort((a, b) => learnerName(a).localeCompare(learnerName(b)));
  return copy;
};

/**
 * Highlights → Helping skills — is AI roleplay practice moving the 14
 * foundational helping skills, which ones, for whom, and how sure can we be?
 *
 * ## What changed after the production analysis (2026-10-03)
 *
 * A single cut's score is ~0.20 SD of noise and only ~3% of its variance
 * belongs to the learner (the scenario mix swamps it). The first version of
 * this tab drew fixed bands narrower than that noise and so labelled chance as
 * movement. Now:
 *
 *  - every start→now change carries its 95% interval and is only called a
 *    move when the interval excludes zero ("Calibrate Confidence Expression to
 *    Interaction Stakes": in a high-stakes context, transparency about
 *    uncertainty is non-negotiable);
 *  - a precision strip says up front how big a move must be to be visible;
 *  - skills the measure cannot move (capped by the rubric, rarely tested) are
 *    grouped as "not measurable", never drawn as "no change";
 *  - stable, readable signals — the behaviour profile, who has had a chance
 *    at each skill, practice depth, coaching flags, safety counts — get the
 *    space the retired movement charts used to take;
 *  - the benchmark section is the one place that can show real before/after
 *    change, because it compares the SAME scenario ("Measure true customer
 *    outcomes, not vanity metrics").
 *
 * Self against self only; nothing ranks learners. All-time and platform-wide
 * like Priority, so no page filters reach it.
 */
export const FoundationalSkillsSubTab = () => {
  const [cuts, setCuts] = useState<number | undefined>(undefined);
  const [baseline, setBaseline] = useState<"1" | "2">("1");
  const [levelWindow, setLevelWindow] = useState<WindowKey>("late");
  const [profileKind, setProfileKind] = useState<FhsBehaviourKind>("basic");
  const [sort, setSort] = useState<SortKey>("change");
  const [page, setPage] = useState(0);
  const [openLearner, setOpenLearner] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetFoundationalSkillsProgressQuery({
    cuts,
    baselineFrom: baseline === "2" ? 2 : 1,
  });
  const bench = useGetFoundationalSkillsBenchmarkQuery();

  const loading = isLoading && !data;
  const common = { loading, error: isError, onRetry: refetch };

  const skills = useMemo(() => data?.skills ?? [], [data]);
  const byCut = useMemo(() => data?.byCut ?? [], [data]);
  const behaviours = useMemo(() => data?.behaviours ?? [], [data]);
  const windows = data?.windows ?? { early: [], late: [], from: 1 as const };
  const summary = data?.summary;
  const precision = data?.precision;
  const floor = data?.minSampleSize ?? 20;
  const panelN = summary?.cohortLearners ?? 0;
  const startNow = `start = ${windowLabel(windows.early)}, now = ${windowLabel(windows.late)}`;

  const compositeBand = useMemo(() => buildCompositeBand(byCut), [byCut]);
  const unhelpfulBand = useMemo(() => buildUnhelpfulBand(byCut), [byCut]);
  const { measurable, notMeasurable } = useMemo(() => skillChangeRows(skills), [skills]);
  const levelMix = useMemo(() => buildLevelMix(skills, levelWindow), [skills, levelWindow]);
  const opportunity = useMemo(
    () => buildOpportunity(skills, data?.measuredLearners ?? 0),
    [skills, data?.measuredLearners],
  );
  const profile = useMemo(
    () => behaviourProfile(behaviours, profileKind),
    [behaviours, profileKind],
  );
  const moves = useMemo(() => credibleMoves(behaviours), [behaviours]);
  const trendMix = useMemo(() => (data ? buildTrendMix(data.trend) : []), [data]);
  const learnerRows = useMemo(() => sortLearners(data?.learners ?? [], sort), [data, sort]);
  const pageRows = learnerRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const openRow = learnerRows.find(r => r.id === openLearner) ?? null;

  const mixWithheld = levelMixWithheld(skills, levelWindow);
  const skillName = useMemo(() => new Map(skills.map(s => [s.skill, s.name])), [skills]);
  const gridRows = skillsByTier(skills).map(s => ({
    key: s.skill,
    label:
      s.measurability === "measurable"
        ? s.name
        : `${s.name} (${MEASURABILITY_LABELS[s.measurability].toLowerCase()})`,
    group: TIER_LABELS[s.tier],
  }));

  const asOf = asOfStamp(data?.computedAt);
  const panelSource = buildSource({
    derivation: `Same learners throughout; ${startNow}`,
    window: "All time",
    n: panelN,
    nUnit: "learners",
    extra: data
      ? `Rubric ${data.rubricVersion} · AI-judged, not yet checked against human raters · test orgs excluded`
      : undefined,
    asOf,
  });
  const everyoneSource = buildSource({
    derivation: "Every measured learner",
    window: "All time",
    n: data?.measuredLearners,
    nUnit: "learners measured",
    asOf,
  });
  const exportContext = [data?.provenance.note ?? "", data?.provenance.derivation ?? ""];

  const compositeOpts = useMemo(() => bandOpts("Average level (1–4)", COMPOSITE_SCALE, [1, 4]), []);
  const unhelpfulOpts = useMemo(
    () => bandOpts("Cuts with an unhelpful behaviour (%)", UNHELPFUL_SCALE, [0, 100]),
    [],
  );
  const levelMixOpts = useMemo(
    () => hStackedOpts("Share of assessments (%)", LEVEL_SCALE, [0, 100]),
    [],
  );
  const opportunityOpts = useMemo(() => hStackedOpts("Learners", OPPORTUNITY_SCALE), []);

  const skillTable = {
    columns: [
      "Skill",
      "Tier",
      "Measurable?",
      "Paired learners",
      "Start",
      "Now",
      "Change",
      "95% CI",
      "Up / down",
      "Sign test",
      "Start mix (1/2/3/4)",
      "Now mix (1/2/3/4)",
      "Tested in % of cuts",
      "Learners with 2+ chances",
    ],
    rows: skills.map(s => [
      s.name,
      TIER_LABELS[s.tier],
      MEASURABILITY_LABELS[s.measurability],
      s.n,
      s.earlyAvg,
      s.lateAvg,
      s.change,
      ciText(s.ci),
      `${s.up} / ${s.down}`,
      pValue(s.signP),
      s.levelMix.early.levels?.join(" / ") ?? `n = ${s.levelMix.early.assessments}`,
      s.levelMix.late.levels?.join(" / ") ?? `n = ${s.levelMix.late.assessments}`,
      s.opportunityPct,
      s.learnersWithTwoPlus,
    ]),
  };
  const cutTable = {
    columns: [
      "Cut",
      "Learners",
      "Overall",
      "Overall 95% CI",
      ...(["engage", "understand", "support"] as const).map(t => TIER_LABELS[t]),
      "Unhelpful %",
      "Unhelpful 95% CI",
      ...skills.map(s => s.name),
    ],
    rows: byCut.map(c => [
      cutLabel(c.cut),
      c.learners,
      c.composite,
      ciText(c.compositeCi),
      ...(["engage", "understand", "support"] as const).map(
        t => c.tiers.find(x => x.tier === t)?.avgLevel ?? null,
      ),
      c.unhelpfulPct,
      ciText(c.unhelpfulCi, 1),
      ...skills.map(s => c.skills.find(x => x.skill === s.skill)?.avgLevel ?? null),
    ]),
  };

  const options: PanelOption[] = data?.cohortOptions ?? [];
  const sh = data?.safety.selfHarm;
  const conf = data?.safety.confidentiality;
  const b = bench.data;

  return (
    <div className="flex flex-col gap-8">
      {/* The panel and the baseline: which learners and which cuts every comparison uses. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-typography-900">
            Compare the same learners:
          </span>
          {options.length > 0 ? (
            <Dropdown
              id="fhs-panel"
              size="sm"
              type="inline"
              label="Panel"
              titleText=""
              hideLabel
              items={options}
              itemToString={(o: PanelOption) => (o ? panelOptionLabel(o) : "")}
              selectedItem={options.find(o => o.cuts === data?.cuts) ?? null}
              onChange={({ selectedItem }: { selectedItem: PanelOption }) => {
                if (!selectedItem) return;
                setCuts(selectedItem.cuts);
                setPage(0);
              }}
            />
          ) : (
            <span className="text-sm text-typography-500">
              {loading ? "Loading…" : "no panel yet"}
            </span>
          )}
          <InlinePicker
            id="fhs-baseline"
            label="Baseline"
            items={BASELINE_ITEMS}
            selected={baseline}
            onChange={setBaseline}
          />
          {isFetching && !loading && <span className="text-xs text-typography-500">Updating…</span>}
        </div>
        <p className="max-w-4xl text-xs leading-relaxed text-typography-500">
          Each learner's roleplay speech is cut into 5,000-character slices, and each slice is
          scored 1–4 on 14 foundational helping skills by an AI judge, whatever the scenario.
          Everything above the People section follows the same learners — those whose first{" "}
          {data?.cuts ?? "N"} cuts are all scored — so "start" (
          {windowLabel(windows.early) || "their first cuts"}) and "now" (
          {windowLabel(windows.late) || "their latest cuts"}) are the same people. Cut 1 often
          behaves like a warm-up; "Start at cut 2" leaves it out.{" "}
          {data && `${data.measuredLearners} learners have at least one scored cut.`}
        </p>
        {data && options.length === 0 && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Not enough practice to compare yet"
            subtitle={`A comparison needs at least ${data.minCohortSize} learners with two or more scored cuts.`}
          />
        )}
      </div>

      {/* How precise the measure is — read this before any chart below. */}
      <ChartCard
        wide
        title="How precise is this measure?"
        caption="How big a change has to be before this measure can see it. Every chart below should be read against these numbers."
        source={everyoneSource}
        {...common}
        chartId="AAQ-187"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="Slice-to-slice noise"
            value={
              precision?.cutNoiseSd !== null && precision
                ? `±${precision.cutNoiseSd.toFixed(2)}`
                : "—"
            }
            note="How much one learner's score moves between slices with no real change (SD, 1–4 scale)"
          />
          <Stat
            label="Learner signal (ICC)"
            value={precision?.icc !== null && precision ? precision.icc.toFixed(2) : "—"}
            note="Share of a slice's score that is about the learner rather than the slice — near 0 means one slice says little"
          />
          <Stat
            label="Smallest detectable change"
            value={
              precision?.minimumDetectableChange != null
                ? precision.minimumDetectableChange.toFixed(2)
                : "—"
            }
            note={`For this panel of ${panelN} learners (80% power)`}
          />
          <Stat
            label="One learner must move"
            value={precision?.learnerBand != null ? `±${precision.learnerBand.toFixed(2)}` : "—"}
            note="Start → now, before their own change is more than noise"
          />
          <Stat
            label="Level / code consistency"
            value={
              precision
                ? `${precision.levelCodeMismatches} of ${precision.levelsChecked.toLocaleString()}`
                : "—"
            }
            note="Stored levels that disagree with the behaviour codes the judge ticked"
          />
          <Stat
            label="Human-rater agreement"
            value="Not yet"
            note="No study yet comparing the AI judge with trained raters — treat scores as practice feedback, not assessment"
          />
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          label="Overall score, start → now"
          description={
            summary
              ? `Same ${panelN} learners, ${startNow}. ${compositeTakeaway(summary) ?? ""}`
              : "Same learners, start vs now"
          }
          value={
            summary && summary.earlyComposite !== null && summary.lateComposite !== null
              ? `${level(summary.earlyComposite)} → ${level(summary.lateComposite)}`
              : "—"
          }
          n={panelN}
          nUnit="learners"
          minN={floor}
          {...common}
          chartId="AAQ-168"
        />
        <KpiTile
          label="Unhelpful behaviour, start → now"
          description={
            summary
              ? `Learners with any skill scored 1. ${unhelpfulTakeaway(summary.unhelpful) ?? ""}`
              : "Learners with any skill scored 1"
          }
          value={
            summary && summary.unhelpful.earlyPct !== null
              ? `${pct(summary.unhelpful.earlyPct)} → ${pct(summary.unhelpful.latePct)}`
              : "—"
          }
          n={panelN}
          nUnit="learners"
          minN={floor}
          {...common}
          chartId="AAQ-169"
        />
        <KpiTile
          label="Learners beyond noise"
          description={
            data
              ? `Own first half of cuts vs last half, all learners with ${data.thresholds.trendMinCuts}+ cuts, against a band sized to the noise. ${data.trend.steady} within noise, ${data.trend.tooEarly} too early to say.`
              : "Against their own start"
          }
          value={data ? `${data.trend.improving} up · ${data.trend.declining} down` : "—"}
          {...common}
          chartId="AAQ-171"
        />
      </div>

      <Section
        title="Overall"
        blurb="The whole skill set as one score, and how often an unhelpful behaviour appears, cut by cut for the same learners — with the 95% band each point could plausibly sit in."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Overall score, cut by cut"
            caption={`Average level at each cut for the same ${panelN} learners, with a 95% band. A line inside the band of its neighbours has not moved. * Cut 1 is often a warm-up. Below: each tier start → now.`}
            source={panelSource}
            takeaway={summary ? compositeTakeaway(summary) : undefined}
            {...common}
            empty={!loading && !hasPlotted(compositeBand)}
            emptyText={`Needs a panel of at least ${floor} learners`}
            onExpand={() => setExpanded("cuts")}
            chartId="AAQ-172"
          >
            <ScrollableChart data={compositeBand}>
              <AreaChart data={compositeBand} options={compositeOpts} />
            </ScrollableChart>
            <table className="mt-3 w-full text-xs">
              <thead className="text-left text-typography-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Tier</th>
                  <th className="py-1 pr-3 font-medium">Start → now</th>
                  <th className="py-1 pr-3 font-medium">Change [95% CI]</th>
                  <th className="py-1 font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {(data?.tiers ?? []).map(t => (
                  <tr key={t.tier} className="border-t border-[#f0f0f0]">
                    <td className="py-1 pr-3">{TIER_LABELS[t.tier]}</td>
                    <td className="py-1 pr-3 tabular-nums">
                      {level(t.earlyAvg)} → {level(t.lateAvg)}
                    </td>
                    <td className="py-1 pr-3 tabular-nums">
                      {signed(t.change)} [{ciText(t.ci)}]
                    </td>
                    <td className="py-1">{changeVerdict(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>

          <ChartCard
            title="Unhelpful behaviour, cut by cut"
            caption="Share of these learners whose cut showed at least one unhelpful or potentially harmful behaviour (any skill scored 1), with a 95% band. Lower is better. * Cut 1 is often a warm-up."
            source={panelSource}
            takeaway={summary ? unhelpfulTakeaway(summary.unhelpful) : undefined}
            {...common}
            empty={!loading && !hasPlotted(unhelpfulBand)}
            emptyText={`Needs a panel of at least ${floor} learners`}
            onExpand={() => setExpanded("cuts")}
            chartId="AAQ-173"
          >
            <ScrollableChart data={unhelpfulBand}>
              <AreaChart data={unhelpfulBand} options={unhelpfulOpts} />
            </ScrollableChart>
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Skill by skill"
        blurb="Which of the 14 skills move, which don't, and which this measure can't move at all. A skill counts for a learner only when their practice gave a chance to show it at both the start and now."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            wide
            title="Change per skill, start → now"
            caption={`Each learner's level now minus at the start, averaged over the learners with a chance at the skill in both, with its 95% interval. Coloured only when the interval excludes zero (green up, red down); grey means no detectable change. ${
              summary
                ? `${summary.skills.detectableUp} detectably up, ${summary.skills.detectableDown} detectably down, ${summary.skills.noDetectableChange} no detectable change, ${summary.skills.notMeasurable} not measurable.`
                : ""
            }`}
            source={panelSource}
            {...common}
            empty={!loading && skills.length === 0}
            emptyText="No panel yet"
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-174"
          >
            <ChangeWhiskers
              rows={measurable.map(s => ({
                key: s.skill,
                label: s.name,
                sublabel: TIER_LABELS[s.tier],
                change: s.change,
                ci: s.ci,
                n: s.n,
                detectable: s.detectable,
              }))}
            />
            {notMeasurable.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-typography-500">
                  Not measurable on this rubric yet
                </p>
                <ul className="flex flex-col gap-1 text-xs text-typography-700">
                  {notMeasurable.map(s => (
                    <li key={s.skill}>
                      <span className="font-medium">{s.name}</span> —{" "}
                      {s.measurability === "rare"
                        ? `rarely tested (${pct(s.opportunityPct)} of cuts; ${s.learnersWithTwoPlus} learners have had 2+ chances)`
                        : "capped by the rubric: almost every score sits at one level, so it cannot show a change"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Level mix per skill, start vs now"
            caption={`Share of the skill's assessments at each level, ${
              levelWindow === "early"
                ? `at the start (${windowLabel(windows.early)})`
                : `now (${windowLabel(windows.late)})`
            }. Red is an unhelpful behaviour; dark blue is basic plus advanced. A skill sitting at one level in both windows is capped by the rubric.${
              mixWithheld.length
                ? ` ${mixWithheld.length} skill(s) have fewer than ${floor} assessments and are not drawn.`
                : ""
            }`}
            source={panelSource}
            {...common}
            empty={!loading && levelMix.length === 0}
            emptyText={`No skill has ${floor} assessments in this window yet`}
            height={SKILL_ROWS_HEIGHT}
            controls={
              <InlinePicker
                id="fhs-level-window"
                label="Window"
                items={WINDOW_ITEMS}
                selected={levelWindow}
                onChange={setLevelWindow}
              />
            }
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-177"
          >
            <StackedBarChart data={levelMix} options={levelMixOpts} />
          </ChartCard>

          <ChartCard
            title="Learners with a chance at each skill"
            caption={`Of the ${data?.measuredLearners ?? "—"} measured learners: how many have had two or more chances to show each skill, one, or none — fewest at the top. A skill practice rarely gives a chance at cannot show progress, however good learners get at it: a content gap, not a learning one.`}
            source={everyoneSource}
            {...common}
            empty={!loading && opportunity.length === 0}
            emptyText="No scored cuts yet"
            height={SKILL_ROWS_HEIGHT}
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-178"
          >
            <StackedBarChart data={opportunity} options={opportunityOpts} />
          </ChartCard>

          <ChartCard
            title="Every skill, cut by cut"
            caption={`Average level on each skill at each cut, same learners, grouped by tier. Darker is higher. A dash is fewer than ${floor} learners with a chance at the skill at that cut. Most scores are level 2, so this grid is a diagnostic, not a trend.`}
            source={panelSource}
            {...common}
            empty={!loading && byCut.length === 0}
            emptyText="No panel yet"
            onExpand={() => setExpanded("cuts")}
            chartId="AAQ-176"
          >
            <SkillCutGrid
              rows={gridRows}
              cuts={byCut.map(c => c.cut)}
              caption="Average level per skill and cut"
              cell={(skill, cut) => {
                const s = byCut.find(c => c.cut === cut)?.skills.find(x => x.skill === skill);
                if (!s) return { value: null };
                return {
                  value: s.avgLevel,
                  title:
                    s.avgLevel === null
                      ? `n = ${s.learners} · need ${floor}`
                      : `n = ${s.learners} learners`,
                };
              }}
            />
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Behaviours"
        blurb="The rubric's own behaviours — what helpers do and don't do — which is steadier than the 1–4 levels and shows movement the capped skills hide."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ChartCard
              title="Behaviour profile"
              caption={`Share of ALL measured learners showing each behaviour at least once — in their first slice (grey) and in any slice (blue) — among those whose practice gave the skill a chance. Shares over fewer than ${floor} learners are left out.`}
              source={everyoneSource}
              {...common}
              empty={!loading && profile.length === 0}
              emptyText="No behaviours observed yet"
              controls={
                <InlinePicker
                  id="fhs-profile-kind"
                  label="Kind"
                  items={KIND_ITEMS}
                  selected={profileKind}
                  onChange={setProfileKind}
                />
              }
              onExpand={() => setExpanded("behaviours")}
              chartId="AAQ-184"
            >
              <ul className="flex flex-col divide-y divide-[#e0e0e0]">
                {profile.map(bh => (
                  <li key={bh.code} className="flex flex-col gap-1 py-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm text-typography-900">{bh.text}</p>
                        <p className="text-[11px] text-typography-500">
                          {skillName.get(bh.skill) ?? bh.skill} · n = {bh.everLearners}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                        <span className="text-typography-500">first {pct(bh.firstSlicePct)}</span>
                        <span className="font-medium text-typography-900">
                          ever {pct(bh.everPct)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5" aria-hidden>
                      <span
                        className="block h-1 rounded-sm"
                        style={{ width: `${bh.firstSlicePct ?? 0}%`, background: CONTEXT.faint }}
                      />
                      <span
                        className="block h-1 rounded-sm"
                        style={{ width: `${bh.everPct ?? 0}%`, background: PALETTE.blue }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>

          <ChartCard
            title="Behaviours that moved"
            caption={`Start → now for the same learners, shown only when the move survives a correction for testing ${testedMoves(behaviours)} behaviours at once (Benjamini–Hochberg, q ≤ ${data?.thresholds.behaviourQ ?? 0.05}). Without the correction, the biggest few movers out of ~100 are just the luckiest draws.`}
            source={panelSource}
            {...common}
            chartId="AAQ-179"
          >
            {moves.length === 0 ? (
              <div className="flex flex-col gap-2 text-sm text-typography-700">
                <p>No behaviour moved beyond chance for this panel.</p>
                <p className="text-xs text-typography-500">
                  The expanded view lists every behaviour with its raw change and q-value, for
                  re-checking as the panel grows.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[#e0e0e0]">
                {moves.map(m => {
                  const good =
                    m.kind === "unhelpful" ? (m.changePts ?? 0) < 0 : (m.changePts ?? 0) > 0;
                  return (
                    <li key={m.code} className="flex flex-col gap-0.5 py-2">
                      <p className="text-sm text-typography-900">{m.text}</p>
                      <p className="text-xs tabular-nums text-typography-700">
                        {pct(m.earlyPct)} → {pct(m.latePct)} ({signed(m.changePts, 0)} pts;{" "}
                        {m.gained} gained, {m.lost} lost; q=
                        {m.q?.toFixed(3)}) · {good ? "better" : "worse"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Safety (internal)"
        blurb="The skills that matter most and are tested least. AI-judge coding of simulated conversations, not yet audited by a clinician: share only privately, as aggregates, with partners' clinical leads."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Self-harm cues: followed up or missed"
            caption="A cue is a slice where the client hinted at hopelessness, self-harm, suicide or harm to or from others (or the helper raised it). Followed up = asked about it; missed = the judge coded that the helper did not ask; unclear = both or neither coded (a slice can span sessions)."
            source={everyoneSource}
            takeaway={sh ? selfHarmSummary(sh) : undefined}
            {...common}
            empty={!loading && (!sh || sh.learnersWithCue === 0)}
            emptyText="No learner has met a self-harm cue yet"
            chartId="AAQ-185"
          >
            {sh && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-typography-700">
                    First cue, per learner ({sh.learnersWithCue})
                  </p>
                  <CountBar
                    parts={[
                      {
                        label: "Followed up",
                        value: sh.learnersFollowedFirst,
                        color: PALETTE.green,
                      },
                      { label: "Missed", value: sh.learnersMissedFirst, color: PALETTE.red },
                      { label: "Unclear", value: sh.learnersAmbiguousFirst, color: CONTEXT.faint },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-typography-700">
                    Every cue slice ({sh.cutsWithCue})
                  </p>
                  <CountBar
                    parts={[
                      { label: "Followed up", value: sh.cutsFollowedUp, color: PALETTE.green },
                      { label: "Missed", value: sh.cutsMissed, color: PALETTE.red },
                      { label: "Unclear", value: sh.cutsAmbiguous, color: CONTEXT.faint },
                    ]}
                  />
                  <p className="text-[11px] text-typography-500">
                    {sh.cutsWithAdvanced} slice(s) also explored risk or agreed a safety plan.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-typography-700">
                    Learners who met a cue more than once ({sh.repeatLearners}): first vs latest
                  </p>
                  <CountBar
                    parts={[
                      { label: "Better", value: sh.repeatBetter, color: PALETTE.green },
                      { label: "Same", value: sh.repeatSame, color: CONTEXT.line },
                      { label: "Worse", value: sh.repeatWorse, color: PALETTE.red },
                    ]}
                  />
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Confidentiality: explained, limits, promises"
            caption="Learners whose practice raised confidentiality, and what they said at least once. Explaining its limits (self-harm, harm to others) is the safe practice; promising it without exceptions is the risky one."
            source={everyoneSource}
            {...common}
            empty={!loading && (!conf || conf.learnersAssessable === 0)}
            emptyText="No practice has raised confidentiality yet"
            chartId="AAQ-186"
          >
            {conf && (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-xs text-typography-500">
                  {conf.learnersAssessable} learners had a chance ({conf.cutsAssessable} slices);
                  only {conf.learnersWithTwoPlus} had two or more, so this cannot show change yet.
                </p>
                <ul className="flex flex-col gap-1.5 text-typography-800">
                  <li>
                    <span className="tabular-nums font-semibold">{conf.learnersExplained}</span>{" "}
                    explained what confidentiality means
                  </li>
                  <li>
                    <span className="tabular-nums font-semibold">
                      {conf.learnersListedExceptions}
                    </span>{" "}
                    listed its limits for self-harm or harm to others
                  </li>
                  <li>
                    <span className="tabular-nums font-semibold">{conf.learnersExplainedWhy}</span>{" "}
                    explained why it can be important to break it
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: PALETTE.red }}
                      aria-hidden
                    />
                    <span className="tabular-nums font-semibold">
                      {conf.learnersPromisedAbsolute}
                    </span>{" "}
                    promised it without any exceptions
                  </li>
                  <li>
                    <span className="tabular-nums font-semibold">{conf.learnersInaccurate}</span>{" "}
                    described it inaccurately
                  </li>
                </ul>
              </div>
            )}
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Benchmark: same scenario, before and after"
        blurb="The one comparison that can honestly show whether skills improved: each learner against themselves on the SAME scenario, taken early and again after more practice — no scenario mix to swamp the change."
      >
        <ChartCard
          wide
          title="Benchmark scenario, before and after"
          caption={
            b
              ? `Each line is one learner's first and latest scored session of the same benchmark scenario, at least ${b.minCutsBetween} cuts of practice apart; the bold line is the average, coloured only when its 95% interval excludes zero. Sessions with under ${b.minLearnerChars.toLocaleString()} characters of the learner's own speech are not scored.`
              : "Each learner's first and latest session of the same benchmark scenario."
          }
          source={buildSource({
            derivation: "Same scenario, same judge, same rubric",
            window: "All time",
            n: b?.summary.learners,
            nUnit: "paired learners",
            asOf: asOfStamp(b?.computedAt),
          })}
          takeaway={
            b && b.summary.change !== null
              ? `${signed(b.summary.change)} (95% CI ${ciText(b.summary.changeCi)}; ${b.summary.up} up, ${b.summary.down} down, ${pValue(
                  b.summary.signP,
                )}): ${b.summary.detectable ? "a detectable change" : "no detectable change"}.`
              : undefined
          }
          loading={bench.isLoading && !b}
          error={bench.isError}
          onRetry={bench.refetch}
          errorSubtitle="The benchmark endpoint did not respond — it may not be deployed yet."
          empty={!bench.isLoading && !!b && (b.scenarios.length === 0 || b.learners.length === 0)}
          emptyText={
            b && b.scenarios.length === 0
              ? "No benchmark scenario yet. Mark one scenario as the foundational-skills benchmark in the simulation editor; learners take it at onboarding and again after about five cuts."
              : `Benchmark set (${b?.scenarios.map(s => s.title).join(", ")}). ${b?.coverage.learnersWithOne ?? 0} learner(s) have taken it once; none has a second session ${b?.minCutsBetween ?? 3}+ cuts later yet.`
          }
          onExpand={() => setExpanded("benchmark")}
          chartId="AAQ-189"
        >
          {b && b.learners.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <BenchmarkSlope data={b} />
                {b.summary.change === null && (
                  <p className="text-xs text-typography-500">
                    n = {b.summary.learners} paired · need {b.minSampleSize} before an average is
                    shown.
                  </p>
                )}
              </div>
              <ChangeWhiskers
                rows={b.skills.map(s => ({
                  key: s.skill,
                  label: s.name,
                  change: s.change,
                  ci: s.changeCi,
                  n: s.pairedLearners,
                  detectable: s.detectable,
                }))}
              />
            </div>
          )}
        </ChartCard>
      </Section>

      <Section
        title="People"
        blurb="Who is measurable, how each learner moved against their own start — never against each other — and what to coach. The first two cover everyone measured, not just the panel."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Practice depth"
            caption="Learners reaching each number of scored cuts. Only learners with several cuts can show change at all."
            source={everyoneSource}
            {...common}
            empty={!loading && !data?.depth.some(d => d.learners > 0)}
            emptyText="No scored cuts yet"
            chartId="AAQ-188"
          >
            <FunnelBars stages={depthStages(data?.depth ?? [])} unit="learners" />
          </ChartCard>

          <ChartCard
            title="Learners against their own start"
            caption={
              data
                ? `Every learner with ${data.thresholds.trendMinCuts}+ scored cuts: their last half of cuts against their first half, called up or down only beyond a band sized to the slice noise (it narrows as cuts accumulate). Fewer cuts is too early to say.`
                : "Each learner against their own first cuts."
            }
            source={everyoneSource}
            takeaway={data ? trendTakeaway(data.trend, data.thresholds.trendMinCuts) : undefined}
            {...common}
            empty={!loading && trendMix.length === 0}
            emptyText="No learners measured yet"
            chartId="AAQ-181"
          >
            <DonutChart
              data={trendMix}
              options={donutOpts({ centerLabel: "learners", colorScale: TREND_SCALE })}
            />
          </ChartCard>

          <ChartCard
            wide
            title="Learners"
            caption={`The ${panelN} learners in the panel: start and now, their change against the ±${
              precision?.learnerBand?.toFixed(2) ?? "—"
            } a single learner must clear to be more than noise, and coaching flags — any safety behaviour, and any other unhelpful behaviour seen in two or more cuts. Select a learner for every skill and scenario, cut by cut.${
              data?.learnersTruncated ? ` Showing the first ${data.thresholds.maxLearnerRows}.` : ""
            }`}
            source={panelSource}
            {...common}
            empty={!loading && learnerRows.length === 0}
            emptyText="No learners in the panel yet"
            controls={
              <InlinePicker
                id="fhs-learner-sort"
                label="Sort"
                items={SORT_ITEMS}
                selected={sort}
                onChange={id => {
                  setSort(id);
                  setPage(0);
                }}
              />
            }
            onExpand={() => setExpanded("learners")}
            chartId="AAQ-183"
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-typography-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Learner</th>
                    <th className="py-2 pr-3 font-medium">Cuts</th>
                    <th className="py-2 pr-3 font-medium">Start → now</th>
                    <th className="py-2 pr-3 font-medium">Change</th>
                    <th className="py-2 pr-3 font-medium">Unhelpful, start → now</th>
                    <th className="py-2 font-medium">Coaching flags</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.id} className="border-t border-[#e0e0e0] align-top">
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          className="cursor-pointer text-left text-[#264D8E] underline-offset-2 hover:underline"
                          onClick={() => setOpenLearner(r.id)}
                        >
                          {learnerName(r)}
                        </button>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.cutsReached}</td>
                      <td className="py-2 pr-3 tabular-nums text-typography-500">
                        {level(r.earlyComposite)} → {level(r.lateComposite)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {signed(r.change)}{" "}
                        <span className="text-xs text-typography-500">
                          {r.beyondNoise
                            ? "· beyond noise"
                            : r.band !== null
                              ? "· within noise"
                              : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {r.unhelpfulEarly ? "Yes" : "No"} → {r.unhelpfulLate ? "Yes" : "No"}
                      </td>
                      <td className="py-2">
                        {r.flags.length === 0 ? (
                          <span className="text-xs text-typography-500">—</span>
                        ) : (
                          <ul className="flex flex-col gap-0.5 text-xs">
                            {r.flags.slice(0, 2).map(f => (
                              <li key={f.code} className="flex items-start gap-1.5">
                                <span
                                  className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    background: f.kind === "safety" ? PALETTE.red : PALETTE.orange,
                                  }}
                                  aria-hidden
                                />
                                <span>
                                  {f.kind === "safety" ? "Safety: " : ""}
                                  {f.text}{" "}
                                  <span className="text-typography-500">
                                    (cuts {f.cuts.join(", ")}
                                    {f.recent ? ", recent" : ""})
                                  </span>
                                </span>
                              </li>
                            ))}
                            {r.flags.length > 2 && (
                              <li className="text-typography-500">+{r.flags.length - 2} more</li>
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {learnerRows.length > PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between text-xs text-typography-500">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, learnerRows.length)} of{" "}
                  {learnerRows.length}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="cursor-pointer disabled:cursor-default disabled:opacity-40"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer disabled:cursor-default disabled:opacity-40"
                    disabled={(page + 1) * PAGE_SIZE >= learnerRows.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </span>
              </div>
            )}
          </ChartCard>
        </div>
      </Section>

      {data && (
        <p className="max-w-4xl text-[11px] leading-relaxed text-typography-500">
          {data.provenance.derivation} {data.provenance.note}
        </p>
      )}

      <ChartDetailModal
        open={expanded === "cuts"}
        onClose={() => setExpanded(null)}
        title="Cut by cut, same learners"
        caption={`Overall, tiers, unhelpful rate and every skill at each cut, with 95% intervals. Blank = fewer than ${floor} learners.`}
        source={panelSource}
        render={({ height }) => (
          <AreaChart data={compositeBand} options={{ ...compositeOpts, height }} />
        )}
        table={cutTable}
        exportContext={exportContext}
        exportFilename="helping-skills-by-cut"
      />
      <ChartDetailModal
        open={expanded === "skills"}
        onClose={() => setExpanded(null)}
        title="Skill by skill, start → now"
        caption={`Paired over the panel (${startNow}), with 95% intervals and sign tests. Mix counts are skill assessments at levels 1/2/3/4. "Tested" and "chances" are platform-wide.`}
        source={panelSource}
        render={() => null}
        table={skillTable}
        exportContext={exportContext}
        exportFilename="helping-skills-by-skill"
      />
      <ChartDetailModal
        open={expanded === "behaviours"}
        onClose={() => setExpanded(null)}
        title="Behaviours: profile and moves"
        caption="Every rubric behaviour: share of all learners showing it in their first slice and ever, and the panel's start → now move with its sign test and Benjamini–Hochberg q-value."
        source={panelSource}
        render={() => null}
        table={{
          columns: [
            "Behaviour",
            "Skill",
            "Kind",
            "First slice %",
            "Ever %",
            "Paired learners",
            "Start %",
            "Now %",
            "Change (pts)",
            "Gained / lost",
            "Sign test",
            "q",
            "Credible move",
          ],
          rows: behaviours.map(bh => [
            bh.text,
            skillName.get(bh.skill) ?? bh.skill,
            BEHAVIOUR_KIND_LABELS[bh.kind],
            bh.firstSlicePct,
            bh.everPct,
            bh.pairedLearners,
            bh.earlyPct,
            bh.latePct,
            bh.changePts,
            `${bh.gained} / ${bh.lost}`,
            pValue(bh.signP),
            bh.q,
            bh.credible ? "Yes" : "No",
          ]),
        }}
        exportContext={exportContext}
        exportFilename="helping-skills-behaviours"
      />
      <ChartDetailModal
        open={expanded === "learners"}
        onClose={() => setExpanded(null)}
        title="Learners"
        caption="Every learner in the panel: own start vs now against their noise band, with coaching flags."
        source={panelSource}
        render={() => null}
        table={{
          columns: [
            "Learner",
            "Cuts",
            "Start",
            "Now",
            "Change",
            "Noise band ±",
            "Beyond noise",
            "Unhelpful at start",
            "Unhelpful now",
            "Coaching flags",
          ],
          rows: learnerRows.map(r => [
            learnerName(r),
            r.cutsReached,
            r.earlyComposite,
            r.lateComposite,
            r.change,
            r.band,
            r.beyondNoise ?? "no",
            r.unhelpfulEarly ? "Yes" : "No",
            r.unhelpfulLate ? "Yes" : "No",
            r.flags
              .map(
                f => `${f.kind === "safety" ? "SAFETY " : ""}${f.code} (cuts ${f.cuts.join(" ")})`,
              )
              .join("; "),
          ]),
        }}
        exportContext={exportContext}
        exportFilename="helping-skills-learners"
      />
      <ChartDetailModal
        open={expanded === "benchmark"}
        onClose={() => setExpanded(null)}
        title="Benchmark scenario, before and after"
        caption="Each paired learner's first and latest session of the same benchmark scenario."
        render={() =>
          b && b.learners.length > 0 ? <BenchmarkSlope data={b} height={360} /> : null
        }
        table={{
          columns: [
            "Learner",
            "First session",
            "Cuts before",
            "First",
            "Latest session",
            "Cuts before",
            "Latest",
            "Change",
          ],
          rows: (b?.learners ?? []).map(l => [
            learnerName(l),
            l.first.endedAt.slice(0, 10),
            l.first.cutsBefore,
            l.first.composite,
            l.latest.endedAt.slice(0, 10),
            l.latest.cutsBefore,
            l.latest.composite,
            l.change,
          ]),
        }}
        exportContext={exportContext}
        exportFilename="helping-skills-benchmark"
      />

      <FoundationalSkillsLearnerPanel
        learnerId={openLearner}
        row={openRow}
        skills={skills}
        behaviours={behaviours}
        onClose={() => setOpenLearner(null)}
      />
    </div>
  );
};
