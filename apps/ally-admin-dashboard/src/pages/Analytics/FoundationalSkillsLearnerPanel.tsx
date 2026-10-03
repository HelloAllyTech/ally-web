import { useMemo } from "react";

import { LineChart } from "@carbon/charts-react";

import { InlineNotification, SidePanel, SkeletonPlaceholder } from "@ally-ui-mono/ui-shared";
import { useGetFoundationalSkillsLearnerQuery } from "@api";

import { CHART_HEIGHT, ScrollableChart, lineOpts, single } from "./chartKit";
import {
  FhsProgressBehaviour,
  FhsProgressSkill,
  TIER_LABELS,
  cutLabel,
  learnerName,
  signed,
  skillsByTier,
} from "./foundationalSkillsProgressChart";
import { SkillCutGrid } from "./SkillCutGrid";

const COMPOSITE = "Overall score";

/**
 * One learner's foundational helping skills, slice by slice — the development
 * portfolio behind a row of the Skills tab's learner table: the overall score
 * (horizontal: how they are doing as a whole), every skill per cut (vertical:
 * where), and the unhelpful behaviours the judge saw, in words.
 *
 * Self against self only: no cohort line, no rank. Like the Skill growth panel
 * it is a slide-over so the sorted table behind it stays put while an admin
 * opens several learners in a row.
 */
export const FoundationalSkillsLearnerPanel = ({
  learnerId,
  skills,
  behaviours,
  onClose,
}: {
  learnerId: number | null;
  /** Rubric skills, in display order (from the progress response). */
  skills: FhsProgressSkill[];
  /** Behaviour code → text, so codes read as sentences. */
  behaviours: FhsProgressBehaviour[];
  onClose: () => void;
}) => {
  const { data, isFetching, isError } = useGetFoundationalSkillsLearnerQuery(learnerId as number, {
    skip: learnerId === null,
  });
  const learner = data?.learners[0];
  const cuts = useMemo(() => learner?.cuts ?? [], [learner]);

  const series = useMemo(
    () => cuts.map(c => ({ group: COMPOSITE, key: cutLabel(c.cut), value: c.compositeScore })),
    [cuts],
  );
  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Score (1–4)",
        bottomTitle: "Cut",
        colorScale: single(COMPOSITE),
        domain: [1, 4],
        legend: false,
        height: CHART_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [],
  );

  const textOf = useMemo(() => new Map(behaviours.map(b => [b.code, b])), [behaviours]);
  const unhelpfulByCut = cuts
    .map(c => ({
      cut: c.cut,
      items: c.observed
        .map(code => textOf.get(code))
        .filter((b): b is FhsProgressBehaviour => !!b && b.kind === "unhelpful"),
    }))
    .filter(r => r.items.length > 0);

  const byCut = useMemo(() => new Map(cuts.map(c => [c.cut, c])), [cuts]);
  const rows = skillsByTier(skills).map(s => ({
    key: s.skill,
    label: s.name,
    group: TIER_LABELS[s.tier],
  }));

  return (
    <SidePanel
      open={learnerId !== null}
      onClose={onClose}
      title={learner ? learnerName(learner) : "Learner"}
      className="w-[52vw] min-w-[600px]"
    >
      {isFetching ? (
        <SkeletonPlaceholder className="analytics-chart-skeleton" />
      ) : isError || !learner ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Couldn't load this learner"
          subtitle="There was a problem fetching their scored practice."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <p className="text-sm font-medium text-typography-900">
              {cuts.length} scored cut{cuts.length === 1 ? "" : "s"}
              {learner.changeSinceFirstCut !== null &&
                ` · ${signed(learner.changeSinceFirstCut)} from cut 1 to cut ${learner.cutsReached}`}
            </p>
            <p className="text-xs leading-relaxed text-typography-500">
              Each cut is 5,000 characters of this learner's own roleplay speech, scored 1–4 on the
              foundational helping skills. Single cuts are noisy — read the run, not one point.
            </p>
          </header>

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Overall, cut by cut</h4>
            <ScrollableChart data={series}>
              <LineChart data={series} options={opts} />
            </ScrollableChart>
          </section>

          <section className="flex flex-col gap-1">
            <h4 className="text-sm font-medium text-typography-900">Every skill, cut by cut</h4>
            <p className="text-xs text-typography-500">
              1 = an unhelpful behaviour, 2 = not every basic behaviour, 3 = every basic, 4 = basic
              plus advanced. A dash means that cut gave no opportunity for the skill.
            </p>
            <SkillCutGrid
              rows={rows}
              cuts={cuts.map(c => c.cut)}
              decimals={0}
              caption="This learner's level on each skill at each cut"
              cell={(skill, cut) => {
                const v = byCut.get(cut)?.skillLevels[skill];
                return typeof v === "number"
                  ? { value: v }
                  : { value: null, title: "No opportunity for this skill in this cut" };
              }}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-typography-900">Unhelpful behaviours seen</h4>
            {unhelpfulByCut.length === 0 ? (
              <p className="text-xs text-typography-500">None in any scored cut.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-xs">
                {unhelpfulByCut.map(r => (
                  <li key={r.cut} className="flex gap-3">
                    <span className="w-12 shrink-0 font-medium tabular-nums text-typography-700">
                      {cutLabel(r.cut)}
                    </span>
                    <span className="flex flex-col gap-0.5 text-typography-600">
                      {r.items.map(b => (
                        <span key={b.code}>{b.text}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </SidePanel>
  );
};
