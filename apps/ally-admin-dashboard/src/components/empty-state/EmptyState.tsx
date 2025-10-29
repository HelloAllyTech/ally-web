import React from "react";

import { Plus } from "@assets";

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  hideActionButton?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
  hideActionButton = false,
}) => {
  return (
    <div
      className={`w-full py-[15%] flex flex-col items-center justify-center text-center ${className ?? ""}`}
    >
      <h2 className="font-normal text-[24px] text-gray-700 mb-2">{title}</h2>
      {subtitle && <p className="max-w-xl text-gray-500 text-[14px] mb-4 w-[250px]">{subtitle}</p>}
      {actionLabel && !hideActionButton && (
        <button
          onClick={onAction}
          className="inline-flex items-center bg-[#1557D0] hover:bg-[#1557D0]/90 text-white text-[14px] font-medium px-6 sm:px-8 py-3 rounded-full shadow-sm"
        >
          <span className="mr-3">
            <Plus />
          </span>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
