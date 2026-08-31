import React, { useEffect, useRef, useState } from "react";

import { ArrowDown, ArrowUp, Locked } from "@icons";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { RoadmapVoteBudget, RoadmapOpportunity, RoadmapOpportunityType } from "@types";

import { clampVotes, isVotable, remainingWithPending } from "./utils/votes";

const STAGE_LABEL: Record<string, string> = {
  prioritised: "prioritised",
  under_development: "in development",
  released: "released",
  archived: "archived",
};

/** How long a "+1"/"−1" fly-up stays mounted — long enough to finish its rise-and-fade. */
const FLYUP_LIFETIME_MS = 700;

interface Flyup {
  id: number;
  delta: 1 | -1;
}

export interface VoteButtonProps {
  opportunity: RoadmapOpportunity;
  budget: RoadmapVoteBudget;
  /** Called with the final total after the debounce settles. */
  onSetVotes: (opportunityId: string, next: number, previous: number) => void;
  disabled?: boolean;
  debounceMs?: number;
  /**
   * "vertical" is the taller rendering used on the month-board card and the list row, which both
   * have a dedicated column of space: add on top, count, remove underneath — up is more, matching
   * every stepper of that shape.
   *
   * "horizontal" is the compact rendering that fits inside a fixed-height table row, where a
   * three-tier column would not: remove, count, add, left-to-right. That order deliberately
   * mirrors the old `− value +` stepper this control replaced, so the muscle memory survives.
   */
  orientation?: "horizontal" | "vertical";
}

/**
 * The vote control — the core interaction of the whole board.
 *
 * Two icon buttons around a count: the up chevron adds one vote, the down chevron removes one.
 * Replaced the old `− [number field] +` stepper because the underlying action is a vote, not a
 * quantity you dial in — there is no legitimate reason to TYPE an arbitrary number of votes onto
 * a row, which is the part that went away. One vote per tap in either direction is precise
 * enough, and removal is capability-parity with the coin system that came before.
 *
 * THREE THINGS THAT MATTER:
 *
 * 1. `pending` updates SYNCHRONOUSLY on every tap, so the count moves the instant you press it —
 *    taps are never gated on the network. One debounced write carries the final total, so a burst
 *    of rapid taps in either direction costs one request instead of one per tap. That is also why
 *    add-then-remove back to where you started fires NO request at all: `schedule` compares the
 *    settled value against the last committed one.
 *
 * 2. Add disables off remaining-INCLUDING-the-pending-edit, not the server's `remaining`. While
 *    the debounce is open the server total is stale for this row, so gating on it would let a
 *    user tap past the monthly cap and then get a 422.
 *
 * 3. Removal is gated on the SAME rule as adding — `isVotable`, i.e. stage `new` and not a bug
 *    report. Once an opportunity is prioritised its votes are frozen as the record of what got it
 *    there, so the whole control (both buttons) renders locked rather than letting someone
 *    withdraw support from something already being built. The backend enforces this
 *    independently in RoadmapAllocationService.setVotes, where `votes: 0` deletes the row.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({
  opportunity,
  budget,
  onSetVotes,
  disabled = false,
  debounceMs = 400,
  orientation = "horizontal",
}) => {
  const prefersReducedMotion = useReducedMotion();
  const serverVotes = opportunity.myVotes ?? 0;
  const [pending, setPending] = useState(serverVotes);
  const [bounce, setBounce] = useState<{ key: number; delta: 1 | -1 }>({ key: 0, delta: 1 });
  const [flyups, setFlyups] = useState<Flyup[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedRef = useRef(serverVotes);
  const nextFlyupId = useRef(0);

  // Re-sync when the server value changes underneath us (another tab, a realtime patch) — but
  // only when no local edit is in flight, or we would clobber a tap that hasn't settled yet.
  useEffect(() => {
    if (timer.current === null) {
      setPending(serverVotes);
      committedRef.current = serverVotes;
    }
  }, [serverVotes]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const locked = disabled || !isVotable(opportunity);
  const remaining = remainingWithPending(budget, pending, serverVotes);

  const schedule = (next: number) => {
    setPending(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const previous = committedRef.current;
      committedRef.current = next;
      if (next !== previous) onSetVotes(opportunity.id, next, previous);
    }, debounceMs);
  };

  const step = (delta: 1 | -1) => {
    const next = clampVotes(pending + delta, budget, serverVotes);
    // No-op at either end: the monthly cap going up, zero going down. Returning early rather
    // than scheduling keeps a dead tap from restarting the debounce window.
    if (next === pending) return;
    schedule(next);

    if (!prefersReducedMotion) {
      setBounce(b => ({ key: b.key + 1, delta }));
      const id = ++nextFlyupId.current;
      setFlyups(list => [...list, { id, delta }]);
      setTimeout(() => setFlyups(list => list.filter(f => f.id !== id)), FLYUP_LIFETIME_MS);
    }
  };

  if (locked) {
    const reason = isVotable(opportunity)
      ? "You do not have permission to vote"
      : opportunity.type === RoadmapOpportunityType.BUG
        ? "Votes can't be cast on bug reports. Existing votes are kept."
        : `Votes can only be added or removed while an opportunity is new — this one is ${
            STAGE_LABEL[opportunity.stage] ?? opportunity.stage
          }. Existing votes are kept.`;
    return (
      // align="bottom" because the plain Carbon Tooltip has no autoAlign and renders inline;
      // top-aligned it clips inside the table's scroll container.
      <Tooltip label={reason} align="bottom">
        {/*
          role="img" + aria-label, NOT aria-label on its own. A bare <div> is a generic element,
          and generic elements cannot take an accessible name — the label was being dropped on
          the floor, so a locked row announced as nothing but its number. There are a dozen of
          them on a normal queue. role="img" makes this a nameable leaf and hides the glyph and
          the digits inside it, so the whole control announces once, as one sentence.

          A padlock rather than the dead ArrowUp this used to render. A greyed-out chevron reads
          as a button that is broken or momentarily disabled, which invites the click that does
          nothing; a padlock says the state is deliberate. It also drops a false asymmetry — an
          up chevron with no down chevron under it looked like half a stepper had failed to
          render, rather than like a control that is closed.

          The number is YOUR votes, the same quantity the unlocked control shows. It is named in
          the label because the card beside it shows the TOTAL, and an unqualified "0" sitting
          next to "60 votes" reads as a contradiction until you know the two count different
          things.
        */}
        <div
          role="img"
          aria-label={`Your votes: ${serverVotes}. Locked — ${reason}`}
          className="flex flex-col items-center gap-0.5 opacity-45"
        >
          <Locked size={16} aria-hidden />
          <span className="tabular-nums text-typography-primary text-xs">{serverVotes}</span>
        </div>
      </Tooltip>
    );
  }

  const isVertical = orientation === "vertical";
  const buttonSize = isVertical ? "h-8 w-8" : "h-7 w-7";
  const iconSize = isVertical ? 18 : 16;

  const arrow = (delta: 1 | -1) => {
    const Icon = delta === 1 ? ArrowUp : ArrowDown;
    // Bounce replays only on the button that was actually tapped, and only for that tap: the key
    // changes to force a remount, so a one-shot keyframe needs no imperative controller.
    if (prefersReducedMotion || bounce.delta !== delta) {
      return (
        <span className="text-primary-600 flex items-center justify-center">
          <Icon size={iconSize} />
        </span>
      );
    }
    return (
      <motion.span
        key={bounce.key}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.2 }}
        className="text-primary-600 flex items-center justify-center"
      >
        <Icon size={iconSize} />
      </motion.span>
    );
  };

  const addButton = (
    <button
      key="add"
      type="button"
      /*
        TWO different quantities, named as two. `pending` is the votes on THIS row; the budget is
        the monthly allowance spent across every row. The old string read
        "${pending} of ${votesPerMonth} used this month", which stated the first as if it were
        the second — a row holding 24 votes announced "24 of 100 used this month" while the
        header correctly said 59 of 100 left, i.e. 41 used. Two numbers on one screen
        contradicting each other, and the wrong one is the one attached to the button you are
        about to press. `remaining` is the pending-aware figure the disabled state already gates
        on, so the label cannot drift from the behaviour.
      */
      aria-label={`Add a vote — you have ${pending} on this, ${remaining} of ${budget.votesPerMonth} left this month`}
      title={remaining === 0 ? "No votes left this month" : "Add a vote"}
      disabled={remaining === 0}
      onClick={() => step(1)}
      className={`border-border-light hover:bg-background-secondary flex items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${buttonSize}`}
    >
      {arrow(1)}
    </button>
  );

  const removeButton = (
    <button
      key="remove"
      type="button"
      aria-label={`Remove a vote — you have ${pending} on this, ${remaining} of ${budget.votesPerMonth} left this month`}
      title={pending === 0 ? "You have no votes on this to remove" : "Remove a vote"}
      disabled={pending === 0}
      onClick={() => step(-1)}
      className={`border-border-light hover:bg-background-secondary flex items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${buttonSize}`}
    >
      {arrow(-1)}
    </button>
  );

  const count = (
    <div key="count" className="relative flex h-4 items-start justify-center">
      {prefersReducedMotion ? (
        <span className="tabular-nums text-typography-primary text-xs font-medium">{pending}</span>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={pending}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="tabular-nums text-typography-primary block text-xs font-medium"
          >
            {pending}
          </motion.span>
        </AnimatePresence>
      )}

      {/* The "+1"/"−1" fly-up — a short-lived absolutely-positioned toast, one per tap, similar
          to Medium's clap "+1". It rises for an add and sinks for a remove, so the direction of
          the change is legible without reading the number. Never rendered under reduced motion
          (flyups stays empty there). */}
      <AnimatePresence>
        {flyups.map(({ id, delta }) => (
          <motion.span
            key={id}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: delta === 1 ? -18 : 18, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FLYUP_LIFETIME_MS / 1000 }}
            className="text-primary-600 pointer-events-none absolute top-0 text-xs font-semibold"
          >
            {delta === 1 ? "+1" : "−1"}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );

  /**
   * The three parts are declared once and ORDERED by orientation, rather than duplicating the
   * whole control per layout — two copies of a debounced stepper is two places for the clamp
   * rules to drift apart. (The same reasoning the old CoinAllocator used, and the same reason
   * it is worth keeping.)
   */
  return (
    <div
      className={
        isVertical
          ? "inline-flex flex-col items-center gap-1"
          : "inline-flex items-center justify-center gap-1.5"
      }
    >
      {isVertical ? [addButton, count, removeButton] : [removeButton, count, addButton]}
    </div>
  );
};
