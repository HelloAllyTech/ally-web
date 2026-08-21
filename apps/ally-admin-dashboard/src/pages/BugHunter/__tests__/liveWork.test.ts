import { describe, expect, it } from "vitest";

import { BugFinding, BugFindingStatus, BugHuntEvent, BugHuntEventStage } from "@types";

import {
  inFlightIds,
  isInFlight,
  landedBucket,
  landedSince,
  latestEvent,
  LIVE_WORK_LANDED_LIMIT,
  LIVE_WORK_LINGER_MS,
  pruneLanded,
  sortedInFlight,
  visibleLanded,
} from "../liveWork";

const finding = (
  id: string,
  status: BugFindingStatus,
  updatedAt = "2026-08-21T12:00:00.000Z",
): BugFinding => ({ id, status, updatedAt, title: id }) as unknown as BugFinding;

const event = (stage: BugHuntEventStage, createdAt: string, summary = stage): BugHuntEvent =>
  ({ id: createdAt, stage, createdAt, summary }) as unknown as BugHuntEvent;

describe("isInFlight / inFlightIds", () => {
  it("counts exactly the four statuses Bug Hunter moves under its own steam", () => {
    const moving = [
      BugFindingStatus.QUEUED,
      BugFindingStatus.FIXING,
      BugFindingStatus.COORDINATING,
      BugFindingStatus.RELEASING,
    ];

    Object.values(BugFindingStatus).forEach(status => {
      expect(isInFlight(finding("a", status))).toBe(moving.includes(status));
    });
  });

  /**
   * The one classification worth pinning by name here. NEEDS_INPUT is a bug
   * mid-fix that stopped — it *looks* like work in progress and is the opposite:
   * nothing moves until a human answers. It belongs to `NeedsYouQueue`, and a
   * board that showed it as in-flight would be claiming to be working on
   * something it has downed tools on, which is voice rule 3.
   */
  it("does not treat a bug waiting on a human answer as in flight", () => {
    expect(isInFlight(finding("a", BugFindingStatus.NEEDS_INPUT))).toBe(false);
    expect(isInFlight(finding("a", BugFindingStatus.PENDING_APPROVAL))).toBe(false);
    expect(isInFlight(finding("a", BugFindingStatus.BLOCKED))).toBe(false);
  });

  it("collects in-flight ids and nothing else", () => {
    const ids = inFlightIds([
      finding("moving", BugFindingStatus.FIXING),
      finding("done", BugFindingStatus.MERGED),
    ]);

    expect([...ids]).toEqual(["moving"]);
  });
});

describe("sortedInFlight", () => {
  /**
   * The board's whole ordering claim: a bug climbs as it progresses, so the top
   * row is the one closest to being in front of users. Sorting by recency
   * instead would reshuffle on every poll and make a row moving mean nothing.
   */
  it("puts the bug furthest along the rail first", () => {
    const sorted = sortedInFlight([
      finding("queued", BugFindingStatus.QUEUED),
      finding("releasing", BugFindingStatus.RELEASING),
      finding("fixing", BugFindingStatus.FIXING),
    ]);

    expect(sorted.map(f => f.id)).toEqual(["releasing", "fixing", "queued"]);
  });

  it("breaks a tie on recency, then on id — so equal rows hold their place across polls", () => {
    const sorted = sortedInFlight([
      finding("b", BugFindingStatus.FIXING, "2026-08-21T12:00:00.000Z"),
      finding("a", BugFindingStatus.FIXING, "2026-08-21T12:00:00.000Z"),
      finding("newer", BugFindingStatus.FIXING, "2026-08-21T12:05:00.000Z"),
    ]);

    expect(sorted.map(f => f.id)).toEqual(["newer", "a", "b"]);
  });

  it("drops everything that is not in flight", () => {
    expect(
      sortedInFlight([
        finding("merged", BugFindingStatus.MERGED),
        finding("stopped", BugFindingStatus.NEEDS_INPUT),
      ]),
    ).toEqual([]);
  });
});

describe("landedSince", () => {
  /**
   * The property that keeps the board honest: landing is a change between two
   * observations, never a property of one response. A bug already merged when
   * the page opened did not finish while anyone was watching.
   */
  it("reports nothing for a bug that was never seen in flight", () => {
    expect(landedSince(new Set(), [finding("a", BugFindingStatus.MERGED)])).toEqual([]);
  });

  it("reports a bug that was in flight last look and is not now", () => {
    const landed = landedSince(new Set(["a"]), [finding("a", BugFindingStatus.MERGED)]);
    expect(landed.map(f => f.id)).toEqual(["a"]);
  });

  it("reports nothing for a bug still in flight, even if its status changed", () => {
    expect(landedSince(new Set(["a"]), [finding("a", BugFindingStatus.FIXING)])).toEqual([]);
    expect(landedSince(new Set(["a"]), [finding("a", BugFindingStatus.RELEASING)])).toEqual([]);
  });

  it("reports a landing into any bucket, not only a successful one", () => {
    [
      BugFindingStatus.PR_OPENED,
      BugFindingStatus.FAILED,
      BugFindingStatus.NEEDS_INPUT,
      BugFindingStatus.CANCELLED,
      BugFindingStatus.RELEASED,
    ].forEach(status => {
      expect(landedSince(new Set(["a"]), [finding("a", status)])).toHaveLength(1);
    });
  });
});

describe("pruneLanded", () => {
  const at = (observedAt: number, id = "a", status = BugFindingStatus.MERGED) => ({
    finding: finding(id, status),
    observedAt,
  });

  it("drops rows past the linger window and keeps the rest newest first", () => {
    const now = 100_000;
    const pruned = pruneLanded(
      [at(now - LIVE_WORK_LINGER_MS - 1, "expired"), at(now - 1_000, "recent"), at(now, "newest")],
      now,
    );

    expect(pruned.map(item => item.finding.id)).toEqual(["newest", "recent"]);
  });

  /**
   * A bug really can land twice inside one window: an attempt goes red, an
   * admin retries from the drawer, and the retry goes red too. Without the
   * dedupe the board shows one title twice under two snapshots, and React sees
   * a duplicate key.
   */
  it("keeps only the newest entry per bug", () => {
    const pruned = pruneLanded([at(1_000, "a"), at(2_000, "a"), at(1_500, "b")], 2_000);

    expect(pruned.map(item => item.finding.id)).toEqual(["a", "b"]);
    expect(pruned[0].observedAt).toBe(2_000);
  });

  it("caps the list, so a sweep landing twenty bugs at once does not become the page", () => {
    const many = Array.from({ length: 20 }, (_, index) => at(1_000 + index, `bug-${index}`));
    expect(pruneLanded(many, 1_020)).toHaveLength(LIVE_WORK_LANDED_LIMIT);
  });
});

describe("visibleLanded", () => {
  /**
   * MERGED lands a bug; pressing "Release to production" puts it straight back
   * in flight as RELEASING. Inside the linger window it is in both lists, and
   * the stale half would contradict the live half.
   */
  it("hides a landed row for a bug that is moving again", () => {
    const landed = [{ finding: finding("a", BugFindingStatus.MERGED), observedAt: 1_000 }];
    const inFlight = [finding("a", BugFindingStatus.RELEASING)];

    expect(visibleLanded(landed, inFlight)).toEqual([]);
    expect(visibleLanded(landed, [])).toHaveLength(1);
  });
});

describe("landedBucket", () => {
  it("reuses the page's own buckets rather than inventing outcome names", () => {
    expect(landedBucket(finding("a", BugFindingStatus.MERGED))).toBe("in_review");
    expect(landedBucket(finding("a", BugFindingStatus.RELEASED))).toBe("shipped");
    expect(landedBucket(finding("a", BugFindingStatus.FAILED))).toBe("problem");
    expect(landedBucket(finding("a", BugFindingStatus.NEEDS_INPUT))).toBe("needs_you");
    expect(landedBucket(finding("a", BugFindingStatus.CANCELLED))).toBe("closed");
  });
});

describe("latestEvent", () => {
  it("has nothing to report for a run that has not logged anything yet", () => {
    expect(latestEvent([])).toBeNull();
  });

  /**
   * The board prints this as "what I am doing this second", so trusting array
   * order would let it state a stale claim about live work as though it were
   * current.
   */
  it("picks the newest by timestamp, not the last in the array", () => {
    const newest = latestEvent([
      event(BugHuntEventStage.FINDER_RESULT, "2026-08-21T12:05:00.000Z"),
      event(BugHuntEventStage.VERIFY, "2026-08-21T12:01:00.000Z"),
    ]);

    expect(newest?.stage).toBe(BugHuntEventStage.FINDER_RESULT);
  });
});
