import { FC, KeyboardEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { StarYellowIcon } from "@assets";

interface SessionRatingTriggerProps {
  value: number;
  onSelect?: (rating: number) => void;
  size?: "sm" | "md";
}

export const SessionRatingTrigger: FC<SessionRatingTriggerProps> = ({
  value,
  onSelect,
  size = "md",
}) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<number>(0);

  const iconSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const displayValue = hovered || value;

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, star: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(5, star + 1);
      onSelect?.(next);
      (document.querySelector(`[data-star="${next}"]`) as HTMLElement)?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const prev = Math.max(1, star - 1);
      onSelect?.(prev);
      (document.querySelector(`[data-star="${prev}"]`) as HTMLElement)?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect?.(star);
    }
  };

  return (
    <span
      role="radiogroup"
      aria-label={t("simulationFeedback.rateTitle")}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= displayValue;
        const isCurrent = star === (value || 1);
        return (
          <button
            key={star}
            role="radio"
            aria-checked={star === value}
            aria-label={t("simulationFeedback.starLabel", { star, total: 5 })}
            data-star={star}
            tabIndex={isCurrent ? 0 : -1}
            onClick={() => onSelect?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onKeyDown={e => handleKeyDown(e, star)}
            className={`${iconSize} flex items-center justify-center transition-transform cursor-pointer hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded`}
          >
            <StarYellowIcon fill={filled ? "#F9CC49" : "#D8D8D8"} />
          </button>
        );
      })}
    </span>
  );
};
