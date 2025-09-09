import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";

import { getKeyFromIndex } from "@src/utils";

const SimulationEvents: FC = () => {
  // TODO: remove this with LiveKit event data once implemented.
  const [events, setEvents] = useState<string[]>([
    "Try asking an open ended question to get client to open up",
    "Great Question",
    "Event 3",
    "Try asking an open ended question to get client to open up",
  ]);

  const hasEvents = events.length > 0;

  // TODO: remove this useEffect after LiveKit event logic is implemented
  useEffect(() => {
    setInterval(() => {
      setEvents(prev => [...prev, "Event 3"]);
    }, 4000);
  }, []);

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
      >
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <motion.div
              key={getKeyFromIndex(index, "event")}
              className="flex items-center gap-2 bg-[#282B31] px-4 py-1 rounded-full"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isLast ? 1 : 0.5, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-[14px] text-white italic font-['IBM_Plex_Serif']">{event}</span>
              <span className="text-[12px] text-[#9CA3AF] font-['Roboto']">2 mins</span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default SimulationEvents;
