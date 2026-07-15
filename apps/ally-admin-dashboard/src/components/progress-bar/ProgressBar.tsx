import React from "react";

interface ProgressBarProps {
  /** Completion percentage (0-100). null/undefined renders the "--" fallback. */
  value?: number | null;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = "" }) => {
  // Simulations without progress data (backend support pending) show the same
  // "--" fallback used by the other metadata cells instead of an empty bar.
  if (value == null || Number.isNaN(value)) {
    return <span className="text-typography-600">--</span>;
  }

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden"
      >
        <div
          data-testid="progress-bar-fill"
          className="h-full rounded-full bg-primary-500"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="text-xs text-typography-800 shrink-0">{clampedValue}%</span>
    </div>
  );
};
