import { describe, expect, it } from "vitest";

import { BugFindingStatus } from "@types";

import { stageFromFindingStatus } from "../pipelineStage";

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
