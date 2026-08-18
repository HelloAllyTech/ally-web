import { FC } from "react";

import { motion, useReducedMotion } from "framer-motion";

import { en } from "@constants";
import { BugFinding } from "@types";

import { summariseWorkload } from "./agentPersona";

/**
 * What's on Bug Hunter's desk, the way you'd ask a colleague at standup:
 * what they're on, what they're blocked on, what's in review, what shipped.
 *
 * "Waiting on you" is the only tile that changes colour, and only when it is
 * non-zero — it is the single number on this page that represents *your*
 * unfinished work rather than the agent's, and colouring the other three
 * would bury it.
 */
export const AgentWorkloadStrip: FC<{ findings: BugFinding[] }> = ({ findings }) => {
  const shouldReduceMotion = useReducedMotion();
  // Four zeroes tell a reader nothing the empty bugs table below doesn't
  // already say, so a desk with nothing on it shows nothing at all.
  if (findings.length === 0) return null;

  const workload = summariseWorkload(findings);
  const tiles = [
    { label: en.bugHunter.workloadInFlight, value: workload.inFlight, emphasis: false },
    { label: en.bugHunter.workloadWaiting, value: workload.waitingOnYou, emphasis: true },
    { label: en.bugHunter.workloadInReview, value: workload.inReview, emphasis: false },
    { label: en.bugHunter.workloadShipped, value: workload.shipped, emphasis: false },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(tile => (
          <div
            key={tile.label}
            className={`border rounded-lg px-4 py-3 ${
              tile.emphasis && tile.value > 0
                ? "border-orange-200 bg-orange-50"
                : "border-border-light bg-white"
            }`}
          >
            <dt className="text-xs text-typography-600">{tile.label}</dt>
            <dd
              className={`text-2xl font-secondary tabular-nums ${
                tile.emphasis && tile.value > 0 ? "text-orange-700" : "text-typography-900"
              }`}
            >
              {/* Re-keyed on the value itself, so a poll that changes a count
                  remounts this wrapper and replays a small pop-in — the same
                  idiom as `SpecPatchFlash`, applied to a single number rather
                  than a whole section. */}
              <motion.span
                key={tile.value}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="inline-block"
              >
                {tile.value}
              </motion.span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-typography-500 mt-2">
        {en.bugHunter.workloadFootnote.replace("{count}", String(findings.length))}
      </p>
    </div>
  );
};
