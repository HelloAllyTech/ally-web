import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useGetLearnTrackProgressQuery } from "@api";
import { ArrowRight } from "@assets";
import { ROUTES, buildTrackRoute } from "@constants";

import { TrackProgressBody } from "./components/TrackProgressBody";

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

      <TrackProgressBody dashboard={dashboard} />
    </div>
  );
};

export default TrackProgress;
