import React, { ReactNode } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { ToggleSwitch } from "@components";
import { en } from "@constants";

interface EntityToggleCardProps {
  entity: {
    imageUrl: string;
    name: string;
    description: string;
  };
  hasAccess: boolean;
  onToggleAccess: (enabled: boolean) => void;
  imageFit?: "cover" | "contain";
  imageContainerClassName?: string;
  /**
   * Optional control rendered to the left of the toggle — today the group
   * targeting pill on the organization content tabs. Optional so every other
   * caller (Badges, platform admins) keeps a card with no group concept at all.
   */
  rowAction?: ReactNode;
}

export const EntityToggleCard: React.FC<EntityToggleCardProps> = ({
  entity,
  hasAccess,
  onToggleAccess,
  imageFit = "cover",
  imageContainerClassName = "bg-neutral-100",
  rowAction,
}) => {
  return (
    <div className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]">
      {/* Image */}
      <div
        className={`w-[18%] md:w-[10%] lg:w-[7%] h-[56px] rounded-lg overflow-hidden flex-shrink-0 ${imageContainerClassName}`}
      >
        <CustomImage
          src={entity.imageUrl}
          alt={entity.name}
          className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
        />
      </div>

      {/* Title and Description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="text-sm text-typography-900 mb-1 truncate">{entity.name}</h3>
        <p className="text-sm text-typography-700 leading-relaxed line-clamp-2">
          {entity.description}
        </p>
      </div>

      {/* Toggle and Status */}
      <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end mr-5">
        {rowAction}
        <ToggleSwitch
          enabled={hasAccess}
          onChange={onToggleAccess}
          label={en.userManagement.toggleAccess(entity.name)}
        />
        <span className={`text-sm ${hasAccess ? "text-typography-900" : "text-typography-600"}`}>
          {hasAccess ? en.userManagement.enabled : en.userManagement.disabled}
        </span>
      </div>
    </div>
  );
};
