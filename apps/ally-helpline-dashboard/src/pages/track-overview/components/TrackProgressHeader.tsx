import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { ArrowRight } from "@assets";
import { ROUTES } from "@constants";
import { TrackDetail } from "@types";

interface TrackProgressHeaderProps {
  track: TrackDetail;
  isStarting: boolean;
  onStartOrContinue: () => void;
}

/**
 * Header of the track overview: cover, title, progress bar,
 * "n of m" and the Start/Continue CTA.
 */
export const TrackProgressHeader: FC<TrackProgressHeaderProps> = ({
  track,
  isStarting,
  onStartOrContinue,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const total = track.totalItems || 0;
  const completed = track.completedItems || 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = Boolean(track.completedAt) || (total > 0 && completed >= total);
  const hasProgress = completed > 0;

  const ctaLabel = !track.enrolled
    ? t("common.start")
    : hasProgress
      ? t("common.continue")
      : t("common.start");

  return (
    <div className="bg-white pb-3 pt-2">
      <div className="pt-4 pb-3 flex items-center gap-2 text-sm text-typography-700 min-w-0">
        <button
          onClick={() => navigate(`${ROUTES.LEARN}?tab=courses`)}
          className="hover:text-primary-500 transition-colors whitespace-nowrap"
        >
          {t("tracks2.breadcrumb")}
        </button>
        <ArrowRight />
        <span className="text-primary-500 font-medium truncate">{track.title}</span>
      </div>

      {track.coverImageUrl && (
        <div className="relative h-[140px] sm:h-[220px] w-full rounded-[12px] overflow-hidden">
          <CustomImage
            src={track.coverImageUrl}
            alt={track.title}
            className="w-full h-full object-cover bg-background-secondary"
          />
        </div>
      )}

      <div className="pt-4 sm:pt-6">
        <h1 className="mb-2 text-xl sm:text-2xl font-bold text-typography-900">{track.title}</h1>

        <div className="mb-4 flex items-center gap-3">
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${progressPct}%`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? "bg-success-300" : "bg-primary-500"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-sm font-medium text-typography-700">
            {t("tracks2.progress", { completed, total })}
          </span>
        </div>

        {track.description && (
          <p className="text-sm sm:text-base text-typography-800 mb-4 leading-relaxed">
            {track.description}
          </p>
        )}

        {!isComplete && (
          <button
            onClick={onStartOrContinue}
            disabled={isStarting}
            className="px-6 py-2 bg-primary-500 text-white rounded-full font-tertiary text-base font-medium hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            {isStarting ? t("common.starting") : ctaLabel}
          </button>
        )}
        {isComplete && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-50 text-success-800 rounded-full text-sm font-medium">
            {t("tracks2.trackCompleted")}
          </div>
        )}
      </div>
    </div>
  );
};
