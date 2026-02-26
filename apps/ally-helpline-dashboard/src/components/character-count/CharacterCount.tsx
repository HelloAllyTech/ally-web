import { FC, useMemo } from "react";

import { CircularProgress } from "../circular-progress";

interface CharacterCountProps {
  value: number;
  maxLength: number;
}

export const CharacterCount: FC<CharacterCountProps> = ({ value, maxLength }) => {
  const percentage = (value / maxLength) * 100;
  const isWarning = percentage >= 80;
  const isError = percentage >= 95;

  const getProgressColor = () => {
    if (isError) return "#F93535";
    if (isWarning) return "#FF9800";
    return "#0957D0";
  };

  const getTextColor = () => {
    if (isError) return "text-red-500";
    if (isWarning) return "text-orange-500";
    return "text-primary-600";
  };

  const getFontSize = useMemo(() => {
    if (value > 100) return "12px";
    if (value > 1000) return "11px";
    if (value > 10000) return "10px";
    return "13px";
  }, [value]);

  return (
    <div className="flex items-center shrink-0 relative">
      <CircularProgress
        current={value}
        total={maxLength}
        size={40}
        strokeWidth={3}
        progressColor={getProgressColor()}
        backgroundColor="#E5E7EB"
        showLabel={false}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          style={{ fontSize: getFontSize }}
          className={`font-semibold font-primary ${getTextColor()}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
};
