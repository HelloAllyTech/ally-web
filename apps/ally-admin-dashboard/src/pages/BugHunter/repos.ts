/**
 * The five repos Bug Hunter works on. Mirrors ally-be's `BUG_HUNT_REPOS`, which
 * remains the authority — it rejects anything not in its own map, so a drift
 * here surfaces as a clear 400 rather than a silent misfire. Held as a literal
 * rather than fetched because it changes about once a year.
 *
 * Lived in `SweepPanel` until the on-demand sweep control came off the page
 * (2026-10-01, sweeps are scheduled only); the notebook's repo filter is what
 * still needs it.
 */
export const BUG_HUNTER_REPOS = [
  "ally-be",
  "ally-web",
  "ally-ai",
  "ally-ai-learn",
  "ally-mobile",
] as const;
