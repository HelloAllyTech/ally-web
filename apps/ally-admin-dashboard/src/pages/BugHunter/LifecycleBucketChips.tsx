import { FC } from "react";

import { motion, useReducedMotion } from "framer-motion";

import { en } from "@constants";

import { BucketCounts, LIFECYCLE_BUCKETS, LifecycleBucket } from "./lifecycleBucket";

/** What the filter can be set to: one bucket, or everything. */
export type BucketFilter = LifecycleBucket | "all";

/**
 * Read inside a function, never at module scope.
 *
 * `@constants` is a barrel, and building a `Record` off it at import time is the
 * pattern the repo's CLAUDE.md calls out by name: it broke nine admin test
 * suites that mock the barrel wholesale. Same rule `agentPersona.ts` follows.
 */
const bucketLabels = (): Record<LifecycleBucket, string> => ({
  needs_you: en.bugHunter.bucketNeedsYou,
  problem: en.bugHunter.bucketProblem,
  queued: en.bugHunter.bucketQueued,
  in_flight: en.bugHunter.bucketInFlight,
  in_review: en.bugHunter.bucketInReview,
  shipped: en.bugHunter.bucketShipped,
  closed: en.bugHunter.bucketClosed,
});

/**
 * Chip treatment when the bucket has something in it.
 *
 * Only the two buckets whose next move belongs to a human get a colour, and
 * only while they are non-empty. Everything else stays neutral however large it
 * gets: a tab where "In review 9" is as loud as "Needs your call 4" is a tab
 * that has told you nothing about which to look at. This is Stacks' *Dynamic
 * visibility scaling tied to information urgency* — quiet the signal when
 * normal, amplify it when it needs acting on — and it is what lets the
 * `NeedsYouQueue` below stay the only coloured region on the page.
 */
const OCCUPIED_STYLES: Partial<Record<LifecycleBucket, string>> = {
  needs_you: "border-orange-300 bg-orange-50 text-orange-800",
  problem: "border-destructive-300 bg-destructive-50 text-destructive-700",
};

const NEUTRAL_STYLE = "border-border-light bg-white text-typography-800";
/** Zero is worth showing — it is the difference between "nothing failed" and "I haven't looked" — but not worth reading first. */
const EMPTY_STYLE = "border-border-light bg-white text-typography-500";
const SELECTED_RING = "ring-2 ring-primary-500 ring-offset-1";

export interface LifecycleBucketChipsProps {
  counts: BucketCounts;
  /** Total findings in the loaded window — the "Everything" chip's count. */
  total: number;
  value: BucketFilter;
  onChange: (value: BucketFilter) => void;
  /** Dims the row and blocks clicks while a fresh page is in flight. */
  disabled?: boolean;
}

/**
 * The seven lifecycle buckets as a row of filter chips, directly above the
 * bugs table.
 *
 * ## What this replaces
 *
 * Two separate controls that between them did neither job. The first was a
 * four-tile workload strip on the profile card: about 110px of vertical space,
 * counting four overlapping-in-principle groups out of a hundred-row window,
 * summing to less than the total, and carrying a footnote apologising for the
 * denominator ("From my 24 most recent bugs — a picture of this week, not an
 * all-time total"). None of the four numbers was clickable, so a card that said
 * "Waiting on your call: 4" offered no way to see those four. The second was a
 * flat `<Select>` of all seventeen statuses next to the table, ordered by enum
 * declaration, where finding your own work meant knowing which four names meant
 * "you".
 *
 * One row of chips does both: it reads as a breakdown *and* it filters. Because
 * `countByBucket` puts every finding in exactly one bucket, the chips sum to
 * the "Everything" count — so the row is arithmetic a reader can trust, and the
 * apologetic footnote is gone because there is nothing left to apologise for.
 *
 * ## Why chips and not a segmented control
 *
 * Seven options with numbers on them. A `ContentSwitcher` divides its width
 * evenly and would clip every label — which is exactly the bug this redesign
 * fixed on the working-style switcher, and not one worth reintroducing at seven
 * segments instead of three.
 */
export const LifecycleBucketChips: FC<LifecycleBucketChipsProps> = ({
  counts,
  total,
  value,
  onChange,
  disabled = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const labels = bucketLabels();

  const chips: { key: BucketFilter; label: string; count: number }[] = [
    { key: "all", label: en.bugHunter.bucketAll, count: total },
    ...LIFECYCLE_BUCKETS.map(bucket => ({
      key: bucket as BucketFilter,
      label: labels[bucket],
      count: counts[bucket],
    })),
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      role="group"
      aria-label={en.bugHunter.bucketGroupLabel}
    >
      {chips.map(chip => {
        const isSelected = chip.key === value;
        const occupied = chip.key !== "all" && chip.count > 0;
        const tone = occupied
          ? (OCCUPIED_STYLES[chip.key as LifecycleBucket] ?? NEUTRAL_STYLE)
          : chip.count > 0
            ? NEUTRAL_STYLE
            : EMPTY_STYLE;

        return (
          <button
            key={chip.key}
            type="button"
            // `aria-pressed` rather than a tab role: these are seven
            // independent toggles over one list, not a tabset with seven
            // panels, and a screen reader announcing "tab 3 of 8" would
            // promise panels that do not exist.
            aria-pressed={isSelected}
            onClick={() => onChange(chip.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors hover:bg-neutral-50 ${tone} ${
              isSelected ? SELECTED_RING : ""
            }`}
          >
            {chip.label}
            <span className="tabular-nums font-semibold">
              {/* Re-keyed on the value itself, so a poll that changes a count
                  remounts this wrapper and replays a small pop-in — carried
                  over from the workload strip this row replaces, which is where
                  the idiom (and its test) came from. */}
              <motion.span
                key={chip.count}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="inline-block"
              >
                {chip.count}
              </motion.span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
