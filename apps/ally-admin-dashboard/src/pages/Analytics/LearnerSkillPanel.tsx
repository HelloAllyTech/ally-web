import { useMemo } from "react";

import { LineChart } from "@carbon/charts-react";

import { InlineNotification, SidePanel, SkeletonPlaceholder } from "@ally-ui-mono/ui-shared";
import { useGetSkillGrowthLearnerSeriesQuery } from "@api/analytics";

import { CHART_HEIGHT, ScrollableChart, boundedDomainNote, lineOpts } from "./chartKit";
import {
  KNOWLEDGE_SCALE,
  LEARNER_SCALE,
  TREND_LABELS,
  buildKnowledgeSeries,
  buildLearnerCompositeSeries,
  buildSkillCoverageSeries,
  learnerName,
  learnerTakeaway,
  skillCoverageCategories,
  skillCoverageScale,
} from "./skillGrowthChart";

/**
 * One learner's skill timeline, in a slide-over.
 *
 * ## Why a panel and not the analytics `ChartDetailModal`
 *
 * Every other drill-down on this dashboard re-renders the series already on
 * screen. This one fetches a different resource — a person's history — and the
 * list behind it stays useful while you read it: an admin scanning for who
 * needs coaching opens three or four learners in a row against the same sorted
 * table. A modal blanks that table on every open.
 *
 * ## What it deliberately does not show
 *
 * No comparison to other learners, no cohort median, no rank. The panel plots
 * one person against their own first sessions and nothing else, which is the
 * frame the whole feature was scoped to.
 *
 * ## Two series, never one number
 *
 * Roleplay scores and quiz/annotation scores sit in separate charts. Blending
 * them into a single "skill index" was considered and rejected: the weighting
 * would be invented here, and an index that moves tells a reader nothing about
 * which half of it moved. They are also graded by different rulers — an LLM
 * judge versus deterministic set comparison — so a shared axis would average a
 * drifting measure with a stable one.
 */
export const LearnerSkillPanel = ({
  learnerId,
  onClose,
}: {
  /** null closes the panel; a number opens it and fetches that learner. */
  learnerId: number | null;
  onClose: () => void;
}) => {
  // `skip` is what keeps the list to one request: no learner series is fetched
  // until a row is actually opened.
  const { data, isFetching, isError } = useGetSkillGrowthLearnerSeriesQuery(learnerId as number, {
    skip: learnerId === null,
  });

  const composite = useMemo(
    () => buildLearnerCompositeSeries(data?.sessions ?? []),
    [data?.sessions],
  );
  const coverage = useMemo(() => buildSkillCoverageSeries(data?.sessions ?? []), [data?.sessions]);
  const coverageCategories = useMemo(
    () => skillCoverageCategories(data?.sessions ?? []),
    [data?.sessions],
  );
  const knowledge = useMemo(
    () => buildKnowledgeSeries(data?.knowledgeAttempts ?? []),
    [data?.knowledgeAttempts],
  );

  const domain = data?.scoreDomain ?? [0, 100];

  const compositeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: "Evaluated session",
        colorScale: LEARNER_SCALE,
        legend: false,
        domain,
        height: CHART_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [domain],
  );

  const coverageOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Skill %",
        bottomTitle: "Evaluated session",
        colorScale: skillCoverageScale(coverageCategories),
        domain,
        height: CHART_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [coverageCategories, domain],
  );

  const knowledgeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Score %",
        bottomTitle: "Submitted",
        colorScale: KNOWLEDGE_SCALE,
        domain,
        height: CHART_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [domain],
  );

  const title = data ? learnerName(data.learner) : "Learner";

  return (
    <SidePanel
      open={learnerId !== null}
      onClose={onClose}
      title={title}
      className="w-[46vw] min-w-[560px]"
    >
      {isFetching ? (
        <SkeletonPlaceholder className="analytics-chart-skeleton" />
      ) : isError || !data ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Couldn't load this learner"
          subtitle="There was a problem fetching their session history."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <p className="text-sm font-medium text-typography-900">
              {TREND_LABELS[data.learner.trend]}
            </p>
            <p className="text-xs leading-relaxed text-typography-500">
              {learnerTakeaway(data.learner, data.thresholds)}
            </p>
            {data.learner.email && (
              <p className="text-xs text-typography-500">{data.learner.email}</p>
            )}
          </header>

          {data.truncated && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="History truncated"
              subtitle="This learner has more sessions than the panel loads; the earliest are shown."
            />
          )}

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Roleplay sessions</h4>
            <p className="text-xs text-typography-500">
              Composite judge score per evaluated session, oldest first. {boundedDomainNote(domain)}
            </p>
            {composite.length ? (
              <ScrollableChart data={composite}>
                <LineChart data={composite} options={compositeOpts} />
              </ScrollableChart>
            ) : (
              <EmptyBlock text="No evaluated roleplay sessions yet" />
            )}
          </section>

          {coverage.length > 0 && (
            <section className="flex flex-col gap-1">
              <h4 className="text-sm font-medium text-typography-900">Per-skill breakdown</h4>
              <p className="text-xs text-typography-500">
                Only sessions the evaluator scored per skill appear; gaps are sessions without a
                per-skill payload, not zeroes.
              </p>
              <ScrollableChart data={coverage}>
                <LineChart data={coverage} options={coverageOpts} />
              </ScrollableChart>
            </section>
          )}

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Quizzes &amp; annotations</h4>
            <p className="text-xs text-typography-500">
              Knowledge-side scores, kept separate from roleplay: the two are graded by different
              rulers and a combined number would hide which one moved.
            </p>
            {knowledge.length ? (
              <ScrollableChart data={knowledge}>
                <LineChart data={knowledge} options={knowledgeOpts} />
              </ScrollableChart>
            ) : (
              <EmptyBlock text="No scored quiz or annotation attempts yet" />
            )}
          </section>

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Sessions</h4>
            {/* The table earns its place beside the chart: the scenario is the
                known confound of a raw-score timeline, and a reader needs to see
                a dip land on a scenario change rather than infer it. */}
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white text-left text-typography-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">#</th>
                    <th className="py-1 pr-2 font-medium">Date</th>
                    <th className="py-1 pr-2 font-medium">Scenario</th>
                    <th className="py-1 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map(s => (
                    <tr key={s.ordinal} className="border-t border-[#e0e0e0]">
                      <td className="py-1 pr-2 text-typography-500">{s.ordinal}</td>
                      <td className="py-1 pr-2">
                        {s.occurredAt ? s.occurredAt.slice(0, 10) : "—"}
                      </td>
                      <td className="py-1 pr-2">{s.scenarioTitle ?? "—"}</td>
                      <td className="py-1">{s.compositeScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-[11px] leading-relaxed text-typography-500">
            {data.provenance.derivation}. {data.provenance.note}
          </p>
        </div>
      )}
    </SidePanel>
  );
};

const EmptyBlock = ({ text }: { text: string }) => (
  <div className="flex h-24 items-center justify-center rounded border border-dashed border-[#e0e0e0] text-xs text-typography-500">
    {text}
  </div>
);
