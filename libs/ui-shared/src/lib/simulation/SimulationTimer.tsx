"use client";

import { FC, useEffect, useRef, useState } from "react";

import { SimulationTimerProps } from "./types";
import { MAX_SESSION_MINUTES, WARNING_THRESHOLD } from "./waveformConstants";

export const SimulationTimer: FC<SimulationTimerProps> = ({
  onTimeLimit,
  onWarning,
  startTime,
  timeLimit = MAX_SESSION_MINUTES,
}) => {
  const [timer, setTimer] = useState<number>(0);

  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!startTime) return () => {};

    const interval = setInterval(() => {
      const now = Date.now();
      const timeElapsed = Math.floor((now - Date.parse(startTime)) / 1000);
      setTimer(timeElapsed);

      if (timeLimit - timeElapsed <= WARNING_THRESHOLD && !hasWarnedRef.current) {
        onWarning?.();
        hasWarnedRef.current = true;
      }

      if (timeElapsed >= timeLimit) {
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
    <div className="w-[30px] h-[30px] mt-[10px] border-t-2 border-b-2 border-border-dark rounded-full animate-spin" />
  );

  return (
    <div className="flex items-center gap-2 font-primary text-white">
      <span className="text-[14px]">Session Duration:</span>
      {formatTime(timer) || renderLoader()}
    </div>
  );
};
