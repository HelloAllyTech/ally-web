import { FC } from "react";

import { useTranslation } from "react-i18next";

import { StarRating } from "../star-rating";

interface SessionRatingTriggerProps {
  value: number;
  onSelect?: (rating: number) => void;
  size?: "sm" | "md";
}

/**
 * Inline star rating shown next to the summary title. Thin wrapper over the
 * shared {@link StarRating} so the header and the feedback modal draw the exact
 * same (always-visible) stars and can't drift apart.
 */
export const SessionRatingTrigger: FC<SessionRatingTriggerProps> = ({
  value,
  onSelect,
  size = "md",
}) => {
  const { t } = useTranslation();

  return (
    <StarRating
      rating={value}
      setRating={rating => onSelect?.(rating)}
      size={size}
      ariaLabel={t("simulationFeedback.rateTitle")}
      starLabel={(star, total) => t("simulationFeedback.starLabel", { star, total })}
    />
  );
};
