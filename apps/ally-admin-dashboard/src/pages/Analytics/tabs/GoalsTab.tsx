import { GoalsXpCard } from "../GoalsXpCard";

/**
 * Analytics → Goals: actual XP earned against a goal for that period.
 *
 * First tab in the registry — the leadership question "are we on pace"
 * belongs ahead of the platform-history view in Highlights. No page-level
 * pickers: the chart is all-time and platform-wide by construction, and its
 * own grain control (month/quarter/year) lives on the card.
 */
export const GoalsTab = () => (
  <div className="flex flex-col gap-4">
    <GoalsXpCard />
  </div>
);
