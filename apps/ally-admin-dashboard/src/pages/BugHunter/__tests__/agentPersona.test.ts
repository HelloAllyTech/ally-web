import { describe, expect, it, vi } from "vitest";

// The strings come from the real `en`, and importing @constants pulls the
// @components barrel at module-eval time (it reads `cellTypes` back off it).
// Stubbing that keeps this pure-logic file from dragging in the component tree
// and the Redux store behind it — same treatment the page suites use.
vi.mock("@components", () => ({ cellTypes: {} }));

import { BugFinding, BugFindingStatus, BugHunterMode, BugHuntRun, BugHuntRunStatus } from "@types";

import { deriveAgentStatus, summariseWorkload } from "../agentPersona";

const finding = (status: BugFindingStatus, overrides: Partial<BugFinding> = {}): BugFinding =>
  ({ id: `f-${status}-${Math.random()}`, status, ...overrides }) as BugFinding;

const liveRun = (repo = "ally-be"): BugHuntRun =>
  ({ id: "run-1", repo, status: BugHuntRunStatus.RUNNING }) as BugHuntRun;

describe("deriveAgentStatus", () => {
  it("reports off duty before anything else, because nothing else can be happening", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.OFF,
      findings: [finding(BugFindingStatus.NEEDS_INPUT), finding(BugFindingStatus.FIXING)],
      liveRun: liveRun(),
    });

    expect(status.kind).toBe("off_duty");
  });

  it("does not treat a not-yet-loaded mode as off duty", () => {
    expect(deriveAgentStatus({ mode: undefined, findings: [] }).kind).not.toBe("off_duty");
  });

  // The one ordering decision that matters: work in flight continues on its
  // own, blocked work does not, so the blocked thing is what the pill says.
  it("leads with what is waiting on you, even while it is busy with something else", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.MANUAL,
      findings: [finding(BugFindingStatus.PENDING_APPROVAL), finding(BugFindingStatus.FIXING)],
      liveRun: liveRun(),
    });

    expect(status.kind).toBe("waiting_on_you");
    expect(status.detail).toContain("One bug is waiting on your call");
  });

  it("counts every kind of blocked bug together", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.PENDING_APPROVAL), finding(BugFindingStatus.NEEDS_INPUT)],
    });

    expect(status.detail).toContain("2 bugs are waiting on your call");
  });

  it("raises a red job above work in flight, but never above a decision it needs", () => {
    const withProblem = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.RELEASE_FAILED), finding(BugFindingStatus.FIXING)],
    });
    expect(withProblem.kind).toBe("problem");

    const alsoBlocked = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.RELEASE_FAILED), finding(BugFindingStatus.NEEDS_INPUT)],
    });
    expect(alsoBlocked.kind).toBe("waiting_on_you");
  });

  // Status is read off the work, not off whether anyone has cleared the inbox:
  // retrying a red release makes it stop being a problem immediately.
  it("stops reporting a problem once the red job is retried", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.RELEASING)],
    });

    expect(status.kind).toBe("working");
  });

  it("names the repo it is sweeping, which is the more specific thing to say", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.FIXING)],
      liveRun: liveRun("ally-web"),
    });

    expect(status.kind).toBe("working");
    expect(status.detail).toBe("I'm sweeping ally-web right now.");
  });

  it("still reports working from fixes alone, with no sweep running", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.FIXING), finding(BugFindingStatus.QUEUED)],
      liveRun: null,
    });

    expect(status.detail).toBe("I'm working on 2 fixes right now.");
  });

  it("is on shift when there is nothing outstanding, and says what it will do next", () => {
    const status = deriveAgentStatus({
      mode: BugHunterMode.AI,
      findings: [finding(BugFindingStatus.RELEASED), finding(BugFindingStatus.DISMISSED)],
    });

    expect(status.kind).toBe("on_shift");
    expect(status.detail).toContain("next sweep runs tonight");
  });

  it("mentions the approval step when idle in Manual mode, since that changes what happens next", () => {
    const status = deriveAgentStatus({ mode: BugHunterMode.MANUAL, findings: [] });
    expect(status.detail).toContain("check with you before I fix anything");
  });
});

describe("summariseWorkload", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");

  it("splits the desk into what it is doing, what is blocked, and what is in review", () => {
    const workload = summariseWorkload(
      [
        finding(BugFindingStatus.FIXING),
        finding(BugFindingStatus.COORDINATING),
        finding(BugFindingStatus.NEEDS_INPUT),
        finding(BugFindingStatus.PR_OPENED),
        finding(BugFindingStatus.MERGED),
        finding(BugFindingStatus.DISMISSED),
      ],
      now,
    );

    expect(workload).toMatchObject({ inFlight: 2, waitingOnYou: 1, inReview: 2 });
  });

  it("counts as shipped only what actually reached production inside the window", () => {
    const workload = summariseWorkload(
      [
        finding(BugFindingStatus.RELEASED, { releasedAt: "2026-08-15T00:00:00.000Z" }),
        // Released a fortnight ago: real, but not this week's work.
        finding(BugFindingStatus.RELEASED, { releasedAt: "2026-08-01T00:00:00.000Z" }),
        // Merged rather than released — not in front of users, so not shipped.
        finding(BugFindingStatus.MERGED, { releasedAt: null }),
        // Released by a build that never recorded when: counting it would put a
        // date-less row in a by-date tile.
        finding(BugFindingStatus.RELEASED, { releasedAt: null }),
      ],
      now,
    );

    expect(workload.shipped).toBe(1);
  });
});
