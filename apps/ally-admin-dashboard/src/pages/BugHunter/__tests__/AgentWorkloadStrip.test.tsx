import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BugFinding, BugFindingStatus } from "@types";

import { AgentWorkloadStrip } from "../AgentWorkloadStrip";

// Same treatment as Login.test.tsx: real framer-motion timing isn't what this
// suite is about, and a plain pass-through keeps the assertions deterministic
// while preserving the one thing under test — that a `key` change on the
// value forces React to remount the wrapper rather than patch it in place.
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useReducedMotion: () => false,
}));

const finding = (status: BugFindingStatus, id: string): BugFinding => ({
  id,
  runId: null,
  repo: "ally-be",
  source: "test_failure" as BugFinding["source"],
  title: "x",
  description: "x",
  file: null,
  evidence: null,
  severity: null,
  proven: false,
  touchesGuardedPath: false,
  reportedBugId: null,
  status,
  prUrl: null,
  escalationQuestion: null,
  escalationAnswer: null,
  escalationAnsweredBy: null,
  escalationAnsweredAt: null,
  decidedBy: null,
  decidedAt: null,
  sessionRunUrl: null,
  releaseTag: null,
  releaseRunUrl: null,
  releasedBy: null,
  releasedAt: null,
  createdAt: "2026-08-17",
  updatedAt: "2026-08-17",
});

describe("AgentWorkloadStrip — flash on change", () => {
  it("remounts the value's flash wrapper when the count changes, so a poll registers as an event rather than a silent re-render", () => {
    const twoInFlight = [
      finding(BugFindingStatus.FIXING, "f-1"),
      finding(BugFindingStatus.FIXING, "f-2"),
    ];
    const { rerender } = render(<AgentWorkloadStrip findings={twoInFlight} />);

    const before = screen.getByText("2");
    expect(before).toBeInTheDocument();

    const fourInFlight = [
      ...twoInFlight,
      finding(BugFindingStatus.FIXING, "f-3"),
      finding(BugFindingStatus.FIXING, "f-4"),
    ];
    rerender(<AgentWorkloadStrip findings={fourInFlight} />);

    const after = screen.getByText("4");
    expect(after).toBeInTheDocument();
    // Not just the same node with new text: a genuinely different DOM node,
    // which only happens because `key={tile.value}` forced React to tear the
    // old one down rather than patch its text content in place.
    expect(after).not.toBe(before);
  });

  it("does not remount when re-rendered with the same counts", () => {
    const twoInFlight = [
      finding(BugFindingStatus.FIXING, "f-1"),
      finding(BugFindingStatus.FIXING, "f-2"),
    ];
    const { rerender } = render(<AgentWorkloadStrip findings={twoInFlight} />);

    const before = screen.getByText("2");
    rerender(<AgentWorkloadStrip findings={twoInFlight} />);
    const after = screen.getByText("2");

    expect(after).toBe(before);
  });
});
