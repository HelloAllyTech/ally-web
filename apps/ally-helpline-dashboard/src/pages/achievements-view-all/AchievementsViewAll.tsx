import { FC, useState } from "react";

import { Tooltip } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { useGetAvailableBadgesQuery } from "@api";
import { ArrowLeft, Info, NoResults } from "@assets";
import { AchievementItem, FallbackUI, ToggleButtonGroup } from "@components";
import { ROUTES, navBarOptions, toolTipStyles } from "@constants";
import { AchievementItemData, BadgeCategory, LockedStatus } from "@types";

// Badge type display labels
const BADGE_TYPE_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.SIMULATION_MINUTES]: "Journey",
  [BadgeCategory.ACTIVE_DAY_STREAK]: "Momentum",
  [BadgeCategory.COMMENTS_REACTIONS_GIVEN]: "Contribution",
  [BadgeCategory.COMMENTS_REACTIONS_RECEIVED]: "Resonance",
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "UNLOCKED", label: "Unlocked" },
];

const BADGE_TYPE_TOOLTIP_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.SIMULATION_MINUTES]:
    "Earned by completing simulation minutes. Only completed simulation time is counted.",
  [BadgeCategory.ACTIVE_DAY_STREAK]:
    "Complete at least one simulation per day to build a streak. Missing a day resets your streak.",
  [BadgeCategory.COMMENTS_REACTIONS_GIVEN]:
    "Count comments and reactions you give on sessions owned by other users. Interactions on your own sessions are not counted.",
  [BadgeCategory.COMMENTS_REACTIONS_RECEIVED]:
    "Earned when other reviewers comment or react on your sessions. Your own actions on your sessions are excluded.",
};

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
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState("ALL");

  const isFromNavbar =
    location.pathname === ROUTES.ACHIEVEMENTS_VIEW_ALL ||
    navBarOptions.some(option => option.path === location.pathname);

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
        const badgesArray = categoryData.badges || [];
        const filteredBadges =
          activeFilter === LockedStatus.UNLOCKED
            ? badgesArray.filter(badge => badge.lockStatus === LockedStatus.UNLOCKED)
            : badgesArray;

        return {
          category: categoryData.category,
          badges: filteredBadges,
        };
      })
      .filter(group => group.badges && group.badges.length > 0);
  };

  // Check if there are any unlocked badges
  const hasUnlockedBadges = badgesData.some(categoryData => {
    const badgesArray = categoryData.badges || [];
    return badgesArray.some(badge => badge.lockStatus === LockedStatus.UNLOCKED);
  });

  const groupedBadges = getFilteredBadgesByCategory();

  if (!FEATURE_FLAGS_MAP.BADGES_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Achievements is not enabled</div>
    );
  }

  // Error state should be checked before empty state
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

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-row items-center gap-3 sm:gap-[18px]">
          {!isFromNavbar && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -m-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-[5px] h-2.5" />
            </button>
          )}
          <h1
            className="text-[#0D0D0D] font-secondary text-xl sm:text-2xl font-[350] leading-[0.83]"
            data-testid="achievements-view-all-title"
          >
            Achievements
          </h1>
        </div>
        <div className="flex flex-row justify-between gap-3 sm:gap-[18px] w-full">
          <div className="flex flex-row items-center gap-1 mt-2">
            <div className="text-typography-900 text-lg font-medium font-primary">Badges</div>
            <Tooltip
              title={
                <div
                  style={{
                    fontWeight: 400,
                    fontSize: "13px",
                    color: "#F5EFF7",
                  }}
                >
                  Badges are earned based on your activity across simulations and community
                  participation. Some badges may be removed if qualifying actions are undone.
                </div>
              }
              slotProps={toolTipStyles}
              arrow
              placement="bottom"
            >
              <span className="cursor-pointer">
                <Info className="w-5 h-5" />
              </span>
            </Tooltip>
          </div>
          <ToggleButtonGroup
            className="font-primary text-xs sm:text-sm leading-[1.5]"
            value={activeFilter}
            onValueChange={handleFilterChange}
            items={FILTER_OPTIONS}
            equalWidth
            disabled={!hasUnlockedBadges}
          />
        </div>
      </div>
    );
  };

  const renderSectionLabel = (category: BadgeCategory) => {
    const tooltipContent = (
      <div className="flex flex-col gap-1">
        <div
          style={{
            fontWeight: 600,
            fontSize: "13px",
            color: "#F5EFF7",
          }}
        >
          {`${BADGE_TYPE_LABELS[category]} Badges`}
        </div>
        <div
          style={{
            fontWeight: 400,
            fontSize: "13px",
            color: "#F5EFF7",
            lineHeight: "1.4",
          }}
        >
          {BADGE_TYPE_TOOLTIP_LABELS[category]}
        </div>
      </div>
    );

    return (
      <div className="flex items-center gap-1">
        <div className="font-primary text-xs leading-5 font-normal text-typography-600">
          {BADGE_TYPE_LABELS[category]}
        </div>
        <Tooltip title={tooltipContent} arrow placement="top" slotProps={toolTipStyles}>
          <span className="cursor-pointer">
            <Info className="w-5 h-5" />
          </span>
        </Tooltip>
        <div className="border-t-[0.5px] ml-2 border-[#D2D2D2] w-full" />
      </div>
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
          <AchievementItem key={badge.id} achievement={badge} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-white" data-testid="achievements-view-all-page">
      <div className="p-4 sm:p-6 pb-4 sm:pb-6">{renderHeader()}</div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-4 sm:gap-6">
        {groupedBadges.length === 0 && !isBadgesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-typography-600 text-base text-center">No badges found</div>
          </div>
        ) : (
          groupedBadges.map(({ category, badges }) => (
            <div key={category} className="flex flex-col gap-3 sm:gap-4">
              {renderSectionLabel(category)}
              {renderBadgeSection(badges)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
