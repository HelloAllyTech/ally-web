import { FC } from "react";

/*
 * The sign-in hero's scenery, redrawn in vector from the hills illustration the
 * page used to show as a photo. Pure decoration: every piece is aria-hidden, and
 * the colours are the `night` tokens (index.css), never literals.
 */

const STARS: Array<{ cx: number; cy: number; r: number; opacity: number }> = [
  { cx: 210, cy: 300, r: 2, opacity: 0.7 },
  { cx: 420, cy: 120, r: 1.6, opacity: 0.6 },
  { cx: 610, cy: 230, r: 2.2, opacity: 0.7 },
  { cx: 760, cy: 150, r: 1.6, opacity: 0.5 },
  { cx: 1010, cy: 190, r: 2, opacity: 0.6 },
  { cx: 1290, cy: 260, r: 1.6, opacity: 0.5 },
  { cx: 1385, cy: 160, r: 2, opacity: 0.7 },
];

/** Four-point sparkle centred on (x, y), `size` from centre to tip. */
const sparkle = (x: number, y: number, size: number) => {
  const waist = size / 3;
  return `M${x} ${y - size} L${x + waist} ${y - waist} L${x + size} ${y} L${x + waist} ${y + waist} L${x} ${y + size} L${x - waist} ${y + waist} L${x - size} ${y} L${x - waist} ${y - waist} Z`;
};

export const NightStars: FC = () => (
  <svg
    viewBox="0 0 1440 540"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    className="pointer-events-none absolute left-0 top-0 h-[540px] w-full"
  >
    {STARS.map(star => (
      <circle
        key={`${star.cx}-${star.cy}`}
        cx={star.cx}
        cy={star.cy}
        r={star.r}
        opacity={star.opacity}
        className="fill-night-mist"
      />
    ))}
    <path d={sparkle(700, 200, 16)} opacity={0.85} className="fill-night-mist" />
    <path d={sparkle(880, 142, 12)} opacity={0.75} className="fill-night-mist" />
  </svg>
);

/*
 * Each band is a fill plus a lighter ridge stroke along its top edge. The
 * stroke keeps its width however far the SVG is stretched
 * (vector-effect="non-scaling-stroke"), since preserveAspectRatio="none" lets
 * the hills span any viewport width.
 */
const HILLS = [
  {
    ridge: "M0 90 C 260 20 520 40 760 120 C 1000 200 1200 70 1440 30",
    fill: "fill-night-hill-far",
    stroke: "stroke-night-ridge-far",
  },
  {
    ridge: "M0 180 C 200 130 420 120 640 180 C 860 240 1120 160 1440 130",
    fill: "fill-night-hill-mid",
    stroke: "stroke-night-ridge-mid",
  },
  {
    ridge: "M0 246 C 260 206 520 232 760 252 C 1000 272 1240 228 1440 220",
    fill: "fill-night-hill-near",
    stroke: "stroke-night-ridge-near",
  },
];

/**
 * Hills along the bottom of the hero. The last, foreground band takes the page
 * ground colour, so the night scene settles straight onto the section below.
 */
export const NightHills: FC = () => (
  <svg
    viewBox="0 0 1440 320"
    preserveAspectRatio="none"
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 bottom-0 h-[320px] w-full"
  >
    {HILLS.map(hill => (
      <g key={hill.ridge}>
        <path d={`${hill.ridge} L1440 320 L0 320 Z`} className={hill.fill} />
        <path
          d={hill.ridge}
          fill="none"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
          className={`${hill.stroke} opacity-80`}
        />
      </g>
    ))}
    <path
      d="M0 292 C 300 266 620 286 900 296 C 1150 304 1300 288 1440 282 L1440 320 L0 320 Z"
      className="fill-background"
    />
  </svg>
);

/** A lower, two-band strip for the contact panel at the foot of the page. */
export const ContactHills: FC = () => (
  <svg
    viewBox="0 0 1296 160"
    preserveAspectRatio="none"
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] w-full"
  >
    <path
      d="M0 90 C 240 40 480 60 700 100 C 920 140 1100 70 1296 50 L1296 160 L0 160 Z"
      className="fill-night-hill-far"
    />
    <path
      d="M0 90 C 240 40 480 60 700 100 C 920 140 1100 70 1296 50"
      fill="none"
      strokeWidth={2.5}
      vectorEffect="non-scaling-stroke"
      className="stroke-night-ridge-far opacity-70"
    />
    <path
      d="M0 132 C 260 108 520 128 800 136 C 1020 142 1180 126 1296 120 L1296 160 L0 160 Z"
      className="fill-night-hill-mid"
    />
  </svg>
);

export const NightSun: FC<{ className?: string }> = ({ className = "" }) => (
  <div aria-hidden="true" className={`rounded-full bg-night-sun ${className}`} />
);
