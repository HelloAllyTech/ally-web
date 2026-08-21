"use client";

import { FC, useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { SupervisorNotesProps } from "./types";

const DEFAULT_EMPTY_STATE =
  "Your supervisor is listening — notes appear here when there's something useful.";

/**
 * The live feed of coaching hints the AI supervisor sends during a session.
 *
 * Deliberately quiet. The learner is mid-conversation with a client, so this
 * panel never animates for attention, never spins, and never shows a count —
 * the unread badge on the tab is the only signal, and it is the sidebar's job.
 * Newest note last and highlighted; earlier ones dim but stay readable, since
 * a hint the learner half-read and wants to check again is the common case.
 */
export const SupervisorNotes: FC<SupervisorNotesProps> = ({ notes = [], translations }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    // Guarded rather than assumed: scrollTo is absent in jsdom, and a missing
    // auto-scroll should never be able to take the panel down with it.
    if (typeof container?.scrollTo === "function") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [notes.length]);

  if (notes.length === 0) {
    return (
      <div
        data-testid="supervisor-notes-empty"
        className="text-[14px] text-[#9CA3AF] leading-relaxed"
      >
        {translations?.supervisorEmptyState ?? DEFAULT_EMPTY_STATE}
      </div>
    );
  }

  return (
    <div
      data-testid="supervisor-notes"
      ref={containerRef}
      className="flex flex-col gap-3 custom-scrollbar"
    >
      {notes.map((item, index) => {
        const isLast = index === notes.length - 1;
        return (
          <motion.div
            key={item.seq}
            data-testid={`supervisor-note-${index}`}
            className={`bg-[#282B31] rounded-2xl p-4 text-[14px] leading-relaxed shrink-0 ${
              isLast ? "text-white" : "text-[#D9D9DC] opacity-70"
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isLast ? 1 : 0.7, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {item.note}
          </motion.div>
        );
      })}
    </div>
  );
};
