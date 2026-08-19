import { BugFinding, BugFindingStatus } from "@types";

/**
 * The seventeen `BugFindingStatus` values, collapsed into the seven groups an
 * admin actually scans for.
 *
 * Seventeen statuses is the right resolution for the backend's transition map
 * and the wrong resolution for a filter: the old flat `<Select>` listed all of
 * them alphabetically-by-enum, so "Pending approval" (a bug stopped dead
 * waiting on a human) sat between "New" and "Approved" with nothing to say it
 * mattered more. A reader looking for their own unfinished work had to know
 * which four of seventeen names meant "you". These groups encode that
 * knowledge once, here, instead of in each reader's head.
 *
 * ## Why the groups are shaped this way
 *
 * The split is by **who the next move belongs to**, not by how far along the
 * pipeline a bug is — `PipelineRail` already covers distance travelled. A bug
 * at PR_OPENED and a bug at MERGED are three stages apart on the rail and the
 * same thing to an admin scanning this page: a written fix that nobody has put
 * in front of users yet. Whereas NEEDS_INPUT and FIXING are one stage apart on
 * the rail and opposite in every way that matters here — one is blocked on you,
 * the other is blocked on nobody.
 *
 * ## This module owns the status groups for the whole page
 *
 * The four arrays below were previously private to `agentPersona.ts`, which
 * imports them from here now. Two copies of "which statuses mean waiting on a
 * human" is how the status pill and the workload tile end up disagreeing about
 * the same number, on the same card, in the same render.
 *
 * Deliberately imports `@types` and nothing else — no `@constants`, so there
 * are no user-facing strings here at all. `agentPersona.ts`'s docblock records
 * why: a module that page components import must not read `@constants` at
 * module-eval time, and a top-level `Record<LifecycleBucket, string>` of
 * labels is exactly that mistake. The chip labels live in
 * `LifecycleBucketChips`, which is a component and can read `en` freely.
 */
export type LifecycleBucket =
  /** A decision is blocked on a human. Nothing moves until someone clicks. */
  | "needs_you"
  /** Its last job went red. A human decides whether to retry. */
  | "problem"
  /** Recorded and accepted, but its turn hasn't come round yet. */
  | "queued"
  /** Bug Hunter is moving this one right now. */
  | "in_flight"
  /** A fix exists and is written, but users don't have it yet. */
  | "in_review"
  /** In production. Users have it. */
  | "shipped"
  /** Off the board — dismissed, rejected, or a session a human stopped. */
  | "closed";

/**
 * Chip order, and the order the buckets are counted in.
 *
 * Front-loaded by whose move it is: the two groups that represent a human's
 * own unfinished work come first, then the agent's own work in the order it
 * flows, then the two terminal groups. A reader who only ever looks at the
 * first two chips is reading the right two.
 */
export const LIFECYCLE_BUCKETS: LifecycleBucket[] = [
  "needs_you",
  "problem",
  "queued",
  "in_flight",
  "in_review",
  "shipped",
  "closed",
];

/** Findings that have stopped and are waiting on a person. */
export const WAITING_ON_YOU_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.PENDING_APPROVAL,
  BugFindingStatus.NEEDS_INPUT,
];

/** Findings whose last job went red. */
export const PROBLEM_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.FAILED,
  BugFindingStatus.RELEASE_FAILED,
];

/** Findings Bug Hunter is actively moving right now. */
export const IN_FLIGHT_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.QUEUED,
  BugFindingStatus.FIXING,
  BugFindingStatus.COORDINATING,
  BugFindingStatus.RELEASING,
];

/** Merged or in review — done with, but not yet in front of users. */
export const IN_REVIEW_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.PR_OPENED,
  BugFindingStatus.MERGED,
];

/**
 * Recorded, and nobody is blocked — it simply hasn't been picked up.
 *
 * BLOCKED belongs here rather than in `in_flight` despite naming a real wait:
 * what it waits on is an earlier repo in its own multi-repo plan, which is
 * Bug Hunter's problem and not a human's. Its label ("Waiting its turn") says
 * so, and putting it under `needs_you` would be the one mistake this whole
 * module exists to prevent.
 */
export const QUEUED_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.NEW,
  BugFindingStatus.APPROVED,
  BugFindingStatus.BLOCKED,
];

/**
 * Terminal, and not a failure.
 *
 * CANCELLED sits here rather than under `problem` for the same reason
 * `BugFindingStatusBadge` gives it the neutral grey instead of the red: a
 * human stopped it on purpose. It is still offerable for a retry from the
 * drawer, which is where that decision has enough context to be made.
 */
export const CLOSED_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.DISMISSED,
  BugFindingStatus.REJECTED,
  BugFindingStatus.CANCELLED,
];

/**
 * Which bucket a status belongs to.
 *
 * Written as an exhaustive `switch` on purpose rather than as a lookup built
 * from the arrays above: `noFallthroughCasesInSwitch` plus the `never` return
 * makes adding an eighteenth status a compile error here, which is the one
 * place a new status has to be classified. A `Record` would have needed the
 * same discipline; a `.includes()` chain would have silently swallowed it.
 */
export const bucketOfStatus = (status: BugFindingStatus): LifecycleBucket => {
  switch (status) {
    case BugFindingStatus.PENDING_APPROVAL:
    case BugFindingStatus.NEEDS_INPUT:
      return "needs_you";

    case BugFindingStatus.FAILED:
    case BugFindingStatus.RELEASE_FAILED:
      return "problem";

    case BugFindingStatus.NEW:
    case BugFindingStatus.APPROVED:
    case BugFindingStatus.BLOCKED:
      return "queued";

    case BugFindingStatus.QUEUED:
    case BugFindingStatus.FIXING:
    case BugFindingStatus.COORDINATING:
    case BugFindingStatus.RELEASING:
      return "in_flight";

    case BugFindingStatus.PR_OPENED:
    case BugFindingStatus.MERGED:
      return "in_review";

    case BugFindingStatus.RELEASED:
      return "shipped";

    case BugFindingStatus.DISMISSED:
    case BugFindingStatus.REJECTED:
    case BugFindingStatus.CANCELLED:
      return "closed";
  }
};

/** Every status in a bucket — what the table sends as a filter, and what the tests assert against. */
export const statusesInBucket = (bucket: LifecycleBucket): BugFindingStatus[] =>
  Object.values(BugFindingStatus).filter(status => bucketOfStatus(status) === bucket);

export type BucketCounts = Record<LifecycleBucket, number>;

/** Zeroed counts, so a caller can render a stable chip row before any data lands. */
export const emptyBucketCounts = (): BucketCounts =>
  LIFECYCLE_BUCKETS.reduce((counts, bucket) => {
    counts[bucket] = 0;
    return counts;
  }, {} as BucketCounts);

/**
 * How many findings sit in each bucket.
 *
 * One pass, and every finding lands in exactly one bucket — so the chips sum
 * to the list length and a reader can trust the row as a breakdown rather than
 * as seven unrelated numbers. That property is what the old strip could not
 * offer: its four tiles counted overlapping-in-principle sets out of a
 * hundred-row window and summed to less than the total, with a footnote
 * apologising for it.
 */
export const countByBucket = (findings: BugFinding[]): BucketCounts => {
  const counts = emptyBucketCounts();
  findings.forEach(finding => {
    counts[bucketOfStatus(finding.status)] += 1;
  });
  return counts;
};

/**
 * The buckets whose next move belongs to a human.
 *
 * `needs_you` and `problem` are separate buckets because they need separate
 * words — "waiting on your call" and "went red" are different things to be
 * told — but they are one question when the page asks "is there anything for
 * me here?", and this is that question.
 */
export const ACTIONABLE_BUCKETS: LifecycleBucket[] = ["needs_you", "problem"];

export const isActionableBucket = (bucket: LifecycleBucket): boolean =>
  ACTIONABLE_BUCKETS.includes(bucket);

/** Findings whose next move belongs to a human, newest first — what `NeedsYouQueue` renders. */
export const actionableFindings = (findings: BugFinding[]): BugFinding[] =>
  findings
    .filter(finding => isActionableBucket(bucketOfStatus(finding.status)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
