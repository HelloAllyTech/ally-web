import { useMemo, useState } from "react";

import { LineChart, ScatterChart, SimpleBarChart } from "@carbon/charts-react";

import {
  useGetCurriculumCourseFunnelQuery,
  useGetCurriculumKnowledgeVsSkillQuery,
  useGetCurriculumProgressCurveQuery,
  useGetCurriculumQuizOutcomesQuery,
  useGetCurriculumRoleplayGatesQuery,
} from "@api";
import { AnalyticsRange } from "@types";

import { AnalyticsTabFilters, asOfStamp, windowLabel } from "./analyticsFilters";
import { ChangeWhiskers } from "./ChangeWhiskers";
import { RANGE_LABEL, RangePicker, defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, buildSource, hBarOpts, scatterOpts } from "./chartKit";
import {
  KNOWLEDGE_SCALE,
  belowFloorCourses,
  dropText,
  knowledgeCoverageNote,
  knowledgePoints,
  knowledgeTable,
  knowledgeTakeaway,
  progressCurvePoints,
  progressCurveScale,
  progressCurveTable,
  progressCurveTakeaway,
} from "./courseProgressChart";
import {
  CourseFunnelRow,
  FUNNEL_STAGES,
  FUNNEL_STAGE_SCALE,
  GATE_OUTCOMES,
  GATE_OUTCOME_SCALE,
  GateRow,
  QUIZ_CHART_ROWS,
  QuizOutcome,
  RoleplayGatesResponse,
  courseFunnelRows,
  courseFunnelTable,
  courseFunnelTakeaway,
  coursesOffChart,
  firstPassBars,
  firstPassScale,
  firstPassTakeaway,
  firstToBestRows,
  firstToBestTakeaway,
  gateRows,
  gatesTable,
  gatesTakeaway,
  measurableQuizzes,
  missedQuestionText,
  quizOutcomesTable,
  withheldList,
  withheldQuizzes,
} from "./curriculumOutcomesChart";
import { pct } from "./foundationalSkillsProgressChart";

/** The windowed cards here, as `useChartControls` keys (stored as `curriculum.<key>`). */
const WINDOWED = ["courseFunnel", "quizFirstPass", "quizGain"] as const;
type WindowedChart = (typeof WINDOWED)[number];

/**
 * A course takes weeks to finish, so a 30-day cohort is mostly people who
 * have not had time to: these cards open on the server's own default, 12
 * months, rather than the tab-wide all-time.
 */
const DEFAULT_CONTROLS = defaultControlsFor(WINDOWED, {
  courseFunnel: { range: "12m" },
  quizFirstPass: { range: "12m" },
  quizGain: { range: "12m" },
});

const NOT_DEPLOYED = (what: string) =>
  `The ${what} endpoint did not respond — it may not be deployed yet.`;

/** "in the last 12 months" / "yet" — the period phrase an empty state ends on. */
const inPeriod = (range: AnalyticsRange) =>
  range === "all" ? "yet" : `in the ${RANGE_LABEL[range].toLowerCase()}`;

/* -------------------------------------------------------------------------- */
/* Bodies                                                                      */
/* -------------------------------------------------------------------------- */

// Label, bar and numbers stack below `sm`: side by side they are wider than a
// phone. Each bar then spans the full width, so lengths still compare.
const ROW_GRID =
  "grid grid-cols-1 items-center gap-1 sm:grid-cols-[minmax(9rem,16rem)_1fr_11rem] sm:gap-3";

/**
 * One row per course: four nested bars (enrolled → started → halfway →
 * finished), each a subset of the one behind it, so the visible step between
 * two shades is the drop at that stage.
 *
 * Plain HTML rather than a Carbon chart because the row labels are
 * author-written course titles, which a Carbon labels axis truncates at 14
 * characters. Bar length comes from the counts, which are on screen anyway;
 * the stated percentages are the server's, and a course under the cohort
 * floor shows counts only.
 */
export const CourseFunnelRows = ({ rows }: { rows: CourseFunnelRow[] }) => (
  <div className="flex flex-col">
    <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-typography-500">
      {FUNNEL_STAGES.map(stage => (
        <span key={stage} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: FUNNEL_STAGE_SCALE[stage] }}
          />
          {stage}
        </span>
      ))}
    </div>
    {rows.map(r => {
      const base = r.counts[0];
      const finishedPct = r.pcts[3];
      return (
        <div key={r.key} className={`${ROW_GRID} border-t border-[#f0f0f0] py-1.5`}>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-typography-900">{r.label}</span>
            <span className="text-[11px] text-typography-500">{r.sublabel}</span>
          </span>
          <span
            className="relative h-5 rounded"
            style={{ backgroundColor: "#f0f0f0" }}
            role="img"
            aria-label={`${r.label}: ${FUNNEL_STAGES.map((s, i) => `${s} ${r.counts[i]}`).join(", ")}`}
          >
            {r.counts.map((count, i) => (
              <span
                key={FUNNEL_STAGES[i]}
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${base > 0 ? (count / base) * 100 : 0}%`,
                  background: FUNNEL_STAGE_SCALE[FUNNEL_STAGES[i]],
                }}
              />
            ))}
          </span>
          <span className="flex flex-col text-xs tabular-nums text-typography-700">
            <span>{r.counts.map(c => c.toLocaleString()).join(" → ")}</span>
            <span className="text-[11px] text-typography-500">
              {finishedPct !== null ? `${pct(finishedPct)} finished · ` : ""}
              {r.stalled.toLocaleString()} stalled
              {r.stalledPct !== null ? ` (${pct(r.stalledPct)} of started)` : ""}
            </span>
          </span>
        </div>
      );
    })}
  </div>
);

/**
 * One 100%-stacked row per gated roleplay. The shares are the server's (they
 * sum to 100 by construction); a withheld gate has none and is listed with its
 * n under the rows rather than stacked from counts. HTML for the same reason as
 * {@link CourseFunnelRows}: item titles are long.
 */
export const GateRows = ({ rows }: { rows: GateRow[] }) => (
  <div className="flex flex-col">
    <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-typography-500">
      {GATE_OUTCOMES.map(o => (
        <span key={o} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: GATE_OUTCOME_SCALE[o] }}
          />
          {o}
        </span>
      ))}
    </div>
    {rows.map(r => {
      const first = r.segments.find(s => s.outcome === "Cleared first time");
      return (
        <div key={r.key} className={`${ROW_GRID} border-t border-[#f0f0f0] py-1.5`}>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-typography-900">{r.label}</span>
            <span className="text-[11px] text-typography-500">{r.sublabel}</span>
          </span>
          <span
            className="flex h-5 overflow-hidden rounded"
            style={{ backgroundColor: "#f0f0f0" }}
            role="img"
            aria-label={`${r.label}: ${r.segments.map(s => `${s.outcome} ${pct(s.pct)}`).join(", ")}`}
          >
            {r.segments.map(s => (
              <span
                key={s.outcome}
                title={`${s.outcome}: ${s.count} (${pct(s.pct)})`}
                style={{ width: `${s.pct}%`, background: GATE_OUTCOME_SCALE[s.outcome] }}
              />
            ))}
          </span>
          <span className="flex flex-col text-xs tabular-nums text-typography-700">
            <span>
              {first ? `${pct(first.pct)} first time` : "none first time"} · n = {r.n}
            </span>
            {r.flag && (
              <span className="text-[11px] font-medium text-typography-900">{r.flag}</span>
            )}
          </span>
        </div>
      );
    })}
  </div>
);

/** The quizzes too thin to rate, by name and n — so a withheld quiz is never invisible. */
const WithheldLine = ({
  quizzes,
  minN,
  what,
}: {
  quizzes: QuizOutcome[];
  minN: number;
  what: string;
}) => {
  const text = withheldList(quizzes.map(q => ({ title: q.title, n: q.firstAttempts })));
  if (!text) return null;
  return (
    <p className="text-[11px] leading-snug text-typography-500">
      Under {minN} {what}, so not rated: {text}.
    </p>
  );
};

const gatesWithheld = (r: RoleplayGatesResponse) =>
  withheldList(r.items.filter(g => g.withheld).map(g => ({ title: g.title, n: g.progressRows })));

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Curriculum → Courses: is the course content working? Where learners drop out
 * of each course (AAQ-210), which quizzes are hardest first time (AAQ-211) and
 * what a retry recovers (AAQ-212), whether each roleplay gate fits its
 * scenario (AAQ-213), where in a course momentum dies (AAQ-225), and whether
 * quiz scores go with roleplay skill (AAQ-226).
 *
 * Content questions, read on course progress, quiz attempts and session scores
 * — not on the helping-skills rubric (that is Course impact's job). Each
 * windowed card carries its own period, saved per user; the gates card is
 * all-time because an attempt number is an ordinal, not a date.
 */
export const CourseOutcomesSection = ({ query }: Pick<AnalyticsTabFilters, "query">) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { controlsFor, setRange, hydrating } = useChartControls<WindowedChart>(
    "curriculum",
    DEFAULT_CONTROLS,
  );

  const tenant = useMemo(
    () => (query.tenantId ? { tenantId: query.tenantId } : {}),
    [query.tenantId],
  );
  const range = {
    courseFunnel: controlsFor("courseFunnel").range,
    quizFirstPass: controlsFor("quizFirstPass").range,
    quizGain: controlsFor("quizGain").range,
  };

  // Waiting for hydration stops each card fetching its default window and then
  // immediately re-fetching the saved one.
  const funnelQ = useGetCurriculumCourseFunnelQuery(
    { ...tenant, range: range.courseFunnel },
    { skip: hydrating },
  );
  const firstPassQ = useGetCurriculumQuizOutcomesQuery(
    { ...tenant, range: range.quizFirstPass },
    { skip: hydrating },
  );
  // Same endpoint; RTK shares the request whenever the two cards' windows match.
  const gainQ = useGetCurriculumQuizOutcomesQuery(
    { ...tenant, range: range.quizGain },
    { skip: hydrating },
  );
  const gatesQ = useGetCurriculumRoleplayGatesQuery(tenant);
  // All time by construction: an item position and a slice after enrolling are
  // ordinals, not dates.
  const curveQ = useGetCurriculumProgressCurveQuery(tenant);
  const knowQ = useGetCurriculumKnowledgeVsSkillQuery(tenant);

  const picker = (chart: WindowedChart) => (
    <RangePicker
      id={`curriculum-range-${chart}`}
      value={range[chart]}
      onChange={r => setRange(chart, r)}
    />
  );

  /* ------------------------------- AAQ-210 -------------------------------- */
  const funnel = funnelQ.data;
  const funnelRows = useMemo(() => courseFunnelRows(funnel?.courses ?? []), [funnel]);
  const allFunnelRows = useMemo(
    () => courseFunnelRows((funnel?.courses ?? []).map(c => ({ ...c, inChart: true }))),
    [funnel],
  );
  const offChart = coursesOffChart(funnel?.courses ?? []);
  const funnelSource = buildSource({
    derivation: "Enrolments created in the period, followed to today",
    window: windowLabel(funnel?.window),
    n: funnel?.totals.enrolled,
    nUnit: "enrolments",
    asOf: asOfStamp(funnel?.computedAt),
  });

  /* ------------------------------- AAQ-211 -------------------------------- */
  const fp = firstPassQ.data;
  const bars = useMemo(() => firstPassBars(fp?.quizzes ?? []), [fp]);
  const barScale = useMemo(() => firstPassScale(bars), [bars]);
  const fpMinN = fp?.minSampleSize ?? 20;
  const fpWithheld = withheldQuizzes(fp?.quizzes ?? []);
  const fpMeasurable = measurableQuizzes(fp?.quizzes ?? []);
  const barHeight = (rows: number) => `${Math.max(220, rows * 28 + 70)}px`;
  const barOptions = (height: string, colorScale = barScale) =>
    hBarOpts({
      bottomTitle: "Passed on the first attempt (%)",
      colorScale,
      domain: [0, 100],
      height,
    });
  const fpSource = buildSource({
    derivation: "Each learner's first attempt at each quiz",
    window: windowLabel(fp?.window),
    n: fp?.summary.firstAttempts,
    nUnit: "scored first attempts",
    asOf: asOfStamp(fp?.computedAt),
  });

  /* ------------------------------- AAQ-212 -------------------------------- */
  const gain = gainQ.data;
  const gainRows = useMemo(() => firstToBestRows(gain?.quizzes ?? []), [gain]);
  const gainStated = gainRows.filter(r => r.change !== null).length;
  const gainMinN = gain?.minSampleSize ?? 20;
  const gainMostPaired = gainRows.reduce((m, r) => Math.max(m, r.n), 0);
  const gainSource = buildSource({
    derivation: "First vs best scored attempt, same learners",
    window: windowLabel(gain?.window),
    n: gainRows.reduce((sum, r) => sum + r.n, 0) || undefined,
    nUnit: "learner–quiz pairs",
    asOf: asOfStamp(gain?.computedAt),
  });

  /* ------------------------------- AAQ-213 -------------------------------- */
  const gates = gatesQ.data;
  const gRows = useMemo(() => (gates ? gateRows(gates) : []), [gates]);
  const gMinN = gates?.minSampleSize ?? 20;
  const gWithheld = gates ? gatesWithheld(gates) : null;
  const gatesSource = buildSource({
    derivation: "Course roleplay progress, first linked session against the gate",
    window: "All time",
    n: gates?.summary.progressRows,
    nUnit: "learner progress rows",
    asOf: asOfStamp(gates?.computedAt),
  });

  /* ------------------------------- AAQ-225 -------------------------------- */
  const curve = curveQ.data;
  const curvePoints = useMemo(() => progressCurvePoints(curve?.courses ?? []), [curve]);
  const curveMinN = curve?.minSampleSize ?? 20;
  const curveBelow = curve ? belowFloorCourses(curve) : null;
  const curveOptions = (height?: string) =>
    scatterOpts({
      leftTitle: "Started learners who reached the item (%)",
      bottomTitle: "Position through the course (%)",
      colorScale: progressCurveScale(curve?.courses ?? []),
      domain: [0, 100],
      xDomain: [0, 100],
      legend: true,
      ...(height ? { height } : {}),
      extra: { curve: "curveLinear", points: { radius: 2 } },
    });
  const curveSource = buildSource({
    derivation: "Furthest unlocked item per started enrolment, course order",
    window: "All time",
    n: curve?.totals.startedEnrolments,
    nUnit: "started enrolments",
    asOf: asOfStamp(curve?.computedAt),
  });

  /* ------------------------------- AAQ-226 -------------------------------- */
  const know = knowQ.data;
  const knowPts = useMemo(() => (know ? knowledgePoints(know) : []), [know]);
  const knowMinN = know?.minSampleSize ?? 30;
  const knowNote = know ? knowledgeCoverageNote(know) : null;
  const knowOptions = (height?: string) =>
    scatterOpts({
      leftTitle: "Helping-skills score (1–4)",
      bottomTitle: "First-attempt quiz score (0–100)",
      colorScale: KNOWLEDGE_SCALE,
      domain: know?.scoreDomain ?? [1, 4],
      xDomain: know?.quizScoreDomain ?? [0, 100],
      ...(height ? { height } : {}),
    });
  const knowSource = buildSource({
    derivation: "Mean first-attempt quiz score vs helping-skills slices after enrolling",
    window: "All time",
    n: know?.coverage.points,
    nUnit: "learner–course points",
    asOf: asOfStamp(know?.computedAt),
  });

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        wide
        title="Course funnel"
        caption={`Of the learners who enrolled in each course in the period: how many opened an item, reached half the course, and finished. Stalled = started, not finished, and no activity for ${
          funnel?.stalledAfterDays ?? 30
        } days. Rates are shown once a course has ${
          funnel?.minCohortSize ?? 5
        } enrolments. A recent cohort has had less time to finish, so a short period reads lower than a long one.`}
        source={funnelSource}
        takeaway={funnel ? courseFunnelTakeaway(funnel) || undefined : undefined}
        loading={hydrating || (funnelQ.isLoading && !funnel)}
        error={funnelQ.isError}
        onRetry={funnelQ.refetch}
        errorSubtitle={NOT_DEPLOYED("course-funnel")}
        empty={!funnelQ.isLoading && !!funnel && funnelRows.length === 0}
        emptyText={`No one enrolled in a course ${inPeriod(range.courseFunnel)}`}
        controls={picker("courseFunnel")}
        onExpand={() => setExpanded("courseFunnel")}
        chartId="AAQ-210"
      >
        <div className="flex flex-col gap-2">
          <CourseFunnelRows rows={funnelRows} />
          {offChart > 0 && (
            <p className="text-[11px] text-typography-500">
              {offChart} more course{offChart === 1 ? "" : "s"} with fewer enrolments{" "}
              {offChart === 1 ? "is" : "are"} in the expanded view.
            </p>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Pass on first attempt, by quiz"
          caption={`Share of learners whose first attempt at each quiz passed, hardest at the top. A learner counts once per quiz, in the period they first sat it. A quiz needs ${fpMinN} scored first attempts before its share is shown; quizzes with fewer are named below with their n. Open-ended answers are graded by an LLM, so a step in a quiz's pass rate can be a grader change.`}
          source={fpSource}
          takeaway={fp ? firstPassTakeaway(fp) : undefined}
          loading={hydrating || (firstPassQ.isLoading && !fp)}
          error={firstPassQ.isError}
          onRetry={firstPassQ.refetch}
          errorSubtitle={NOT_DEPLOYED("quiz-outcomes")}
          empty={!firstPassQ.isLoading && !!fp && bars.length === 0}
          emptyText={
            fp && fp.summary.quizzes > 0
              ? `No quiz has ${fpMinN} scored first attempts ${inPeriod(range.quizFirstPass)} — ${fp.summary.quizzes} ${fp.summary.quizzes === 1 ? "quiz has" : "quizzes have"} fewer; their counts are in the expanded view`
              : `No quiz was attempted ${inPeriod(range.quizFirstPass)}`
          }
          controls={picker("quizFirstPass")}
          onExpand={() => setExpanded("quizFirstPass")}
          chartId="AAQ-211"
        >
          <div className="flex flex-col gap-2">
            <SimpleBarChart data={bars} options={barOptions(barHeight(bars.length))} />
            {fpMeasurable.length > QUIZ_CHART_ROWS && (
              <p className="text-[11px] text-typography-500">
                The {QUIZ_CHART_ROWS} hardest of {fpMeasurable.length} rated quizzes; the rest are
                in the expanded view.
              </p>
            )}
            <WithheldLine quizzes={fpWithheld} minN={fpMinN} what="scored first attempts" />
          </div>
        </ChartCard>

        <ChartCard
          title="First → best attempt, by quiz"
          caption={`Among learners who sat a quiz more than once: their first score against their best (0–100), with a 95% interval. Best is never below first by construction, so this measures what a retry recovers, not how much was learned — which is why it is drawn in grey. Under each quiz: first → best, and the share who tried again. Shown from ${gainMinN} learners with a second scored attempt.`}
          source={gainSource}
          takeaway={gain ? firstToBestTakeaway(gain) : undefined}
          loading={hydrating || (gainQ.isLoading && !gain)}
          error={gainQ.isError}
          onRetry={gainQ.refetch}
          errorSubtitle={NOT_DEPLOYED("quiz-outcomes")}
          empty={!gainQ.isLoading && !!gain && gainStated === 0}
          emptyText={
            gainRows.length > 0
              ? `No quiz has ${gainMinN} learners with a second scored attempt ${inPeriod(range.quizGain)} (the most is ${gainMostPaired})`
              : `No learner sat a quiz twice ${inPeriod(range.quizGain)}`
          }
          controls={picker("quizGain")}
          onExpand={() => setExpanded("quizGain")}
          chartId="AAQ-212"
        >
          <ChangeWhiskers
            rows={gainRows.slice(0, QUIZ_CHART_ROWS)}
            decimals={0}
            unit=" pts"
            emptyLabel="too few retries"
          />
        </ChartCard>
      </div>

      <ChartCard
        wide
        title="Roleplay gates inside courses"
        caption={`For each course roleplay with a minimum score: of the learners who tried it, how many cleared the gate on their first session, cleared it later, are stuck (unfinished, no session for ${
          gates?.stuckAfterDays ?? 14
        } days), or are still trying. A session score is scaled to its scenario, so this says whether a gate fits its scenario, not whether learners are skilled. A gate under ${
          gates?.calibrationBand.tooHardBelowPct ?? 40
        }% or over ${gates?.calibrationBand.tooEasyAbovePct ?? 95}% first-time clearance is flagged to check: too hard stalls learners, too easy tests nothing. Shown from ${gMinN} learners per gate.`}
        source={gatesSource}
        takeaway={gates ? gatesTakeaway(gates) : undefined}
        loading={gatesQ.isLoading && !gates}
        error={gatesQ.isError}
        onRetry={gatesQ.refetch}
        errorSubtitle={NOT_DEPLOYED("roleplay-gates")}
        empty={!gatesQ.isLoading && !!gates && gRows.length === 0}
        emptyText={
          gates && gates.summary.items > 0
            ? `No gated roleplay has ${gMinN} learners who tried it yet — ${gates.summary.items} ${gates.summary.items === 1 ? "has" : "have"} fewer: ${gWithheld}`
            : `No course roleplay with a minimum score has been attempted yet${
                gates && gates.summary.ungatedItems > 0
                  ? ` (${gates.summary.ungatedItems} attempted roleplay${gates.summary.ungatedItems === 1 ? " has" : "s have"} no gate)`
                  : ""
              }`
        }
        onExpand={() => setExpanded("gates")}
        chartId="AAQ-213"
      >
        <div className="flex flex-col gap-2">
          <GateRows rows={gRows} />
          {gWithheld && (
            <p className="text-[11px] leading-snug text-typography-500">
              Under {gMinN} learners, so not split: {gWithheld}.
            </p>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Where in a course momentum dies"
          caption={`For each course with ${curveMinN}+ learners who started it: the share of them who reached each item, by position through the course (0% = first item, 100% = last). Items unlock one at a time, so reached means unlocked, not opened. Where a line falls hardest is where learners stop; the expanded view names the item.`}
          source={curveSource}
          takeaway={curve ? progressCurveTakeaway(curve) : undefined}
          loading={curveQ.isLoading && !curve}
          error={curveQ.isError}
          onRetry={curveQ.refetch}
          errorSubtitle={NOT_DEPLOYED("progress-curve")}
          empty={!curveQ.isLoading && !!curve && curvePoints.length === 0}
          emptyText={
            curve && curve.belowFloor.length > 0
              ? `No course has ${curveMinN} learners who started it yet — ${curve.belowFloor.length} ${
                  curve.belowFloor.length === 1 ? "has" : "have"
                } fewer: ${curveBelow}`
              : "No one has started a course yet"
          }
          onExpand={() => setExpanded("progressCurve")}
          chartId="AAQ-225"
        >
          <div className="flex flex-col gap-2">
            <LineChart data={curvePoints} options={curveOptions()} />
            {curve && curve.others.length > 0 && (
              <p className="text-[11px] text-typography-500">
                {curve.others.length} more measurable course
                {curve.others.length === 1 ? " is" : "s are"} in the expanded view.
              </p>
            )}
            {curveBelow && (
              <p className="text-[11px] leading-snug text-typography-500">
                Under {curveMinN} started learners, so not drawn: {curveBelow}.
              </p>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Does knowing predict doing?"
          caption={`One point per learner and course: their mean first-attempt quiz score in the course against their helping-skills score over their first ${
            know?.skillWindowCuts ?? 6
          } slices after enrolling. Spearman's r is stated from ${knowMinN} points; no line is fitted. Both measures are noisy — a quiz is a few questions, a slice is one AI reading — so a weak r is expected and still says something: knowledge may not be what holds learners back, or the quiz may not test the skill. An association, never a cause.`}
          source={knowSource}
          takeaway={know ? knowledgeTakeaway(know) : undefined}
          loading={knowQ.isLoading && !know}
          error={knowQ.isError}
          onRetry={knowQ.refetch}
          errorSubtitle={NOT_DEPLOYED("knowledge-vs-skill")}
          empty={!knowQ.isLoading && !!know && knowPts.length === 0}
          emptyText={
            know && know.coverage.courses > 0
              ? `No learner has both a scored quiz attempt and a helping-skills slice after enrolling yet (${know.coverage.missingQuiz} enrolments have no quiz score, ${know.coverage.missingSkill} no slice)`
              : "No course with a quiz has an enrolment yet"
          }
          onExpand={() => setExpanded("knowledge")}
          chartId="AAQ-226"
        >
          <div className="flex flex-col gap-2">
            <ScatterChart data={knowPts} options={knowOptions()} />
            {knowNote && <p className="text-[11px] leading-snug text-typography-500">{knowNote}</p>}
          </div>
        </ChartCard>
      </div>

      {/* ------------------------- Detail / export ------------------------ */}

      <ChartDetailModal
        open={expanded === "courseFunnel"}
        onClose={() => setExpanded(null)}
        title="Course funnel"
        caption="Every course with an enrolment in the period. Rates and days to finish are withheld below the cohort floor; the counts still stand."
        source={funnelSource}
        render={() => <CourseFunnelRows rows={allFunnelRows} />}
        table={courseFunnelTable(funnel?.courses ?? [])}
        exportContext={[
          `Window: ${windowLabel(funnel?.window)}`,
          `Rates and medians withheld below ${funnel?.minCohortSize ?? 5} learners`,
        ]}
        exportFilename="course-funnel"
      />

      <ChartDetailModal
        open={expanded === "quizFirstPass"}
        onClose={() => setExpanded(null)}
        title="Pass on first attempt, by quiz"
        caption="Every quiz first sat in the period, with the questions most often wrong on the first attempt — by position and type only; question text is never shown."
        source={fpSource}
        render={({ height }) => {
          const all = firstPassBars(fp?.quizzes ?? [], Infinity);
          return (
            <div className="flex flex-col gap-4">
              {all.length > 0 && (
                <SimpleBarChart
                  data={all}
                  options={barOptions(
                    `${Math.max(parseInt(height, 10), all.length * 28 + 70)}px`,
                    firstPassScale(all),
                  )}
                />
              )}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-medium text-typography-900">
                  Most often wrong on the first attempt
                </h4>
                {(fp?.quizzes ?? [])
                  .filter(q => q.missedQuestions.length > 0)
                  .map(q => (
                    <div key={q.trackItemId} className="text-xs text-typography-700">
                      <span className="font-medium">{q.title}</span>{" "}
                      <span className="text-typography-500">({q.trackTitle})</span>
                      <ul className="ml-4 list-disc text-[11px] text-typography-600">
                        {q.missedQuestions.map(m => (
                          <li key={m.questionId}>{missedQuestionText(m)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          );
        }}
        table={quizOutcomesTable(fp?.quizzes ?? [])}
        exportContext={[
          `Window: ${windowLabel(fp?.window)} (by first attempt)`,
          `Rates withheld below ${fpMinN} scored first attempts`,
        ]}
        exportFilename="quiz-first-attempt"
      />

      <ChartDetailModal
        open={expanded === "quizGain"}
        onClose={() => setExpanded(null)}
        title="First → best attempt, by quiz"
        caption="Every quiz with a learner who tried again. Best is never below first by construction."
        source={gainSource}
        render={() => (
          <ChangeWhiskers rows={gainRows} decimals={0} unit=" pts" emptyLabel="too few retries" />
        )}
        table={quizOutcomesTable(gain?.quizzes ?? [])}
        exportContext={[
          `Window: ${windowLabel(gain?.window)} (by first attempt)`,
          `Changes withheld below ${gainMinN} learners with a second scored attempt`,
        ]}
        exportFilename="quiz-first-to-best"
      />

      <ChartDetailModal
        open={expanded === "gates"}
        onClose={() => setExpanded(null)}
        title="Roleplay gates inside courses"
        caption="Every gated course roleplay someone has tried, withheld ones included with their counts."
        source={gatesSource}
        render={() => <GateRows rows={gRows} />}
        table={gates ? gatesTable(gates) : undefined}
        exportContext={[
          "Window: All time",
          `Shares withheld below ${gMinN} learners per gate`,
          "Gates are read at their current minimum score",
        ]}
        exportFilename="roleplay-gates"
      />

      <ChartDetailModal
        open={expanded === "progressCurve"}
        onClose={() => setExpanded(null)}
        title="Where in a course momentum dies"
        caption="Every course: where its line falls hardest, and the courses not drawn. Reached means unlocked, not opened."
        source={curveSource}
        render={({ height }) => (
          <div className="flex flex-col gap-4">
            {curvePoints.length > 0 && (
              <LineChart data={curvePoints} options={curveOptions(height)} />
            )}
            <ul className="flex flex-col gap-1 text-xs text-typography-700">
              {(curve ? [...curve.courses, ...curve.others] : []).map(c => {
                const text = dropText(c);
                return (
                  <li key={c.trackId}>
                    <span className="font-medium">{c.title}</span>
                    {": "}
                    {text ?? "no step loses anyone"}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        table={curve ? progressCurveTable(curve) : undefined}
        exportContext={[
          "Window: All time",
          `Courses need ${curveMinN} started enrolments to be drawn`,
          "Reached = unlocked, not opened",
        ]}
        exportFilename="course-progress-curve"
      />

      <ChartDetailModal
        open={expanded === "knowledge"}
        onClose={() => setExpanded(null)}
        title="Does knowing predict doing?"
        caption="Each course on its own, where it has enough points: pooling mixes quizzes of different difficulty, so a per-course r is the cleaner read."
        source={knowSource}
        render={({ height }) =>
          knowPts.length > 0 ? <ScatterChart data={knowPts} options={knowOptions(height)} /> : null
        }
        table={know ? knowledgeTable(know) : undefined}
        exportContext={[
          "Window: All time",
          `r withheld below ${knowMinN} learner–course points`,
          know ? `Rubric ${know.rubricVersion}` : "",
        ].filter(Boolean)}
        exportFilename="knowledge-vs-skill"
      />
    </div>
  );
};
