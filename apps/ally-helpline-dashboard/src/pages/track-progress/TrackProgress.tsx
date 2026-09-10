import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useGetLearnTrackProgressQuery } from "@api";
import { ArrowRight } from "@assets";
import { ROUTES, buildTrackRoute } from "@constants";

import { RoleplaySessionRow } from "./components/RoleplaySessionRow";
import { SectionProgressBar } from "./components/SectionProgressBar";
import { SkillCategoryCard } from "./components/SkillCategoryCard";

/**
 * A learner's progress-and-feedback dashboard for one course: percent
 * complete plus consolidated skill feedback across every roleplay session
 * evaluated so far. Complements Track Overview ("what's next") rather than
 * replacing it — this page answers "what have I shown so far".
 */
export const TrackProgress: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trackId = "" } = useParams<{ trackId: string }>();

  const {
    data: dashboard,
    isLoading,
    isError,
  } = useGetLearnTrackProgressQuery({ trackId }, { skip: !trackId });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-4 text-lg text-typography-700">
          {t("tracks2.progressDashboard.notFound")}
        </div>
        <button
          onClick={() => navigate(`${ROUTES.LEARN}?tab=courses`)}
          className="rounded-md bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600"
        >
          {t("common.backToLearn")}
        </button>
      </div>
    );
  }

  const sortedSections = [...dashboard.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl bg-white px-4 pb-16 font-primary sm:px-6">
      <div className="pt-4 pb-3 flex items-center gap-2 text-sm text-typography-700 min-w-0">
        <button
          onClick={() => navigate(buildTrackRoute(trackId))}
          className="hover:text-primary-500 transition-colors whitespace-nowrap truncate"
        >
          {dashboard.title}
        </button>
        <ArrowRight />
        <span className="text-primary-500 font-medium truncate">
          {t("tracks2.progressDashboard.title")}
        </span>
      </div>

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
    </div>
  );
};

export default TrackProgress;
