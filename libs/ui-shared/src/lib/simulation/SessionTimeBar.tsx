"use client";

import { FC, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import { SessionTimeBarProps } from "./types";

/**
 * Compact "MM:SS / MM:SS" + thin progress bar for the page header. Same
 * pause-aware elapsed-time tracking as SessionProgress's time bar, just
 * without the "Session Progress" title or state-name stepper — this is the
 * only timer display shown to the learner; SimulationTimer (bottom bar) still
 * runs headless for its onWarning/onTimeLimit side effects.
 */
export const SessionTimeBar: FC<SessionTimeBarProps> = ({
  startTime,
  maxTimeSeconds,
  isPaused = false,
  pausedOffsetMs = 0,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  if (!startTime || !maxTimeSeconds) return null;

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const timeProgressPercent =
    maxTimeSeconds > 0 ? Math.min(100, (elapsedSeconds / maxTimeSeconds) * 100) : 0;

  return (
    <div
      data-testid="session-time-bar"
      className="flex flex-col items-end gap-1 w-[140px] shrink-0"
    >
      <span data-testid="session-time-bar-value" className="text-[13px] font-medium text-white">
        {formatTime(elapsedSeconds)} / {formatTime(maxTimeSeconds)}
      </span>
      <div className="w-full h-[4px] bg-[#374151] rounded-full overflow-hidden">
        <motion.div
          data-testid="session-time-bar-fill"
          className="h-full rounded-full bg-primary-500"
          animate={{ width: `${timeProgressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
