import { FC } from "react";

import { useTranslation } from "react-i18next";

import { TrackProgressDashboard } from "@types";

import { LatestFeedbackPreview } from "./LatestFeedbackPreview";
import { PracticeNudge } from "./PracticeNudge";
import { RoleplaySessionRow } from "./RoleplaySessionRow";
import { ScoreTrendSparkline } from "./ScoreTrendSparkline";
import { SectionProgressBar } from "./SectionProgressBar";
import { SkillCategoryCard } from "./SkillCategoryCard";

interface TrackProgressBodyProps {
  dashboard: TrackProgressDashboard;
  /** Continues the learner into the next unlocked item in this course. */
  onContinuePress: () => void;
}

/**
 * The dashboard's actual content — overall progress, per-section rollup,
 * consolidated feedback, and the practice-sessions list — with no fetch/
 * loading/error handling and no page chrome of its own. Shared between the
 * standalone /track/:trackId/progress page and the in-context drawer opened
 * from Track Overview's progress bar, which each frame it differently.
 */
export const TrackProgressBody: FC<TrackProgressBodyProps> = ({ dashboard, onContinuePress }) => {
  const { t } = useTranslation();
  const sortedSections = [...dashboard.sections].sort((a, b) => a.order - b.order);
  const latestSession = dashboard.roleplaySessions[dashboard.roleplaySessions.length - 1];

  return (
    <>
      {/* Overall progress */}
      <section className="py-4">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-valuenow={dashboard.completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${dashboard.completionPct}%`}
          >
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-out"
              style={{ width: `${dashboard.completionPct}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-typography-700">
            {t("tracks2.progress", {
              completed: dashboard.completedItems,
              total: dashboard.totalItems,
            })}
          </span>
        </div>

        {sortedSections.length > 0 && (
          <div className="divide-y divide-border-light rounded-xl border border-border-light px-3">
            {sortedSections.map(section => (
              <SectionProgressBar key={section.id} section={section} />
            ))}
          </div>
        )}
      </section>

      <PracticeNudge
        skillCategories={dashboard.skillCategories}
        onContinuePress={onContinuePress}
      />

      {/* Consolidated feedback */}
      <section className="py-4">
        <h2 className="mb-1 text-lg font-semibold text-typography-900">
          {t("tracks2.progressDashboard.feedbackHeading")}
        </h2>
        {dashboard.evaluatedRoleplaySessionCount > 0 && (
          <p className="mb-4 text-sm text-typography-700">
            {t("tracks2.progressDashboard.feedbackSubheading", {
              count: dashboard.evaluatedRoleplaySessionCount,
            })}
          </p>
        )}

        <div className="mb-4">
          <ScoreTrendSparkline sessions={dashboard.roleplaySessions} />
        </div>

        {dashboard.skillCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-light p-6 text-center text-sm text-typography-700">
            {t("tracks2.progressDashboard.feedbackEmpty")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dashboard.skillCategories.map(skill => (
              <SkillCategoryCard key={skill.category} skill={skill} />
            ))}
          </div>
        )}

        {latestSession && (
          <div className="mt-4">
            <LatestFeedbackPreview session={latestSession} />
          </div>
        )}
      </section>

      {/* Practice sessions */}
      {dashboard.roleplaySessions.length > 0 && (
        <section className="py-4">
          <h2 className="mb-4 text-lg font-semibold text-typography-900">
            {t("tracks2.progressDashboard.sessionsHeading")}
          </h2>
          <div className="flex flex-col gap-2">
            {[...dashboard.roleplaySessions].reverse().map(session => (
              <RoleplaySessionRow
                key={`${session.trackItemId}-${session.scenarioSessionId}`}
                session={session}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
};
