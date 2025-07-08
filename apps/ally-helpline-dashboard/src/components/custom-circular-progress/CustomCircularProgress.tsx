import React from "react";

const SIZE = 20;
const STROKE_WIDTH = 3;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CustomCircularProgress: React.FC<{ value: number; size?: number; color?: string }> = ({
  value,
  size = SIZE,
  color = "#00723F",
}) => {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Background circle */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke="#E0E0E0"
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      {/* Foreground (progress) arc */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.5s",
        }}
      />
    </svg>
  );
};

export default CustomCircularProgress;
