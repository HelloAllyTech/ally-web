"use client";

import { FC, useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { SimulationEventsProps } from "./types";

export const SimulationEvents: FC<SimulationEventsProps> = ({ events = [] }) => {
  const filteredEvents = events.filter(event => event.emoji && event.message);
  const hasEvents = filteredEvents.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastEventRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const last = lastEventRef.current;
    if (!container || !last) return;

    const thresholdPx = 60;
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const isNearBottom = distanceFromBottom <= thresholdPx;

    if (isNearBottom) {
      last.scrollIntoView({ behavior: "smooth", block: "end" });
    }
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

  if (events?.length === 0) return null;

  return (
    <motion.div
      data-testid="simulation-events"
      layout
      initial={{ width: 0 }}
      animate={{ width: hasEvents ? "30%" : 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden rounded-lg"
      style={{ willChange: "width" }}
    >
      <motion.div
        data-testid="simulation-events-container"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: hasEvents ? "0%" : "100%", opacity: hasEvents ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-end gap-4 bg-[#1D2020] p-4 h-full overflow-y-auto"
        ref={containerRef}
      >
        {filteredEvents.map(({ emoji, message, timestamp }, index) => {
          const isLast = index === filteredEvents.length - 1;
          return (
            <motion.div
              key={`${timestamp}-${index}`}
              data-testid={`simulation-event-${index}`}
              className="flex items-center gap-2 bg-[#282B31] px-4 py-1 rounded-full"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isLast ? 1 : 0.5, y: 0 }}
              transition={{ duration: 0.4 }}
              ref={isLast ? lastEventRef : undefined}
            >
              <span
                data-testid={`simulation-event-message-${index}`}
                className="text-[14px] text-white italic font-['IBM_Plex_Serif']"
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
