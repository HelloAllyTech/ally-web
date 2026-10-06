import { ReactNode, useMemo, useState } from "react";

import { LineChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetFoundationalSkillsRetentionQuery,
  useGetFoundationalSkillsSegmentsQuery,
  useGetFoundationalSkillsTimeToCompetenceQuery,
  useGetPracticeProgressionQuery,
} from "@api";

import { asOfStamp } from "./analyticsFilters";
import { ChangeWhiskers } from "./ChangeWhiskers";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, lineOpts, stackedBarOpts } from "./chartKit";
import {
  DIMENSION_NOTES,
  largestWithheld,
  segmentRows,
  segmentTable,
  segmentsTakeaway,
  withheldText,
} from "./effectivenessChart";
import {
  DIFFICULTY_SCALE,
  ProgressionPanel,
  TIER_LINE_SCALE,
  competenceExportContext,
  competenceRule,
  competenceSeries,
  competenceTable,
  competenceTakeaway,
  excludedSkillsText,
  hasCompetencePoints,
  hasProgressionShares,
  mostOftenMissing,
  progressionSeries,
  progressionTable,
  progressionTakeaway,
  retentionRows,
  retentionTable,
  retentionTakeaway,
  unplottedPairs,
  withheldOrdinals,
} from "./foundationalSkillsTimeChart";

const PCT_DOMAIN: [number, number] = [0, 100];
type Expanded = "competence" | "retention" | "progression" | "difficulty" | null;

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
    // Visually hidden, but it names the control for a screen reader.
    titleText={label}
    hideLabel
    items={items}
    itemToString={(i: T) => i?.label ?? ""}
    selectedItem={items.find(i => i.id === selected)}
    onChange={({ selectedItem }: { selectedItem: T }) => selectedItem && onChange(selectedItem.id)}
  />
);

/** Response to THESE arguments only — never the previous org's while the new one loads. */
const stateOf = <T,>(q: {
  currentData?: T;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}) => {
  const data = q.currentData;
  return {
    data,
    loading: !data && (q.isLoading || q.isFetching),
    error: !data && q.isError && !q.isFetching,
    onRetry: q.refetch,
  };
};

/** Tooltip lines Carbon has no option for: who was still in the curve at a point. */
const competenceTooltip = (data: unknown, defaultHTML: string): string => {
  const rows = Array.isArray(data) ? data : [data];
  const extra = rows
    .filter((d): d is { group: string; atRisk: number; reachedAtCut: number } =>
      Boolean(d && typeof d === "object" && "atRisk" in d),
    )
    .map(d => `${d.group}: ${d.atRisk} still at risk, ${d.reachedAtCut} reached here`)
    .join("<br/>");
  return extra
    ? `${defaultHTML}<div class="text-xs" style="padding:4px 8px">${extra}</div>`
    : defaultHTML;
};

/**
 * Helping skills → "Time, breaks and difficulty": how much practice it takes
 * to reach competence (AAQ-205), whether a break in practice is associated
 * with a different score after it (AAQ-206), whether learners move on to
 * harder scenarios as they practise (AAQ-207), and the start → now change
 * within each difficulty path (AAQ-219).
 *
 * All four are all-time by construction — the x-axis is a learner's own Nth
 * slice, the gap between two of their slices, or their own Nth session — and
 * follow the tab's org filter. Each card loads on its own query.
 */
export const FoundationalSkillsTimeSection = ({
  tenantId,
  windowLabel = "All time",
}: {
  /** The tab's org filter; "" = every non-test org. */
  tenantId: string;
  /** The tab's window line ("All time · Org only"), for the provenance footers. */
  windowLabel?: string;
}) => {
  const [panel, setPanel] = useState<ProgressionPanel>("all");
  const [expanded, setExpanded] = useState<Expanded>(null);
  const org = tenantId ? { tenantId } : {};

  const competence = stateOf(useGetFoundationalSkillsTimeToCompetenceQuery(org));
  const retention = stateOf(useGetFoundationalSkillsRetentionQuery(org));
  const progression = stateOf(useGetPracticeProgressionQuery(org));
  const difficulty = stateOf(
    useGetFoundationalSkillsSegmentsQuery({ dimension: "difficultyTransition", ...org }),
  );

  const tc = competence.data;
  const rt = retention.data;
  const pp = progression.data;
  const dt = difficulty.data;

  const competencePoints = useMemo(() => (tc ? competenceSeries(tc) : []), [tc]);
  const competenceOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Reached competence (%)",
        bottomTitle: "Learner's Nth scored slice",
        colorScale: TIER_LINE_SCALE,
        domain: PCT_DOMAIN,
        // A Kaplan–Meier curve only changes at an event: a step, not a slope
        // that invents values between slices.
        curve: "curveStepAfter",
        extra: {
          points: { enabled: true, radius: 3 },
          tooltip: {
            valueFormatter: (v: unknown) => (typeof v === "number" ? `${v.toFixed(1)}%` : "—"),
            customHTML: competenceTooltip,
          },
        },
      }),
    [],
  );

  const progressionPoints = useMemo(() => (pp ? progressionSeries(pp, panel) : []), [pp, panel]);
  const progressionOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of sessions (%)",
        bottomTitle: "Learner's Nth countable session",
        colorScale: DIFFICULTY_SCALE,
        domain: PCT_DOMAIN,
      }),
    [],
  );
  const panelItems = useMemo(
    () => [
      { id: "all" as const, label: "All learners" },
      {
        id: "experienced" as const,
        label: `Learners with ${pp?.experiencedMinSessions ?? 12}+ sessions`,
      },
    ],
    [pp?.experiencedMinSessions],
  );

  const tcSource = buildSource({
    derivation: "Each learner's own scored slices, one fixed rubric",
    window: windowLabel,
    n: tc?.learners,
    nUnit: "learners with a scored first slice",
    extra: tc?.learnersWithoutFirstCut
      ? `${tc.learnersWithoutFirstCut} without a scored first slice left out`
      : undefined,
    asOf: asOfStamp(tc?.computedAt),
  });
  const rtSource = buildSource({
    derivation: "Consecutive scored slices, banded by the gap between them",
    window: windowLabel,
    n: rt?.learners,
    nUnit: "learners",
    extra: rt
      ? `${rt.pairs.plotted} pairs plotted${unplottedPairs(rt) ? `, ${unplottedPairs(rt)} with no gap to measure` : ""}`
      : undefined,
    asOf: asOfStamp(rt?.computedAt),
  });
  const ppSource = buildSource({
    derivation: "Countable sessions by scenario difficulty label",
    window: windowLabel,
    n: pp ? (panel === "experienced" ? pp.experiencedLearners : pp.learners) : undefined,
    nUnit: "learners",
    asOf: asOfStamp(pp?.computedAt),
  });
  const dtSource = buildSource({
    derivation: "Same learners start → now, one fixed rubric",
    window: windowLabel,
    n: dt?.panelLearners,
    nUnit: "learners in the panel",
    asOf: asOfStamp(dt?.computedAt),
  });

  const missing = tc ? mostOftenMissing(tc) : [];
  const ppWithheld = pp ? withheldOrdinals(pp, panel) : [];
  const dtMeasurable = !!dt && dt.segments.length > 0;
  const dtFloor = dt?.minSampleSize ?? 20;

  return (
    <Section
      title="Time, breaks and difficulty"
      blurb="How much practice it takes to reach competence, whether a break in practice is associated with a different score after it, and whether learners take on harder scenarios as they go. All time; each card follows the org filter above."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          wide
          title="Time to competence"
          caption={
            tc
              ? `Share of learners who, by their Nth scored slice, have reached each tier: all but one of its movable skills at level ${tc.competenceLevel} (every basic behaviour) at least once — ${competenceRule(tc)}. Learners who stop practising leave the curve rather than counting as "never". A one-time crossing, not sustained. ${excludedSkillsText(tc)} A gap means fewer than ${tc.minSampleSize} learners were still in the curve.`
              : "Share of learners who have reached each tier's skills by their Nth scored slice."
          }
          source={tcSource}
          takeaway={tc ? competenceTakeaway(tc) : undefined}
          loading={competence.loading}
          error={competence.error}
          onRetry={competence.onRetry}
          errorSubtitle="The time-to-competence endpoint did not respond — it may not be deployed yet."
          {...(tc ? { n: tc.learners, nUnit: "learners", minN: tc.minSampleSize } : {})}
          empty={!competence.loading && !!tc && !hasCompetencePoints(tc)}
          emptyText={`Fewer than ${tc?.minCohortSize ?? 5} learners have a scored first slice yet`}
          onExpand={() => setExpanded("competence")}
          chartId="AAQ-205"
        >
          {tc && (
            <div className="flex flex-col gap-2">
              <ScrollableChart data={competencePoints}>
                <LineChart data={competencePoints} options={competenceOpts} />
              </ScrollableChart>
              {missing.length > 0 && (
                <p className="text-[11px] leading-snug text-typography-500">
                  Most often missing among learners not there yet — {missing.join(" · ")}.
                </p>
              )}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Skill retention after a break"
          caption={
            rt
              ? `Change in a learner's overall score (1–4) from the slice before a gap in practice to the slice after it, by the gap's length. Each learner's pairs in a band are averaged first, ± 95% interval, coloured only when it clears zero. Read a longer break against the under-7-days reference, not against zero: slice-to-slice change carries noise and drift whatever the gap, and spacing practice out can help as well as a gap can hurt. Bands under ${rt.minPairs} pairs or ${rt.minLearners} learners are withheld with their counts; a learner can appear in several bands.`
              : "Change in a learner's score across a gap in practice, by the gap's length."
          }
          source={rtSource}
          takeaway={rt ? retentionTakeaway(rt) : undefined}
          loading={retention.loading}
          error={retention.error}
          onRetry={retention.onRetry}
          errorSubtitle="The retention endpoint did not respond — it may not be deployed yet."
          empty={!retention.loading && !!rt && rt.pairs.plotted === 0}
          emptyText="No learner has two consecutive scored slices with a gap to measure yet"
          onExpand={() => setExpanded("retention")}
          height="auto"
          chartId="AAQ-206"
        >
          {rt && <ChangeWhiskers rows={retentionRows(rt)} emptyLabel="too few pairs" />}
        </ChartCard>

        <ChartCard
          title="Difficulty mix by practice ordinal"
          caption={
            pp
              ? `Each learner's 1st to ${pp.maxOrdinal}th countable session by the scenario's difficulty label, as a share of the sessions at that position. "Learners with ${pp.experiencedMinSessions}+ sessions" follows the same people at every position: if only the all-learners mix shifts, it is who kept practising, not people moving up. Difficulty is an authoring label (it defaults to Medium), not a measured property.${
                  ppWithheld.length
                    ? ` Session ${ppWithheld.join(", ")} ${ppWithheld.length === 1 ? "has" : "have"} fewer than ${pp.minSampleSize} sessions and ${ppWithheld.length === 1 ? "is" : "are"} left blank; counts are in the expanded view.`
                    : ""
                }`
              : "Each learner's Nth session by scenario difficulty label."
          }
          source={ppSource}
          takeaway={pp ? progressionTakeaway(pp, panel) : undefined}
          loading={progression.loading}
          error={progression.error}
          onRetry={progression.onRetry}
          errorSubtitle="The practice-progression endpoint did not respond — it may not be deployed yet."
          empty={!progression.loading && !!pp && !hasProgressionShares(pp, panel)}
          emptyText={
            panel === "experienced"
              ? `Too few learners with ${pp?.experiencedMinSessions ?? 12}+ sessions to state a mix yet`
              : "Too few sessions at any position to state a mix yet"
          }
          controls={
            <InlinePicker
              id="fhs-progression-panel"
              label="Learners"
              items={panelItems}
              selected={panel}
              onChange={setPanel}
            />
          }
          onExpand={() => setExpanded("progression")}
          chartId="AAQ-207"
        >
          {pp && (
            <ScrollableChart data={progressionPoints}>
              <StackedBarChart data={progressionPoints} options={progressionOpts} />
            </ScrollableChart>
          )}
        </ChartCard>

        <ChartCard
          wide
          title="Change start → now, within difficulty"
          caption={`The start → now change for the same panel, split by the difficulty most of each learner's start slices were practised at → most of their now slices (e.g. Easy → Hard): whether a flat overall score hides learners taking on harder material. Each row ± its 95% interval, coloured only when it clears zero; the first row is everyone. Difficulty is the scenario's current label, and Medium is the default for an unlabelled one.`}
          source={dtSource}
          takeaway={dtMeasurable && dt ? segmentsTakeaway(dt) : undefined}
          loading={difficulty.loading}
          error={difficulty.error}
          onRetry={difficulty.onRetry}
          errorSubtitle="The segments endpoint did not respond — it may not be deployed yet."
          // Gated: rendered only once one difficulty path clears the floor.
          empty={!difficulty.loading && !!dt && !dtMeasurable}
          emptyText={`Not yet measurable: n = ${dt ? largestWithheld(dt) : 0} of ${dtFloor} needed in any cell`}
          onExpand={dtMeasurable ? () => setExpanded("difficulty") : undefined}
          height="auto"
          chartId="AAQ-219"
        >
          {dt && dtMeasurable && (
            <div className="flex flex-col gap-3">
              <ChangeWhiskers rows={segmentRows(dt)} />
              {dt.withheld.length > 0 && (
                <p className="text-[11px] leading-snug text-typography-500">
                  Too few learners to read (under {dt.minSampleSize}): {withheldText(dt.withheld)}.
                </p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {tc && (
        <ChartDetailModal
          open={expanded === "competence"}
          onClose={() => setExpanded(null)}
          title="Time to competence"
          caption="Per tier and slice: learners still in the curve, how many reached the tier there, how many stopped there without reaching it, and the share reached by then (blank under the floor)."
          source={tcSource}
          render={({ height }) => (
            <LineChart data={competencePoints} options={{ ...competenceOpts, height }} />
          )}
          table={competenceTable(tc)}
          exportContext={competenceExportContext(tc)}
          exportFilename="helping-skills-time-to-competence.csv"
        />
      )}
      {rt && (
        <ChartDetailModal
          open={expanded === "retention"}
          onClose={() => setExpanded(null)}
          title="Skill retention after a break"
          caption="Per gap band: pairs, learners, the score change and the change in unhelpful behaviour (percentage points; down is better), with intervals and sign tests. Associated with a break, not caused by it: learners choose when they come back."
          source={rtSource}
          render={() => <ChangeWhiskers rows={retentionRows(rt)} emptyLabel="too few pairs" />}
          table={retentionTable(rt)}
          exportContext={[rt.provenance.derivation, rt.provenance.note]}
          exportFilename="helping-skills-retention-after-break.csv"
        />
      )}
      {pp && (
        <ChartDetailModal
          open={expanded === "progression"}
          onClose={() => setExpanded(null)}
          title={`Difficulty mix by practice ordinal — ${panel === "experienced" ? `learners with ${pp.experiencedMinSessions}+ sessions` : "all learners"}`}
          caption="Sessions at each position by difficulty label: counts, then shares (blank under the floor). Difficulty is an authoring label that defaults to Medium."
          source={ppSource}
          render={({ height }) => (
            <StackedBarChart data={progressionPoints} options={{ ...progressionOpts, height }} />
          )}
          table={progressionTable(pp, panel)}
          exportContext={[pp.provenance.derivation, pp.provenance.note]}
          exportFilename={`practice-difficulty-mix-${panel}.csv`}
        />
      )}
      {dt && dtMeasurable && (
        <ChartDetailModal
          open={expanded === "difficulty"}
          onClose={() => setExpanded(null)}
          title="Change start → now, within difficulty"
          caption={DIMENSION_NOTES.difficultyTransition}
          source={dtSource}
          render={() => <ChangeWhiskers rows={segmentRows(dt)} />}
          table={segmentTable(dt)}
          exportContext={[dt.provenance.derivation, dt.provenance.note]}
          exportFilename="helping-skills-change-within-difficulty.csv"
        />
      )}
    </Section>
  );
};
