import { FC, useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { getElapsedTimeInMinutes, getKeyFromIndex } from "@utils";

import { SimulationEventsProps } from "./types";

const SimulationEvents: FC<SimulationEventsProps> = ({ events }) => {
  const hasEvents = events.length > 0;

  // Scroll container and last event refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastEventRef = useRef<HTMLDivElement | null>(null);

  // When a new event arrives, auto-scroll only if user is already near the bottom
  useEffect(() => {
    const container = containerRef.current;
    const last = lastEventRef.current;
    if (!container || !last) return;

    // Determine if user is already near the bottom of the container
    const thresholdPx = 60;
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const isNearBottom = distanceFromBottom <= thresholdPx;

    if (isNearBottom) {
      last.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [events.length]);

  const getEventTime = (timestamp: string): string => {
    // TODO: update logic to show only the latest event as 'now'
    const elapsedTime = getElapsedTimeInMinutes(timestamp);
    if (elapsedTime === 0) return "now";
    return `${elapsedTime} min${elapsedTime === 1 ? "" : "s"}`;
  };

  return (
    <motion.div
      layout
      initial={{ width: 0 }}
      animate={{ width: hasEvents ? "30%" : 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden rounded-lg"
      style={{ willChange: "width" }}
    >
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: hasEvents ? "0%" : "100%", opacity: hasEvents ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-end gap-4 bg-[#1D2020] p-4 h-full overflow-y-auto"
        ref={containerRef}
      >
        {events.map(({ emoji, message, timestamp }, index) => {
          const isLast = index === events.length - 1;
          return (
            <motion.div
              key={getKeyFromIndex(index, "event")}
              className="flex items-center gap-2 bg-[#282B31] px-4 py-1 rounded-full"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isLast ? 1 : 0.5, y: 0 }}
              transition={{ duration: 0.4 }}
              ref={isLast ? lastEventRef : undefined}
            >
              <span className="text-[14px] text-white italic font-['IBM_Plex_Serif']">
                {`${emoji}  ${message}`}
              </span>
              <span className="text-[12px] text-[#9CA3AF] font-['Roboto'] flex-none">
                {getEventTime(timestamp)}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default SimulationEvents;
