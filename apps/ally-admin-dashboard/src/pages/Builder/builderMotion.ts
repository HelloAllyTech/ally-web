/**
 * Builder's motion vocabulary, defined once.
 *
 * Two Carbon easing families, used for different jobs and not interchangeably:
 *
 *  - **productive** — status changing, a row settling, a value updating. Fast
 *    and unremarkable; the user should register the change, not the motion.
 *  - **expressive** — the handful of moments that carry meaning: the PRD
 *    becoming build-ready, a pull request opening. Slower, with a slight
 *    overshoot, because these are the beats a person remembers the session by.
 *
 * Two rules hold everywhere:
 *
 * 1. **Nothing animates when nothing is happening.** An idle agent gets a
 *    still interface. A spinner over a stalled build, or a pulse over a
 *    session that has been waiting on an answer for an hour, manufactures the
 *    appearance of progress — which is worse than showing none.
 * 2. **`prefers-reduced-motion` removes the movement, never the information.**
 *    Every animated state has a static equivalent that says the same thing.
 */

export const BUILDER_EASING = {
  productive: "cubic-bezier(0.2, 0, 0.38, 0.9)",
  expressive: "cubic-bezier(0.4, 0.14, 0.3, 1)",
  /** For things leaving: quick, no overshoot — an exit should not draw the eye. */
  exit: "cubic-bezier(0.2, 0, 1, 0.9)",
} as const;

export const BUILDER_DURATION = {
  /** A chip flipping state, a checkbox settling. */
  fast: 110,
  /** The default: a row entering the feed, a section updating. */
  moderate: 240,
  /** A panel or drawer moving. */
  slow: 400,
  /** Reserved for the readiness ring filling and the PR reveal. */
  celebratory: 700,
} as const;

/** Feed items stagger by index so a burst of events reads as a sequence. */
export const BUILDER_STAGGER_MS = 40;
/** Past this many items, stagger stops — a 30-item catch-up should not crawl. */
export const BUILDER_STAGGER_MAX_ITEMS = 8;

export const builderTransition = (
  properties: string[],
  duration: keyof typeof BUILDER_DURATION = "moderate",
  easing: keyof typeof BUILDER_EASING = "productive",
): string =>
  properties
    .map(property => `${property} ${BUILDER_DURATION[duration]}ms ${BUILDER_EASING[easing]}`)
    .join(", ");

/**
 * Read once at call time rather than cached: a user can flip the OS setting
 * mid-session, and a cached value would leave them with motion they just
 * asked to stop.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Stagger delay for a feed item, flattened under reduced motion. */
export const staggerDelayMs = (index: number): number => {
  if (prefersReducedMotion() || index >= BUILDER_STAGGER_MAX_ITEMS) return 0;
  return index * BUILDER_STAGGER_MS;
};

/**
 * Status colours, defined once so the session list and the session header
 * cannot drift into saying the same state two different ways. The type is
 * Carbon's own Tag union rather than `string`, which is what stops a typo'd
 * colour reaching the DOM as an unstyled tag.
 */
export type BuilderTagType = "blue" | "teal" | "purple" | "magenta" | "green" | "red" | "cool-gray";

export const BUILDER_STATUS_TAG_TYPE: Record<string, BuilderTagType> = {
  INTERVIEWING: "blue",
  PRD_READY: "teal",
  BUILDING: "purple",
  // Magenta, not a warning colour: waiting on a person is a normal turn in the
  // conversation, not a fault, and colouring it as one would make every pause
  // read as something going wrong.
  WAITING_FOR_INPUT: "magenta",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "cool-gray",
};

/**
 * The agent's visible state. This drives the avatar, the header line and
 * which (if any) motion is running — one enum so those three can never
 * disagree about what the agent is doing.
 */
export type BuilderAgentState =
  | "idle"
  | "listening"
  | "thinking"
  | "researching"
  | "coding"
  | "testing"
  | "verifying"
  | "waitingForYou"
  | "celebrating"
  | "stopped";

/**
 * Copy for each state, in the agent's voice: first person, present tense,
 * specific. "Thinking…" is a spinner with a label; "Working out what to ask
 * next" tells the admin what the pause is for.
 *
 * `animated: false` states are the honest-idle ones — the agent is not doing
 * anything, and the interface says so by holding still.
 */
export const BUILDER_AGENT_STATE_COPY: Record<
  BuilderAgentState,
  { label: string; animated: boolean }
> = {
  idle: { label: "Ready when you are", animated: false },
  listening: { label: "Reading your answer", animated: true },
  thinking: { label: "Working out what to ask next", animated: true },
  researching: { label: "Looking through the codebase", animated: true },
  coding: { label: "Writing code", animated: true },
  testing: { label: "Running tests", animated: true },
  verifying: { label: "Checking its own work", animated: true },
  waitingForYou: { label: "Waiting on your answer", animated: false },
  celebrating: { label: "Pull requests are open", animated: true },
  stopped: { label: "Stopped", animated: false },
};
