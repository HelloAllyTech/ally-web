import { FC } from "react";

import { useTranslation } from "react-i18next";

import { Badge, NoBadges } from "@assets";
import { AchievementItem } from "@components";
import { AchievementItemData } from "@types";
import { cn } from "@utils";

export interface AchievementsCardProps {
  achievements?: AchievementItemData[];
  viewedBadgesCount?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  onViewAll?: () => void;
  className?: string;
}

const SkeletonCard: FC = () => {
  return (
    <div className="flex items-center gap-4 p-4 border border-border-light rounded-xl animate-pulse">
      <div className="w-20 h-20 rounded-lg bg-neutral-200 flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-5 w-32 bg-neutral-200 rounded" />
        <div className="h-4 w-48 bg-neutral-200 rounded" />
      </div>
    </div>
  );
};

const EmptyState: FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 pb-4 px-4 flex-1">
      <p className="text-black text-base leading-4.5 font-normal text-center mb-4">{message}</p>
      <NoBadges className="w-64 h-64" />
    </div>
  );
};

export const AchievementsCard: FC<AchievementsCardProps> = ({
  achievements = [],
  viewedBadgesCount,
  isLoading = false,
  emptyMessage,
  onViewAll,
  className,
}) => {
  const { t } = useTranslation();
  const isEmpty = !isLoading && achievements.length === 0;
  const displayEmptyMessage = emptyMessage || t("achievements.emptyHome");
  const showBadgeCount =
    !isLoading && !isEmpty && viewedBadgesCount !== undefined && viewedBadgesCount > 0;

  const renderHeader = (
    <div className="flex items-center justify-between p-4 border-b border-border-light">
      <div className="flex items-center gap-2">
        <Badge className="w-5 h-5" />
        <h3 className="text-typography-900 text-lg font-semibold">{t("achievements.title")}</h3>
      </div>
      {showBadgeCount && (
        <span className="px-3 py-1 bg-primary-50 text-primary-600 text-sm font-medium rounded-lg">
          {t("achievements.badgesCount", { count: viewedBadgesCount })}
        </span>
      )}
    </div>
  );

  const renderContent = (
    <div className="flex flex-col gap-3 p-4 pb-2.5 flex-1 custom-scrollbar">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
      ) : isEmpty ? (
        <EmptyState message={displayEmptyMessage} />
      ) : (
        achievements.map(achievement => (
          <AchievementItem key={achievement.id} achievement={achievement} />
        ))
      )}
    </div>
  );

  const renderFooter = (
    <div className={cn("p-4 pt-0", isEmpty && "flex justify-center")}>
      <button
        onClick={onViewAll}
        className="text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors"
      >
        {isEmpty ? t("achievements.viewAllBadges") : t("achievements.viewAll")}
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-border-light rounded-lg font-primary h-full",
        className,
      )}
    >
      {renderHeader}
      {renderContent}
      {onViewAll && renderFooter}
    </div>
  );
};
