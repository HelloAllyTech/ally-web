import { FC } from "react";

export interface CircularProgressProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  backgroundColor?: string;
  textColor?: string;
  showLabel?: boolean;
  className?: string;
}

export const CircularProgress: FC<CircularProgressProps> = ({
  current,
  total,
  size = 40,
  strokeWidth = 2,
  progressColor = "#6366F1",
  backgroundColor = "#E5E7EB",
  textColor = "text-primary-500",
  showLabel = true,
  className = "",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (current / total) * circumference;
  const center = size / 2;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && (
        <span className={`relative text-xs font-medium ${textColor} z-10`}>
          {current}/{total}
        </span>
      )}
    </div>
  );
};
