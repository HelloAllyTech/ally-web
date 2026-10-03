import { ReactNode, useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { DonutChart, LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown, InlineNotification } from "@ally-ui-mono/ui-shared";
import { useGetFoundationalSkillsProgressQuery } from "@api";

import { asOfStamp } from "../analyticsFilters";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  CHART_HEIGHT,
  ChartCard,
  KpiTile,
  ScrollableChart,
  buildSource,
  donutOpts,
  hBarOpts,
  lineOpts,
  timeBarOpts,
} from "../chartKit";
import { CONTEXT, ColorScale, PALETTE } from "../chartScales";
import { FoundationalSkillsLearnerPanel } from "../FoundationalSkillsLearnerPanel";
import {
  BEHAVIOUR_KIND_LABELS,
  DIRECTION_SCALE,
  DOSE_SCALE,
  FhsBehaviourKind,
  FhsProgressLearner,
  LEVEL_SCALE,
  OPPORTUNITY_SCALE,
  TIER_LABELS,
  TIER_SCALE,
  TRANSITION_SCALE,
  TREND_LABELS,
  TREND_SCALE,
  UNHELPFUL_SCALE,
  WINDOW_LABELS,
  behaviourMovers,
  buildDose,
  buildLevelMix,
  buildOpportunity,
  buildSkillChange,
  buildTierSeries,
  buildTransitions,
  buildTrendMix,
  buildUnhelpfulSeries,
  buildWhoMoved,
  ceilingSkills,
  cutLabel,
  hasPlotted,
  learnerName,
  level,
  levelMixWithheld,
  panelOptionLabel,
  pct,
  signed,
  skillChangeTakeaway,
  tierTakeaway,
  transitionsTakeaway,
  trendTakeaway,
  windowLabel,
  withheldSkills,
} from "../foundationalSkillsProgressChart";
import { SkillCutGrid } from "../SkillCutGrid";

/** Fourteen skill rows need more height than a default tile to stay legible. */
const SKILL_ROWS_HEIGHT = "440px";
const PAGE_SIZE = 20;

type PanelOption = { cuts: number; learners: number };
type WindowKey = "early" | "late";
type SortKey = "change" | "cuts" | "name";

const WINDOW_ITEMS: { id: WindowKey; label: string }[] = [
  { id: "early", label: WINDOW_LABELS.early },
  { id: "late", label: WINDOW_LABELS.late },
];

const KIND_ITEMS: { id: FhsBehaviourKind | "all"; label: string }[] = [
  { id: "all", label: "All behaviours" },
  { id: "unhelpful", label: "Unhelpful" },
  { id: "basic", label: "Basic" },
  { id: "advanced", label: "Advanced" },
];

const SORT_ITEMS: { id: SortKey; label: string }[] = [
  { id: "change", label: "Biggest own change" },
  { id: "cuts", label: "Most practice" },
  { id: "name", label: "Name" },
];

/** Horizontal bars with the category on `key` — one series, one colour. */
const hKeyBarOpts = ({
  bottomTitle,
  colorScale,
  domain,
  height = SKILL_ROWS_HEIGHT,
}: {
  bottomTitle: string;
  colorScale: ColorScale;
  domain?: [number, number];
  height?: string;
}) => ({
  height,
  axes: {
    left: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "" },
    bottom: {
      mapsTo: "value",
      scaleType: ScaleTypes.LINEAR,
      title: bottomTitle,
      ...(domain ? { domain } : { includeZero: true }),
    },
  },
  color: { scale: colorScale },
  legend: { enabled: false },
  toolbar: { enabled: false },
});

/** Horizontal stacked bars: one row per skill (`key`), segments by `group`. */
const hStackedOpts = ({
  bottomTitle,
  colorScale,
  domain,
  height = SKILL_ROWS_HEIGHT,
}: {
  bottomTitle: string;
  colorScale: ColorScale;
  domain?: [number, number];
  height?: string;
}) => ({
  height,
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

const sortLearners = (rows: FhsProgressLearner[], sort: SortKey): FhsProgressLearner[] => {
  const copy = [...rows];
  if (sort === "cuts") copy.sort((a, b) => b.cutsReached - a.cutsReached || b.change - a.change);
  if (sort === "name") copy.sort((a, b) => learnerName(a).localeCompare(learnerName(b)));
  // "change" is the server's order: biggest own change first.
  return copy;
};

/**
 * Highlights → Skills — is AI roleplay practice moving the 14 foundational
 * helping skills, and which ones, for whom?
 *
 * ## One panel of the same people
 *
 * Every "by cut" line and every "start → now" pair is taken over ONE fixed
 * group: the learners whose first N cuts are all scored (picker at the top;
 * the default is the largest group of at least 20). The same people stand at
 * both ends of every comparison, so nothing here moves because the learners
 * who kept practising were different to begin with. "Start" and "now" are the
 * first and last ⌊N/2⌋ cuts, never a single noisy slice.
 *
 * ## Four altitudes
 *
 * 1. **Overall** — the whole skill set as one score and three tiers (the
 *    horizontal view of a development portfolio), plus the unhelpful rate.
 * 2. **Skill by skill** — the vertical view: change, who moved, the full grid,
 *    the level mix, and how often practice even tests each skill. The last one
 *    matters most early on: a skill practice rarely tests cannot show progress,
 *    and a skill stuck at one level in both windows is a rubric ceiling, not a
 *    stall. Both are named on the tab rather than left to be misread.
 * 3. **Behaviours** — the rubric's own codes: which unhelpful behaviours fell
 *    away and which basic and advanced ones were picked up.
 * 4. **People** — every learner against their own start, change by amount of
 *    practice, and the list with a per-person panel. Self against self only;
 *    nothing ranks learners against each other.
 *
 * All-time and platform-wide like Priority, so no page filters reach it: the
 * axis is practice volume, which a date range would redefine, not narrow.
 */
export const FoundationalSkillsSubTab = () => {
  const [cuts, setCuts] = useState<number | undefined>(undefined);
  const [levelWindow, setLevelWindow] = useState<WindowKey>("late");
  const [behaviourKind, setBehaviourKind] = useState<FhsBehaviourKind | "all">("all");
  const [sort, setSort] = useState<SortKey>("change");
  const [page, setPage] = useState(0);
  const [openLearner, setOpenLearner] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetFoundationalSkillsProgressQuery({
    cuts,
  });

  const loading = isLoading && !data;
  const common = { loading, error: isError, onRetry: refetch };

  const skills = useMemo(() => data?.skills ?? [], [data]);
  const byCut = useMemo(() => data?.byCut ?? [], [data]);
  const behaviours = useMemo(() => data?.behaviours ?? [], [data]);
  const windows = data?.windows ?? { early: [], late: [] };
  const summary = data?.summary;
  const floor = data?.minSampleSize ?? 20;
  const panelN = summary?.cohortLearners ?? 0;
  const startNow = `start = ${windowLabel(windows.early)}, now = ${windowLabel(windows.late)}`;

  const tierSeries = useMemo(() => buildTierSeries(byCut), [byCut]);
  const unhelpfulSeries = useMemo(() => buildUnhelpfulSeries(byCut), [byCut]);
  const skillChange = useMemo(
    () => buildSkillChange(skills, data?.thresholds.skillMoveBand ?? 0.1),
    [skills, data?.thresholds.skillMoveBand],
  );
  const whoMoved = useMemo(() => buildWhoMoved(skills), [skills]);
  const levelMix = useMemo(() => buildLevelMix(skills, levelWindow), [skills, levelWindow]);
  const opportunity = useMemo(() => buildOpportunity(skills), [skills]);
  const movers = useMemo(
    () => behaviourMovers(behaviours, behaviourKind, 12),
    [behaviours, behaviourKind],
  );
  const transitions = useMemo(
    () => (data ? buildTransitions(data.unhelpfulTransitions) : []),
    [data],
  );
  const trendMix = useMemo(() => (data ? buildTrendMix(data.trend) : []), [data]);
  const dose = useMemo(() => buildDose(data?.dose ?? []), [data]);
  const learnerRows = useMemo(() => sortLearners(data?.learners ?? [], sort), [data, sort]);
  const pageRows = learnerRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const withheld = withheldSkills(skills);
  const ceilings = ceilingSkills(skills);
  const mixWithheld = levelMixWithheld(skills, levelWindow);
  const skillName = useMemo(() => new Map(skills.map(s => [s.skill, s.name])), [skills]);
  const gridRows = skills.map(s => ({ key: s.skill, label: s.name, group: TIER_LABELS[s.tier] }));

  const asOf = asOfStamp(data?.computedAt);
  const panelSource = buildSource({
    derivation: `Same learners throughout; ${startNow}`,
    window: "All time",
    n: panelN,
    nUnit: "learners",
    extra: data ? `Rubric ${data.rubricVersion} · test orgs excluded` : undefined,
    asOf,
  });
  const everyoneSource = buildSource({
    derivation: "Each learner against their own first half of cuts",
    window: "All time",
    n: data?.measuredLearners,
    nUnit: "learners measured",
    asOf,
  });
  const exportContext = [data?.provenance.note ?? "", data?.provenance.derivation ?? ""];

  const lineCutOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Average level (1–4)",
        bottomTitle: "Cut (5,000 characters of their own speech)",
        colorScale: TIER_SCALE,
        domain: [1, 4],
        extra: {
          points: { enabled: true, radius: 4 },
          tooltip: { valueFormatter: (v: unknown) => (typeof v === "number" ? v.toFixed(2) : "—") },
        },
      }),
    [],
  );
  const unhelpfulOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Cuts with an unhelpful behaviour (%)",
        bottomTitle: "Cut",
        colorScale: UNHELPFUL_SCALE,
        domain: [0, 100],
        legend: false,
        extra: { points: { enabled: true, radius: 4 } },
      }),
    [],
  );
  const changeOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Change in average level, start → now",
        colorScale: skillChange.scale,
        height: SKILL_ROWS_HEIGHT,
      }),
    [skillChange.scale],
  );
  const whoMovedOpts = useMemo(
    () => hStackedOpts({ bottomTitle: "Learners", colorScale: DIRECTION_SCALE }),
    [],
  );
  const levelMixOpts = useMemo(
    () =>
      hStackedOpts({
        bottomTitle: "Share of assessments (%)",
        colorScale: LEVEL_SCALE,
        domain: [0, 100],
      }),
    [],
  );
  const opportunityOpts = useMemo(
    () =>
      hKeyBarOpts({
        bottomTitle: "Scored cuts that tested the skill (%)",
        colorScale: OPPORTUNITY_SCALE,
        domain: [0, 100],
      }),
    [],
  );
  const doseOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Average own change (1–4 scale)",
        bottomTitle: "Cuts of practice so far",
        colorScale: DOSE_SCALE,
      }),
    [],
  );

  const skillTable = {
    columns: [
      "Skill",
      "Tier",
      "Paired learners",
      "Start",
      "Now",
      "Change",
      "Improved",
      "Held",
      "Declined",
      "Start mix (1/2/3/4)",
      "Now mix (1/2/3/4)",
      "Tested in % of cuts",
    ],
    rows: skills.map(s => [
      s.name,
      TIER_LABELS[s.tier],
      s.pairedLearners,
      s.earlyAvg,
      s.lateAvg,
      s.change,
      s.improved,
      s.unchanged,
      s.declined,
      s.levelMix.early.levels?.join(" / ") ?? `n = ${s.levelMix.early.assessments}`,
      s.levelMix.late.levels?.join(" / ") ?? `n = ${s.levelMix.late.assessments}`,
      s.opportunityPct,
    ]),
  };
  const cutTable = {
    columns: [
      "Cut",
      "Learners",
      "Overall",
      ...(["engage", "understand", "support"] as const).map(t => TIER_LABELS[t]),
      "Unhelpful %",
      ...skills.map(s => s.name),
    ],
    rows: byCut.map(c => [
      cutLabel(c.cut),
      c.learners,
      c.composite,
      ...(["engage", "understand", "support"] as const).map(
        t => c.tiers.find(x => x.tier === t)?.avgLevel ?? null,
      ),
      c.unhelpfulPct,
      ...skills.map(s => c.skills.find(x => x.skill === s.skill)?.avgLevel ?? null),
    ]),
  };

  const options: PanelOption[] = data?.cohortOptions ?? [];
  const firstUnhelpful = byCut.find(c => c.unhelpfulPct !== null);
  const lastUnhelpful = [...byCut].reverse().find(c => c.unhelpfulPct !== null);

  return (
    <div className="flex flex-col gap-8">
      {/* The panel: which learners every comparison below is taken over. */}
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
          {isFetching && !loading && <span className="text-xs text-typography-500">Updating…</span>}
        </div>
        <p className="max-w-4xl text-xs leading-relaxed text-typography-500">
          Each learner's roleplay speech is cut into 5,000-character slices, and each slice is
          scored 1–4 on 14 foundational helping skills, whatever the scenario. Every chart below
          except the People section follows the same learners — those whose first{" "}
          {data?.cuts ?? "N"} cuts are all scored — so "start" (
          {windowLabel(windows.early) || "their first cuts"}) and "now" (
          {windowLabel(windows.late) || "their latest cuts"}) are the same people.{" "}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Overall score, start → now"
          description={
            summary
              ? `Same ${panelN} learners, ${startNow} · ${signed(summary.compositeChange)} on a 1–4 scale`
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
          description="Share of those learners with any skill scored 1 (an unhelpful behaviour)"
          value={
            summary && summary.unhelpfulEarlyPct !== null
              ? `${pct(summary.unhelpfulEarlyPct)} → ${pct(summary.unhelpfulLatePct)}`
              : "—"
          }
          n={panelN}
          nUnit="learners"
          minN={floor}
          {...common}
          chartId="AAQ-169"
        />
        <KpiTile
          label="Skills moving"
          description={
            summary
              ? `${summary.skillsSteady} holding within ±${data?.thresholds.skillMoveBand}; ${summary.skillsWithheld} without enough paired learners yet`
              : "Skills whose average moved, start → now"
          }
          value={summary ? `${summary.skillsUp} up · ${summary.skillsDown} down` : "—"}
          {...common}
          chartId="AAQ-170"
        />
        <KpiTile
          label="Learners improving"
          description={
            data
              ? `Against their own start, all learners with ${data.thresholds.trendMinCuts}+ cuts; ${data.trend.declining} declining, ${data.trend.tooEarly} too early to say`
              : "Against their own start"
          }
          value={
            data
              ? `${data.trend.improving} of ${data.trend.improving + data.trend.steady + data.trend.declining}`
              : "—"
          }
          {...common}
          chartId="AAQ-171"
        />
      </div>

      <Section
        title="Overall"
        blurb="The whole skill set as one score and as its three tiers — engaging the client, understanding their situation, supporting change — plus how often an unhelpful behaviour appears."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Overall and by tier, cut by cut"
            caption={`Average level at each cut for the same ${panelN} learners. A tier's level is the mean of its assessable skills in that cut. Points over fewer than ${floor} learners are left out.`}
            source={panelSource}
            takeaway={tierTakeaway(byCut, windows)}
            {...common}
            empty={!loading && !hasPlotted(tierSeries)}
            emptyText={`Needs a panel of at least ${floor} learners`}
            onExpand={() => setExpanded("cuts")}
            chartId="AAQ-172"
          >
            <ScrollableChart data={tierSeries}>
              <LineChart data={tierSeries} options={lineCutOpts} />
            </ScrollableChart>
          </ChartCard>

          <ChartCard
            title="Unhelpful behaviour, cut by cut"
            caption="Share of these learners whose cut showed at least one unhelpful or potentially harmful behaviour (any skill scored 1). Lower is better."
            source={panelSource}
            takeaway={
              firstUnhelpful && lastUnhelpful && firstUnhelpful !== lastUnhelpful
                ? `${pct(firstUnhelpful.unhelpfulPct)} at ${cutLabel(firstUnhelpful.cut).toLowerCase()}, ${pct(lastUnhelpful.unhelpfulPct)} at ${cutLabel(lastUnhelpful.cut).toLowerCase()} — same learners.`
                : undefined
            }
            {...common}
            empty={!loading && !hasPlotted(unhelpfulSeries)}
            emptyText={`Needs a panel of at least ${floor} learners`}
            onExpand={() => setExpanded("cuts")}
            chartId="AAQ-173"
          >
            <ScrollableChart data={unhelpfulSeries}>
              <LineChart data={unhelpfulSeries} options={unhelpfulOpts} />
            </ScrollableChart>
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Skill by skill"
        blurb="Which of the 14 skills move and which don't. A skill only counts for a learner when their practice gave a chance to show it at both the start and now — never scored as a zero when it didn't come up."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Change per skill, start → now"
            caption={`Each learner's average level now minus at the start, averaged over the learners the skill was assessable for in both. Green moved up by ${data?.thresholds.skillMoveBand ?? 0.1}+, red down, grey held.${
              withheld.length
                ? ` Not shown (fewer than ${floor} paired learners): ${withheld.map(s => s.name).join(", ")}.`
                : ""
            }`}
            source={panelSource}
            takeaway={skillChangeTakeaway(skills)}
            {...common}
            empty={!loading && skillChange.data.length === 0}
            emptyText={`No skill has ${floor} paired learners yet`}
            height={SKILL_ROWS_HEIGHT}
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-174"
          >
            <SimpleBarChart data={skillChange.data} options={changeOpts} />
          </ChartCard>

          <ChartCard
            title="Who moved on each skill"
            caption={`Learners whose own level on the skill rose by ${data?.thresholds.skillFlatBand ?? 0.5}+ (improved), fell by as much (declined), or neither (held). An average can hide a split — five up and five down nets to zero — and this cannot. Counts of people, so nothing is withheld.`}
            source={panelSource}
            {...common}
            empty={!loading && whoMoved.length === 0}
            emptyText="No paired learners yet"
            height={SKILL_ROWS_HEIGHT}
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-175"
          >
            <StackedBarChart data={whoMoved} options={whoMovedOpts} />
          </ChartCard>

          <ChartCard
            wide
            title="Every skill, cut by cut"
            caption={`Average level on each skill at each cut, same learners, grouped by tier. Darker is higher. A dash is fewer than ${floor} learners with a chance to show the skill at that cut — hover for the count.`}
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

          <ChartCard
            title="Level mix per skill, start vs now"
            caption={`Share of the skill's assessments at each level, ${levelWindow === "early" ? `at the start (${windowLabel(windows.early)})` : `now (${windowLabel(windows.late)})`}. Switch to compare. Red is an unhelpful behaviour; dark blue is basic plus advanced.${
              ceilings.length
                ? ` ${ceilings.map(s => s.name).join(", ")} sit at one level in both windows — a sign the rubric's bar for the next level is out of reach in a 5,000-character slice, not that learners have stalled.`
                : ""
            }${mixWithheld.length ? ` ${mixWithheld.length} skill(s) have fewer than ${floor} assessments and are not drawn.` : ""}`}
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
            title="How often practice tests each skill"
            caption="Share of all scored cuts, platform-wide, that gave a chance to show the skill. A skill practice rarely tests cannot show progress however good learners get at it — that is a content gap, not a learning one."
            source={buildSource({
              derivation: "Scored cuts with an opportunity for the skill",
              window: "All time",
              n: data?.measuredLearners,
              nUnit: "learners measured",
              asOf,
            })}
            {...common}
            empty={!loading && opportunity.length === 0}
            emptyText="No scored cuts yet"
            height={SKILL_ROWS_HEIGHT}
            onExpand={() => setExpanded("skills")}
            chartId="AAQ-178"
          >
            <SimpleBarChart data={opportunity} options={opportunityOpts} />
          </ChartCard>
        </div>
      </Section>

      <Section
        title="Behaviours"
        blurb="The rubric's own behaviours, so a move in a skill can be read as something a learner started or stopped doing."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ChartCard
              title="Behaviours that moved"
              caption={`Share of these learners showing the behaviour at least once at the start vs now, among those whose practice gave the skill a chance in both. Biggest moves first, either way; for an unhelpful behaviour a fall is the good direction. Shares over fewer than ${floor} learners are left out.`}
              source={panelSource}
              {...common}
              empty={!loading && movers.length === 0}
              emptyText={`No behaviour has moved among ${floor}+ paired learners yet`}
              controls={
                <InlinePicker
                  id="fhs-behaviour-kind"
                  label="Kind"
                  items={KIND_ITEMS}
                  selected={behaviourKind}
                  onChange={setBehaviourKind}
                />
              }
              onExpand={() => setExpanded("behaviours")}
              chartId="AAQ-179"
            >
              <ul className="flex flex-col divide-y divide-[#e0e0e0]">
                {movers.map(b => (
                  <li key={b.code} className="flex flex-col gap-1.5 py-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm text-typography-900">{b.text}</p>
                        <p className="text-[11px] text-typography-500">
                          {skillName.get(b.skill) ?? b.skill} · {BEHAVIOUR_KIND_LABELS[b.kind]} · n
                          = {b.pairedLearners}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                        <span className="text-typography-500">{pct(b.earlyPct)}</span>
                        <span className="text-typography-500">→</span>
                        <span className="font-medium text-typography-900">{pct(b.latePct)}</span>
                        <span className="flex items-center gap-1 text-typography-700">
                          <span
                            aria-hidden
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: b.good ? PALETTE.green : PALETTE.red }}
                          />
                          {signed(b.changePts, 0)} pts · {b.good ? "better" : "worse"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5" aria-hidden>
                      <span
                        className="block h-1 rounded-sm"
                        style={{ width: `${b.earlyPct ?? 0}%`, background: CONTEXT.faint }}
                      />
                      <span
                        className="block h-1 rounded-sm"
                        style={{ width: `${b.latePct ?? 0}%`, background: PALETTE.blue }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-typography-500">
                Grey bar = start, blue bar = now.
              </p>
            </ChartCard>
          </div>

          <ChartCard
            title="Unhelpful behaviour, person by person"
            caption="Each of these learners in one group: stopped (unhelpful at the start, none now), never showed one, still showing one, or started (none at the start, one now)."
            source={panelSource}
            takeaway={data ? transitionsTakeaway(data.unhelpfulTransitions) : undefined}
            {...common}
            empty={!loading && transitions.length === 0}
            emptyText="No panel yet"
            chartId="AAQ-180"
          >
            <DonutChart
              data={transitions}
              options={donutOpts({ centerLabel: "learners", colorScale: TRANSITION_SCALE })}
            />
          </ChartCard>
        </div>
      </Section>

      <Section
        title="People"
        blurb="Every learner against their own start — never against each other. The first two charts cover everyone measured, not just the panel above."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Learners against their own start"
            caption={
              data
                ? `Every learner with ${data.thresholds.trendMinCuts}+ scored cuts, comparing the average of their last half of cuts with their first half; within ±${data.thresholds.compositeFlatBand} is holding steady. Fewer cuts is too early to say.`
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
            title="Change by amount of practice"
            caption={`Does more practice go with more change? Each learner's own change (last half of their cuts vs first half), averaged by how many cuts they have. ${
              data
                ? data.dose
                    .map(
                      d =>
                        `${d.label}: ${d.learners} learner${d.learners === 1 ? "" : "s"}${d.avgChange === null ? ` (need ${floor})` : ""}`,
                    )
                    .join("; ")
                : ""
            }. A correlation, not proof — keen learners may both practise more and improve faster.`}
            source={everyoneSource}
            {...common}
            empty={!loading && !hasPlotted(dose)}
            emptyText={`No practice bucket has ${floor} learners yet`}
            height={CHART_HEIGHT}
            chartId="AAQ-182"
          >
            <SimpleBarChart data={dose} options={doseOpts} />
          </ChartCard>

          <ChartCard
            wide
            title="Learners"
            caption={`The ${panelN} learners in the panel: their overall score at the start and now, which skills went up or down by ${data?.thresholds.skillFlatBand ?? 0.5}+ levels, and whether they showed an unhelpful behaviour at each end. Select a learner for every skill, cut by cut. Trend uses all their cuts.${
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
                    <th className="py-2 pr-3 font-medium">Skills up / down</th>
                    <th className="py-2 pr-3 font-medium">Unhelpful, start → now</th>
                    <th className="py-2 font-medium">Trend (all cuts)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.id} className="border-t border-[#e0e0e0]">
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
                      <td className="py-2 pr-3 tabular-nums">{signed(r.change)}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {r.skillsImproved} / {r.skillsDeclined}
                      </td>
                      <td className="py-2 pr-3">
                        {r.unhelpfulEarly ? "Yes" : "No"} → {r.unhelpfulLate ? "Yes" : "No"}
                      </td>
                      <td className="py-2">{TREND_LABELS[r.trend]}</td>
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
        caption={`Overall, tier, unhelpful rate and every skill at each cut. Blank = fewer than ${floor} learners.`}
        source={panelSource}
        render={({ height }) => (
          <LineChart data={tierSeries} options={{ ...lineCutOpts, height }} />
        )}
        table={cutTable}
        exportContext={exportContext}
        exportFilename="foundational-skills-by-cut"
      />
      <ChartDetailModal
        open={expanded === "skills"}
        onClose={() => setExpanded(null)}
        title="Skill by skill, start → now"
        caption={`Paired over the panel (${startNow}). Mix counts are skill assessments at levels 1/2/3/4. "Tested" is platform-wide.`}
        source={panelSource}
        render={({ height }) => (
          <SimpleBarChart data={skillChange.data} options={{ ...changeOpts, height }} />
        )}
        table={skillTable}
        exportContext={exportContext}
        exportFilename="foundational-skills-by-skill"
      />
      <ChartDetailModal
        open={expanded === "behaviours"}
        onClose={() => setExpanded(null)}
        title="Behaviours, start → now"
        caption="Every rubric behaviour: share of paired learners showing it at the start and now. Blank = fewer than the minimum paired learners."
        source={panelSource}
        render={() => null}
        table={{
          columns: [
            "Behaviour",
            "Skill",
            "Kind",
            "Paired learners",
            "Start %",
            "Now %",
            "Change (pts)",
          ],
          rows: behaviours.map(b => [
            b.text,
            skillName.get(b.skill) ?? b.skill,
            BEHAVIOUR_KIND_LABELS[b.kind],
            b.pairedLearners,
            b.earlyPct,
            b.latePct,
            b.changePts,
          ]),
        }}
        exportContext={exportContext}
        exportFilename="foundational-skills-behaviours"
      />
      <ChartDetailModal
        open={expanded === "learners"}
        onClose={() => setExpanded(null)}
        title="Learners"
        caption="Every learner in the panel, own start vs now."
        source={panelSource}
        render={() => null}
        table={{
          columns: [
            "Learner",
            "Cuts",
            "Start",
            "Now",
            "Change",
            "Skills up",
            "Skills down",
            "Unhelpful at start",
            "Unhelpful now",
            "Trend (all cuts)",
          ],
          rows: learnerRows.map(r => [
            learnerName(r),
            r.cutsReached,
            r.earlyComposite,
            r.lateComposite,
            r.change,
            r.skillsImproved,
            r.skillsDeclined,
            r.unhelpfulEarly ? "Yes" : "No",
            r.unhelpfulLate ? "Yes" : "No",
            TREND_LABELS[r.trend],
          ]),
        }}
        exportContext={exportContext}
        exportFilename="foundational-skills-learners"
      />

      <FoundationalSkillsLearnerPanel
        learnerId={openLearner}
        skills={skills}
        behaviours={behaviours}
        onClose={() => setOpenLearner(null)}
      />
    </div>
  );
};
