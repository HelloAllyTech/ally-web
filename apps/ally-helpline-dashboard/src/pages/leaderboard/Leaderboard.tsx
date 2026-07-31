import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  useGetMyBadgesQuery,
  useGetBadgesCountQuery,
  useGetCurrentUserQuery,
  useGetLeaderBoardListQuery,
} from "@api";
import { AchievementsCard, LeaderboardList, LeaderboardUser } from "@components";
import { ROUTES, Permissions } from "@constants";
import { useUser } from "@hooks";
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [pathsOffset, setPathsOffset] = useState(0);
  const [window, setWindow] = useState(INITIAL_WINDOW);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { permissions } = useUser();

  const isBadgesEnabled = permissions.includes(Permissions.VIEW_BADGES);

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
    setHasMore(leaderBoardList?.data?.length === PATHS_PAGE_SIZE);
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
      languageCode: i18n.language,
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

  const handleViewAllBadges = () => {
    navigate(ROUTES.ACHIEVEMENTS_VIEW_ALL, { state: { from: "community" } });
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

  return (
    <div
      className={"p-4 sm:p-6 overflow-y-auto sm:overflow-hidden w-full h-full"}
      data-testid="leaderboard-page"
    >
      <div
        className="text-typography-900 font-secondary text-xl sm:text-2xl font-[500] flex items-center"
        data-testid="leaderboard-title"
      >
        {t("community.title")}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pb-4 h-full items-stretch sm:items-start">
        <LeaderboardList
          currentUser={currentUser}
          onTimeFilterChange={handleWindowChange}
          onLoadMore={loadMore}
          hasMore={hasMore}
          hideRank={leaderBoardList?.hideRankInCommunity}
          isLoading={isFetching}
          selectedTimeFilter={window}
          data={leaderboardData}
        />
        {/* achievements card */}
        <div className="w-full sm:w-1/2 sm:max-w-md sm:ml-0 sm:mt-[16px] sm:self-start flex-shrink-0">
          <AchievementsCard
            achievements={getBadgesList()}
            viewedBadgesCount={viewedBadgesCount}
            isLoading={isBadgesLoading || isBadgesCountLoading}
            onViewAll={handleViewAllBadges}
            className="h-auto"
          />
        </div>
      </div>
    </div>
  );
};
