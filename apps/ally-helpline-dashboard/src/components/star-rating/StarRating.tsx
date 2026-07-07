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
          {/* Empty stars use a visible neutral grey (not white) so they don't
              disappear against the light modal/background. */}
          <StarYellowIcon fill={star <= rating ? "#F9CC49" : "#E0E0E0"} />
        </Button>
      ))}
    </div>
  );
};

export default StarRating;
