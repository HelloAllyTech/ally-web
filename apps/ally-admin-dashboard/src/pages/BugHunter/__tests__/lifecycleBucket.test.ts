import { describe, expect, it } from "vitest";

import { BugFinding, BugFindingStatus } from "@types";

import {
  actionableFindings,
  bucketOfStatus,
  countByBucket,
  LIFECYCLE_BUCKETS,
  statusesInBucket,
} from "../lifecycleBucket";

const finding = (status: BugFindingStatus, id: string, createdAt = "2026-08-17"): BugFinding =>
  ({ id, status, createdAt, title: id, repo: null }) as unknown as BugFinding;

describe("bucketOfStatus", () => {
  /**
   * The property the whole chip row rests on. If a status fell through to no
   * bucket the chips would silently sum to less than the list — which is the
   * exact defect the four-tile workload strip had, and the reason it shipped
   * with a footnote apologising for its own arithmetic.
   */
  it("classifies every status, with no status in two buckets", () => {
    const statuses = Object.values(BugFindingStatus);
    const claimed = LIFECYCLE_BUCKETS.flatMap(statusesInBucket);

    expect(claimed).toHaveLength(statuses.length);
    expect(new Set(claimed).size).toBe(statuses.length);
    statuses.forEach(status => expect(LIFECYCLE_BUCKETS).toContain(bucketOfStatus(status)));
  });

  it("puts the two statuses that stop dead on a human decision under needs_you, and nothing else", () => {
    expect(statusesInBucket("needs_you").sort()).toEqual(
      [BugFindingStatus.PENDING_APPROVAL, BugFindingStatus.NEEDS_INPUT].sort(),
    );
  });

  // The one classification worth pinning by name. BLOCKED reads like a bug
  // waiting on a person and is not: it waits on an earlier repo in its own
  // multi-repo plan, which is Bug Hunter's problem. Filing it under needs_you
  // would put work in an admin's queue that they cannot do anything about.
  it("does not treat BLOCKED as waiting on a human", () => {
    expect(bucketOfStatus(BugFindingStatus.BLOCKED)).toBe("queued");
  });

  // Same reasoning as the neutral-grey badge it already gets: a human stopped
  // this on purpose, so it is not a red job to chase.
  it("treats a cancelled session as closed rather than as a problem", () => {
    expect(bucketOfStatus(BugFindingStatus.CANCELLED)).toBe("closed");
    expect(bucketOfStatus(BugFindingStatus.FAILED)).toBe("problem");
  });
});

describe("countByBucket", () => {
  it("sums to the number of findings, so the chip row reads as a breakdown", () => {
    const findings = [
      finding(BugFindingStatus.PENDING_APPROVAL, "a"),
      finding(BugFindingStatus.NEEDS_INPUT, "b"),
      finding(BugFindingStatus.FAILED, "c"),
      finding(BugFindingStatus.FIXING, "d"),
      finding(BugFindingStatus.MERGED, "e"),
      finding(BugFindingStatus.RELEASED, "f"),
      finding(BugFindingStatus.DISMISSED, "g"),
    ];

    const counts = countByBucket(findings);
    const total = LIFECYCLE_BUCKETS.reduce((sum, bucket) => sum + counts[bucket], 0);

    expect(total).toBe(findings.length);
    expect(counts.needs_you).toBe(2);
    expect(counts.problem).toBe(1);
  });

  it("reports zeroes rather than omitting empty buckets, so the chip row never reflows", () => {
    const counts = countByBucket([]);
    LIFECYCLE_BUCKETS.forEach(bucket => expect(counts[bucket]).toBe(0));
  });
});

describe("actionableFindings", () => {
  it("returns the bugs whose next move is a human's, newest first", () => {
    const findings = [
      finding(BugFindingStatus.FIXING, "ignored-in-flight"),
      finding(BugFindingStatus.PENDING_APPROVAL, "older", "2026-08-10"),
      finding(BugFindingStatus.RELEASED, "ignored-shipped"),
      finding(BugFindingStatus.RELEASE_FAILED, "newer", "2026-08-18"),
    ];

    expect(actionableFindings(findings).map(f => f.id)).toEqual(["newer", "older"]);
  });

  it("does not reorder the array it was given", () => {
    const findings = [
      finding(BugFindingStatus.PENDING_APPROVAL, "older", "2026-08-10"),
      finding(BugFindingStatus.PENDING_APPROVAL, "newer", "2026-08-18"),
    ];
    actionableFindings(findings);

    // `data.items` off an RTK Query cache entry is read by three other surfaces
    // in the same render; sorting it in place would reorder theirs too.
    expect(findings.map(f => f.id)).toEqual(["older", "newer"]);
  });
});
