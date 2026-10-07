import { FC } from "react";

import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProgressSummary } from "@types";
import { cn } from "@utils";

import { LevelIndicator } from "../level-indicator";

export interface XpLevelCardProps {
  /** The void-arg summary is enough; the Progress page passes its fuller payload. */
  summary: ProgressSummary;
  /**
   * Adds a "See your progress" link. /learn passes it; the Progress page leaves it out,
   * since a link to the page you are already on is noise.
   */
  onViewProgress?: () => void;
  className?: string;
}

/**
 * Level, XP earned inside it, and what is left to the next one.
 *
 * XP and levels are the progression learners are asked to engage with, so this one card
 * is what both /learn and the Progress page show. Sharing the component is what keeps
 * them from drifting into two different pictures of the same number.
 *
 * At the top of the ladder the "N XP to level M" line would have nothing to point at,
 * so it is replaced rather than left showing a null — a learner who finished the ladder
 * should not see an empty target where their achievement belongs.
 */
const XpLevelCard: FC<XpLevelCardProps> = ({ summary, onViewProgress, className }) => {
  const { t } = useTranslation();
  const percent = Math.round(summary.progress * 100);

  return (
    <section
      className={cn("rounded-xl border border-border-light bg-background-tertiary p-5", className)}
      data-testid="progress-hero"
    >
      <div className="flex items-center gap-4">
        <LevelIndicator
          level={summary.level}
          progress={summary.progress}
          isMaxLevel={summary.isMaxLevel}
          ariaLabel={t("progress.a11y.level", {
            level: summary.level,
            xp: summary.totalXp,
          })}
          className="scale-150"
        />
        <div className="ml-2 min-w-0 flex-1">
          <div className="font-secondary text-lg text-typography-900">
            {t("progress.hero.level", { level: summary.level })}
          </div>
          <div className="mt-1 text-sm text-typography-600" data-testid="progress-next-level">
            {summary.isMaxLevel
              ? t("progress.hero.maxLevel")
              : t("progress.hero.toNextLevel", {
                  count: summary.xpToNextLevel ?? 0,
                  level: summary.level + 1,
                })}
          </div>
        </div>
        {onViewProgress && (
          <button
            type="button"
            onClick={onViewProgress}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-typography-700 hover:bg-white max-md:min-h-11"
            data-testid="progress-hero-view"
          >
            {t("progress.hero.viewProgress")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary-50"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("progress.a11y.levelBar", { level: summary.level })}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-xs tabular-nums text-typography-600">
        {t("progress.hero.xpTotal", { count: summary.totalXp })}
      </div>
    </section>
  );
};

export default XpLevelCard;
