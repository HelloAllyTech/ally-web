import { FC, useState } from "react";

import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { useGetAvailableBadgesQuery } from "@api";
import { ArrowLeft, NoResults } from "@assets";
import { AchievementItem, FallbackUI, ToggleButtonGroup } from "@components";
import { AchievementItemData, BadgeCategory, LockedStatus } from "@types";

// Badge type display labels
const BADGE_TYPE_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.SIMULATION_MINUTES]: "Simulation Minutes",
  [BadgeCategory.ACTIVE_DAY_STREAK]: "Active Day Streak",
  [BadgeCategory.COMMENTS_REACTIONS_GIVEN]: "Comments & Reactions Given",
  [BadgeCategory.COMMENTS_REACTIONS_RECEIVED]: "Comments & Reactions Received",
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "UNLOCKED", label: "Unlocked" },
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
  const [activeFilter, setActiveFilter] = useState("ALL");

  const {
    data: badgesData = [],
    isLoading: isBadgesLoading,
    isError: isBadgesError,
    refetch: refetchBadges,
  } = useGetAvailableBadgesQuery();

  // Filter badges based on active filter and group by category
  const getFilteredBadgesByCategory = (): Array<{
    category: BadgeCategory;
    badges: AchievementItemData[];
  }> => {
    return badgesData
      .map(categoryData => {
        const filteredBadges =
          activeFilter === LockedStatus.UNLOCKED
            ? categoryData.data.filter(badge => badge.lockStatus === LockedStatus.UNLOCKED)
            : categoryData.data;

        return {
          category: categoryData.categories,
          badges: filteredBadges,
        };
      })
      .filter(group => group.badges.length > 0);
  };

  const groupedBadges = getFilteredBadgesByCategory();

  if (!FEATURE_FLAGS_MAP.LEADERBOARD_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Achievements is not enabled</div>
    );
  }

  if (isBadgesError) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <FallbackUI
          icon={<NoResults />}
          mainMessage="Unable to Load Achievements"
          description="Something went wrong while loading achievements. Please try again."
          button={{
            text: "Retry",
            onClick: () => refetchBadges(),
          }}
        />
      </div>
    );
  }

  const renderHeader = () => {
    return (
      <div className="flex flex-col gap-3 w-full">
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
        <div className="flex flex-row justify-between gap-3 sm:gap-[18px] w-full">
          <div className="text-typography-900 text-lg font-medium mt-2 font-primary">Badges</div>
          <ToggleButtonGroup
            className="font-primary text-xs sm:text-sm leading-[1.5]"
            value={activeFilter}
            onValueChange={setActiveFilter}
            items={FILTER_OPTIONS}
            equalWidth
          />
        </div>
      </div>
    );
  };

  const renderSectionLabel = (label: string) => {
    return (
      <div className="font-primary text-xs leading-5 font-normal text-typography-600">{label}</div>
    );
  };

  const renderBadgeSection = (badgesList: AchievementItemData[]) => {
    if (isBadgesLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <BadgeCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badgesList.map(badge => (
          <AchievementItem key={badge.id} achievement={badge} imageSize={60} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-white" data-testid="achievements-view-all-page">
      <div className="p-4 sm:p-6 pb-4 sm:pb-6">{renderHeader()}</div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-4 sm:gap-6">
        {groupedBadges.map(({ category, badges }) => (
          <div key={category} className="flex flex-col gap-3 sm:gap-4">
            {renderSectionLabel(BADGE_TYPE_LABELS[category])}
            {renderBadgeSection(badges)}
          </div>
        ))}
      </div>
    </div>
  );
};
