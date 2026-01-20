import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useGetCurrentUserQuery, useGetLeaderBoardListQuery } from "@api";
import { AchievementBadgeModal, AchievementsCard, LeaderboardList } from "@components";
import { ROUTES } from "@constants";
import { LeaderboardUser } from "@src/components/leaderboard-list/LeaderboardList";

const PATHS_PAGE_SIZE = 30;

// TODO: Replace with actual data from API
const DUMMY_ACHIEVEMENTS = [
  {
    id: "1",
    title: "First Steps",
    description: "Practice for at least 15 minutes at account level",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop&crop=center",
  },
  {
    id: "2",
    title: "Consistent Start",
    description: "Maintain a 3-day practice streak (minimum 10 mins/day)",
    imageUrl:
      "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=100&h=100&fit=crop&crop=center",
  },
  {
    id: "3",
    title: "Milestone Hunter",
    description: "Successfully complete 10 simulation sessions",
    imageUrl:
      "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=100&h=100&fit=crop&crop=center",
  },
];

const BADGE_MODAL_DATA = [
  {
    id: "1",
    title: "First Step",
    description: "Practice for at least 15 minutes at account level",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop&crop=center",
  },
  {
    id: "2",
    title: "Consistent Start",
    description: "Maintain a 3-day practice streak (minimum 10 mins/day)",
    imageUrl:
      "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=100&h=100&fit=crop&crop=center",
  },
  {
    id: "3",
    title: "Milestone Hunter",
    description: "Successfully complete 10 simulation sessions",
    imageUrl:
      "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=100&h=100&fit=crop&crop=center",
  },
];

export const Leaderboard = () => {
  const navigate = useNavigate();
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState<number | null>(null);
  const [pathsOffset, setPathsOffset] = useState(0);
  const [window, setWindow] = useState("LAST_WEEK");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);

  const pathParams = {
    limit: PATHS_PAGE_SIZE,
    offset: pathsOffset,
    window: window,
    sortBy: "score",
    order: "DESC" as const,
  };
  const { data: leaderBoardList, isFetching } = useGetLeaderBoardListQuery(pathParams);
  const { data: currentUser } = useGetCurrentUserQuery({ window: window });

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

  useEffect(() => {
    if (BADGE_MODAL_DATA.length > 0) {
      setCurrentBadgeIndex(0);
    }
  }, []);

  const hasMore = useMemo(() => {
    if (!leaderBoardList) return false;
    return leaderboardData.length < (leaderBoardList.totalCount || 0);
  }, [leaderboardData.length, leaderBoardList]);

  const handleViewAllBadges = () => {
    navigate(ROUTES.ACHIEVEMENTS_VIEW_ALL);
  };

  const handleCloseModal = () => {
    setCurrentBadgeIndex(prevIndex => {
      if (prevIndex === null) return null;
      const nextIndex = prevIndex + 1;
      return nextIndex < BADGE_MODAL_DATA.length ? nextIndex : null;
    });
  };

  const currentBadge = currentBadgeIndex !== null ? BADGE_MODAL_DATA[currentBadgeIndex] : null;

  if (!FEATURE_FLAGS_MAP.LEADERBOARD_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Leaderboard is not enabled</div>
    );
  }

  return (
    <div className={"p-6 overflow-hidden w-full h-full"} data-testid="leaderboard-page">
      <div
        className="text-typography-900 font-secondary text-2xl font-[500] flex items-center"
        data-testid="leaderboard-title"
      >
        Leaderboard
      </div>
      <div className="flex flex-row gap-2 pb-4 h-full">
        <LeaderboardList
          currentUser={currentUser}
          onTimeFilterChange={handleWindowChange}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isFetching}
        />

        {/* achievements card */}
        <div className="w-1/2 h-[490px] ml-4 mt-4">
          <AchievementsCard
            achievements={DUMMY_ACHIEVEMENTS}
            totalBadges={3}
            onViewAll={handleViewAllBadges}
          />
        </div>
      </div>

      {currentBadge && (
        <AchievementBadgeModal
          isOpen={true}
          onClose={handleCloseModal}
          title={currentBadge.title}
          description={currentBadge.description}
          badgeImageUrl={currentBadge.imageUrl}
        />
      )}
    </div>
  );
};
