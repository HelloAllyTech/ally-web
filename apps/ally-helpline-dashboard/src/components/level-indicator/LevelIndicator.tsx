import { FC } from "react";

import { cn } from "@utils";

const RING_SIZE = 30;
const RING_STROKE = 3;
const RING_RADIUS = 12;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface LevelIndicatorProps {
  /** Current level — the number at the centre. */
  level: number;
  /**
   * "ring" is the full 30px ring. "pill" is the compact badge for the collapsed nav rail,
   * whose trailing slot is a `-right-3 -top-2` corner overlay sized for something the
   * shape of StreakPill — a 30px ring dropped in there lands exactly on top of the 18px
   * tab icon and hides it.
   */
  variant?: "ring" | "pill";
  /** 0..1 fill toward the next level. */
  progress: number;
  /** True at the top of the ladder, where the ring is full and stops meaning "nearly there". */
  isMaxLevel?: boolean;
  /** Full sentence for assistive tech. A ring and a bare number say nothing on their own. */
  ariaLabel: string;
  className?: string;
}

/**
 * Compact level ring for the persistent nav rail.
 *
 * Deliberately NOT drawn around the avatar, which is where a level ring would normally
 * go: `UserInfo` already wraps the avatar in a conic-gradient credit ring, and two
 * concentric progress rings on one control read as one number contradicting the other.
 * It sits in the rail as its own mark instead.
 *
 * Also deliberately distinct from StreakRing — that one is 52px, lives on /learn, and is
 * measured in days. This is measured in levels, so it gets its own palette and size
 * rather than sharing a component and hoping the units are read correctly.
 *
 * No tooltip. NavbarWrapper's `overflow-y-hidden` computes overflow-x to `auto`, making
 * it a clipping ancestor on both axes, and the Carbon tooltip is not portaled — the same
 * trap the streak pill documents. The meaning lives in `ariaLabel`.
 */
const LevelIndicator: FC<LevelIndicatorProps> = ({
  level,
  progress,
  variant = "ring",
  isMaxLevel = false,
  ariaLabel,
  className,
}) => {
  const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const gradientId = `levelIndicatorRing-${isMaxLevel ? "max" : "climbing"}`;

  // At the top of the ladder the ring is permanently full, so it switches to the warm
  // accent to read as "topped out" rather than "one more session to go".
  const stroke = isMaxLevel
    ? {
        from: "rgb(var(--color-secondary-500))",
        to: "rgb(var(--color-secondary-300))",
        track: "rgb(var(--color-secondary-50))",
      }
    : {
        from: "rgb(var(--color-primary-500))",
        to: "rgb(var(--color-primary-300))",
        track: "rgb(var(--color-primary-50))",
      };

  if (variant === "pill") {
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        data-testid="level-indicator"
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
          isMaxLevel ? "bg-secondary-50 text-secondary-700" : "bg-primary-50 text-primary-700",
          className,
        )}
      >
        {`L${level}`}
      </span>
    );
  }

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={ariaLabel}
      data-testid="level-indicator"
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stroke.from} />
            <stop offset="100%" stopColor={stroke.to} />
          </linearGradient>
        </defs>
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={stroke.track}
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - safeProgress)}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-secondary text-[12px] font-medium leading-none tabular-nums text-typography-900">
        {level}
      </span>
    </span>
  );
};

export default LevelIndicator;
