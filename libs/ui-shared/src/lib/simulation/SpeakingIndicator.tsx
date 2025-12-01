"use client";

import React from "react";

import { motion, Variants } from "framer-motion";

const barVariants: Variants = {
  speaking: (i: number) => ({
    height: ["4px", "12px", "4px"],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: "reverse",
      delay: i * 0.1,
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

export const SpeakingIndicator: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <div className="flex items-center justify-center gap-[3px] h-4 w-4">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-[3px] bg-white rounded-full"
          custom={i}
          variants={barVariants}
          initial="muted"
          animate={isSpeaking ? "speaking" : "muted"}
        />
      ))}
    </div>
  );
};
