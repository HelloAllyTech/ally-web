import { FC } from "react";

import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { ArrowLeft } from "@assets";
import { AchievementItem, AchievementItemData } from "@components";

// TODO: Replace with actual API data
const UNLOCKED_BADGES: AchievementItemData[] = [
  {
    id: "1",
    title: "First Steps",
    description: "Complete first roleplay of 2+ minutes",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop&crop=center",
    isUnlocked: true,
  },
  {
    id: "2",
    title: "Warm Up",
    description: "Accumulate 10 minutes of roleplay",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop&crop=center",
    isUnlocked: true,
  },
  {
    id: "3",
    title: "Getting Serious",
    description: "Accumulate 50 minutes of roleplay",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop&crop=center",
    isUnlocked: true,
  },
];

const LOCKED_BADGES: AchievementItemData[] = [
  {
    id: "4",
    title: "In the Zone",
    description: "Accumulate 100 minutes of roleplay",
    isUnlocked: false,
  },
  {
    id: "5",
    title: "Committed",
    description: "Accumulate 500 minutes of roleplay",
    isUnlocked: false,
  },
  {
    id: "6",
    title: "Deep Practice",
    description: "Accumulate 1,000 minutes of roleplay",
    isUnlocked: false,
  },
  {
    id: "7",
    title: "Mastery Path",
    description: "Accumulate 5,000 minutes of roleplay",
    isUnlocked: false,
  },
  {
    id: "8",
    title: "Consistent Start",
    description: "First 3-day active streak",
    isUnlocked: false,
  },
  {
    id: "9",
    title: "Habit Builder",
    description: "First 10-day active streak",
    isUnlocked: false,
  },
  {
    id: "10",
    title: "Locked In",
    description: "First 30-day active streak",
    isUnlocked: false,
  },
  {
    id: "11",
    title: "First Voice",
    description: "Give 3 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "12",
    title: "Active Contributor",
    description: "Give 10 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "13",
    title: "Community Regular",
    description: "Give 100 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "14",
    title: "Community Pillar",
    description: "Give 500 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "15",
    title: "Noticed",
    description: "Receive 3 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "16",
    title: "Engaging",
    description: "Receive 10 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "17",
    title: "Resonating",
    description: "Receive 100 comments or reactions",
    isUnlocked: false,
  },
  {
    id: "18",
    title: "Highly Valued",
    description: "Receive 500 comments or reactions",
    isUnlocked: false,
  },
];

const BadgeCardSkeleton: FC = () => {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-[#D2D2D2] rounded-xl animate-pulse">
      <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-lg bg-neutral-200 flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-4 w-20 sm:w-24 bg-neutral-200 rounded" />
        <div className="h-3 w-32 sm:w-40 bg-neutral-200 rounded" />
      </div>
    </div>
  );
};

export const AchievementsViewAll: FC = () => {
  const navigate = useNavigate();

  // TODO: Replace with actual API call
  const unlockedBadges = UNLOCKED_BADGES;
  const lockedBadges = LOCKED_BADGES;
  const isLoading = false;

  const renderHeader = () => {
    return (
      <div className="flex flex-row items-center gap-3 sm:gap-[18px]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -m-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-[5px] h-2.5" />
        </button>
        <h1
          className="text-[#0D0D0D] font-secondary text-xl sm:text-2xl font-[350] leading-[0.83]"
          data-testid="achievements-view-all-title"
        >
          Achievements
        </h1>
      </div>
    );
  };

  const renderSectionLabel = (label: string) => {
    return (
      <div className="font-primary text-base font-medium leading-[1.69] text-black/87">{label}</div>
    );
  };

  const renderUnlockedSection = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <BadgeCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {unlockedBadges.map(badge => (
          <AchievementItem key={badge.id} achievement={badge} imageSize={60} />
        ))}
      </div>
    );
  };

  const renderLockedSection = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <BadgeCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (!FEATURE_FLAGS_MAP.LEADERBOARD_FLAG) {
      return (
        <div className="flex items-center justify-center h-full">Leaderboard is not enabled</div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {lockedBadges.map(badge => (
          <AchievementItem key={badge.id} achievement={badge} imageSize={60} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-white" data-testid="achievements-view-all-page">
      <div className="p-4 sm:p-6 pb-4 sm:pb-6">{renderHeader()}</div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-4 sm:gap-6">
        {/* Unlocked Section */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {renderSectionLabel("Unlocked")}
          {renderUnlockedSection()}
        </div>

        {/* Locked Section */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {renderSectionLabel("Locked")}
          {renderLockedSection()}
        </div>
      </div>
    </div>
  );
};
