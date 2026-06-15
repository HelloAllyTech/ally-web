import { FC } from "react";

import { WandStars } from "@assets";

interface AutofillButtonProps {
  onClick: () => void;
  isLoading: boolean;
  label: string;
  disabled?: boolean;
  /** Compact variant: smaller padding + color-fade when disabled (used in inline field headers) */
  compact?: boolean;
}

export const AutofillButton: FC<AutofillButtonProps> = ({
  onClick,
  isLoading,
  label,
  disabled = false,
  compact = false,
}) => {
  const isInactive = disabled || isLoading;

  const className = compact
    ? `flex items-center gap-1 text-sm border rounded-2xl px-2 py-1 transition-opacity cursor-pointer ${
        isInactive
          ? "text-primary-300 border-primary-300 cursor-not-allowed"
          : "text-primary-500 border-primary-500 hover:bg-primary-50"
      } ${isLoading ? "animate-fadeInOut" : ""}`
    : "inline-flex items-center gap-1 text-sm border rounded-2xl px-3 py-1.5 transition-opacity border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button type="button" onClick={onClick} disabled={isInactive} className={className}>
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
      ) : (
        <WandStars />
      )}
      {label}
    </button>
  );
};
