import { FC } from "react";

import { SearchVariant } from "../../types";

export type BadgeVariant = SearchVariant | "outlined";

/**
 * Props for Badge component.
 */
export interface BadgeProps {
  text: string;
  variant: BadgeVariant;
  className?: string;
}

const Badge: FC<BadgeProps> = ({ variant, text, className }) => {
  /**
   * Returns the style classes for the given badge variant.
   * @param {BadgeVariant} variant
   * @returns {string}
   */
  const getStyles = (variant: BadgeVariant) => {
    switch (variant) {
      case "outlined":
        return "bg-[#FDFDFD] text-[#616161] border border-[#D5D9EB]";
      case SearchVariant.DARK:
        return "bg-[#FDFDFD] text-[#1E2025]";
      case SearchVariant.LIGHT:
        return "bg-[#ECECEC] text-[#535353]";
    }
  };
  return (
    <div
      className={`rounded-2xl px-2 py-0.5 text-xs font-medium ${getStyles(variant)} ${className}`}
    >
      {text}
    </div>
  );
};

export default Badge;
