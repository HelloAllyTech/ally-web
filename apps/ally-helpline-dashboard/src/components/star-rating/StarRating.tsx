import { FC } from "react";

import { StarYellowIcon } from "@assets";
import { Button, ButtonVariant } from "@components";

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
          {/* Empty stars need a mid grey (Carbon gray-50) so they stay clearly
              visible against the light modal/background — gray-20 (#E0E0E0) was
              too faint to see. Selected stars are gold. */}
          <StarYellowIcon fill={star <= rating ? "#F9CC49" : "#8D8D8D"} />
        </Button>
      ))}
    </div>
  );
};

export default StarRating;
