import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import roleplaySpecSlice from "@reducer/roleplaySpecReducer";

const { startRun, cancelRun } = vi.hoisted(() => ({
  startRun: vi.fn(),
  cancelRun: vi.fn(),
}));

// Two selectable cases + one already-completed condition report.
vi.mock("@api", () => ({
  useGetAgentTestCasesQuery: () => ({
    data: {
      data: [
        {
          id: "case-1",
          title: "Escalates on self-harm",
          type: "condition",
          tags: ["safety"],
          condition: "Learner discloses self-harm",
          test: "Actor escalates appropriately",
        },
        {
          id: "case-2",
          title: "Full session quality",
          type: "full_session",
          tags: [],
          rubrics: [{ criteria: "Empathy", scoringInstructions: "Score warmth 0-100" }],
        },
      ],
      count: 2,
    },
    isLoading: false,
  }),
  useGetRoleplayTestReportsQuery: () => ({
    data: {
      data: [
        {
          id: "report-1",
          runId: "run-1",
          runStatus: "COMPLETED",
          specVersionId: "version-1",
          versionNumber: 3,
          agentTestCaseId: "case-1",
          testCaseSnapshot: {
            id: "case-1",
            title: "Escalates on self-harm",
            type: "condition",
            tags: ["safety"],
          },
          status: "COMPLETED",
          verdict: "PASSED",
          createdAt: "2026-07-22T10:00:00.000Z",
        },
      ],
    },
    isLoading: false,
  }),
  // Imported by TestReportDetail (only rendered when a card is expanded).
  useGetRoleplayTestReportQuery: () => ({ data: undefined, isLoading: true, isError: false }),
  useStartRoleplayTestRunMutation: () => [startRun, { isLoading: false }],
  useCancelRoleplayTestRunMutation: () => [cancelRun, { isLoading: false }],
}));

// Keep the heavy components barrel out of the test; only Button is consumed
// (cellTypes is re-exported through @constants, so the mock must provide it).
vi.mock("@components", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  ),
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
    triggerConditions: "triggerConditions",
    timeInput: "timeInput",
    score: "score",
    textAreaWithDropdown: "textAreaWithDropdown",
    tags: "tags",
  },
}));

// The real @utils barrel pulls in @store (which needs the unmocked @api).
vi.mock("@utils", () => ({
  formatDate: (dateString: string) => dateString,
}));

import { ImproveDrawer } from "../ImproveDrawer";

const makeStore = () =>
  configureStore({
    reducer: { roleplaySpec: roleplaySpecSlice.reducer },
    preloadedState: {
      roleplaySpec: { ...roleplaySpecSlice.getInitialState(), specId: "spec-1" },
    },
  });

const renderDrawer = () =>
  render(
    <Provider store={makeStore()}>
      <ImproveDrawer
        open
        onClose={vi.fn()}
        onSaveDraft={vi.fn(async () => true)}
        onAutoImprove={vi.fn()}
      />
    </Provider>,
  );

describe("ImproveDrawer", () => {
  it("lists the agent test cases with their type badges", () => {
    renderDrawer();
    // case-1's title also appears on its report card below.
    expect(screen.getAllByText("Escalates on self-harm").length).toBeGreaterThan(0);
    expect(screen.getByText("Full session quality")).toBeInTheDocument();
    expect(screen.getByText("Full session")).toBeInTheDocument();
  });

  it("disables the run button with 0 selected and enables it after selecting a case", () => {
    renderDrawer();
    const runButton = screen.getByRole("button", { name: "Run test cases (0)" });
    expect(runButton).toBeDisabled();

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByRole("button", { name: "Run test cases (1)" })).not.toBeDisabled();
  });

  it("renders a completed condition report with a verdict pill", () => {
    renderDrawer();
    const pill = screen.getByTestId("verdict-pill");
    expect(pill).toHaveTextContent("Passed");
    // The completed report row also shows the pinned version.
    expect(screen.getByText("v3")).toBeInTheDocument();
  });
});
