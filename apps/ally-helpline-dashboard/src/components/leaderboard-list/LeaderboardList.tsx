import { FC, useState, useRef, useEffect, useCallback } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { ToggleButtonGroup } from "@src/components";
import { cn } from "@utils";

export interface LeaderboardUser {
  userId: number;
  rank: number;
  name: string;
  profileImageUrl?: string;
  minutesPlayed: number;
  badgeCount: number;
}

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

export const TIME_FILTER_OPTIONS: { labelKey: string; value: LeaderboardTimeFilter }[] = [
  { labelKey: "community.filters.last7days", value: "LAST_WEEK" },
  { labelKey: "community.filters.last28days", value: "LAST_MONTH" },
  { labelKey: "community.filters.last364days", value: "LAST_YEAR" },
  { labelKey: "community.filters.allTime", value: "ALL_TIME" },
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

const formatMinutesToHoursAndMinutes = (
  minutes: number,
  t: ReturnType<typeof useTranslation>["t"],
): string => {
  if (minutes < 60) {
    return minutes === 1
      ? t("common.minutes_one", { count: minutes })
      : t("common.minutes_other", { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1
      ? t("common.hours_one", { count: hours })
      : t("common.hours_other", { count: hours });
  }

  const hoursText =
    hours === 1
      ? t("common.hours_one", { count: hours })
      : t("common.hours_other", { count: hours });
  const minutesText =
    remainingMinutes === 1
      ? t("common.minutes_one", { count: remainingMinutes })
      : t("common.minutes_other", { count: remainingMinutes });
  return `${hoursText} ${minutesText}`;
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
          fallbackText={user.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
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
}

const LeaderboardRow: FC<LeaderboardRowProps> = ({
  user,
  isLast,
  rowRef,
  isCurrentUser,
  hideRank,
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
        <div className="w-16 flex justify-center">
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
      <div className="flex items-center gap-4 flex-1">
        <UserAvatar user={user} />
        <div className="flex items-center gap-2">
          <span className="text-typography-900 text-base font-medium">{user.name}</span>
          {isCurrentUser && (
            <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
              {t("community.you")}
            </span>
          )}
        </div>
      </div>

      {/* Total Duration */}
      <div className="w-40 text-right">
        <span className="text-typography-800 text-base">
          {formatMinutesToHoursAndMinutes(user.minutesPlayed, t)}
        </span>
      </div>

      {/* Badges */}
      <div className="w-24 text-center">
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
      <div className="w-16 flex justify-center">
        <div className="w-8 h-8 rounded-full bg-neutral-200" />
      </div>

      {/* User Info skeleton */}
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-full bg-neutral-200" />
        <div className="h-4 w-32 bg-neutral-200 rounded" />
      </div>

      {/* Total Duration skeleton */}
      <div className="w-40 flex justify-end">
        <div className="h-4 w-20 bg-neutral-200 rounded" />
      </div>

      {/* Badges skeleton */}
      <div className="w-24 flex justify-center">
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
  const [internalFilter, setInternalFilter] = useState<LeaderboardTimeFilter>("LAST_WEEK");
  const [isCurrentUserVisible, setIsCurrentUserVisible] = useState<boolean | null>(null);
  const [hasCheckedVisibility, setHasCheckedVisibility] = useState(false);
  const currentUserRowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const activeFilter = externalFilter ?? internalFilter;
  const isEmpty = !isLoading && (!data || data.length === 0);

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
    const items = TIME_FILTER_OPTIONS.map(opt => ({
      value: opt.value,
      label: t(opt.labelKey),
    }));
    return (
      <div className="w-full mb-4 overflow-hidden">
        <ToggleButtonGroup
          data-testid="leaderboard-time-filter-toggle"
          value={activeFilter}
          onValueChange={handleFilterChange}
          items={items}
          equalWidth
          className="w-full font-primary text-xs leading-[1.5] text-typography-900"
        />
      </div>
    );
  };

  const renderTableHeader = () => {
    return (
      <div className="flex items-center py-3 px-4 text-typography-600 text-sm font-medium border-b border-border-light">
        {!hideRank && <div className="w-16 text-center">{t("community.table.rank")}</div>}
        <div className="flex-1">{t("community.table.user")}</div>
        <div className="w-40 text-right">{t("community.table.totalDuration")}</div>
        <div className="w-24 text-center">{t("community.table.badges")}</div>
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
      const message = emptyMessage ?? t("community.emptyLeaderboard");
      return <EmptyState message={message} />;
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
            <LeaderboardRow user={currentUser} isLast isCurrentUser={true} />
          </div>
        )}
      </div>
    </div>
  );
};
