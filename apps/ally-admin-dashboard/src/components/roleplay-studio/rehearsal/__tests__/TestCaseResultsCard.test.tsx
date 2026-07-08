import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoleplayRehearsalTestCaseSnapshot,
  RoleplayTestCaseResult,
} from "@src/types/roleplayStudio";

import { TestCaseResultsCard } from "../TestCaseResultsCard";

const SNAPSHOTS: RoleplayRehearsalTestCaseSnapshot[] = [
  { id: "case-a", title: "Self-harm disclosure", condition: "c1", test: "t1" },
  { id: "case-b", title: "Boundary push", condition: "c2", test: "t2" },
  { id: "case-c", title: "Pricing question", condition: "c3", test: "t3" },
];

const RESULTS: RoleplayTestCaseResult[] = [
  {
    test_case_id: "case-a",
    title: "Self-harm disclosure",
    verdict: "PASSED",
    condition_recreated: true,
    evidence: "[turn 3] trainee: I hear how much pain you're in.",
    reasoning: "The AI client acknowledged without minimizing.",
  },
  {
    test_case_id: "case-b",
    verdict: "FAILED",
    condition_recreated: true,
    evidence: "[turn 5] client: sure, here's my number.",
    reasoning: "The AI client shared personal contact details.",
  },
  {
    test_case_id: "case-c",
    verdict: "INCONCLUSIVE",
    condition_recreated: false,
    evidence: "",
    reasoning: "The pricing topic never came up.",
  },
];

describe("TestCaseResultsCard", () => {
  it("renders nothing for an empty result list", () => {
    const { container } = render(<TestCaseResultsCard results={[]} testCases={SNAPSHOTS} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders one verdict badge per case with the mapped labels", () => {
    render(<TestCaseResultsCard results={RESULTS} testCases={SNAPSHOTS} />);

    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Inconclusive")).toBeInTheDocument();
  });

  it("computes the passed summary over all verdicts (INCONCLUSIVE counts in the denominator)", () => {
    render(<TestCaseResultsCard results={RESULTS} testCases={SNAPSHOTS} />);

    expect(screen.getByText("1/3 passed")).toBeInTheDocument();
  });

  it("titles rows from result.title, then the snapshot, then the raw id", () => {
    const results: RoleplayTestCaseResult[] = [
      { test_case_id: "case-a", title: "Result title wins", verdict: "PASSED" },
      { test_case_id: "case-b", verdict: "FAILED" },
      { test_case_id: "case-unknown", verdict: "FAILED" },
    ];
    render(<TestCaseResultsCard results={results} testCases={SNAPSHOTS} />);

    expect(screen.getByText("Result title wins")).toBeInTheDocument();
    expect(screen.getByText("Boundary push")).toBeInTheDocument();
    expect(screen.getByText("case-unknown")).toBeInTheDocument();
  });

  it("exposes evidence and reasoning inside the expander", () => {
    render(<TestCaseResultsCard results={RESULTS} testCases={SNAPSHOTS} />);

    const row = screen.getByTestId("test-case-result-case-a");
    fireEvent.click(within(row).getByText("Evidence / Reasoning"));

    expect(
      within(row).getByText("[turn 3] trainee: I hear how much pain you're in."),
    ).toBeInTheDocument();
    expect(
      within(row).getByText("The AI client acknowledged without minimizing."),
    ).toBeInTheDocument();
  });

  it("invokes onViewTranscript with the case id", () => {
    const onViewTranscript = vi.fn();
    render(
      <TestCaseResultsCard
        results={RESULTS}
        testCases={SNAPSHOTS}
        onViewTranscript={onViewTranscript}
      />,
    );

    const row = screen.getByTestId("test-case-result-case-b");
    fireEvent.click(within(row).getByText("View transcript"));

    expect(onViewTranscript).toHaveBeenCalledWith("case-b");
  });

  it("hides the view-transcript action when no callback is provided", () => {
    render(<TestCaseResultsCard results={RESULTS} testCases={SNAPSHOTS} />);

    expect(screen.queryByText("View transcript")).not.toBeInTheDocument();
  });

  it("renders the inconclusive hint only on INCONCLUSIVE rows", () => {
    render(<TestCaseResultsCard results={RESULTS} testCases={SNAPSHOTS} />);

    const hints = screen.getAllByText(
      "The condition was never recreated in the session, so the test could not be evaluated.",
    );
    expect(hints).toHaveLength(1);
    expect(screen.getByTestId("test-case-result-case-c")).toContainElement(hints[0]);
  });
});
