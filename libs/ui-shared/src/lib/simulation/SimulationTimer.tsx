"use client";

import { FC, useEffect, useRef, useState } from "react";

import { SimulationTimerProps } from "./types";
import { MAX_SESSION_MINUTES, WARNING_THRESHOLD } from "./waveformConstants";

// The agent authoritatively ends the session at the limit; this client auto-end
// is only a fallback if the agent failed to, so it fires a bit past the limit.
const CLIENT_AUTO_END_GRACE_SECONDS = 15;

export const SimulationTimer: FC<SimulationTimerProps> = ({
  onTimeLimit,
  onWarning,
  startTime,
  timeLimit = MAX_SESSION_MINUTES,
  isPaused = false,
  pausedOffsetMs = 0,
  translations,
}) => {
  const [timer, setTimer] = useState<number>(0);

  const hasWarnedRef = useRef(false);
  // Read pause state inside the interval without restarting it on every change.
  const isPausedRef = useRef(isPaused);
  const pausedOffsetMsRef = useRef(pausedOffsetMs);
  useEffect(() => {
    isPausedRef.current = isPaused;
    pausedOffsetMsRef.current = pausedOffsetMs;
  });

  useEffect(() => {
    if (!startTime) return () => {};

    const interval = setInterval(() => {
      // While paused, hold the displayed time and don't advance the limit —
      // paused time must not count toward the scenario time limit.
      if (isPausedRef.current) return;

      const now = Date.now();
      const timeElapsed = Math.floor(
        (now - Date.parse(startTime) - pausedOffsetMsRef.current) / 1000,
      );
      setTimer(timeElapsed);

      if (timeLimit - timeElapsed <= WARNING_THRESHOLD && !hasWarnedRef.current) {
        onWarning?.();
        hasWarnedRef.current = true;
      }

      if (timeElapsed >= timeLimit + CLIENT_AUTO_END_GRACE_SECONDS) {
        onTimeLimit?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  const renderLoader = () => (
    <div
      data-testid="simulation-timer-loader"
      className="w-[30px] h-[30px] mt-[10px] border-t-2 border-b-2 border-[#9CA3AF] rounded-full animate-spin"
    />
  );

  return (
    <div
      data-testid="simulation-timer"
      className="flex items-center gap-2 font-['IBM_Plex_Serif'] text-[#fff]"
    >
      <span data-testid="simulation-timer-label" className="text-[14px]">
        {translations?.sessionDuration ?? "Session Duration:"}
      </span>
      <span data-testid="simulation-timer-value">{formatTime(timer) || renderLoader()}</span>
    </div>
  );
};
