"use client";

import { memo } from "react";

import { AnimatePresence, motion } from "framer-motion";

export type AgentTurnStatus = "thinking" | "speaking" | "user_turn";

interface TurnIndicatorProps {
  status: AgentTurnStatus;
  agentName?: string;
}

export const TurnIndicator = memo<TurnIndicatorProps>(({ status, agentName = "AI Client" }) => {
  const getMessage = () => {
    if (status === "thinking") return "Thinking...";
    if (status === "speaking") return `${agentName} is speaking`;
    return "Your turn to speak";
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 text-sm font-['IBM_Plex_Serif']"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Thinking indicator — three pulsing dots */}
        {status === "thinking" && (
          <span className="flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-white/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </span>
        )}

        {/* Speaking indicator — green pulsing dot */}
        {status === "speaking" && (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}

        {/* User turn indicator — static blue dot */}
        {status === "user_turn" && <span className="w-2 h-2 rounded-full bg-blue-400" />}

        <span
          className={
            status === "user_turn"
              ? "text-blue-300"
              : status === "speaking"
                ? "text-green-300"
                : "text-white/60"
          }
        >
          {getMessage()}
        </span>
      </motion.div>
    </AnimatePresence>
  );
});

TurnIndicator.displayName = "TurnIndicator";
