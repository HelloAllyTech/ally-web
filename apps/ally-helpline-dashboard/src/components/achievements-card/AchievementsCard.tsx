import { FC } from "react";

import { Badge, NoBadges } from "@assets";
import { cn } from "@utils";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface AchievementsCardProps {
  achievements?: Achievement[];
  totalBadges?: number;
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

const AchievementItem: FC<{ achievement: Achievement }> = ({ achievement }) => {
  return (
    <div className="flex items-center gap-4 p-4 border border-border-light rounded-xl">
      {achievement.imageUrl ? (
        <img
          src={achievement.imageUrl}
          alt={achievement.title}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Badge className="w-8 h-8 text-neutral-400" />
        </div>
      )}
      <div className="flex flex-col">
        <h4 className="text-typography-900 text-base font-semibold">{achievement.title}</h4>
        <p className="text-typography-800 text-sm">{achievement.description}</p>
      </div>
    </div>
  );
};

const EmptyState: FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 pb-4 px-4 flex-1">
      <p className="text-typography-900 text-lg font-medium text-center mb-4">{message}</p>
      <NoBadges className="w-64 h-64" />
    </div>
  );
};

export const AchievementsCard: FC<AchievementsCardProps> = ({
  achievements = [],
  totalBadges,
  isLoading = false,
  emptyMessage = "You don't have any badges yet",
  onViewAll,
  className,
}) => {
  const isEmpty = !isLoading && achievements.length === 0;
  const showBadgeCount = !isLoading && !isEmpty && totalBadges !== undefined && totalBadges > 0;

  const renderHeader = (
    <div className="flex items-center justify-between p-4 border-b border-border-light">
      <div className="flex items-center gap-2">
        <Badge className="w-5 h-5" />
        <h3 className="text-typography-900 text-lg font-semibold">Achievements</h3>
      </div>
      {showBadgeCount && (
        <span className="px-3 py-1 bg-primary-50 text-primary-600 text-sm font-medium rounded-lg">
          {totalBadges} Badges
        </span>
      )}
    </div>
  );

  const renderContent = (
    <div className="flex flex-col gap-3 p-4 pb-0 flex-1 custom-scrollbar">
      {isLoading ? (
        Array.from({ length: totalBadges }).map((_, index) => <SkeletonCard key={index} />)
      ) : isEmpty ? (
        <EmptyState message={emptyMessage} />
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
        {isEmpty ? "View all badges" : "View all"}
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
