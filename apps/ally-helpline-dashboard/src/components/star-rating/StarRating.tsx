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
          <StarYellowIcon fill={star <= rating ? "#F9CC49" : "#ffffff"} />
        </Button>
      ))}
    </div>
  );
};

export default StarRating;
