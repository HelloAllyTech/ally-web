import {
  durationFast02,
  durationModerate01,
  durationModerate02,
  durationSlow01,
  easings,
} from "@carbon/motion";

/**
 * Carbon's motion tokens, in the shape framer-motion wants.
 *
 * ## Why this file exists
 *
 * This platform wears IBM Carbon — Carbon components, Carbon icons, a
 * Carbon-compatible type scale (see the note in `tailwind.config.js`) — and had
 * no Carbon motion at all. Every animation in the repo picks its own numbers:
 * `0.25 / easeOut` here, `0.3 / easeOut` there, `0.5 / [0.4, 0, 0.2, 1]` in the
 * simulation components (which is Material's standard curve, not Carbon's), and
 * `0.5 / easeInOut` in this feature's own rail. None of those are wrong on their
 * own and together they are not a system: the same kind of change moves at three
 * speeds depending on which file you are in.
 *
 * Carbon publishes the tokens, and `@carbon/motion` is a real dependency of this
 * app, so the numbers below are *derived from the package* rather than
 * transcribed from the docs. If Carbon retunes a curve, this follows.
 *
 * ## Productive vs. expressive — the one rule worth knowing
 *
 * Carbon splits its easings in two, and the split is about significance rather
 * than speed:
 *
 * - **Productive** — small, frequent, functional motion that must not draw the
 *   eye: a row changing place, a node filling in, a panel expanding. Most of
 *   this tab is productive.
 * - **Expressive** — motion attached to a moment that deserves noticing: a
 *   dialog arriving, a notification, an ambient loop that is *meant* to be seen.
 *
 * Durations run `fast-01` (70ms) through `slow-02` (700ms), and Carbon's
 * guidance is that duration should track distance and size: a 20px node
 * changing colour is `fast-02`, a row moving the height of another row is
 * `moderate-02`, a bar sweeping the width of a rail is `slow-01`.
 *
 * ## Reduced motion
 *
 * `stillness` is the same shape with a zero duration, so a caller can swap it
 * in behind `useReducedMotion()` without branching on the animation itself.
 * Every transition here is one or the other, never a half-speed compromise.
 *
 * Lives in this folder rather than in `@utils` or `libs/ui-shared` because
 * several suites on this page mock those barrels wholesale, and an import that
 * resolves to a mock without this export would take the whole tab down. Worth
 * promoting to the shared library the moment a second feature wants it — at
 * which point the ad-hoc numbers listed above are the ones to replace.
 */

/** `"240ms"` -> `0.24`, the unit framer-motion's `duration` is in. */
const seconds = (token: string): number => Number.parseFloat(token) / 1000;

/**
 * `"cubic-bezier(0.2, 0, 0.38, 0.9)"` -> `[0.2, 0, 0.38, 0.9]`.
 *
 * Carbon ships easings as CSS strings because its own consumers are
 * stylesheets; framer-motion wants the four control points as numbers.
 */
const bezier = (css: string): [number, number, number, number] => {
  const points = (css.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return [points[0], points[1], points[2], points[3]];
};

/** The raw tokens, exported so a test can assert these still match the package. */
export const CARBON_DURATION = {
  fast02: seconds(durationFast02),
  moderate01: seconds(durationModerate01),
  moderate02: seconds(durationModerate02),
  slow01: seconds(durationSlow01),
} as const;

export const CARBON_EASE = {
  standardProductive: bezier(easings.standard.productive),
  standardExpressive: bezier(easings.standard.expressive),
  entranceProductive: bezier(easings.entrance.productive),
  exitProductive: bezier(easings.exit.productive),
} as const;

export interface CarbonTransition {
  duration: number;
  ease: [number, number, number, number];
  repeat?: number;
}

/** Reduced-motion stand-in: the end state, arrived at instantly. */
export const stillness = { duration: 0 } as const;

/**
 * The transitions this feature animates with, each named for what it is *for*
 * rather than for its token, so a call site reads as a claim about the change
 * being made.
 */
export const CARBON_MOTION = {
  /**
   * A pipeline node changing state. Smallest thing that moves here — a 20-32px
   * circle recolouring — so Carbon's shortest interaction duration.
   */
  advance: {
    duration: CARBON_DURATION.fast02,
    ease: CARBON_EASE.standardProductive,
  },

  /**
   * A row changing place in the board because its bug advanced a stage. Travels
   * roughly the height of another row, which is `moderate-02` territory, and it
   * is functional rather than celebratory — the reader should register that
   * something moved without being pulled off what they were reading.
   */
  reorder: {
    duration: CARBON_DURATION.moderate02,
    ease: CARBON_EASE.standardProductive,
  },

  /** A row arriving. Entrance curves start at rest and accelerate in. */
  enter: {
    duration: CARBON_DURATION.moderate02,
    ease: CARBON_EASE.entranceProductive,
  },

  /**
   * A row leaving. Deliberately quicker than its entrance: Carbon's exits are
   * shorter than their entrances because something on its way out has stopped
   * being worth the reader's time.
   */
  exit: {
    duration: CARBON_DURATION.moderate01,
    ease: CARBON_EASE.exitProductive,
  },

  /** The rail's coloured fill sweeping to a new stage — the longest distance anything travels. */
  railFill: {
    duration: CARBON_DURATION.slow01,
    ease: CARBON_EASE.standardProductive,
  },

  /**
   * The looping "still working" motions — the pulse ring on the current node
   * and the pulse travelling toward the next one.
   *
   * The only expressive easing in the set, and the only one whose duration is
   * not a Carbon token. Both are deliberate: an ambient loop exists precisely to
   * be noticed, which is what expressive is for, and Carbon's duration scale
   * tops out at 700ms because it describes state *changes* — a breath that
   * repeats forever is not one of those, and at 700ms it would read as an alarm
   * rather than as someone working.
   */
  ambient: {
    duration: 1.4,
    ease: CARBON_EASE.standardExpressive,
    repeat: Infinity,
  },
} as const;
