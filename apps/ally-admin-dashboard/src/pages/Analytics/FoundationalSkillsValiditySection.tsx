import { ReactNode, useState } from "react";

import {
  useGetFoundationalSkillsFeedbackUptakeQuery,
  useGetFoundationalSkillsJudgeAgreementQuery,
  useGetFoundationalSkillsTransferQuery,
  useGetMeasurementConvergenceQuery,
} from "@api";

import { asOfStamp } from "./analyticsFilters";
import { ChangeWhiskers } from "./ChangeWhiskers";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, buildSource } from "./chartKit";
import { CONTEXT, PALETTE } from "./chartScales";
import { changeColor, level, pct, signed } from "./foundationalSkillsProgressChart";
import {
  FoundationalSkillsTransferResponse,
  JudgeAgreementResponse,
  MeasurementConvergenceResponse,
  convergenceMatrix,
  convergenceTable,
  convergenceTakeaway,
  difficultyShiftText,
  judgeAgreementRows,
  judgeAgreementTable,
  judgeAgreementTakeaway,
  judgeCoverageText,
  kappaText,
  notYetMeasuredText,
  rText,
  singleScenarioText,
  transferTable,
  transferTakeaway,
  uptakeCoverageText,
  uptakeNotMapped,
  uptakeRows,
  uptakeTable,
  uptakeTakeaway,
  withheldNote,
} from "./foundationalSkillsValidityChart";

type Expanded = "transfer" | "uptake" | "convergence" | "judge" | null;

const NOT_DEPLOYED = "endpoint did not respond — it may not be deployed yet.";

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

/**
 * One faint line per learner from their last slice on a familiar scenario to
 * their first slice on a new one, with the group mean drawn over them — the
 * `BenchmarkSlope` form with this comparison's own end labels (that component
 * hard-codes "First / Latest" and a benchmark description, both wrong here).
 * The mean is coloured only when its interval excludes zero.
 */
const TransferSlope = ({
  data,
  height = 260,
}: {
  data: FoundationalSkillsTransferResponse;
  height?: number;
}) => {
  const [lo, hi] = data.scoreDomain;
  const pad = 28;
  const w = 380;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  const xs = [pad + 60, w - pad - 60];
  const c = data.comparison;
  const learners = data.learners ?? [];
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      role="img"
      aria-label={`Helping skills composite on a familiar scenario vs the next slice on a new scenario, for ${learners.length} learners`}
      className="w-full max-w-[520px]"
    >
      {ticks.map(t => (
        <g key={t}>
          <line
            x1={pad}
            x2={w - pad}
            y1={y(t)}
            y2={y(t)}
            stroke={CONTEXT.faint}
            strokeWidth={0.5}
          />
          <text x={pad - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill={CONTEXT.strong}>
            {t}
          </text>
        </g>
      ))}
      <text x={xs[0]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        Familiar scenario
      </text>
      <text x={xs[1]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        New scenario
      </text>
      {learners.map(l => (
        <line
          key={l.learnerId}
          x1={xs[0]}
          x2={xs[1]}
          y1={y(l.before)}
          y2={y(l.after)}
          stroke={CONTEXT.line}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {c.beforeAvg !== null && c.afterAvg !== null && (
        <>
          <line
            x1={xs[0]}
            x2={xs[1]}
            y1={y(c.beforeAvg)}
            y2={y(c.afterAvg)}
            stroke={c.detectable ? changeColor(c) : PALETTE.blue}
            strokeWidth={3}
          />
          <circle cx={xs[0]} cy={y(c.beforeAvg)} r={4} fill={PALETTE.blue} />
          <circle cx={xs[1]} cy={y(c.afterAvg)} r={4} fill={PALETTE.blue} />
          <text
            x={xs[0] - 8}
            y={y(c.beforeAvg) + 4}
            fontSize={11}
            textAnchor="end"
            fill={CONTEXT.strong}
          >
            {level(c.beforeAvg)}
          </text>
          <text x={xs[1] + 8} y={y(c.afterAvg) + 4} fontSize={11} fill={CONTEXT.strong}>
            {level(c.afterAvg)}
          </text>
        </>
      )}
    </svg>
  );
};

/** A small labelled count beside the slope: how the difficulty tag moved across the pairs. */
const Count = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-baseline justify-between gap-4 border-t border-[#f0f0f0] py-1 text-xs">
    <span className="text-typography-500">{label}</span>
    <span className="tabular-nums text-typography-900">{value}</span>
  </div>
);

/** Rulers × rulers, upper triangle; a cell under the floor shows its n alone. */
const ConvergenceMatrix = ({ data }: { data: MeasurementConvergenceResponse }) => {
  const matrix = convergenceMatrix(data);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-[2px] text-xs">
          <caption className="sr-only">
            Spearman rank correlation between each pair of rulers, with the slices behind it
          </caption>
          <thead>
            <tr className="text-typography-500">
              <th className="py-1 pr-3 text-left font-medium">Ruler</th>
              {data.rulers.map(r => (
                <th key={r.key} scope="col" className="px-2 py-1 text-center font-medium">
                  <span className="block">{r.key}</span>
                  <span className="block font-normal">{r.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rulers.map((row, i) => (
              <tr key={row.key}>
                <th scope="row" className="py-1 pr-3 text-left font-normal text-typography-700">
                  <span className="block">
                    {row.key} {row.label}
                  </span>
                  <span className="block text-[11px] text-typography-500">
                    {row.cuts.toLocaleString()} slices
                  </span>
                </th>
                {matrix[i].map((cell, j) => {
                  const key = `${row.key}-${data.rulers[j].key}`;
                  if (cell.self || cell.mirror || !cell.pair) {
                    return (
                      <td key={key} className="px-2 py-1 text-center text-typography-300">
                        {cell.self ? "·" : ""}
                      </td>
                    );
                  }
                  const p = cell.pair;
                  return (
                    <td
                      key={key}
                      className="rounded-sm bg-[#f4f4f4] px-2 py-1 text-center tabular-nums"
                    >
                      {p.r === null ? (
                        <span className="text-typography-500">n = {p.n}</span>
                      ) : (
                        <>
                          <span className="block text-sm text-typography-900">
                            r = {rText(p.r)}
                          </span>
                          <span className="block text-[11px] text-typography-500">n = {p.n}</span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="flex flex-col gap-0.5 text-[11px] leading-snug text-typography-500">
        {data.rulers.map(r => (
          <div key={r.key}>
            <dt className="inline font-medium text-typography-700">
              {r.key} {r.label}:
            </dt>{" "}
            <dd className="inline">{r.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

/** κ per skill, judge vs human beside human vs human; "—" where withheld. */
const JudgeAgreementTable = ({ data }: { data: JudgeAgreementResponse }) => {
  const rows = judgeAgreementRows(data);
  const cell = (v: number | null) => (
    <td className="px-2 py-1 text-center tabular-nums text-typography-900">{kappaText(v)}</td>
  );
  const pctCell = (v: number | null) => (
    <td className="px-2 py-1 text-center tabular-nums text-typography-700">{pct(v)}</td>
  );
  const nCell = (v: number) => (
    <td className="px-2 py-1 text-center tabular-nums text-typography-500">{v}</td>
  );
  return (
    <div className="overflow-auto">
      <table className="w-full border-separate border-spacing-[2px] text-xs">
        <caption className="sr-only">
          Agreement between the AI judge and human raters, and between human raters, per skill
        </caption>
        <thead>
          <tr className="text-typography-500">
            <th />
            <th colSpan={4} scope="colgroup" className="px-2 pt-1 text-center font-semibold">
              AI judge vs human
            </th>
            <th colSpan={4} scope="colgroup" className="px-2 pt-1 text-center font-semibold">
              Human vs human
            </th>
          </tr>
          <tr className="text-typography-500">
            <th scope="col" className="py-1 pr-3 text-left font-medium">
              Skill
            </th>
            {["Weighted κ", "κ", "Same level", "Rated slices"].map(h => (
              <th key={`j-${h}`} scope="col" className="px-2 py-1 text-center font-medium">
                {h}
              </th>
            ))}
            {["Weighted κ", "κ", "Same level", "Rated twice"].map(h => (
              <th key={`h-${h}`} scope="col" className="px-2 py-1 text-center font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-t border-[#f0f0f0]">
              <th scope="row" className="py-1 pr-3 text-left font-normal">
                <span className="block text-typography-900">{r.label}</span>
                <span className="block text-[11px] text-typography-500">{r.sublabel}</span>
              </th>
              {cell(r.judge.weightedKappa)}
              {cell(r.judge.kappa)}
              {pctCell(r.judge.agreementPct)}
              {nCell(r.judge.cuts)}
              {cell(r.human.weightedKappa)}
              {cell(r.human.kappa)}
              {pctCell(r.human.agreementPct)}
              {nCell(r.human.cuts)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Helping skills → "Is the measure sound, and does feedback land?":
 *
 *  - AAQ-220 Transfer to a new scenario — does a learner bring their skill to a
 *    scenario they have never played?
 *  - AAQ-221 Named improvements that were acted on — when the debrief names a
 *    skill, does that skill rise more than the ones it did not name?
 *  - AAQ-222 Do the rulers agree? — can the cheap per-session signals stand in
 *    for the helping-skills judge?
 *  - AAQ-223 Judge vs human agreement — the check on the judge itself.
 *
 * All four are all-time by construction. The first three follow the tab's org
 * filter; judge agreement is a property of the instrument, not of an org, and
 * says so on its source line. Each card loads on its own query, so a backend
 * that has not shipped one endpoint costs only that card.
 */
export const FoundationalSkillsValiditySection = ({
  tenantId,
  windowLabel = "All time",
}: {
  /** The tab's org filter; "" = every non-test org. */
  tenantId: string;
  /** The tab's window line ("All time · Org only"), for the provenance footers. */
  windowLabel?: string;
}) => {
  const [expanded, setExpanded] = useState<Expanded>(null);
  const org = tenantId ? { tenantId } : {};

  const transfer = stateOf(useGetFoundationalSkillsTransferQuery(org));
  const uptake = stateOf(useGetFoundationalSkillsFeedbackUptakeQuery(org));
  const convergence = stateOf(useGetMeasurementConvergenceQuery(org));
  const judge = stateOf(useGetFoundationalSkillsJudgeAgreementQuery());

  const tr = transfer.data;
  const up = uptake.data;
  const cv = convergence.data;
  const ja = judge.data;

  const notMapped = !!up && uptakeNotMapped(up);
  const notRated = !!ja && ja.status === "notYetMeasured";

  const trSource = buildSource({
    derivation: "Same learner, familiar → new scenario, one fixed rubric",
    window: windowLabel,
    n: tr?.learnersWithPair,
    nUnit: "learners with a pair",
    extra: tr
      ? `${tr.pairs} pairs · ${tr.learnersEligible} learners with ${tr.minSingleScenarioCuts}+ single-scenario slices · rubric ${tr.rubricVersion}`
      : undefined,
    asOf: asOfStamp(tr?.computedAt),
  });
  const upSource = buildSource({
    derivation: "Debrief areas of growth filed under skills by a model; levels from the judge",
    window: windowLabel,
    n: up?.pooled.difference.learners,
    nUnit: "learners with named and unnamed skills",
    extra: up
      ? `${uptakeCoverageText(up.coverage)} · mapper ${up.mapperVersion} · rubric ${up.rubricVersion}`
      : undefined,
    asOf: asOfStamp(up?.computedAt),
  });
  const cvSource = buildSource({
    derivation: "Spearman r over single-scenario slices",
    window: windowLabel,
    n: cv?.cuts.singleScenario,
    nUnit: "single-scenario slices",
    extra: cv
      ? `rubric ${cv.rubricVersion}${
          cv.scoping.tenantId ? " · R2 is z-scored against every org's sessions" : ""
        }`
      : undefined,
    asOf: asOfStamp(cv?.computedAt),
  });
  const jaSource = buildSource({
    derivation: "AI judge vs human raters on the same slices",
    // A property of the instrument: never narrowed by the org filter.
    window: "All time · every org (the org filter does not apply)",
    n: ja?.coverage.ratedCuts,
    nUnit: "rated slices",
    extra: ja ? `rubric ${ja.rubricVersion}` : undefined,
    asOf: asOfStamp(ja?.computedAt),
  });

  const uptakeWhiskers = up ? uptakeRows(up) : [];

  return (
    <Section
      title="Is the measure sound, and does feedback land?"
      blurb="Whether skill carries over to a scenario the learner has never met, whether a skill the debrief names is the one that moves, whether the cheaper signals agree with the helping-skills judge, and how the judge compares with people rating the same slices. All time; the first three follow the org filter above."
    >
      <div className="grid grid-cols-1 gap-4">
        <ChartCard
          wide
          title="Transfer to a new scenario"
          caption={
            tr
              ? `Each line is one learner: their last slice on a scenario they had already played (left) against their next slice, on a scenario they had never played (right). The bold line is the average, coloured only when its 95% interval excludes zero. ${singleScenarioText(
                  tr,
                )} New scenarios are often harder (read with "Difficulty mix by practice ordinal", AAQ-207), and familiar material reads higher than first contact even when skill carries over — so a drop here can be difficulty or novelty, not lost skill.`
              : "Each learner's familiar-scenario slice against their next slice on a new scenario."
          }
          source={trSource}
          takeaway={tr ? transferTakeaway(tr) : undefined}
          loading={transfer.loading}
          error={transfer.error}
          onRetry={transfer.onRetry}
          errorSubtitle={`The transfer ${NOT_DEPLOYED}`}
          n={tr?.comparison.n}
          nUnit="learners with a pair"
          minN={tr?.minSampleSize}
          onExpand={tr ? () => setExpanded("transfer") : undefined}
          chartId="AAQ-220"
        >
          {tr && (
            <div className="flex flex-wrap items-start gap-6">
              <TransferSlope data={tr} />
              <div className="flex min-w-[14rem] flex-col">
                <span className="mb-1 text-xs font-medium text-typography-900">
                  Difficulty tag, familiar → new
                </span>
                <Count label="Harder" value={tr.difficultyShift.harder} />
                <Count label="Same" value={tr.difficultyShift.same} />
                <Count label="Easier" value={tr.difficultyShift.easier} />
                <Count label="Untagged" value={tr.difficultyShift.untagged} />
                <Count
                  label="Change, same difficulty only"
                  value={
                    tr.sameDifficulty.change === null
                      ? withheldNote(tr.sameDifficulty.n, tr.minSampleSize)
                      : signed(tr.sameDifficulty.change)
                  }
                />
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          wide
          title="Named improvements that were acted on"
          caption={`When a debrief names a skill to work on, does that skill rise by the learner's next scored slice? Each row is a within-learner difference: how often the skill rose when a debrief named it, minus how often the same learner's unnamed skills rose, in percentage points, ± 95% interval — coloured only when the interval excludes zero. Observational: the named skill is usually the weak one, so it tends to rise anyway (regression to the mean) — that is what the unnamed-skill comparison is for.`}
          source={upSource}
          takeaway={up ? uptakeTakeaway(up) : undefined}
          loading={uptake.loading}
          error={uptake.error}
          onRetry={uptake.onRetry}
          errorSubtitle={`The feedback uptake ${NOT_DEPLOYED}`}
          // Not mapped yet is a state of the pipeline, not a thin sample: let
          // the empty state say so instead of "n = 0 · need 20".
          n={notMapped ? undefined : up?.pooled.difference.learners}
          nUnit="learners"
          minN={notMapped ? undefined : up?.minSampleSize}
          empty={notMapped}
          emptyText={
            up
              ? `Not yet measured — the feedback-to-skill mapping runs only when enabled. ${up.coverage.debriefedSessions.toLocaleString()} debriefed sessions are waiting (${up.coverage.pendingSessions.toLocaleString()} pending).`
              : undefined
          }
          onExpand={up && !notMapped ? () => setExpanded("uptake") : undefined}
          chartId="AAQ-221"
        >
          {up && (
            <ChangeWhiskers
              rows={uptakeWhiskers}
              decimals={1}
              unit=" pts"
              emptyLabel="too few learners"
            />
          )}
        </ChartCard>

        <ChartCard
          wide
          title="Do the rulers agree?"
          caption={
            cv
              ? `Spearman rank correlation between five signals, over slices where every session ran one scenario (${pct(
                  cv.cuts.singleScenarioPct,
                )} of ${cv.cuts.total.toLocaleString()} scored slices). Every ruler runs higher = better, so agreement is positive. Cells with fewer than ${cv.minPairs} slices in common show n only; one learner contributes several slices, so n overstates the independent evidence. Agreement is not validity — two AI judges can agree and both be wrong; human ratings are the check (below). R2 includes behaviour-instruction points, so R2–R3 agreement is partly mechanical.`
              : "Rank correlation between the per-session signals and the helping-skills judge."
          }
          source={cvSource}
          takeaway={cv ? convergenceTakeaway(cv) : undefined}
          loading={convergence.loading}
          error={convergence.error}
          onRetry={convergence.onRetry}
          errorSubtitle={`The convergence ${NOT_DEPLOYED}`}
          empty={!!cv && cv.cuts.singleScenario === 0}
          emptyText="No single-scenario scored slices yet"
          onExpand={cv ? () => setExpanded("convergence") : undefined}
          chartId="AAQ-222"
        >
          {cv && <ConvergenceMatrix data={cv} />}
        </ChartCard>

        <ChartCard
          wide
          title="Judge vs human agreement"
          caption={
            ja
              ? `People rate a stratified sample of slices (${ja.samplePerQuarter} per quarter) against the same rubric by ticking behaviour codes; each level is then derived with the judge's own rule, so agreement is about what each saw. κ: 1 = perfect, 0 = no better than chance. Weighted κ counts a near miss (3 vs 4) far less than a far one (1 vs 4). Human vs human is the ceiling the judge can reasonably be held to. — = fewer than ${ja.minSampleSize} rated slices, or κ undefined.`
              : "The AI judge's levels against people rating the same slices."
          }
          source={jaSource}
          takeaway={ja ? judgeAgreementTakeaway(ja) : undefined}
          loading={judge.loading}
          error={judge.error}
          onRetry={judge.onRetry}
          errorSubtitle={`The judge agreement ${NOT_DEPLOYED}`}
          empty={notRated}
          emptyText={
            ja ? `${notYetMeasuredText(ja)} ${judgeCoverageText(ja.coverage)}.` : undefined
          }
          onExpand={ja && !notRated ? () => setExpanded("judge") : undefined}
          chartId="AAQ-223"
        >
          {ja && (
            <div className="flex flex-col gap-2">
              <JudgeAgreementTable data={ja} />
              <p className="text-[11px] leading-snug text-typography-500">
                {judgeCoverageText(ja.coverage)}.
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {tr && expanded === "transfer" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Transfer to a new scenario"
          caption="Familiar → new scenario, every pair and same-difficulty pairs only. Blank = fewer learners than the floor."
          source={trSource}
          render={({ height }) => <TransferSlope data={tr} height={parseInt(height, 10)} />}
          table={transferTable(tr)}
          exportContext={[
            tr.provenance.derivation,
            tr.provenance.note,
            difficultyShiftText(tr.difficultyShift),
          ]}
          exportFilename="helping-skills-transfer"
        />
      )}
      {up && expanded === "uptake" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Named improvements that were acted on"
          caption="Per skill: how often the level rose, held or fell when a debrief named it and when it did not, with the level each arm started from. Blank = fewer learners than the floor."
          source={upSource}
          render={() => <ChangeWhiskers rows={uptakeWhiskers} decimals={1} unit=" pts" />}
          table={uptakeTable(up)}
          exportContext={[up.provenance.derivation, up.caveat]}
          exportFilename="helping-skills-feedback-uptake"
        />
      )}
      {cv && expanded === "convergence" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Do the rulers agree?"
          caption={`Every pair of rulers once. r is blank below ${cv.minPairs} slices in common.`}
          source={cvSource}
          render={() => <ConvergenceMatrix data={cv} />}
          table={convergenceTable(cv)}
          exportContext={[cv.provenance.derivation, cv.caveat]}
          exportFilename="helping-skills-ruler-convergence"
        />
      )}
      {ja && expanded === "judge" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Judge vs human agreement"
          caption="Per skill, level agreement where both sides found an opportunity, plus opportunity agreement and the judge's mean lean (judge − human). Blank = withheld."
          source={jaSource}
          render={() => <JudgeAgreementTable data={ja} />}
          table={judgeAgreementTable(ja)}
          exportContext={[ja.provenance.derivation, ja.provenance.note]}
          exportFilename="helping-skills-judge-agreement"
        />
      )}
    </Section>
  );
};
