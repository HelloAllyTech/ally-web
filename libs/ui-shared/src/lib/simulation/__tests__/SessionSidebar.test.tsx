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
    expect(screen.queryByTestId("session-sidebar-tab-supervisor")).not.toBeInTheDocument();
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

  describe("Supervisor tab (live coaching notes)", () => {
    it("is absent when the roleplay has live notes switched off", () => {
      // Opt-in: notes arriving without the flag must not conjure a tab.
      render(
        <SessionSidebar
          {...baseProps}
          reminders={["Stay calm"]}
          supervisorNotes={[{ note: "Slow down.", seq: 1 }]}
        />,
      );

      expect(screen.queryByTestId("session-sidebar-tab-supervisor")).not.toBeInTheDocument();
    });

    it("shows with a calm empty state before any note arrives", () => {
      // The tab appears from the start of the session: its empty state is what
      // tells the learner a supervisor is watching at all.
      render(<SessionSidebar {...baseProps} supervisorNotesEnabled />);

      expect(screen.getByTestId("session-sidebar-tab-supervisor")).toBeInTheDocument();
      expect(screen.getByTestId("supervisor-notes-empty")).toBeInTheDocument();
      expect(screen.queryByTestId("supervisor-notes")).not.toBeInTheDocument();
    });

    it("uses the translated tab label and empty state when provided", () => {
      render(
        <SessionSidebar
          {...baseProps}
          supervisorNotesEnabled
          translations={
            {
              supervisorTab: "மேற்பார்வையாளர்",
              supervisorEmptyState: "காத்திருக்கிறது",
            } as any
          }
        />,
      );

      expect(screen.getByTestId("session-sidebar-tab-supervisor")).toHaveTextContent(
        "மேற்பார்வையாளர்",
      );
      expect(screen.getByTestId("supervisor-notes-empty")).toHaveTextContent("காத்திருக்கிறது");
    });

    it("renders notes in order once they arrive", () => {
      render(
        <SessionSidebar
          {...baseProps}
          supervisorNotesEnabled
          supervisorNotes={[
            { note: "Stay with the fear.", seq: 1 },
            { note: "Ask what evenings are like.", seq: 2 },
          ]}
        />,
      );

      expect(screen.getByTestId("supervisor-note-0")).toHaveTextContent("Stay with the fear.");
      expect(screen.getByTestId("supervisor-note-1")).toHaveTextContent(
        "Ask what evenings are like.",
      );
    });

    it("badges unread notes only while another tab is active", () => {
      // Badge-only is the whole notification mechanism — the learner is
      // mid-conversation and decides when to look.
      const { rerender } = render(
        <SessionSidebar
          {...baseProps}
          reminders={["Stay calm"]}
          supervisorNotesEnabled
          supervisorNotes={[]}
        />,
      );

      // Reminders is tab[0], so Supervisor starts inactive.
      expect(
        screen.queryByTestId("session-sidebar-supervisor-badge"),
      ).not.toBeInTheDocument();

      rerender(
        <SessionSidebar
          {...baseProps}
          reminders={["Stay calm"]}
          supervisorNotesEnabled
          supervisorNotes={[{ note: "Slow down.", seq: 1 }]}
        />,
      );
      expect(screen.getByTestId("session-sidebar-supervisor-badge")).toHaveTextContent("1");

      // Opening the tab clears it, and it stays clear.
      fireEvent.click(screen.getByTestId("session-sidebar-tab-supervisor"));
      expect(
        screen.queryByTestId("session-sidebar-supervisor-badge"),
      ).not.toBeInTheDocument();

      rerender(
        <SessionSidebar
          {...baseProps}
          reminders={["Stay calm"]}
          supervisorNotesEnabled
          supervisorNotes={[
            { note: "Slow down.", seq: 1 },
            { note: "She named a fear.", seq: 2 },
          ]}
        />,
      );
      // Still on the Supervisor tab, so a new note is read as it lands.
      expect(
        screen.queryByTestId("session-sidebar-supervisor-badge"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("session-sidebar-tab-reminders"));
      rerender(
        <SessionSidebar
          {...baseProps}
          reminders={["Stay calm"]}
          supervisorNotesEnabled
          supervisorNotes={[
            { note: "Slow down.", seq: 1 },
            { note: "She named a fear.", seq: 2 },
            { note: "Let that sit.", seq: 3 },
          ]}
        />,
      );
      expect(screen.getByTestId("session-sidebar-supervisor-badge")).toHaveTextContent("1");
    });

    it("coexists with the Live events tab", () => {
      render(
        <SessionSidebar
          {...baseProps}
          events={[{ score: 1, emoji: "🎯", message: "Nice", timestamp: new Date().toISOString() }]}
          supervisorNotesEnabled
        />,
      );

      expect(screen.getByTestId("session-sidebar-tab-live")).toBeInTheDocument();
      expect(screen.getByTestId("session-sidebar-tab-supervisor")).toBeInTheDocument();
    });
  });
});
