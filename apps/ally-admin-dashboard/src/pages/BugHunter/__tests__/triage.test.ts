import { describe, expect, it } from "vitest";

import { BUG_FINDING_FIX_SESSION_START_STATUSES, BugFinding, BugFindingStatus } from "@types";

import {
  ageInDays,
  bulkEligible,
  canAct,
  canApprove,
  canReject,
  canStartFixSession,
  eligibleFor,
  formatAge,
  showsStaleness,
  stalenessTier,
  STALENESS_DAYS,
} from "../triage";

const NOW = new Date("2026-08-20T12:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    status: BugFindingStatus.NEW,
    title: overrides.id,
    repo: "ally-be",
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  }) as BugFinding;

/**
 * The rules mirror ally-be's `BugFindingService`, which is the authority. These
 * tests are the guard on that mirror: a button offered where the backend throws
 * `ForbiddenException` is a 403 the reader sees as a broken page.
 */
describe("what ally-be will actually accept", () => {
  it("approves only from pending approval", () => {
    const approvable = Object.values(BugFindingStatus).filter(canApprove);
    expect(approvable).toEqual([BugFindingStatus.PENDING_APPROVAL]);
  });

  /**
   * A wider door than approve, and the asymmetry matters: a night's sweep lands
   * findings at PENDING_APPROVAL where both apply, but bugs a human reported
   * arrive at NEW where only reject does.
   */
  it("rejects from new as well as pending approval", () => {
    const rejectable = Object.values(BugFindingStatus).filter(canReject);
    expect(rejectable.sort()).toEqual([BugFindingStatus.NEW, BugFindingStatus.PENDING_APPROVAL].sort());
  });

  it("offers a fix session from exactly the statuses @types mirrors", () => {
    const startable = Object.values(BugFindingStatus).filter(canStartFixSession);
    expect(startable.sort()).toEqual([...BUG_FINDING_FIX_SESSION_START_STATUSES].sort());
  });

  it("never offers a decision on a bug that has already shipped", () => {
    const released = finding({ id: "a", status: BugFindingStatus.RELEASED });
    expect(canAct("approve", released)).toBe(false);
    expect(canAct("reject", released)).toBe(false);
    expect(canAct("fix", released)).toBe(false);
  });
});

describe("bulk eligibility", () => {
  /**
   * A repo-less bug needs the admin to pick a codebase in a confirm dialog, and
   * there is no sensible way to ask that once for a mixed selection — so it
   * stays a one-at-a-time job. The row still offers the button; the bulk bar
   * does not.
   */
  it("excludes a repo-less bug from a bulk fix but not from its own row button", () => {
    const orphan = finding({ id: "orphan", repo: null, status: BugFindingStatus.NEW });

    expect(canAct("fix", orphan)).toBe(true);
    expect(bulkEligible("fix", orphan)).toBe(false);
  });

  it("keeps the repo rule out of approve and reject, which never needed one", () => {
    const orphan = finding({ id: "orphan", repo: null, status: BugFindingStatus.PENDING_APPROVAL });
    expect(bulkEligible("approve", orphan)).toBe(true);
    expect(bulkEligible("reject", orphan)).toBe(true);
  });

  /**
   * The number each bulk button prints. A bar that offered "Approve 3" over a
   * selection where only one is pending would fire three requests and fail two.
   */
  it("narrows a mixed selection to the subset each action applies to", () => {
    const selection = [
      finding({ id: "new", status: BugFindingStatus.NEW }),
      finding({ id: "pending", status: BugFindingStatus.PENDING_APPROVAL }),
      finding({ id: "fixing", status: BugFindingStatus.FIXING }),
    ];

    expect(eligibleFor("approve", selection).map(f => f.id)).toEqual(["pending"]);
    expect(eligibleFor("reject", selection).map(f => f.id)).toEqual(["new", "pending"]);
  });
});

describe("age", () => {
  it("measures from createdAt", () => {
    const week = finding({ id: "a", createdAt: new Date(NOW - 7 * DAY).toISOString() });
    expect(ageInDays(week, NOW)).toBeCloseTo(7);
  });

  /** Clock skew between the API host and the browser must read as "just now", never as negative. */
  it("clamps a future timestamp to zero", () => {
    const future = finding({ id: "a", createdAt: new Date(NOW + 5 * DAY).toISOString() });
    expect(ageInDays(future, NOW)).toBe(0);
  });

  it("reports no age at all for an unparseable timestamp", () => {
    expect(ageInDays(finding({ id: "a", createdAt: "nonsense" }), NOW)).toBeNull();
  });

  it("tiers on a week and a month, which is how people talk about a backlog", () => {
    expect(stalenessTier(0.5)).toBe("fresh");
    expect(stalenessTier(3)).toBe("recent");
    expect(stalenessTier(STALENESS_DAYS.stale)).toBe("stale");
    expect(stalenessTier(STALENESS_DAYS.ancient)).toBe("ancient");
  });

  /**
   * A bug that shipped three months ago is not stale, it is finished — and
   * tinting it would teach a reader to ignore the tint, which is the one thing
   * a staleness signal cannot survive.
   */
  it("only colours bugs that are still waiting on somebody", () => {
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.PENDING_APPROVAL }))).toBe(true);
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.FAILED }))).toBe(true);
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.NEW }))).toBe(true);

    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.RELEASED }))).toBe(false);
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.MERGED }))).toBe(false);
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.FIXING }))).toBe(false);
    expect(showsStaleness(finding({ id: "a", status: BugFindingStatus.REJECTED }))).toBe(false);
  });

  /** Short enough not to push the title column out — the exact date is a hover away. */
  it("formats compactly", () => {
    expect(formatAge(0.001)).toBe("now");
    expect(formatAge(0.5)).toBe("12h");
    expect(formatAge(3)).toBe("3d");
    expect(formatAge(20)).toBe("2w");
    expect(formatAge(95)).toBe("3mo");
  });
});
