import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { AchievementsCard, LeaderboardList } from "@components";

// TODO: Replace with actual data
export const DUMMY_LEADERBOARD_DATA = [
  {
    id: "1",
    rank: 1,
    name: "Sarah Johnson",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    totalDuration: "14 h 32 min",
    badges: 12,
  },
  {
    id: "2",
    rank: 2,
    name: "Emily Rodriguez",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    totalDuration: "12 h 15 min",
    badges: 10,
  },
  {
    id: "3",
    rank: 3,
    name: "Emily Rodriguez",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    totalDuration: "11 h 58 min",
    badges: 9,
  },
  {
    id: "4",
    rank: 4,
    name: "Emily Rodriguez",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    totalDuration: "10 h 22 min",
    badges: 8,
  },
  {
    id: "5",
    rank: 5,
    name: "Anderson",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    totalDuration: "9 h 47 min",
    badges: 7,
  },
  {
    id: "6",
    rank: 6,
    name: "James Anderson",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    totalDuration: "8 h 01 min",
    badges: 7,
  },
  {
    id: "7",
    rank: 7,
    name: "Maria Garcia",
    avatarUrl:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "7 h 19 min",
    badges: 6,
  },
  {
    id: "8",
    rank: 8,
    name: "Robert Taylor",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "6 h 55 min",
    badges: 6,
  },
  {
    id: "9",
    rank: 9,
    name: "Maria Garcia",
    avatarUrl:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "Abhay Balan",
    rank: 10,
    name: "Yedhu Krishnan",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "6 h 12 min",
    badges: 5,
    isCurrentUser: true,
  },
  {
    id: "11",
    rank: 11,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "12",
    rank: 12,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "13",
    rank: 13,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "14",
    rank: 14,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "15",
    rank: 15,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
  {
    id: "16",
    rank: 16,
    name: "John Doe",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    totalDuration: "5 h 45 min",
    badges: 5,
  },
];

// TODO: Replace with actual data
const CURRENT_USER = {
  id: "Abhay Balan",
  rank: 10,
  name: "Yedhu Krishnan",
  avatarUrl:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
  totalDuration: "6 h 12 min",
  badges: 5,
  isCurrentUser: true,
};

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

export const Leaderboard = () => {
  if (!FEATURE_FLAGS_MAP.LEADERBOARD_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Leaderboard is not enabled</div>
    );
  }

  const handleViewAllBadges = () => {
    // TODO: Navigate to badges page or open modal
  };

  return (
    <div className={"p-6 overflow-hidden w-full h-full"} data-testid="leaderboard-page">
      <div
        className="text-typography-900 font-secondary text-2xl font-[500] flex items-center"
        data-testid="leaderboard-title"
      >
        Leaderboard
      </div>
      <div className="flex flex-row gap-2 pb-4 h-full">
        <LeaderboardList currentUser={CURRENT_USER} data={DUMMY_LEADERBOARD_DATA} />

        {/* achievements card */}
        <div className="w-1/2 h-[490px] ml-4 mt-4">
          <AchievementsCard
            achievements={DUMMY_ACHIEVEMENTS}
            totalBadges={3}
            onViewAll={handleViewAllBadges}
          />
        </div>
      </div>
    </div>
  );
};
