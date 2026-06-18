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

  const getStateLabelColor = (index: number) => {
    if (index === currentStateIndex) return "#10B981";
    if (index < currentStateIndex) return "#9CA3AF";
    return "#6B7280";
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
      {startTime && maxTimeSeconds && (
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
      {startTime && maxTimeSeconds && (
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

      {stateNames.length > 0 && (
        <div className="relative" style={{ paddingBottom: "28px" }}>
          <div className="relative flex items-center w-full" style={{ height: "16px" }}>
            <div
              className="absolute h-[4px] bg-[#374151] rounded-full"
              style={{ left: "0%", right: "0%" }}
            />

            <motion.div
              className="absolute h-[4px] rounded-full"
              style={{
                backgroundColor: STATE_COLORS.active,
                left: "0%",
              }}
              animate={{
                width:
                  stateNames.length > 1
                    ? `${8 + (currentStateIndex / (stateNames.length - 1)) * 84}%`
                    : "0%",
              }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            />

            {stateNames.map((state, index) => {
              const leftPercent =
                stateNames.length > 1 ? 8 + (index / (stateNames.length - 1)) * 84 : 50;
              const isActive = index === currentStateIndex;
              const isCompleted = index < currentStateIndex;
              const dotColor = getStateColor(index);

              return (
                <motion.div
                  key={state.stateId}
                  data-testid={`session-progress-dot-${state.stateId}`}
                  className="absolute rounded-full z-10"
                  style={{
                    left: `${leftPercent}%`,
                    transform: "translateX(-50%)",
                    backgroundColor: isActive || isCompleted ? dotColor : "#374151",
                    border: "none",
                    width: isActive ? "16px" : "10px",
                    height: isActive ? "16px" : "10px",
                    boxShadow: isActive ? `0 0 12px 2px ${dotColor}66` : "none",
                  }}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              );
            })}
          </div>

          {/* State labels — absolutely positioned below each dot */}
          {stateNames.map((state, index) => {
            const leftPercent =
              stateNames.length > 1 ? 8 + (index / (stateNames.length - 1)) * 84 : 50;
            const isActive = index === currentStateIndex;
            const isCompleted = index < currentStateIndex;

            return (
              <div
                key={state.stateId}
                data-testid={`session-progress-state-${state.stateId}`}
                className="absolute"
                style={{
                  left: `${leftPercent}%`,
                  transform: "translateX(-50%)",
                  top: "24px",
                  textAlign: "center",
                  width: "90px",
                }}
              >
                <span
                  className="text-[11px] leading-[1.2] whitespace-normal inline-block"
                  style={{
                    color: getStateLabelColor(index),
                    fontWeight: isActive ? 600 : 500,
                    opacity: isActive || isCompleted ? 1 : 0.6,
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
