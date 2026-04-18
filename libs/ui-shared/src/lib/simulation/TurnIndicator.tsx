"use client";

import { memo } from "react";

import { motion } from "framer-motion";

export enum TurnState {
  AI_SPEAKING = "ai_speaking",
  AI_LISTENING = "ai_listening",
  USER_TURN_TO_SPEAK = "user_turn_to_speak",
  USER_TURN_TO_LISTEN = "user_turn_to_listen",
  THINKING = "thinking",
  IDLE = "idle",
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
    case TurnState.USER_TURN_TO_SPEAK:
      return "bg-blue-500";
    case TurnState.AI_SPEAKING:
    case TurnState.THINKING:
    case TurnState.AI_LISTENING:
    case TurnState.USER_TURN_TO_LISTEN:
      return "bg-blue-600";
    case TurnState.IDLE:
    default:
      return "bg-transparent";
  }
};

export const TurnTakingIndicator = memo<TurnTakingIndicatorProps>(({ turnState }) => {
  const message = getTurnMessage(turnState);

  if (!message) return null;

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
      <span className="text-white text-[14px] font-medium leading-[18px] italic">{message}</span>
    </motion.div>
  );
});

TurnTakingIndicator.displayName = "TurnTakingIndicator";
