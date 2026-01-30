import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useGetMyBadgesQuery,
  useGetBadgesCountQuery,
  useGetCurrentUserQuery,
  useGetLeaderBoardListQuery,
} from "@api";
import { AchievementsCard, LeaderboardList, LeaderboardUser } from "@components";
import { ROUTES } from "@constants";
import { AchievementItemData, LockedStatus, UserBadge, ViewedStatus } from "@types";

// Map UserBadge (earned badges) to AchievementItemData format
const mapUserBadgeToAchievementItem = (badge: UserBadge): AchievementItemData => ({
  id: badge.id,
  code: badge.code,
  name: badge.name,
  description: badge.description,
  imageUrl: badge.imageUrl,
  viewedStatus: badge.viewStatus,
  lockStatus: LockedStatus.UNLOCKED, // Earned badges are always unlocked
  category: "",
});

const PATHS_PAGE_SIZE = 30;
const INITIAL_WINDOW = "LAST_WEEK";

export const Leaderboard = () => {
  const navigate = useNavigate();
  const [pathsOffset, setPathsOffset] = useState(0);
  const [window, setWindow] = useState(INITIAL_WINDOW);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);

  const isBadgesEnabled = FEATURE_FLAGS_MAP.BADGES_FLAG;

  const pathParams = {
    limit: PATHS_PAGE_SIZE,
    offset: pathsOffset,
    window: window,
    sortBy: "score",
    order: "DESC" as const,
  };
  const { data: leaderBoardList, isFetching } = useGetLeaderBoardListQuery(pathParams);
  const { data: currentUser } = useGetCurrentUserQuery({ window: window.toUpperCase() });

  useEffect(() => {
    if (!leaderBoardList?.data?.length) return;

    setLeaderboardData(prevData => {
      if (pathsOffset === 0) {
        return leaderBoardList.data;
      }

      const existingIds = new Set(prevData.map(u => u.userId));
      const newData = leaderBoardList.data.filter(u => !existingIds.has(u.userId));

      return [...prevData, ...newData];
    });
  }, [leaderBoardList?.data, pathsOffset]);

  const loadMore = () => {
    if (isFetching) return;
    setPathsOffset(prev => prev + PATHS_PAGE_SIZE);
  };

  const handleWindowChange = (filter: string) => {
    setWindow(filter);
    setPathsOffset(0);
    setLeaderboardData([]);
  };

  const { data: badgesResponse, isLoading: isBadgesLoading } = useGetMyBadgesQuery(
    {
      viewedStatus: ViewedStatus.VIEWED,
    },
    {
      skip: !isBadgesEnabled,
    },
  );
  const { data: badgesCountResponse, isLoading: isBadgesCountLoading } = useGetBadgesCountQuery(
    {
      viewedStatus: ViewedStatus.VIEWED,
    },
    {
      skip: !isBadgesEnabled,
    },
  );

  const myBadges = badgesResponse?.data ?? [];
  const viewedBadgesCount = badgesCountResponse?.count ?? 0;

  const hasMore = useMemo(() => {
    if (!leaderBoardList) return false;
    return leaderboardData.length < (leaderBoardList.totalCount || 0);
  }, [leaderboardData.length, leaderBoardList]);

  const handleViewAllBadges = () => {
    navigate(ROUTES.ACHIEVEMENTS_VIEW_ALL);
  };

  const getBadgesList = () => {
    if (badgesResponse?.data?.length === 0) {
      return [];
    }
    if (badgesResponse?.data?.length < 3) {
      return myBadges.map(mapUserBadgeToAchievementItem);
    }
    return myBadges.slice(0, 3).map(mapUserBadgeToAchievementItem);
  };

  if (!FEATURE_FLAGS_MAP.LEADERBOARD_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Leaderboard is not enabled</div>
    );
  }

  return (
    <div
      className={"p-4 sm:p-6 overflow-hidden w-full h-full overflow-y-auto"}
      data-testid="leaderboard-page"
    >
      <div
        className="text-typography-900 font-secondary text-xl sm:text-2xl font-[500] flex items-center mb-4 sm:mb-6"
        data-testid="leaderboard-title"
      >
        Leaderboard
      </div>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pb-4 h-full items-stretch sm:items-start">
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <LeaderboardList
            currentUser={currentUser}
            onTimeFilterChange={handleWindowChange}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isFetching}
            selectedTimeFilter={window}
            data={leaderboardData}
          />
        </div>

        {/* achievements card */}
        {FEATURE_FLAGS_MAP.BADGES_FLAG && (
          <div className="w-full sm:w-1/2 sm:max-w-md sm:ml-0 sm:mt-0 sm:self-start flex-shrink-0">
            <AchievementsCard
              achievements={getBadgesList()}
              viewedBadgesCount={viewedBadgesCount}
              isLoading={isBadgesLoading || isBadgesCountLoading}
              onViewAll={handleViewAllBadges}
              className="h-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};
