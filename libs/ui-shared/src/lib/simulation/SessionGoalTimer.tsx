"use client";

import { FC, useEffect, useRef, useState } from "react";

import { SessionGoalTimerProps } from "./types";

export const SessionGoalTimer: FC<SessionGoalTimerProps> = ({
  startTime,
  maxTimeSeconds,
  isPaused = false,
  pausedOffsetMs = 0,
  translations,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  // Read pause state inside the interval without restarting it; exclude paused
  // time so "time remaining" doesn't tick down while the session is frozen.
  const isPausedRef = useRef(isPaused);
  const pausedOffsetMsRef = useRef(pausedOffsetMs);
  useEffect(() => {
    isPausedRef.current = isPaused;
    pausedOffsetMsRef.current = pausedOffsetMs;
  });

  // Convert maxTimeValue (HH:MM:SS) to seconds

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  useEffect(() => {
    if (!startTime || !maxTimeSeconds) return () => {};

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      const now = Date.now();
      const timeElapsed = Math.floor(
        (now - Date.parse(startTime) - pausedOffsetMsRef.current) / 1000,
      );
      const remaining = Math.max(0, maxTimeSeconds - timeElapsed);

      setRemainingTime(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, maxTimeSeconds]);

  // Format max time as MM:SS for display
  const remainingMinutes = Math.floor(remainingTime / 60);
  const remainingSeconds = remainingTime % 60;
  const remainingMinutesText = `${remainingMinutes} ${translations?.min ?? "min"} ${remainingSeconds} ${translations?.sec ?? "sec"}`;

  // Calculate progress percentage (0 to 100)
  const progressPercentage =
    maxTimeSeconds > 0
      ? Math.max(0, Math.min(100, ((maxTimeSeconds - remainingTime) / maxTimeSeconds) * 100))
      : 0;

  return (
    <div data-testid="session-goal-timer" className="w-full">
      {/* Progress bar background */}
      <div className="w-full h-4 bg-slate-400 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r transition-all duration-300 rounded-full"
          style={{
            width: `${progressPercentage}%`,
            backgroundImage:
              remainingTime <= 300
                ? remainingTime <= 60
                  ? "linear-gradient(to right, #E77625, #E77625)"
                  : "linear-gradient(to right, #E77625, #E77625)"
                : "linear-gradient(to right, #264D8E, #264D8E)",
          }}
        />
      </div>

      {/* Timer info section */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <span
              data-testid="session-goal-timer-label"
              className="text-slate-400 text-xs font-medium tracking-wide"
            >
              {translations?.sessionTimer ?? "Session Timer"}
            </span>
            <span
              data-testid="session-goal-timer-max-time"
              className="text-white font-bold text-lg"
            >
              {formatTime(maxTimeSeconds)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-slate-400 text-xs font-medium tracking-wide">
            {translations?.timeRemaining ?? "Time Remaining"}
          </span>
          <span
            data-testid="session-goal-timer-remaining"
            className={`font-bold text-lg transition-colors duration-300 ${
              remainingTime > 0
                ? remainingTime <= 300
                  ? remainingTime <= 60
                    ? "text-red-500"
                    : "text-[#E77625]"
                  : "text-green-400"
                : "text-slate-300"
            }`}
          >
            {remainingMinutesText}
          </span>
        </div>
      </div>
    </div>
  );
};
