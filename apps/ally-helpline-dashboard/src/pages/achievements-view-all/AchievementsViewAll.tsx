import { FC, useState } from "react";

import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetAvailableBadgesQuery } from "@api";
import { ArrowLeft, Info, NoResults } from "@assets";
import { AchievementItem, FallbackUI, ToggleButtonGroup } from "@components";
import { AchievementItemData, BadgeCategory, LockedStatus } from "@types";

// Badge type display labels
const getBadgeTypeLabels = (t: TFunction): Record<BadgeCategory, string> => ({
  [BadgeCategory.SIMULATION_MINUTES]: t("achievements.badgeTypes.journey"),
  [BadgeCategory.ACTIVE_DAY_STREAK]: t("achievements.badgeTypes.momentum"),
  [BadgeCategory.COMMENTS_REACTIONS_GIVEN]: t("achievements.badgeTypes.contribution"),
  [BadgeCategory.COMMENTS_REACTIONS_RECEIVED]: t("achievements.badgeTypes.resonance"),
  [BadgeCategory.XP_LEVEL]: t("achievements.badgeTypes.ascent"),
});

const getFilterOptions = (t: TFunction) => [
  { value: "ALL", label: t("achievements.filters.all") },
  { value: "UNLOCKED", label: t("achievements.filters.unlocked") },
];

const getBadgeTypeTooltipLabels = (t: TFunction): Record<BadgeCategory, string> => ({
  [BadgeCategory.SIMULATION_MINUTES]: t("achievements.badgeTypes.tooltip.journey"),
  [BadgeCategory.ACTIVE_DAY_STREAK]: t("achievements.badgeTypes.tooltip.momentum"),
  [BadgeCategory.COMMENTS_REACTIONS_GIVEN]: t("achievements.badgeTypes.tooltip.contribution"),
  [BadgeCategory.COMMENTS_REACTIONS_RECEIVED]: t("achievements.badgeTypes.tooltip.resonance"),
  [BadgeCategory.XP_LEVEL]: t("achievements.badgeTypes.tooltip.ascent"),
});

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState("ALL");

  const isFromLeaderboard = location.state?.from === "community";

  const {
    data: badgesData = [],
    isLoading: isBadgesLoading,
    isError: isBadgesError,
    refetch: refetchBadges,
  } = useGetAvailableBadgesQuery({ languageCode: i18n.language });

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

  // Error state should be checked before empty state
  if (isBadgesError) {
    return (
      <div className="flex h-[90vh] items-center justify-center">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("achievements.errors.title")}
          description={t("achievements.errors.description")}
          button={{
            text: t("common.retry"),
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
          {isFromLeaderboard && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -m-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t("achievements.backAria")}
            >
              <ArrowLeft className="w-[5px] h-2.5" />
            </button>
          )}
          <h1
            className="text-[#0D0D0D] font-secondary text-xl sm:text-2xl font-[350] leading-[0.83]"
            data-testid="achievements-view-all-title"
          >
            {t("achievements.title")}
          </h1>
        </div>
        <div className="flex flex-row justify-between gap-3 sm:gap-[18px] w-full">
          <div className="flex flex-row items-center gap-1 mt-2">
            <div className="text-typography-900 text-lg font-medium font-primary">
              {t("achievements.badges")}
            </div>
            <Tooltip
              label={
                <div
                  style={{
                    fontWeight: 400,
                    fontSize: "13px",
                    color: "#F5EFF7",
                  }}
                >
                  {t("achievements.badgesTooltip")}
                </div>
              }
              align="bottom"
              autoAlign
            >
              <button
                type="button"
                className="inline-flex cursor-pointer border-0 bg-transparent p-0"
              >
                <Info className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
          <ToggleButtonGroup
            className="font-primary text-xs sm:text-sm leading-[1.5]"
            value={activeFilter}
            onValueChange={handleFilterChange}
            items={getFilterOptions(t)}
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
          {`${getBadgeTypeLabels(t)[category]} ${t("achievements.badgeTypes.suffix")}`}
        </div>
        <div
          style={{
            fontWeight: 400,
            fontSize: "13px",
            color: "#F5EFF7",
            lineHeight: "1.4",
          }}
        >
          {getBadgeTypeTooltipLabels(t)[category]}
        </div>
      </div>
    );

    return (
      <div className="flex items-center gap-1">
        <div className="font-primary text-xs leading-5 font-normal text-typography-600">
          {getBadgeTypeLabels(t)[category]}
        </div>
        <Tooltip label={tooltipContent} align="top" autoAlign>
          <button type="button" className="inline-flex cursor-pointer border-0 bg-transparent p-0">
            <Info className="w-5 h-5" />
          </button>
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
            <div className="text-typography-600 text-base text-center">
              {t("achievements.empty")}
            </div>
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
