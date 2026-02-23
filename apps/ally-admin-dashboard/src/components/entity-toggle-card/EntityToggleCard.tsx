import React from "react";

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
}

export const EntityToggleCard: React.FC<EntityToggleCardProps> = ({
  entity,
  hasAccess,
  onToggleAccess,
}) => {
  return (
    <div className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]">
      {/* Image */}
      <div className="w-[18%] md:w-[10%] lg:w-[7%] h-[56px] rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
        <CustomImage
          src={entity.imageUrl}
          alt={entity.name}
          className="w-full h-full object-cover"
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
