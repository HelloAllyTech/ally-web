import { describe, expect, it } from "vitest";

import { BugFindingStatus, BugHuntEventStage } from "@types";

import { stageFromEventStage, stageFromFindingStatus } from "../pipelineStage";

describe("stageFromEventStage", () => {
  it("maps discovery events to scan", () => {
    expect(stageFromEventStage(BugHuntEventStage.FINDER_RESULT)).toBe("scan");
    expect(stageFromEventStage(BugHuntEventStage.SKIPPED_DISABLED)).toBe("scan");
  });

  it("maps the verify event to verify", () => {
    expect(stageFromEventStage(BugHuntEventStage.VERIFY)).toBe("verify");
  });

  it("maps every fix-session-lifecycle event to fix", () => {
    expect(stageFromEventStage(BugHuntEventStage.FIX_ATTEMPT)).toBe("fix");
    expect(stageFromEventStage(BugHuntEventStage.TEST_WRITTEN)).toBe("fix");
    expect(stageFromEventStage(BugHuntEventStage.DOC_UPDATED)).toBe("fix");
    expect(stageFromEventStage(BugHuntEventStage.SESSION_DISPATCHED)).toBe("fix");
    expect(stageFromEventStage(BugHuntEventStage.PLAN_CREATED)).toBe("fix");
    expect(stageFromEventStage(BugHuntEventStage.STEP_STARTED)).toBe("fix");
  });

  it("maps PR_OPENED to review", () => {
    expect(stageFromEventStage(BugHuntEventStage.PR_OPENED)).toBe("review");
  });

  it("maps MERGED to merged", () => {
    expect(stageFromEventStage(BugHuntEventStage.MERGED)).toBe("merged");
  });

  it("maps every release event to ship", () => {
    expect(stageFromEventStage(BugHuntEventStage.RELEASE_DISPATCHED)).toBe("ship");
    expect(stageFromEventStage(BugHuntEventStage.RELEASED)).toBe("ship");
    expect(stageFromEventStage(BugHuntEventStage.RELEASE_FAILED)).toBe("ship");
  });

  // These never represent forward progress; callers are expected to skip them
  // when picking "the latest event" and use them for the rail's error/waiting
  // overlay instead. The function still has to return something for them.
  it("falls back to scan for non-progression stages, which callers are expected to filter out first", () => {
    expect(stageFromEventStage(BugHuntEventStage.ERROR)).toBe("scan");
    expect(stageFromEventStage(BugHuntEventStage.ESCALATED)).toBe("scan");
    expect(stageFromEventStage(BugHuntEventStage.SETTINGS_CHANGED)).toBe("scan");
  });
});

describe("stageFromFindingStatus", () => {
  it("places pre-fix-stage statuses at verify, not scan — a finding can't exist without already having been scanned", () => {
    expect(stageFromFindingStatus(BugFindingStatus.NEW)).toBe("verify");
    expect(stageFromFindingStatus(BugFindingStatus.PENDING_APPROVAL)).toBe("verify");
    expect(stageFromFindingStatus(BugFindingStatus.APPROVED)).toBe("verify");
    expect(stageFromFindingStatus(BugFindingStatus.QUEUED)).toBe("verify");
    expect(stageFromFindingStatus(BugFindingStatus.BLOCKED)).toBe("verify");
  });

  it("places the active-fix statuses, including a failed attempt, at fix", () => {
    expect(stageFromFindingStatus(BugFindingStatus.COORDINATING)).toBe("fix");
    expect(stageFromFindingStatus(BugFindingStatus.FIXING)).toBe("fix");
    expect(stageFromFindingStatus(BugFindingStatus.NEEDS_INPUT)).toBe("fix");
    expect(stageFromFindingStatus(BugFindingStatus.FAILED)).toBe("fix");
  });

  it("places PR_OPENED at review and MERGED at merged", () => {
    expect(stageFromFindingStatus(BugFindingStatus.PR_OPENED)).toBe("review");
    expect(stageFromFindingStatus(BugFindingStatus.MERGED)).toBe("merged");
  });

  it("places every release status, including a failed release, at ship", () => {
    expect(stageFromFindingStatus(BugFindingStatus.RELEASING)).toBe("ship");
    expect(stageFromFindingStatus(BugFindingStatus.RELEASED)).toBe("ship");
    expect(stageFromFindingStatus(BugFindingStatus.RELEASE_FAILED)).toBe("ship");
  });

  it("treats dismissed/rejected as terminal off-ramps at verify, where that decision is actually made", () => {
    expect(stageFromFindingStatus(BugFindingStatus.DISMISSED)).toBe("verify");
    expect(stageFromFindingStatus(BugFindingStatus.REJECTED)).toBe("verify");
  });
});
