import { FC } from "react";

import { Button, ButtonVariant } from "@components";

import { StarRatingProps } from "./types";

const StarRating: FC<StarRatingProps> = ({ rating, setRating }) => {
  return (
    <div className="flex gap-1 sm:gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <Button
          key={star}
          onClick={() => setRating(star)}
          variant={ButtonVariant.ICON}
          className={`text-2xl sm:text-3xl !p-0 ${star <= rating ? "text-[#F9CC49]" : "text-gray-300"}`}
        >
          ★
        </Button>
      ))}
    </div>
  );
};

export default StarRating;
