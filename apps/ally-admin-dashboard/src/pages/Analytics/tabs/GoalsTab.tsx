import { GoalsXpCard } from "../GoalsXpCard";

/**
 * Highlights → Goals: actual XP earned against a goal for that period.
 *
 * First sub-tab in the Highlights registry — the leadership question "are we
 * on pace" belongs ahead of the broader platform-history view in the other
 * sub-tabs. No page-level pickers: the chart is all-time and platform-wide by
 * construction, and its own grain control (month/quarter/year) lives on the
 * card.
 */
export const GoalsTab = () => (
  <div className="flex flex-col gap-4">
    <GoalsXpCard />
  </div>
);
