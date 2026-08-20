import { BUG_FINDING_FIX_SESSION_START_STATUSES, BugFinding, BugFindingStatus } from "@types";

import { bucketOfStatus } from "./lifecycleBucket";

/**
 * Which decisions are legal on a given bug, and how old it is — the rules the
 * row-level quick actions, the keyboard shortcuts and the bulk bar all consult
 * so they can never offer a button the backend will refuse.
 *
 * ## Why the eligibility rules live here rather than in the drawer
 *
 * The drawer already knew them, implicitly, by rendering a button inside a
 * status check. That was fine while the drawer was the only way to act on a
 * bug. It stopped being fine the moment three surfaces could act on one:
 * a row's quick actions, a keyboard shortcut on the focused row, and a bulk
 * operation over a selection. Three copies of "approve is only legal from
 * PENDING_APPROVAL" is how a button that 403s ships.
 *
 * The rules mirror ally-be's `BugFindingService`, which is the authority:
 *
 * - `approve` throws `ForbiddenException` from anything but `PENDING_APPROVAL`.
 * - `reject` accepts `NEW` *or* `PENDING_APPROVAL` — a wider door than approve,
 *   because dismissing something the finder just reported never needed a
 *   human's approval first.
 * - `startFixSession` accepts the seven statuses in
 *   `BUG_FINDING_FIX_SESSION_START_STATUSES`, which `@types` already mirrors.
 *
 * That asymmetry between approve and reject is not a detail: with the kill
 * switch on "Checks with you", a night's sweep lands every finding at
 * `PENDING_APPROVAL` and both actions apply — but bugs a human reported arrive
 * at `NEW`, where only reject does. A bulk bar that offered "Approve 52" over a
 * selection of `NEW` findings would fire 52 requests and fail 52 times.
 */

export type TriageAction = "approve" | "reject" | "fix";

/** Legal from PENDING_APPROVAL only — see ally-be `BugFindingService.approve`. */
export const canApprove = (status: BugFindingStatus): boolean =>
  status === BugFindingStatus.PENDING_APPROVAL;

/** Legal from NEW or PENDING_APPROVAL — see ally-be `BugFindingService.reject`. */
export const canReject = (status: BugFindingStatus): boolean =>
  status === BugFindingStatus.NEW || status === BugFindingStatus.PENDING_APPROVAL;

/**
 * Legal from the seven start statuses. A finding with no `repo` is excluded
 * from *bulk* fixes even when its status allows one: the backend needs a repo,
 * and the drawer asks the admin to pick one in a confirm dialog. There is no
 * sensible way to ask that question once for a mixed selection, so those bugs
 * stay a one-at-a-time job and `bulkEligible` says so.
 */
export const canStartFixSession = (status: BugFindingStatus): boolean =>
  BUG_FINDING_FIX_SESSION_START_STATUSES.includes(status);

export const canAct = (action: TriageAction, finding: BugFinding): boolean => {
  switch (action) {
    case "approve":
      return canApprove(finding.status);
    case "reject":
      return canReject(finding.status);
    case "fix":
      return canStartFixSession(finding.status);
  }
};

/**
 * Whether an action can be applied to a bug *as part of a selection*.
 *
 * Stricter than `canAct` for `fix` alone, and only because of the repo
 * question above. Kept as a separate predicate rather than a flag on `canAct`
 * so a row's own button and the bulk bar cannot drift: the row offers "Put me
 * on it" for a repo-less bug (the drawer will ask), the bulk bar does not.
 */
export const bulkEligible = (action: TriageAction, finding: BugFinding): boolean =>
  action === "fix" ? canAct(action, finding) && !!finding.repo : canAct(action, finding);

/** The subset of a selection an action would actually apply to. */
export const eligibleFor = (action: TriageAction, findings: BugFinding[]): BugFinding[] =>
  findings.filter(finding => bulkEligible(action, finding));

/**
 * What a bulk run did, once every request has settled.
 *
 * Partial failure is the normal case, not the exception: a selection made
 * fifteen seconds ago can contain a bug whose status has since moved on, and
 * that one request 403s while the other nineteen succeed. So the shape reports
 * both halves and the UI states both — "Approved 19. 1 couldn't be approved."
 * A bulk action that reported only a success count would leave a reader
 * believing all twenty landed.
 */
export interface BulkOutcome {
  succeeded: number;
  failed: number;
  /** Titles of the bugs that failed, for a message that names them rather than counting them. */
  failedTitles: string[];
}

/** How many failed titles a message will name before it starts counting instead. */
export const MAX_NAMED_FAILURES = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How stale a bug is. Only ever shown for bugs nobody has acted on — see
 * `showsStaleness`.
 */
export type StalenessTier = "fresh" | "recent" | "stale" | "ancient";

/** Day boundaries between tiers. A week and a month, which is how people already talk about a backlog. */
export const STALENESS_DAYS = { stale: 7, ancient: 30 } as const;

export const ageInDays = (finding: BugFinding, now: number = Date.now()): number | null => {
  const created = new Date(finding.createdAt).getTime();
  if (!Number.isFinite(created)) return null;
  // Clamped at zero: a row dated slightly in the future (clock skew between the
  // API host and the browser) should read as "just now", not as negative age.
  return Math.max(0, (now - created) / MS_PER_DAY);
};

export const stalenessTier = (days: number): StalenessTier => {
  if (days >= STALENESS_DAYS.ancient) return "ancient";
  if (days >= STALENESS_DAYS.stale) return "stale";
  if (days >= 1) return "recent";
  return "fresh";
};

/**
 * Whether age is worth colouring for this bug at all.
 *
 * Only for bugs that are waiting on somebody: `needs_you`, `problem` and
 * `queued`. A bug that shipped three months ago is not "stale" — it is done,
 * and tinting it amber would teach a reader to ignore the tint, which is the
 * one thing a staleness signal cannot survive. Same argument as
 * `LifecycleBucketChips`' colour rule: quiet when normal, loud only when it
 * needs acting on.
 */
export const showsStaleness = (finding: BugFinding): boolean => {
  const bucket = bucketOfStatus(finding.status);
  return bucket === "needs_you" || bucket === "problem" || bucket === "queued";
};

/**
 * Compact relative age: "3h", "2d", "5w". Used in a table column where the
 * absolute date is already a hover away and the useful fact is the magnitude.
 *
 * Deliberately not `Intl.RelativeTimeFormat`, which produces "3 hours ago" —
 * three words in a column that has to stay narrow enough not to push the title
 * out. The unit letters are not translated here for the same reason the rest of
 * this tab's numbers aren't: the admin console is English-only.
 */
export const formatAge = (days: number): string => {
  if (days < 1 / 24) return "now";
  if (days < 1) return `${Math.floor(days * 24)}h`;
  if (days < 14) return `${Math.floor(days)}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
};
