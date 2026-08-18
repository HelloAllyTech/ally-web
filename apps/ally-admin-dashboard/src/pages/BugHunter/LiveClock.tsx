import { FC, useEffect, useState } from "react";

import { en } from "@constants";

export interface LiveClockProps {
  /** When the data this clock describes was last fetched — an ISO string or a `Date.now()`-style timestamp (RTK Query's own `fulfilledTimeStamp`). */
  since: string | number;
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * "Updated Xs ago", ticking every second off a fixed `since` timestamp — the
 * cheapest, most convincing "this page is alive" signal on the tab, and one
 * that needs no pipeline data to work. Runs its own interval rather than
 * depending on a parent re-render, since the parent (typically a settled RTK
 * Query hook) has no other reason to re-render once a second on its own.
 *
 * Rolls over through seconds -> minutes -> hours rather than only ever
 * counting seconds — a QA pass caught this rendering "Updated 156s ago",
 * which nobody reads as "two and a half minutes".
 */
export const LiveClock: FC<LiveClockProps> = ({ since }) => {
  const sinceMs = typeof since === "string" ? new Date(since).getTime() : since;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / SECONDS_PER_MINUTE);
  const elapsedHours = Math.floor(elapsedMinutes / MINUTES_PER_HOUR);

  const label =
    elapsedSeconds === 0
      ? en.bugHunter.updatedJustNow
      : elapsedSeconds < SECONDS_PER_MINUTE
        ? en.bugHunter.updatedSecondsAgo.replace("{count}", String(elapsedSeconds))
        : elapsedMinutes < MINUTES_PER_HOUR
          ? en.bugHunter.updatedMinutesAgo.replace("{count}", String(elapsedMinutes))
          : en.bugHunter.updatedHoursAgo.replace("{count}", String(elapsedHours));

  return (
    // Monospace + tabular-nums: the one glanceable "this is telemetry, and
    // it's live" cue on the card, in ordinary Carbon light — no dark skin,
    // just the type treatment.
    <span className="text-[11px] font-mono tabular-nums text-typography-500">{label}</span>
  );
};
