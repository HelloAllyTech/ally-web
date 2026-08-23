"use client";

import { FC, useEffect, useRef } from "react";

import { motion } from "framer-motion";

import { SupervisorNotesProps } from "./types";
import { Tooltip } from "../../primitives";

const DEFAULT_EMPTY_STATE =
  "Your supervisor is listening — notes appear here when there's something useful.";
const DEFAULT_AI_LABEL = "AI-generated";
const DEFAULT_AI_TOOLTIP =
  "Ally is an AI supervisor. It's listening live and sending these notes automatically — not a person.";

/**
 * The live feed of coaching hints the AI supervisor sends during a session.
 *
 * Deliberately quiet. The learner is mid-conversation with a client, so this
 * panel never animates for attention, never spins, and never shows a count —
 * the unread badge on the tab is the only signal, and it is the sidebar's job.
 * Newest note last and highlighted; earlier ones dim but stay readable, since
 * a hint the learner half-read and wants to check again is the common case.
 *
 * The disclosure badge sits above the notes rather than on each one — the
 * tab is already named "Supervisor" and reads as a person unless something
 * says otherwise, so it earns a permanent label rather than a one-time toast.
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

  return (
    <>
      <div className="mb-3 flex items-center">
        <Tooltip label={translations?.supervisorAiTooltip ?? DEFAULT_AI_TOOLTIP} align="bottom">
          <span
            data-testid="supervisor-ai-disclosure"
            className="inline-flex cursor-help items-center rounded-full bg-[#282B31] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]"
          >
            {translations?.supervisorAiLabel ?? DEFAULT_AI_LABEL}
          </span>
        </Tooltip>
      </div>

      {notes.length === 0 ? (
        <div
          data-testid="supervisor-notes-empty"
          className="text-[14px] text-[#9CA3AF] leading-relaxed"
        >
          {translations?.supervisorEmptyState ?? DEFAULT_EMPTY_STATE}
        </div>
      ) : (
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
      )}
    </>
  );
};
