"use client";

import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";

import { STATE_COLORS } from "./constants";
import { getCurrentStateIndex, getProgressPercentage } from "./sessionProgressUtils";
import { SessionProgressProps } from "./types";

export const SessionProgress: FC<SessionProgressProps> = ({
  stateInstructions,
  difficultyLevel,
  score,
  startTime,
  maxTimeSeconds,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const currentStateIndex = getCurrentStateIndex(score, difficultyLevel);
  const progressPercent = getProgressPercentage(currentStateIndex, stateInstructions.length);

  useEffect(() => {
    if (!startTime) return () => {};

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - Date.parse(startTime)) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const getStateColor = (index: number) => {
    if (index < currentStateIndex) return STATE_COLORS.completed;
    if (index === currentStateIndex) return STATE_COLORS.active;
    return STATE_COLORS.inactive;
  };

  const getStateLabelColor = (index: number) => {
    if (index === currentStateIndex) return "#3B82F6";
    if (index < currentStateIndex) return "#9CA3AF";
    return "#6B7280";
  };

  return (
    <div
      data-testid="session-progress"
      className="bg-[#1d2020] rounded-lg p-4 font-sans w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <span
          data-testid="session-progress-title"
          className="text-[14px] font-semibold text-white tracking-wide uppercase"
        >
          Session Progress
        </span>
        {startTime && maxTimeSeconds && (
          <span
            data-testid="session-progress-timer"
            className="text-[13px] font-medium text-[#3B82F6]"
          >
            {formatTime(elapsedSeconds)} / {formatTime(maxTimeSeconds)}
          </span>
        )}
      </div>

      <div className="relative mb-2">
        <div className="w-full h-[6px] bg-[#374151] rounded-full overflow-hidden">
          <motion.div
            data-testid="session-progress-bar"
            className="h-full rounded-full"
            style={{ backgroundColor: STATE_COLORS.active }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>

        <div className="flex justify-between mt-1 relative">
          {stateInstructions.map((state, index) => (
            <div
              key={state.stateId}
              data-testid={`session-progress-state-${state.stateId}`}
              className="flex flex-col items-center"
              style={{ width: `${100 / stateInstructions.length}%` }}
            >
              <motion.div
                className="w-3 h-3 rounded-full border-2 mt-[-12px] z-10"
                style={{
                  backgroundColor: index <= currentStateIndex ? getStateColor(index) : "#1d2020",
                  borderColor: getStateColor(index),
                }}
                animate={{
                  scale: index === currentStateIndex ? 1.3 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              <span
                className="text-[10px] mt-1 text-center leading-tight font-medium"
                style={{
                  color: getStateLabelColor(index),
                  fontWeight: index === currentStateIndex ? 700 : 500,
                }}
              >
                {state.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
