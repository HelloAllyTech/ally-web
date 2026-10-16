/**
 * Vitest resource caps for all runs, local and CI.
 *
 * Vitest defaults its fork pool to one worker per CPU core. On a 10-core dev
 * machine that is 10 Node processes each holding its own jsdom, and the admin
 * suite alone is ~290 files / ~5000 tests. One run is survivable; two
 * overlapping runs (or one alongside a Jest run in ally-be) exhausted a 16 GB
 * machine and took the editor down with it.
 *
 * So the cap lives in config, not in the command line: whoever types
 * `npx vitest run` — a person or an agent — gets the safe pool without having
 * to remember a flag.
 *
 * The admin suite has proven to be resource-intensive enough to exhaust CI
 * runners when uncapped, leading to hangs. The cap is now applied everywhere
 * by default.
 *
 * Overrides:
 *   VITEST_MAX_WORKERS=8   raise it on a machine with headroom
 *   VITEST_MAX_WORKERS=1   serialise, to debug a cross-file leak
 * Either applies in CI too, if a pipeline ever needs to pin the pool.
 */
const requested = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? "", 10);
const explicit = Number.isFinite(requested) && requested > 0 ? requested : null;

/** Resolved cap, or null to leave Vitest's own defaults in place. */
export const MAX_TEST_WORKERS = explicit ?? 4;

/**
 * Spread into a project's `test` block. Keeps file-level parallelism (the
 * reason the suite finishes in under a minute) but bounds how much of the
 * machine it may claim at once. Spreads to nothing in CI.
 */
export const testResourceLimits = MAX_TEST_WORKERS
  ? {
      maxWorkers: MAX_TEST_WORKERS,
      minWorkers: 1,
      poolOptions: {
        forks: { maxForks: MAX_TEST_WORKERS, minForks: 1 },
        threads: { maxThreads: MAX_TEST_WORKERS, minThreads: 1 },
      },
    }
  : {};
