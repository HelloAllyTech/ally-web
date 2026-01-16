import { FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { AchievementLocked, Badge } from "@assets";

import { AchievementItemData } from "./types";

export const AchievementItem: FC<{ achievement: AchievementItemData; imageSize?: number }> = ({
  achievement,
  imageSize = 80,
}) => {
  const isUnlocked = achievement.isUnlocked ?? true;
  const renderBadgeImage = () => {
    // Locked badges show the locked placeholder image
    if (!isUnlocked) {
      return (
        <AchievementLocked
          className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400"
          style={{ width: imageSize, height: imageSize }}
        />
      );
    }

    // Unlocked badges with custom image
    if (achievement.imageUrl) {
      return (
        <div className="flex-shrink-0" style={{ width: imageSize, height: imageSize }}>
          <CustomImage
            src={achievement.imageUrl}
            alt={achievement.title}
            className="rounded-lg object-cover w-full h-full"
            fallbackClassName="rounded-lg bg-neutral-100 flex items-center justify-center w-full h-full"
            fallbackText="Image not available"
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
    <div className="flex items-center gap-4 p-4 border border-border-light rounded-xl overflow-hidden">
      {renderBadgeImage()}
      <div className="flex flex-col min-w-0 flex-1">
        <h4
          className={`${isUnlocked ? "text-typography-900" : "text-typography-600"} text-base font-semibold truncate`}
        >
          {achievement.title}
        </h4>
        <p
          className={`${isUnlocked ? "text-typography-800" : "text-typography-600"} text-sm line-clamp-2`}
        >
          {achievement.description}
        </p>
      </div>
    </div>
  );
};
