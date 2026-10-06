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
  learnerName,
  learnerSliceTooltip,
  learnerTakeaway,
  skillLevelsText,
} from "./skillGrowthChart";

/**
 * Fallbacks only while the response is loading — the plotted axes always come
 * from the response. The two scales are never the same: a slice scores 1–4 on
 * the helping-skills rubric, a quiz or annotation 0–100.
 */
const DEFAULT_DOMAIN: [number, number] = [1, 4];
const DEFAULT_KNOWLEDGE_DOMAIN: [number, number] = [0, 100];

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
 * one person against their own first slices and nothing else, which is the
 * frame the whole feature was scoped to.
 *
 * ## Two series, never one number
 *
 * Roleplay and quiz/annotation scores sit in separate charts on separate
 * scales. The roleplay series is the learner's helping-skills score per
 * 5,000-character slice of their speech (1–4, since 2026-10 — before then it
 * was the AI judge's 0–100 score of the AI actor); the knowledge series is
 * 0–100. Blending them into a single "skill index" was considered and
 * rejected: the weighting would be invented here, and an index that moves
 * tells a reader nothing about which half of it moved.
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
  const knowledge = useMemo(
    () => buildKnowledgeSeries(data?.knowledgeAttempts ?? []),
    [data?.knowledgeAttempts],
  );

  const domain = data?.scoreDomain ?? DEFAULT_DOMAIN;
  const knowledgeDomain = data?.knowledgeScoreDomain ?? DEFAULT_KNOWLEDGE_DOMAIN;

  const compositeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: `Helping-skills score (${domain[0]}–${domain[1]})`,
        bottomTitle: "Scored slice",
        colorScale: LEARNER_SCALE,
        legend: false,
        domain,
        height: CHART_HEIGHT,
        extra: {
          points: { enabled: true },
          // The scenarios and skill levels of the slice under the cursor.
          tooltip: { customHTML: learnerSliceTooltip },
        },
      }),
    [domain],
  );

  const knowledgeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Score %",
        bottomTitle: "Submitted",
        colorScale: KNOWLEDGE_SCALE,
        domain: knowledgeDomain,
        height: CHART_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [knowledgeDomain],
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
          subtitle="There was a problem fetching their practice history."
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
              subtitle="This learner has more slices than the panel loads; the earliest are shown."
            />
          )}

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">
              Roleplay practice, slice by slice
            </h4>
            <p className="text-xs text-typography-500">
              Helping-skills score of each 5,000-character slice of their roleplay speech, oldest
              first — the same slices the Helping skills tab reads. Hover a point for its scenarios
              and skill levels; a missing number is a slice that was not scored.{" "}
              {boundedDomainNote(domain)}
            </p>
            {composite.length ? (
              <ScrollableChart data={composite}>
                <LineChart data={composite} options={compositeOpts} />
              </ScrollableChart>
            ) : (
              <EmptyBlock text="No scored slices yet" />
            )}
          </section>

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Quizzes &amp; annotations</h4>
            <p className="text-xs text-typography-500">
              Knowledge-side scores, kept separate from roleplay: the two are graded by different
              rulers on different scales, and a combined number would hide which one moved.{" "}
              {boundedDomainNote(knowledgeDomain)}
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
            <h4 className="text-sm font-medium text-typography-900">Slices</h4>
            {/* The table earns its place beside the chart: the scenario is the
                known confound of a raw-score timeline, and a reader needs to see
                a dip land on a scenario change rather than infer it. */}
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white text-left text-typography-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">#</th>
                    <th className="py-1 pr-2 font-medium">Date</th>
                    <th className="py-1 pr-2 font-medium">Scenarios</th>
                    <th className="py-1 pr-2 font-medium">Score</th>
                    <th className="py-1 pr-2 font-medium">Skill levels</th>
                    <th className="py-1 font-medium">Unhelpful behaviour</th>
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
                      <td className="py-1 pr-2 tabular-nums">{s.compositeScore.toFixed(2)}</td>
                      <td className="py-1 pr-2 text-typography-500">
                        {skillLevelsText(s.skillLevels) || "—"}
                      </td>
                      <td className="py-1">
                        {s.hasUnhelpfulBehaviour === null
                          ? "—"
                          : s.hasUnhelpfulBehaviour
                            ? "Seen"
                            : "None"}
                      </td>
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
