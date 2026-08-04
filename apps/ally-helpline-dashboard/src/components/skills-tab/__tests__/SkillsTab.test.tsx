import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SkillsTab } from "../SkillsTab";

// Drive the two RTK Query hooks the component reads. Only these two are
// imported from @api by SkillsTab, so a narrow mock is enough.
const mockSkillsQuery = vi.hoisted(() => vi.fn());
const mockSummaryQuery = vi.hoisted(() => vi.fn());

vi.mock("@api", () => ({
  useGetSimulationSkillsQuery: mockSkillsQuery,
  useGetSimulationSummaryQuery: mockSummaryQuery,
}));

// A checklist-mode session with an empty skills payload — this is the exact
// shape from the reported bug (feedback sections shown, no skill coverage).
const checklistSummary = (summary: unknown) => ({
  data: {
    scenario: { metadata: { experienceMode: "CHECKLIST" } },
    details: { summary },
  },
});

const emptySkills = {
  data: { skillCoverage: [], emotionalMovement: [] },
  isLoading: false,
  isError: false,
};

describe("SkillsTab feedback states (checklist mode)", () => {
  beforeEach(() => {
    mockSkillsQuery.mockReset();
    mockSummaryQuery.mockReset();
    mockSkillsQuery.mockReturnValue(emptySkills);
  });

  it("shows 'Generating…' only while the summary is unsettled", () => {
    mockSummaryQuery.mockReturnValue(checklistSummary(null));
    render(<SkillsTab sessionId="s1" retryMaxReached={false} />);

    expect(screen.getAllByText("Generating your feedback…")).toHaveLength(2);
    expect(screen.queryByText(/No strengths were identified/)).not.toBeInTheDocument();
  });

  it("settles into an empty state once polling gives up with no feedback", () => {
    mockSummaryQuery.mockReturnValue(checklistSummary(null));
    render(<SkillsTab sessionId="s1" retryMaxReached={true} />);

    expect(screen.queryByText("Generating your feedback…")).not.toBeInTheDocument();
    expect(screen.getByText("No strengths were identified for this session")).toBeInTheDocument();
    expect(
      screen.getByText("No areas for growth were identified for this session"),
    ).toBeInTheDocument();
  });

  it("shows a failure message (not 'Generating…') when the summary errored", () => {
    mockSummaryQuery.mockReturnValue(
      checklistSummary({ errorMessage: "Session has no messages. No summary generated." }),
    );
    render(<SkillsTab sessionId="s1" retryMaxReached={false} />);

    expect(screen.queryByText("Generating your feedback…")).not.toBeInTheDocument();
    expect(screen.getAllByText("Feedback couldn't be generated for this session")).toHaveLength(2);
  });

  it("renders the feedback content when present", () => {
    mockSummaryQuery.mockReturnValue(
      checklistSummary({
        feedback: {
          positives: ["Built warm rapport"],
          areasOfGrowth: [
            { improvement: "Ask more open questions", recommendation: "Try 'tell me more…'" },
          ],
        },
      }),
    );
    render(<SkillsTab sessionId="s1" retryMaxReached={false} />);

    expect(screen.queryByText("Generating your feedback…")).not.toBeInTheDocument();
    expect(screen.getByText("Built warm rapport")).toBeInTheDocument();
    expect(screen.getByText("Ask more open questions")).toBeInTheDocument();
  });
});
