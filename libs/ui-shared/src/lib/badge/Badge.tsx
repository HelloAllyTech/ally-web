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
        return "bg-badge-bg text-badge-fg border border-badge-border";
      case SearchVariant.DARK:
        return "bg-badge-bg text-badge-darkFg";
      case SearchVariant.LIGHT:
        return "bg-badge-lightBg text-badge-lightFg";
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
