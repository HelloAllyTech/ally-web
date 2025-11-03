import { FC, useEffect, useRef, useState } from "react";

import { formatTime } from "@pages/audio-call/utils";

import { MAX_SESSION_MINUTES, WARNING_THRESHOLD } from "./constants";
import { SimulationTimerProps } from "./types";

const SimulationTimer: FC<SimulationTimerProps> = ({
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

      // show warning popup before time limit
      if (timeLimit - timeElapsed <= WARNING_THRESHOLD && !hasWarnedRef.current) {
        onWarning?.();
        hasWarnedRef.current = true;
      }

      // check if time limit is reached
      if (timeElapsed >= timeLimit) {
        onTimeLimit?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const renderLoader = () => (
    <div className="w-[30px] h-[30px] mt-[10px] border-t-2 border-b-2 border-[#9CA3AF] rounded-full animate-spin" />
  );

  return (
    <div className="flex items-center gap-2 font-['IBM_Plex_Serif'] text-[#fff]">
      <span className="text-[14px]">Session Duration:</span>
      {formatTime(timer) || renderLoader()}
    </div>
  );
};

export default SimulationTimer;
