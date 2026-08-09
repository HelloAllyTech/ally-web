import { FC } from "react";

import { cn } from "@utils";

export interface StreakPillProps {
  /** Days in the current streak. */
  days: number;
  /** A live streak that today has not yet secured. */
  atRisk?: boolean;
  size?: "sm" | "md";
  /**
   * Full sentence for assistive tech. The pill is a glyph and a number, which
   * says nothing on its own, so this is required rather than optional.
   */
  ariaLabel: string;
  className?: string;
}

/**
 * Inline flame. `src/assets/icons/` has no flame asset, and the emoji renders
 * inconsistently across platforms and cannot be recoloured per state — so the
 * mark is drawn here and inherits `currentColor`.
 */
const FlameIcon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M13.5 1.5s.6 3.2-1.4 5.3c-1.9 2-3.4 3.2-3.4 5.6 0 1.2.5 2.2 1.2 2.9-.2-1.3.3-2.7 1.5-3.6-.3 1.9.6 3 1.9 3.9 1.1.8 1.6 1.7 1.6 2.9 0 .5-.1 1-.3 1.4 2.2-1 3.9-3.3 3.9-6.1 0-2.6-1.3-4.3-2.5-5.6-.4 1-1 1.6-1.6 1.9.6-2.4.2-5.7-.9-8.6Z" />
    <path d="M9.4 22.5c-1-.6-1.7-1.7-1.7-3 0-1.6 1-2.4 1.8-3.5.2 1 .8 1.6 1.5 2 .9.6 1.3 1.2 1.3 2.1 0 1.1-.6 2-1.5 2.4h-1.4Z" />
  </svg>
);

/**
 * Compact streak marker, shared by the nav rail and the leaderboard so the same
 * number never appears in two different visual languages.
 *
 * Deliberately not NotificationBadge: that is `bg-red-500 animate-pulse`, an
 * unread-alert semantic. A streak is a state, not an alert — and a red pulsing
 * badge on a healthy streak would read as something being wrong.
 */
const StreakPill: FC<StreakPillProps> = ({
  days,
  atRisk = false,
  size = "sm",
  ariaLabel,
  className,
}) => (
  <span
    role="img"
    aria-label={ariaLabel}
    className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full font-medium tabular-nums",
      size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[13px]",
      atRisk ? "bg-warning-50 text-warning-700" : "bg-primary-50 text-primary-700",
      className,
    )}
  >
    <FlameIcon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
    {days}
  </span>
);

export default StreakPill;
