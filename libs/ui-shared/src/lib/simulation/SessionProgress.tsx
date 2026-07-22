"use client";

import { FC, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import { STATE_COLORS } from "./constants";
import { SessionProgressProps } from "./types";
import { getCurrentStateIndex } from "./utils";

export const SessionProgress: FC<SessionProgressProps> = ({
  stateNames,
  difficultyLevel,
  score,
  startTime,
  maxTimeSeconds,
  isPaused = false,
  pausedOffsetMs = 0,
  hideTimeBar = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const currentStateIndex = getCurrentStateIndex(score, difficultyLevel);

  // Read pause state inside the interval without restarting it. Paused time is
  // excluded so this matches the (frozen) main timer and the scenario limit.
  const isPausedRef = useRef(isPaused);
  const pausedOffsetMsRef = useRef(pausedOffsetMs);
  useEffect(() => {
    isPausedRef.current = isPaused;
    pausedOffsetMsRef.current = pausedOffsetMs;
  });

  useEffect(() => {
    if (!startTime) return () => {};

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      const now = Date.now();
      const elapsed = Math.floor((now - Date.parse(startTime) - pausedOffsetMsRef.current) / 1000);
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

  const timeProgressPercent =
    maxTimeSeconds && maxTimeSeconds > 0
      ? Math.min(100, (elapsedSeconds / maxTimeSeconds) * 100)
      : 0;

  return (
    <div
      data-testid="session-progress"
      className="bg-[#1d2020] rounded-lg p-4 pb-5 font-sans w-full"
    >
      {/* Title row */}
      {!hideTimeBar && startTime && maxTimeSeconds && (
        <div className="flex items-center justify-between mb-3">
          <span
            data-testid="session-progress-title"
            className="text-[14px] font-semibold text-white tracking-wide uppercase"
          >
            Session Progress
          </span>
          <span
            data-testid="session-progress-timer"
            className="text-[13px] font-medium text-[#3B82F6]"
          >
            {formatTime(elapsedSeconds)} / {formatTime(maxTimeSeconds)}
          </span>
        </div>
      )}

      {/* Time progress bar (blue) */}
      {!hideTimeBar && startTime && maxTimeSeconds && (
        <div
          className={`w-full h-[6px] bg-[#374151] rounded-full overflow-hidden ${stateNames.length > 0 ? "mb-6" : ""}`}
        >
          <motion.div
            data-testid="session-progress-time-bar"
            className="h-full rounded-full bg-[#3B82F6]"
            animate={{ width: `${timeProgressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Vertical stepper — a horizontal dot-timeline forced every label into
          a narrow fixed-width column and wrapped across 2 lines per state,
          which cluttered the (now narrower) sidebar. Stacking vertically
          gives every state's name the full sidebar width on its own line,
          while keeping every state visible (not just the current one). */}
      {stateNames.length > 0 && (
        <div className="flex flex-col">
          {stateNames.map((state, index) => {
            const isActive = index === currentStateIndex;
            const isCompleted = index < currentStateIndex;
            const isLast = index === stateNames.length - 1;
            const dotColor = getStateColor(index);

            return (
              <div
                key={state.stateId}
                data-testid={`session-progress-state-${state.stateId}`}
                className="relative flex items-center gap-3 pb-3 last:pb-0"
              >
                {!isLast && (
                  <div
                    className="absolute left-[6px] top-1/2 bottom-[-12px] w-[2px]"
                    style={{ backgroundColor: isCompleted ? STATE_COLORS.completed : "#374151" }}
                  />
                )}
                <motion.div
                  data-testid={`session-progress-dot-${state.stateId}`}
                  className="relative z-10 shrink-0 rounded-full"
                  style={{
                    width: isActive ? "14px" : "10px",
                    height: isActive ? "14px" : "10px",
                    backgroundColor: isActive || isCompleted ? dotColor : "#374151",
                    boxShadow: isActive ? `0 0 8px 2px ${dotColor}66` : "none",
                  }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
                <span
                  className="text-[12px] leading-[1.3]"
                  style={{
                    color: isActive ? STATE_COLORS.active : isCompleted ? "#9CA3AF" : "#6B7280",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {state.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
