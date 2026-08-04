"use client";

import { FC, useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { SimulationEventsProps } from "./types";

export const SimulationEvents: FC<SimulationEventsProps> = ({
  events = [],
  hideHeader = false,
}) => {
  const filteredEvents = events.filter(event => event.emoji && event.message);
  const hasEvents = filteredEvents.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    container?.scrollTo({ top: container?.scrollHeight - 10, behavior: "smooth" });
  }, [filteredEvents.length]);

  const getElapsedTimeInMinutes = (startTime: string) => {
    const now = new Date();
    const startTimeDate = new Date(startTime);
    const elapsedTime = now.getTime() - startTimeDate.getTime();
    return Math.max(0, Math.floor(elapsedTime / 60000));
  };

  const getEventTime = (timestamp: string): string => {
    const elapsedTime = getElapsedTimeInMinutes(timestamp);
    if (elapsedTime === 0) return "now";
    return `${elapsedTime} min${elapsedTime === 1 ? "" : "s"}`;
  };

  if (!hasEvents) return null;

  return (
    <motion.div
      data-testid="simulation-events"
      layout
      initial={{ width: 0 }}
      animate={{ width: hasEvents ? "100%" : 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden rounded-sm bg-[#1D2020] h-full flex flex-col"
      style={{ willChange: "width" }}
    >
      {!hideHeader && (
        <div className="shrink-0 text-white text-[14px] font-medium leading-[22px] tracking-[0.28px] bg-[#282B31] px-4 h-[48px] items-center flex">
          AI Feedback
        </div>
      )}
      <motion.div
        data-testid="simulation-events-container"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: hasEvents ? "0%" : "100%", opacity: hasEvents ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-start gap-4 bg-[#1D2020] p-4 flex-1 min-h-0 custom-scrollbar overflow-y-auto"
        ref={containerRef}
      >
        {filteredEvents.map(({ emoji, message, timestamp }, index) => {
          const isLast = index === filteredEvents.length - 1;
          return (
            <motion.div
              key={`${timestamp}-${index}`}
              data-testid={`simulation-event-${index}`}
              className={`flex items-center gap-2 bg-[#282B31] min-h-[50px] px-4 py-1 rounded-[20px] shrink-0 ${
                isLast ? "opacity-100" : "opacity-40"
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isLast ? 1 : 0.5, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span
                data-testid={`simulation-event-message-${index}`}
                className="text-[14px] text-white font-['IBM_Plex_Serif']"
              >
                {`${emoji}  ${message}`}
              </span>
              <span
                data-testid={`simulation-event-time-${index}`}
                className="text-[12px] text-[#9CA3AF] font-['Roboto'] flex-none"
              >
                {getEventTime(timestamp)}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
