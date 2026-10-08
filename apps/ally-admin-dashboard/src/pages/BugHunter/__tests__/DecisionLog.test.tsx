import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({
  useGetBugFindingDecisionsQuery: vi.fn(),
  useGetBugHuntRunDecisionsQuery: vi.fn(),
}));
vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@utils", () => ({ formatTimestamp: (d: string) => `at ${d}` }));

import { useGetBugFindingDecisionsQuery } from "@api";
import { BugHuntDecision } from "@types";

import {
  decisionApproach,
  decisionVetoLabel,
  formatDecisionPick,
  sortDecisions,
} from "../bugDecisionLabels";
import { DecisionLogList, FindingDecisions } from "../DecisionLog";

const decision = (over: Partial<BugHuntDecision>): BugHuntDecision => ({
  id: "d",
  runId: null,
  findingId: "f-1",
  repo: "ally-web",
  point: "D5",
  owner: "model",
  menu: ["fix", "ask_human"],
  pick: "fix",
  shadowOwner: "rule",
  shadowPick: "fix",
  reason: "verified and cheap",
  inputs: null,
  model: "gemini-2.5-flash",
  outcome: null,
  createdAt: "2026-10-08T10:00:00Z",
  ...over,
});

describe("bugDecisionLabels", () => {
  it("formats a pick as one short string whatever its shape", () => {
    expect(formatDecisionPick(["tests", "code_review"])).toBe("tests, code_review");
    expect(formatDecisionPick({ engine: "gemini", model: "gemini-2.5-pro", approach: "x" })).toBe(
      "gemini · gemini-2.5-pro",
    );
    expect(formatDecisionPick("retry_fix")).toBe("retry_fix");
    expect(formatDecisionPick(null)).toBe("—");
    expect(formatDecisionPick([])).toBe("—");
  });

  it("reads the D6 approach and a veto, and sorts oldest first", () => {
    const d6 = decision({
      point: "D6",
      pick: { engine: "gemini", model: "gemini-2.5-pro", approach: "Add the keys." },
    });
    expect(decisionApproach(d6)).toBe("Add the keys.");
    expect(decisionApproach(decision({}))).toBeNull();
    expect(
      decisionVetoLabel(
        decision({ inputs: { veto: { by: "budget", reason: "2 of 2 sessions used" } } }),
      ),
    ).toBe("veto (budget): 2 of 2 sessions used");
    expect(decisionVetoLabel(decision({}))).toBeNull();
    expect(
      sortDecisions([
        decision({ id: "b", createdAt: "2026-10-08T11:00:00Z" }),
        decision({ id: "a", createdAt: "2026-10-08T10:00:00Z" }),
      ]).map(d => d.id),
    ).toEqual(["a", "b"]);
  });
});

describe("DecisionLogList", () => {
  it("shows the pick, who owned it, the pick not taken, a veto and the approach", () => {
    render(
      <DecisionLogList
        decisions={[
          decision({
            id: "d7",
            point: "D7",
            owner: "rule",
            pick: "retry_fix",
            shadowOwner: "model",
            shadowPick: "escalate_model",
            reason: "Rule-owned point; the model shadows.",
            outcome: "worse",
          }),
          decision({
            id: "d6",
            point: "D6",
            pick: { engine: "gemini", model: "gemini-2.5-pro", approach: "Add the four keys." },
            shadowPick: { engine: "gemini", model: "gemini-2.5-flash" },
          }),
          decision({
            id: "d5",
            owner: "rule",
            pick: "ask_human",
            shadowPick: null,
            inputs: { veto: { by: "mode", reason: "MANUAL mode" } },
            reason: "Veto (mode): MANUAL mode",
          }),
        ]}
      />,
    );
    const d7 = screen.getByTestId("decision-D7");
    expect(d7).toHaveTextContent("D7");
    expect(d7).toHaveTextContent("retry, escalate or ask");
    expect(d7).toHaveTextContent("retry_fix");
    expect(d7).toHaveTextContent("by the rule");
    expect(d7).toHaveTextContent("the model would have: escalate_model");
    expect(d7).toHaveTextContent("turned out badly");
    expect(d7).toHaveTextContent("at 2026-10-08T10:00:00Z");

    const d6 = screen.getByTestId("decision-D6");
    expect(d6).toHaveTextContent("gemini · gemini-2.5-pro");
    expect(d6).toHaveTextContent("Approach: Add the four keys.");

    const d5 = screen.getByTestId("decision-D5");
    expect(d5).toHaveTextContent("veto (mode): MANUAL mode");
    // the veto line replaces the reason, which would repeat it
    expect(d5.textContent?.match(/MANUAL mode/g)?.length).toBe(1);
  });

  it("says when both owners agreed, and renders an empty line for nothing", () => {
    render(<DecisionLogList decisions={[decision({})]} />);
    expect(screen.getByTestId("decision-D5")).toHaveTextContent("both agreed");
    const { container } = render(<DecisionLogList decisions={[]} />);
    expect(container).toHaveTextContent("No decisions recorded yet.");
  });
});

describe("FindingDecisions", () => {
  it("renders nothing until there is a decision, then a titled log", () => {
    vi.mocked(useGetBugFindingDecisionsQuery).mockReturnValue({
      data: [],
      isError: false,
    } as never);
    const { container, rerender } = render(<FindingDecisions findingId="f-1" />);
    expect(container).toBeEmptyDOMElement();

    vi.mocked(useGetBugFindingDecisionsQuery).mockReturnValue({
      data: [decision({})],
      isError: false,
    } as never);
    rerender(<FindingDecisions findingId="f-1" />);
    expect(screen.getByTestId("finding-decisions")).toHaveTextContent("How I decided");
    expect(screen.getByTestId("decision-log")).toBeInTheDocument();
  });
});
