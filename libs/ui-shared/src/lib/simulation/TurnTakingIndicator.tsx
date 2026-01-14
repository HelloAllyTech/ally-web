"use client";

import { memo } from "react";

import { motion } from "framer-motion";

export enum TurnState {
  AI_SPEAKING = "ai_speaking", // AI is speaking, shows "Speaking..." on AI card
  AI_LISTENING = "ai_listening", // AI is listening, shows "Listening..." on AI card
  USER_TURN_TO_SPEAK = "user_turn_to_speak", // User's turn, shows "Your turn to speak"
  USER_TURN_TO_LISTEN = "user_turn_to_listen", // User should listen, shows "Your turn to listen"
  THINKING = "thinking", // AI is processing, shows "Thinking..."
  IDLE = "idle", // No active state
}

interface TurnTakingIndicatorProps {
  turnState: TurnState;
}

const getTurnMessage = (turnState: TurnState): string => {
  switch (turnState) {
    case TurnState.AI_SPEAKING:
      return "Speaking...";
    case TurnState.AI_LISTENING:
      return "Listening...";
    case TurnState.USER_TURN_TO_SPEAK:
      return "Your turn to speak";
    case TurnState.USER_TURN_TO_LISTEN:
      return "Your turn to listen";
    case TurnState.THINKING:
      return "Thinking...";
    case TurnState.IDLE:
    default:
      return "";
  }
};

const getBackgroundColor = (turnState: TurnState): string => {
  switch (turnState) {
    case TurnState.AI_SPEAKING:
    case TurnState.THINKING:
      return "bg-blue-600"; // Blue for AI speaking/thinking
    case TurnState.AI_LISTENING:
      return "bg-blue-600"; // Blue for AI listening
    case TurnState.USER_TURN_TO_SPEAK:
      return "bg-blue-500"; // Lighter blue for user's turn to speak
    case TurnState.USER_TURN_TO_LISTEN:
      return "bg-blue-600"; // Blue for user's turn to listen
    case TurnState.IDLE:
    default:
      return "bg-transparent";
  }
};

export const TurnTakingIndicator = memo<TurnTakingIndicatorProps>(({ turnState }) => {
  const message = getTurnMessage(turnState);

  if (!message) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className={`px-3 py-1 rounded-md ${getBackgroundColor(turnState)} flex items-center justify-center`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-white text-[12px] font-medium leading-[18px]">{message}</span>
    </motion.div>
  );
});

TurnTakingIndicator.displayName = "TurnTakingIndicator";
