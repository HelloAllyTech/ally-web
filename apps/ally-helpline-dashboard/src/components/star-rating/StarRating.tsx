import { FC, KeyboardEvent, useState } from "react";

import { STAR_PALETTE, StarState } from "@constants/rating";

export type StarRatingSize = "sm" | "md" | "lg";

interface StarRatingProps {
  /** Current rating (1–5). `null`/`undefined`/`0` render an empty row. */
  rating: number | null | undefined;
  setRating: (rating: number) => void;
  size?: StarRatingSize;
  /** Display-only: no hover, no keyboard, buttons disabled. */
  readOnly?: boolean;
  className?: string;
  /** Accessible label for the whole radiogroup. */
  ariaLabel?: string;
  /** Accessible label for an individual star, e.g. i18n "Star 3 of 5". */
  starLabel?: (star: number, total: number) => string;
}

const TOTAL_STARS = 5;

const SIZE_PX: Record<StarRatingSize, number> = { sm: 20, md: 26, lg: 34 };

// Classic 5-point star. Drawn with fill AND stroke so the shape is always
// visible — an empty star is a light-grey outline that can never vanish.
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

const StarGlyph: FC<{ state: StarState; px: number }> = ({ state, px }) => {
  const { fill, stroke } = STAR_PALETTE[state];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className="transition-colors duration-150"
    >
      <path
        d={STAR_PATH}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const StarRating: FC<StarRatingProps> = ({
  rating,
  setRating,
  size = "md",
  readOnly = false,
  className = "",
  ariaLabel = "Rating",
  starLabel = (star, total) => `${star} of ${total} stars`,
}) => {
  const [hovered, setHovered] = useState(0);
  const current = rating ?? 0;
  const px = SIZE_PX[size];
  // Hover takes precedence over the committed value for a live preview.
  const activeCount = hovered || current;

  const select = (star: number) => {
    if (!readOnly) setRating(star);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, star: number) => {
    if (readOnly) return;
    const focusStar = (next: number) =>
      (document.querySelector(`[data-star="${next}"]`) as HTMLElement | null)?.focus();

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(TOTAL_STARS, star + 1);
      select(next);
      focusStar(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const prev = Math.max(1, star - 1);
      select(prev);
      focusStar(prev);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      select(star);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 sm:gap-1.5 ${className}`}
    >
      {Array.from({ length: TOTAL_STARS }, (_, i) => i + 1).map(star => {
        const isActive = star <= activeCount;
        const state: StarState = isActive ? (hovered ? "hover" : "filled") : "empty";
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === current}
            aria-label={starLabel(star, TOTAL_STARS)}
            data-star={star}
            data-state={state}
            tabIndex={star === (current || 1) ? 0 : -1}
            disabled={readOnly}
            onClick={() => select(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            onKeyDown={e => handleKeyDown(e, star)}
            className={`flex items-center justify-center rounded p-0.5 transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <StarGlyph state={state} px={px} />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
