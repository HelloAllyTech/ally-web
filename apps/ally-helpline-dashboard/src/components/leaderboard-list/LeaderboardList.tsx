import { FC, useState, useRef, useEffect, useCallback } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { StreakPill, ToggleButtonGroup } from "@src/components";
import { cn } from "@utils";

import type { TFunction } from "i18next";

export interface LeaderboardUser {
  userId: number;
  rank: number;
  name: string;
  profileImageUrl?: string;
  minutesPlayed: number;
  badgeCount: number;
  /**
   * All-time consecutive-active-days streak. Optional so the component keeps
   * rendering against an API that has not shipped the field yet.
   */
  currentStreak?: number;
}

/**
 * Column widths, declared once. Header, row and skeleton all read from here so
 * they cannot drift apart.
 *
 * Narrow screens drop columns rather than squeezing them: below `sm` everything
 * but the name collapses into a single meta line under it. Streak outranks
 * badges because it changes daily and badges accumulate.
 */
const COL = {
  rank: "w-16 shrink-0",
  duration: "w-40 hidden md:block shrink-0",
  streak: "w-24 hidden sm:block shrink-0",
  badges: "w-24 hidden lg:block shrink-0",
} as const;

export type LeaderboardTimeFilter = "LAST_WEEK" | "LAST_MONTH" | "LAST_YEAR" | "ALL_TIME";

export interface LeaderboardListProps {
  data?: LeaderboardUser[];
  currentUserId?: string;
  selectedTimeFilter?: string;
  onTimeFilterChange?: (filter: LeaderboardTimeFilter) => void;
  className?: string;
  isLoading?: boolean;
  currentUser?: LeaderboardUser;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  hideRank?: boolean;
}

export const getTimeFilterOptions = (
  t: (key: string) => string,
): { label: string; value: LeaderboardTimeFilter }[] => [
  { label: t("community.filters.last7days"), value: "LAST_WEEK" },
  { label: t("community.filters.last28days"), value: "LAST_MONTH" },
  { label: t("community.filters.last364days"), value: "LAST_YEAR" },
  { label: t("community.filters.allTime"), value: "ALL_TIME" },
];

// Keep for backwards compat with older imports/tests.
export const TIME_FILTER_OPTIONS: { label: string; value: LeaderboardTimeFilter }[] = [
  { label: "Last 7 days", value: "LAST_WEEK" },
  { label: "Last 28 days", value: "LAST_MONTH" },
  { label: "Last 364 days", value: "LAST_YEAR" },
  { label: "All time", value: "ALL_TIME" },
];

const getRankBadgeStyle = (rank: number): string => {
  switch (rank) {
    case 1:
      return "bg-[#FFD700] text-white"; // Gold
    case 2:
      return "bg-[#C0C0C0] text-white"; // Silver
    case 3:
      return "bg-[#CD7F32] text-white"; // Bronze
    default:
      return "bg-transparent text-typography-700";
  }
};

const formatMinutesToHoursAndMinutes = (minutes: number, t: TFunction): string => {
  if (minutes < 60) {
    return `${minutes} ${
      minutes !== 1
        ? t("community.duration.minutes", "mins")
        : t("community.duration.minute", "min")
    }`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours !== 1 ? t("community.duration.hours", "hrs") : t("community.duration.hour", "hr")}`;
  }

  return `${hours} ${
    hours !== 1 ? t("community.duration.hours", "hrs") : t("community.duration.hour", "hr")
  } ${remainingMinutes} ${
    remainingMinutes !== 1
      ? t("community.duration.minutes", "mins")
      : t("community.duration.minute", "min")
  }`;
};

const UserAvatar: FC<{ user: LeaderboardUser; size?: "sm" | "md" }> = ({ user, size = "md" }) => {
  const sizeClasses = size === "sm" ? "w-10 h-10" : "w-12 h-12";

  if (user.profileImageUrl) {
    return (
      <div className="w-[50px] h-[50px] flex items-center justify-center overflow-hidden rounded-full">
        <CustomImage
          src={user.profileImageUrl}
          alt={user.name}
          className={cn(sizeClasses, "rounded-full object-cover")}
          fallbackText={user.name?.slice(0, 1)?.toUpperCase() ?? "--"}
        />
      </div>
    );
  }

  // Fallback initials avatar
  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        sizeClasses,
        "rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-medium text-sm",
      )}
    >
      {initials}
    </div>
  );
};

interface LeaderboardRowProps {
  user: LeaderboardUser;
  isLast?: boolean;
  rowRef?: React.RefObject<HTMLDivElement>;
  isCurrentUser?: boolean;
  hideRank?: boolean;
  youLabel?: string;
}

const LeaderboardRow: FC<LeaderboardRowProps> = ({
  user,
  isLast,
  rowRef,
  isCurrentUser,
  hideRank,
  youLabel,
}) => {
  const { t } = useTranslation();
  const isTopThree = user.rank <= 3;

  return (
    <div
      ref={rowRef}
      className={cn(
        "flex items-center py-3 px-4",
        !isLast && "border-b border-border-light",
        isCurrentUser && "bg-primary-50 rounded-lg border border-primary-200",
      )}
    >
      {/* Rank */}
      {!hideRank && (
        <div className={cn(COL.rank, "flex justify-center")}>
          {isTopThree ? (
            <span
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                getRankBadgeStyle(user.rank),
              )}
            >
              {user.rank}
            </span>
          ) : (
            <span className="text-typography-700 text-base font-medium">{user.rank}</span>
          )}
        </div>
      )}

      {/* User Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <UserAvatar user={user} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-typography-900 text-base font-medium truncate">{user.name}</span>
            {isCurrentUser && (
              <span className="shrink-0 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
                {youLabel ?? t("community.you")}
              </span>
            )}
          </div>
          {/* Below sm the streak/duration/badge columns are hidden, so the same
              figures move here rather than being dropped from the page. */}
          <div className="sm:hidden mt-0.5 text-xs text-typography-600">
            {user.currentStreak !== undefined && user.currentStreak > 0 && (
              <>
                <span>{t("community.table.streakValue", { count: user.currentStreak })}</span>
                <span className="mx-1.5">·</span>
              </>
            )}
            <span>{formatMinutesToHoursAndMinutes(user.minutesPlayed, t)}</span>
            <span className="mx-1.5">·</span>
            <span>{t("community.table.badgeValue", { count: user.badgeCount })}</span>
          </div>
        </div>
      </div>

      {/* Total Duration */}
      <div className={cn(COL.duration, "text-right")}>
        <span className="text-typography-800 text-base">
          {formatMinutesToHoursAndMinutes(user.minutesPlayed, t)}
        </span>
      </div>

      {/* Streak */}
      <div className={cn(COL.streak, "text-center")}>
        {user.currentStreak !== undefined && user.currentStreak > 0 ? (
          <StreakPill
            days={user.currentStreak}
            ariaLabel={t("community.table.streakValue", { count: user.currentStreak })}
          />
        ) : (
          <span className="text-typography-500 text-base">—</span>
        )}
      </div>

      {/* Badges */}
      <div className={cn(COL.badges, "text-center")}>
        <span className="text-typography-800 text-base">{user.badgeCount}</span>
      </div>
    </div>
  );
};

const SkeletonRow: FC<{ isLast?: boolean }> = ({ isLast }) => {
  return (
    <div
      className={cn(
        "flex items-center py-3 px-4 animate-pulse",
        !isLast && "border-b border-border-light",
      )}
    >
      {/* Rank skeleton */}
      <div className={cn(COL.rank, "flex justify-center")}>
        <div className="w-8 h-8 rounded-full bg-neutral-200" />
      </div>

      {/* User Info skeleton */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-full bg-neutral-200" />
        <div className="h-4 w-32 bg-neutral-200 rounded" />
      </div>

      {/* Total Duration skeleton */}
      <div className={cn(COL.duration, "justify-end md:flex")}>
        <div className="h-4 w-20 bg-neutral-200 rounded" />
      </div>

      {/* Streak skeleton */}
      <div className={cn(COL.streak, "justify-center sm:flex")}>
        <div className="h-4 w-10 bg-neutral-200 rounded" />
      </div>

      {/* Badges skeleton */}
      <div className={cn(COL.badges, "justify-center lg:flex")}>
        <div className="h-4 w-8 bg-neutral-200 rounded" />
      </div>
    </div>
  );
};

const EmptyState: FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p className="text-typography-600 text-base text-center">{message}</p>
    </div>
  );
};

const SKELETON_ROWS_COUNT = 8;

export const LeaderboardList: FC<LeaderboardListProps> = ({
  data = [],
  selectedTimeFilter: externalFilter,
  currentUser,
  onTimeFilterChange,
  isLoading = false,
  emptyMessage,
  onLoadMore,
  hideRank,
  hasMore,
}) => {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t("community.emptyLeaderboard");
  const [internalFilter, setInternalFilter] = useState<LeaderboardTimeFilter>("LAST_WEEK");
  const [isCurrentUserVisible, setIsCurrentUserVisible] = useState<boolean | null>(null);
  const [hasCheckedVisibility, setHasCheckedVisibility] = useState(false);
  const currentUserRowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const activeFilter = externalFilter ?? internalFilter;
  const isEmpty = !isLoading && (!data || data.length === 0);
  const timeFilterOptions = getTimeFilterOptions(t);

  // Check if current user row is visible in viewport
  useEffect(() => {
    // Reset visibility check when data changes
    setHasCheckedVisibility(false);
    setIsCurrentUserVisible(null);

    const scrollContainer = scrollContainerRef.current;
    const currentUserRow = currentUserRowRef.current;

    if (!scrollContainer || !currentUserRow) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentUserVisible(entry.isIntersecting);
        setHasCheckedVisibility(true);
      },
      {
        root: scrollContainer,
        threshold: 0.5, // Consider visible when 50% of the row is in view
      },
    );

    observer.observe(currentUserRow);

    return () => {
      observer.disconnect();
    };
  }, [data]);

  const handleLoadMore = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      if (entry.isIntersecting && hasMore) {
        onLoadMore?.();
      }
    },
    [hasMore, onLoadMore],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleLoadMore, {
      root: scrollContainerRef.current,
      rootMargin: "20px",
    });

    const element = loadingRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [handleLoadMore]);

  const handleFilterChange = (filter: LeaderboardTimeFilter) => {
    if (onTimeFilterChange) {
      onTimeFilterChange(filter);
    } else {
      setInternalFilter(filter);
    }
  };

  const renderTabs = () => {
    return (
      <div className="w-full mb-4 overflow-hidden">
        <ToggleButtonGroup
          data-testid="leaderboard-time-filter-toggle"
          value={activeFilter}
          onValueChange={handleFilterChange}
          items={timeFilterOptions}
          equalWidth
          className="w-full font-primary text-xs leading-[1.5] text-typography-900"
        />
      </div>
    );
  };

  const renderTableHeader = () => {
    return (
      <div className="flex items-center py-3 px-4 text-typography-600 text-sm font-medium border-b border-border-light">
        {!hideRank && (
          <div className={cn(COL.rank, "text-center")}>{t("community.table.rank")}</div>
        )}
        <div className="flex-1 min-w-0">{t("community.table.user")}</div>
        <div className={cn(COL.duration, "text-right")}>{t("community.table.totalDuration")}</div>
        <div className={cn(COL.streak, "text-center")} title={t("community.table.streakHint")}>
          {t("community.table.streak")}
        </div>
        <div className={cn(COL.badges, "text-center")}>{t("community.table.badges")}</div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading && data.length === 0) {
      return (
        <>
          {Array.from({ length: SKELETON_ROWS_COUNT }).map((_, index) => (
            <SkeletonRow key={index} isLast={index === SKELETON_ROWS_COUNT - 1} />
          ))}
        </>
      );
    }

    if (isEmpty) {
      return <EmptyState message={resolvedEmptyMessage} />;
    }

    return (
      <>
        {data.map((user, index) => {
          const isCurrentUser = currentUser?.userId === user.userId;

          return (
            <LeaderboardRow
              key={user.userId}
              user={user}
              isLast={index === data.length - 1}
              isCurrentUser={isCurrentUser}
              hideRank={hideRank}
              youLabel={t("community.you")}
              rowRef={isCurrentUser ? currentUserRowRef : undefined}
            />
          );
        })}
        {hasMore && (
          <div ref={loadingRef} className="text-center py-2">
            {isLoading && (
              <span className="text-sm text-typography-600">{t("community.loadingMore")}</span>
            )}
          </div>
        )}
      </>
    );
  };

  const showStickyRow =
    currentUser && hasCheckedVisibility && isCurrentUserVisible === false && !isLoading && !isEmpty;

  return (
    <div className="w-full bg-white h-full relative pt-4 font-primary flex flex-col">
      {renderTabs()}
      {renderTableHeader()}

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto h-full custom-scrollbar"
          style={{
            paddingBottom: showStickyRow ? "80px" : "0",
          }}
        >
          {renderContent()}
        </div>

        {/* Sticky current user row - hidden when visible in the list */}
        {showStickyRow && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border-light shadow-lg z-10">
            <LeaderboardRow
              user={currentUser}
              isLast
              isCurrentUser={true}
              youLabel={t("community.you")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
