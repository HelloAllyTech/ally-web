import { FC } from "react";

import { StarYellowIcon } from "@assets";
import { Button, ButtonVariant } from "@components";
import { STAR_COLOR_EMPTY, STAR_COLOR_FILLED } from "@constants/rating";

interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
}

export const StarRating: FC<StarRatingProps> = ({ rating, setRating }) => {
  return (
    <div className="flex gap-1 sm:gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <Button
          key={star}
          onClick={() => setRating(star)}
          variant={ButtonVariant.ICON}
          className={`text-2xl sm:text-3xl !p-0`}
        >
          {/* The icon paints the whole star in this colour: gold when selected,
              a clearly-visible mid grey when empty. Colours are shared with
              SessionRatingTrigger so the filled/empty pair can't drift apart. */}
          <StarYellowIcon fill={star <= rating ? STAR_COLOR_FILLED : STAR_COLOR_EMPTY} />
        </Button>
      ))}
    </div>
  );
};

export default StarRating;
