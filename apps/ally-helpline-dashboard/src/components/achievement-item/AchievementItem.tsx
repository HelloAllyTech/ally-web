import { FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { AchievementLocked, Badge } from "@assets";
import { AchievementItemData, LockedStatus } from "@types";

export const AchievementItem: FC<{
  achievement: AchievementItemData;
  imageSize?: number;
}> = ({ achievement, imageSize = 75 }) => {
  const isUnlocked = achievement.lockStatus === LockedStatus.UNLOCKED;
  const renderBadgeImage = () => {
    if (!isUnlocked) {
      return (
        <AchievementLocked
          className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400"
          style={{ width: imageSize, height: imageSize }}
        />
      );
    }

    if (achievement.imageUrl) {
      return (
        <div className="flex-shrink-0" style={{ width: imageSize, height: imageSize }}>
          <CustomImage
            src={achievement?.imageUrl}
            alt={achievement?.name}
            className="rounded-lg object-cover w-full h-full"
            fallbackClassName="rounded-lg text-sm text-typography-600 bg-neutral-100 flex items-center justify-center"
            fallbackText="Badge"
          />
        </div>
      );
    }

    // Unlocked badges without image - show placeholder
    return (
      <div
        style={{ width: imageSize, height: imageSize }}
        className="rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 "
      >
        <Badge className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400" />
      </div>
    );
  };
  return (
    <div className="flex items-center gap-4 p-3 border border-border-light rounded-xl overflow-hidden">
      {renderBadgeImage()}
      <div className="flex flex-col min-w-0 flex-1">
        <h4
          className={`${isUnlocked ? "text-typography-900" : "text-typography-600"} font-primary text-base font-semibold truncate`}
        >
          {achievement.name}
        </h4>
        <p
          className={`${isUnlocked ? "text-typography-800" : "text-typography-600"} font-primary text-sm line-clamp-2`}
        >
          {achievement.description}
        </p>
      </div>
    </div>
  );
};
