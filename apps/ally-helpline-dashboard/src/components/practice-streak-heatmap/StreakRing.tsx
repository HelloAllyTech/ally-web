import { FC } from "react";

import { cn } from "@utils";

import { StreakState } from "./streakState";

const RING_SIZE = 52;
const RING_STROKE = 5;
const RING_RADIUS = 21;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Per-state stroke. AT_RISK is the only one that shifts hue — a streak about to
 * break is the one thing on this bar worth noticing. JUST_LOST stays neutral on
 * purpose: a lost streak is a prompt to start again, not a punishment, so no
 * red and no strikethrough.
 *
 * At-risk uses the theme's `warning` scale. That scale is defined as literal hex
 * in tailwind.config.ts rather than as CSS variables — deliberately, so status
 * colours stay recognisable across themes — which is why these are inlined here
 * instead of read from a `--color-*` variable. They are SVG gradient stops, so
 * they need values rather than classes either way.
 */
const WARNING = { 500: "#FF9800", 300: "#FFB74D", 50: "#FFF3E0" };

const STROKE_BY_STATE: Record<StreakState, { from: string; to: string; track: string }> = {
  [StreakState.SECURED]: {
    from: "rgb(var(--color-primary-500))",
    to: "rgb(var(--color-primary-300))",
    track: "rgb(var(--color-primary-50))",
  },
  [StreakState.AT_RISK]: {
    from: WARNING[500],
    to: WARNING[300],
    track: WARNING[50],
  },
  [StreakState.JUST_LOST]: {
    from: "rgb(var(--color-neutral-400))",
    to: "rgb(var(--color-neutral-300))",
    track: "rgb(var(--color-neutral-100))",
  },
  [StreakState.NEVER_STARTED]: {
    from: "rgb(var(--color-neutral-400))",
    to: "rgb(var(--color-neutral-300))",
    track: "rgb(var(--color-neutral-100))",
  },
};

export interface StreakRingProps {
  /** Days in the current streak — the number at the centre. */
  currentStreak: number;
  /** 0..1 fill fraction. */
  progress: number;
  state: StreakState;
  /** Full sentence describing the ring for assistive tech. */
  ariaLabel: string;
  className?: string;
}

/**
 * The streak ring. Both the arc and the centre glyph are in DAYS — the ring
 * fills toward the next milestone (or the personal best), and the number inside
 * is the current streak. Keeping one unit is the point: the previous version put
 * minutes in the ring next to a day count, which read as one number
 * contradicting the other.
 *
 * Deliberately bespoke rather than reusing CircularProgress (which hardcodes a
 * "current/total" label and takes hex colours) or CustomCircularProgress (fixed
 * 20px, and a role="progressbar" with no aria-valuenow, which is worse for
 * screen readers than no role at all).
 */
const StreakRing: FC<StreakRingProps> = ({
  currentStreak,
  progress,
  state,
  ariaLabel,
  className,
}) => {
  const stroke = STROKE_BY_STATE[state];
  const gradientId = `practiceStreakRing-${state}`;
  const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={ariaLabel}
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
      <span className="absolute inset-0 flex items-center justify-center font-secondary text-[15px] leading-none tabular-nums text-typography-900">
        {currentStreak}
      </span>
    </div>
  );
};

export default StreakRing;
