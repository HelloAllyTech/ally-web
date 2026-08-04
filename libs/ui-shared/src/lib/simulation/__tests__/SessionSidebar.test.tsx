import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";

import { SessionSidebar } from "../SessionSidebar";
import { ChecklistMode } from "../types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("../SessionProgress", () => ({
  SessionProgress: (props: any) => (
    <div data-testid="session-progress" data-hide-time-bar={String(!!props.hideTimeBar)} />
  ),
}));
vi.mock("../SessionChecklist", () => ({
  SessionChecklist: (props: any) => (
    <div data-testid="session-checklist" data-hide-header={String(!!props.hideHeader)} />
  ),
}));
vi.mock("../SimulationEvents", () => ({
  SimulationEvents: (props: any) => (
    <div data-testid="simulation-events" data-hide-header={String(!!props.hideHeader)} />
  ),
}));
vi.mock("../../rich-text-renderer", () => ({
  RichTextRenderer: ({ content }: any) => <div data-testid="rich-text-renderer">{content}</div>,
}));

const baseProps = {
  stateNames: [],
  difficultyLevel: "",
  score: 0,
  checklistMode: ChecklistMode.OFF,
  checklistItems: [],
  events: [],
};

describe("SessionSidebar", () => {
  it("renders nothing when there is no content at all", () => {
    const { container } = render(<SessionSidebar {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the state-name stepper (with the time bar hidden) whenever stateNames exist, regardless of active tab", () => {
    render(
      <SessionSidebar
        {...baseProps}
        stateNames={[{ name: "Resistive", stateId: "1" }]}
        reminders={["Stay calm"]}
      />,
    );

    const progress = screen.getByTestId("session-progress");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("data-hide-time-bar", "true");
  });

  it("defaults to Reminders, then Description, then Checklist, then Live, in priority order", () => {
    const { rerender } = render(
      <SessionSidebar
        {...baseProps}
        reminders={["Stay calm"]}
        description="A challenging caller"
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet" }]}
      />,
    );
    expect(screen.getByTestId("session-sidebar-reminders")).toBeInTheDocument();

    rerender(
      <SessionSidebar
        {...baseProps}
        description="A challenging caller"
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet" }]}
      />,
    );
    expect(screen.getByTestId("session-sidebar-description")).toBeInTheDocument();

    rerender(
      <SessionSidebar
        {...baseProps}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet" }]}
      />,
    );
    expect(screen.getByTestId("session-checklist")).toBeInTheDocument();

    rerender(
      <SessionSidebar
        {...baseProps}
        events={[{ score: 1, emoji: "🎯", message: "Nice", timestamp: new Date().toISOString() }]}
      />,
    );
    expect(screen.getByTestId("simulation-events")).toBeInTheDocument();
  });

  it("only shows tabs that have content", () => {
    render(<SessionSidebar {...baseProps} reminders={["Stay calm"]} />);

    expect(screen.getByTestId("session-sidebar-tab-reminders")).toBeInTheDocument();
    expect(screen.queryByTestId("session-sidebar-tab-description")).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-sidebar-tab-checklist")).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-sidebar-tab-live")).not.toBeInTheDocument();
  });

  it("switches tabs on click and passes hideHeader to Checklist/Live panes", () => {
    render(
      <SessionSidebar
        {...baseProps}
        reminders={["Stay calm"]}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet" }]}
      />,
    );

    expect(screen.getByTestId("session-sidebar-reminders")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("session-sidebar-tab-checklist"));
    expect(screen.queryByTestId("session-sidebar-reminders")).not.toBeInTheDocument();
    const checklist = screen.getByTestId("session-checklist");
    expect(checklist).toBeInTheDocument();
    expect(checklist).toHaveAttribute("data-hide-header", "true");
  });

  it("shows Checklist, never Live, when checklist mode is active (mutually exclusive)", () => {
    render(
      <SessionSidebar
        {...baseProps}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet" }]}
        events={[{ score: 1, emoji: "🎯", message: "Nice", timestamp: new Date().toISOString() }]}
      />,
    );

    expect(screen.getByTestId("session-sidebar-tab-checklist")).toBeInTheDocument();
    expect(screen.queryByTestId("session-sidebar-tab-live")).not.toBeInTheDocument();
  });
});
