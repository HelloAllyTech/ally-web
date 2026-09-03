import { FC } from "react";

import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { useGetCurrentUserQuery, useGetProgressQuery } from "@api";
import { NoResults } from "@assets";
import { FallbackUI, LevelIndicator, PracticeStreakHeatmap } from "@components";
import { Permissions, ROUTES } from "@constants";
import { usePracticeStreakSummary, useProgressSummary, useUser } from "@hooks";

/** Matches the leaderboard page's default so the rank peek and that page agree. */
const RANK_WINDOW = "LAST_WEEK";

const StatCardSkeleton: FC = () => (
  <div className="animate-pulse rounded-xl border border-border-light bg-white p-4">
    <div className="h-7 w-16 rounded bg-neutral-200" />
    <div className="mt-2 h-3 w-24 rounded bg-neutral-200" />
  </div>
);

interface StatCardProps {
  value: string;
  label: string;
  testId: string;
}

/**
 * One cumulative number. Every stat on this row is a total that only ever goes up —
 * a lost streak or a bad session cannot take any of them away, which is the point of
 * showing them together above the trends.
 */
const StatCard: FC<StatCardProps> = ({ value, label, testId }) => (
  <div className="rounded-xl border border-border-light bg-white p-4" data-testid={testId}>
    <div className="font-secondary text-2xl leading-none tabular-nums text-typography-900">
      {value}
    </div>
    <div className="mt-2 text-xs text-typography-600">{label}</div>
  </div>
);

export const Progress = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permissions } = useUser();

  const { canViewProgress, isGateLoading } = useProgressSummary();
  const { summary: streakSummary } = usePracticeStreakSummary();

  const {
    data: progress,
    isLoading,
    isError,
    refetch,
  } = useGetProgressQuery(undefined, { skip: !canViewProgress });

  // The rank peek is a single line, not a leaderboard. Skipped entirely for users who
  // cannot see the leaderboard, so they make no request for a number they may not read.
  const canViewLeaderboard = permissions.includes(Permissions.VIEW_LEADERBOARD);
  const { data: myRank } = useGetCurrentUserQuery(
    { window: RANK_WINDOW },
    { skip: !canViewLeaderboard || !canViewProgress },
  );

  const handleStartPractice = () => navigate(ROUTES.LEARN);

  // The route guard only checks VIEW_USER_RANK, which every learner holds, so a direct
  // URL reaches this page even for an org without the feature. Without this the page
  // renders its shell — a title and a heatmap with no hero and no stats — which reads as
  // broken rather than as "not enabled here". Waits for the gate to resolve first, so a
  // slow toggle read cannot bounce a legitimate user out.
  if (!isGateLoading && !canViewProgress) {
    return <Navigate to="/" replace />;
  }

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <h1
        className="flex items-center font-secondary text-xl font-[500] text-typography-900 sm:text-2xl"
        data-testid="progress-title"
      >
        {t("progress.title")}
      </h1>
    </div>
  );

  /**
   * Level, XP earned inside it, and what is left to the next one.
   *
   * At the top of the ladder the "N XP to level M" line would have nothing to point at,
   * so it is replaced rather than left showing a null — a learner who finished the ladder
   * should not see an empty target where their achievement belongs.
   */
  const renderHero = () => {
    if (!progress) return null;

    return (
      <section
        className="mt-4 rounded-xl border border-border-light bg-background-tertiary p-5"
        data-testid="progress-hero"
      >
        <div className="flex items-center gap-4">
          <LevelIndicator
            level={progress.level}
            progress={progress.progress}
            isMaxLevel={progress.isMaxLevel}
            ariaLabel={t("progress.a11y.level", {
              level: progress.level,
              xp: progress.totalXp,
            })}
            className="scale-150"
          />
          <div className="ml-2 flex-1">
            <div className="font-secondary text-lg text-typography-900">
              {t("progress.hero.level", { level: progress.level })}
            </div>
            <div className="mt-1 text-sm text-typography-600" data-testid="progress-next-level">
              {progress.isMaxLevel
                ? t("progress.hero.maxLevel")
                : t("progress.hero.toNextLevel", {
                    count: progress.xpToNextLevel ?? 0,
                    level: progress.level + 1,
                  })}
            </div>
          </div>
        </div>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary-50"
          role="progressbar"
          aria-valuenow={Math.round(progress.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progress.a11y.levelBar", { level: progress.level })}
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress.progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 text-xs tabular-nums text-typography-600">
          {t("progress.hero.xpTotal", { count: progress.totalXp })}
        </div>
      </section>
    );
  };

  const renderStats = () => {
    if (!progress) return null;

    return (
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="progress-stats">
        <StatCard
          testId="progress-stat-minutes"
          value={String(progress.lifetimePracticeMinutes)}
          label={t("progress.stats.lifetimeMinutes")}
        />
        <StatCard
          testId="progress-stat-sessions"
          value={String(progress.sessionsCompleted)}
          label={t("progress.stats.sessions")}
        />
        <StatCard
          testId="progress-stat-track-items"
          value={String(progress.trackItemsCompleted)}
          label={t("progress.stats.trackItems")}
        />
        <StatCard
          testId="progress-stat-streak"
          value={String(streakSummary?.currentStreak ?? 0)}
          label={t("progress.stats.currentStreak")}
        />
      </section>
    );
  };

  /**
   * One line, not a leaderboard.
   *
   * `rank` is absent when the tenant has switched off ranking in the community, and this
   * honours that by rendering nothing rather than substituting a position the org chose
   * not to show.
   */
  const renderRankPeek = () => {
    if (!myRank?.rank) return null;

    return (
      <button
        type="button"
        onClick={() => navigate(ROUTES.COMMUNITY_LEADERBOARD)}
        className="mt-4 w-full rounded-xl border border-border-light bg-white p-4 text-left text-sm text-typography-700 hover:bg-background-tertiary"
        data-testid="progress-rank-peek"
      >
        {t("progress.rank.line", { rank: myRank.rank })}
      </button>
    );
  };

  const renderBadgesLink = () => (
    <button
      type="button"
      onClick={() => navigate(ROUTES.ACHIEVEMENTS_VIEW_ALL)}
      className="mt-4 w-full rounded-xl border border-border-light bg-white p-4 text-left text-sm text-typography-700 hover:bg-background-tertiary"
      data-testid="progress-badges-link"
    >
      {t("progress.badges.link")}
    </button>
  );

  const renderContent = () => {
    // Error before empty, so a failed load is never mistaken for "nothing yet".
    if (isError) {
      return (
        <div className="flex h-[70vh] items-center justify-center">
          <FallbackUI
            icon={<NoResults />}
            mainMessage={t("progress.errors.title")}
            description={t("progress.errors.description")}
            button={{ text: t("common.retry"), onClick: () => refetch() }}
          />
        </div>
      );
    }

    if (isLoading || isGateLoading) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="progress-skeleton">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      );
    }

    return (
      <>
        {renderHero()}
        {renderStats()}
        <PracticeStreakHeatmap className="mt-6" onStartPractice={handleStartPractice} />
        {renderRankPeek()}
        {renderBadgesLink()}
      </>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6" data-testid="progress-page">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};
