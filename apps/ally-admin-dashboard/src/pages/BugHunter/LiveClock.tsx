import { FC, useEffect, useState } from "react";

import { en } from "@constants";

export interface LiveClockProps {
  /** When the data this clock describes was last fetched — an ISO string or a `Date.now()`-style timestamp (RTK Query's own `fulfilledTimeStamp`). */
  since: string | number;
  /**
   * `updated` (the default) reads "Updated 45s ago" — a statement about this
   * page's data. `elapsed` reads "45s" — a duration, for a caller whose own
   * words supply the subject ("2m on this step", "sweeping for 2m").
   *
   * Two modes on one component rather than two components, because the part
   * worth sharing is neither the wording nor the rollover: it is the once-a-
   * second interval. A board with one clock per in-flight row plus the card's
   * own is four independent tickers, and they should at least be the same
   * ticker.
   */
  mode?: "updated" | "elapsed";
  /**
   * Accessible name, for `elapsed` only. A bare "2m" is legible next to a row
   * a sighted reader can see it belongs to, and is meaningless read out on its
   * own — so the caller passes the sentence it stands for.
   */
  srLabel?: string;
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
 *
 * Under `mode="elapsed"` the same rollover renders as a bare duration, which
 * is what `LiveWorkBoard` puts on each in-flight row: a number that visibly
 * climbs is the difference between "Bug Hunter is fixing this" as a status and
 * as something happening while you watch. It counts from a server timestamp,
 * so it clamps at zero rather than showing a negative duration when the
 * client's clock is a few seconds behind the API's.
 */
export const LiveClock: FC<LiveClockProps> = ({ since, mode = "updated", srLabel }) => {
  const sinceMs = typeof since === "string" ? new Date(since).getTime() : since;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((now - sinceMs) / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / SECONDS_PER_MINUTE);
  const elapsedHours = Math.floor(elapsedMinutes / MINUTES_PER_HOUR);

  const strings = en.bugHunter;

  // One rollover, two vocabularies. `elapsed` has no "just now" case: a
  // duration that starts at "0s" and climbs is the point of it, where a clock
  // describing a fetch is better off saying "just now" than "0s ago".
  const label =
    mode === "elapsed"
      ? elapsedSeconds < SECONDS_PER_MINUTE
        ? strings.elapsedSeconds.replace("{count}", String(elapsedSeconds))
        : elapsedMinutes < MINUTES_PER_HOUR
          ? strings.elapsedMinutes.replace("{count}", String(elapsedMinutes))
          : strings.elapsedHours.replace("{count}", String(elapsedHours))
      : elapsedSeconds === 0
        ? strings.updatedJustNow
        : elapsedSeconds < SECONDS_PER_MINUTE
          ? strings.updatedSecondsAgo.replace("{count}", String(elapsedSeconds))
          : elapsedMinutes < MINUTES_PER_HOUR
            ? strings.updatedMinutesAgo.replace("{count}", String(elapsedMinutes))
            : strings.updatedHoursAgo.replace("{count}", String(elapsedHours));

  const accessibleName =
    mode === "elapsed" && srLabel ? srLabel.replace("{duration}", label) : undefined;

  return (
    // Monospace + tabular-nums: the one glanceable "this is telemetry, and
    // it's live" cue on the card, in ordinary Carbon light — no dark skin,
    // just the type treatment. Tabular figures also stop the row from
    // twitching sideways as the digit count changes.
    <span
      className="text-[11px] font-mono tabular-nums text-typography-500"
      // An `aria-label` on a bare <span> is ignored by assistive tech, so the
      // role comes with it — the same pairing `Sparkbars` and the scorecard's
      // chip row use. "45s" is compact notation for a sighted reader and a
      // named graphic to a screen reader, which is what `role="img"` describes.
      role={accessibleName ? "img" : undefined}
      aria-label={accessibleName}
    >
      {label}
    </span>
  );
};
