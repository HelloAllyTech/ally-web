"use client";

import { memo } from "react";

import { motion } from "framer-motion";

import { TurnIndicatorTranslations } from "./types";

export enum TurnState {
  AI_SPEAKING = "ai_speaking",
  AI_LISTENING = "ai_listening",
  USER_TURN_TO_SPEAK = "user_turn_to_speak",
  USER_TURN_TO_LISTEN = "user_turn_to_listen",
  THINKING = "thinking",
  PAUSED = "paused",
  IDLE = "idle",
}

interface TurnTakingIndicatorProps {
  turnState: TurnState;
  translations?: TurnIndicatorTranslations;
}

const DEFAULT_TRANSLATIONS: TurnIndicatorTranslations = {
  speaking: "Speaking...",
  listening: "Listening...",
  yourTurnToSpeak: "Your turn to speak",
  yourTurnToListen: "Your turn to listen",
  thinking: "Thinking...",
  paused: "Paused",
};

const getTurnMessage = (turnState: TurnState, t: TurnIndicatorTranslations): string => {
  switch (turnState) {
    case TurnState.AI_SPEAKING:
      return t.speaking;
    case TurnState.AI_LISTENING:
      return t.listening;
    case TurnState.USER_TURN_TO_SPEAK:
      return t.yourTurnToSpeak;
    case TurnState.USER_TURN_TO_LISTEN:
      return t.yourTurnToListen;
    case TurnState.THINKING:
      return t.thinking;
    case TurnState.PAUSED:
      return t.paused;
    case TurnState.IDLE:
    default:
      return "";
  }
};

const getBackgroundColor = (turnState: TurnState): string => {
  switch (turnState) {
    case TurnState.USER_TURN_TO_SPEAK:
      return "bg-primary-500";
    case TurnState.AI_SPEAKING:
    case TurnState.THINKING:
    case TurnState.AI_LISTENING:
    case TurnState.USER_TURN_TO_LISTEN:
      return "bg-primary-600";
    case TurnState.PAUSED:
      return "bg-gray-500";
    case TurnState.IDLE:
    default:
      return "bg-transparent";
  }
};

export const TurnTakingIndicator = memo<TurnTakingIndicatorProps>(({ turnState, translations }) => {
  const message = getTurnMessage(turnState, translations ?? DEFAULT_TRANSLATIONS);

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
