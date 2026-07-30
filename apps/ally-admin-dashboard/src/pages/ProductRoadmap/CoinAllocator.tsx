import React, { useEffect, useRef, useState } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { RoadmapCoinBudget, RoadmapOpportunity } from "@types";

import { clampCoins, isAllocatable, remainingWithPending } from "./utils/coins";

const STAGE_LABEL: Record<string, string> = {
  prioritised: "prioritised",
  under_development: "in development",
  released: "released",
  archived: "archived",
};

interface CoinAllocatorProps {
  opportunity: RoadmapOpportunity;
  budget: RoadmapCoinBudget;
  /** Called with the final value after the debounce settles. */
  onCommit: (opportunityId: string, next: number, previous: number) => void;
  disabled?: boolean;
  debounceMs?: number;
}

/**
 * The coin control — the core interaction of the whole board.
 *
 * Bespoke rather than Carbon's NumberInput, for four concrete reasons: its steppers stack
 * vertically (~40px tall, wrong inside a table row), it owns its own value and validation state,
 * its onChange signature fights an externally-supplied clamp, and it has no "locked with an
 * explanatory reason" state.
 *
 * TWO THINGS THAT MATTER:
 *
 * 1. `pending` updates SYNCHRONOUSLY on every click and keystroke, so the number moves the
 *    instant you press it — clicks are never gated on the network. One debounced write carries
 *    the final value. (The standalone app had no debounce at all: it fired a request on every
 *    single `+` click and every keystroke in the number field.)
 *
 * 2. `+` is disabled off remaining-INCLUDING-the-pending-edit, not the server's `remaining`.
 *    While the debounce is open the server total is stale for this row, so gating on it would
 *    let a user click past the cap and then get a 422.
 */
export const CoinAllocator: React.FC<CoinAllocatorProps> = ({
  opportunity,
  budget,
  onCommit,
  disabled = false,
  debounceMs = 400,
}) => {
  const serverCoins = opportunity.myCoins ?? 0;
  const [pending, setPending] = useState(serverCoins);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedRef = useRef(serverCoins);

  // Re-sync when the server value changes underneath us (another tab, a realtime patch) — but
  // only when no local edit is in flight, or we would clobber what the user is typing.
  useEffect(() => {
    if (timer.current === null) {
      setPending(serverCoins);
      committedRef.current = serverCoins;
    }
  }, [serverCoins]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const locked = disabled || !isAllocatable(opportunity);
  const remaining = remainingWithPending(budget, pending, serverCoins);

  const schedule = (next: number) => {
    setPending(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const previous = committedRef.current;
      committedRef.current = next;
      if (next !== previous) onCommit(opportunity.id, next, previous);
    }, debounceMs);
  };

  const step = (delta: number) => schedule(clampCoins(pending + delta, budget, serverCoins));

  if (locked) {
    const reason = isAllocatable(opportunity)
      ? "You do not have permission to allocate coins"
      : `Coins can only go to new opportunities — this one is ${
          STAGE_LABEL[opportunity.stage] ?? opportunity.stage
        }. Existing votes are kept.`;
    return (
      // align="bottom" because the plain Carbon Tooltip has no autoAlign and renders inline;
      // top-aligned it clips inside the table's scroll container.
      <Tooltip label={reason} align="bottom">
        <div className="flex items-center gap-1 opacity-45" aria-label={`Coins locked: ${reason}`}>
          <span className="font-mono tabular-nums text-typography-primary w-12 text-center">
            {serverCoins}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      role="spinbutton"
      aria-valuenow={pending}
      aria-valuemin={0}
      aria-valuemax={budget.coinsPerMonth}
      className="flex items-center"
    >
      <button
        type="button"
        aria-label="Decrease coins"
        disabled={pending === 0}
        onClick={() => step(-1)}
        className="border border-border-light h-9 w-8 disabled:opacity-40 hover:bg-background-secondary"
      >
        −
      </button>
      <input
        type="number"
        value={pending}
        min={0}
        max={budget.coinsPerMonth}
        aria-label="Coins"
        onFocus={e => e.currentTarget.select()}
        onChange={e => schedule(clampCoins(e.currentTarget.value, budget, serverCoins))}
        className="border-y border-border-light h-9 w-12 text-center font-mono tabular-nums outline-none focus:bg-background-secondary"
      />
      <button
        type="button"
        aria-label="Increase coins"
        disabled={remaining === 0}
        onClick={() => step(1)}
        className="border border-border-light h-9 w-8 disabled:opacity-40 hover:bg-background-secondary"
      >
        +
      </button>
    </div>
  );
};
