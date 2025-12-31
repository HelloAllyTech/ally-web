"use client";

import { memo } from "react";

import { motion, Variants } from "framer-motion";

/** Number of animated bars in the indicator */
const BAR_COUNT = 3;

/** Animation delay between each bar (in seconds) */
const STAGGER_DELAY = 0.1;

/** Animation variants for the speaking indicator bars */
const barVariants: Variants = {
  speaking: (index: number) => ({
    height: ["4px", "12px", "4px"],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: "reverse",
      delay: index * STAGGER_DELAY,
      ease: "easeInOut",
    },
  }),
  muted: {
    height: "3px",
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

interface SpeakingIndicatorProps {
  isSpeaking: boolean;
}

export const SpeakingIndicator = memo<SpeakingIndicatorProps>(({ isSpeaking }) => {
  return (
    <div className="flex items-center justify-center gap-[3px] h-4 w-4">
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <motion.div
          key={index}
          className="w-[3px] bg-white rounded-full"
          custom={index}
          variants={barVariants}
          initial="muted"
          animate={isSpeaking ? "speaking" : "muted"}
        />
      ))}
    </div>
  );
});

SpeakingIndicator.displayName = "SpeakingIndicator";
