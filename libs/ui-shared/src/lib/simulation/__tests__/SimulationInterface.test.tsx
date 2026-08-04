import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";

import { RoomStatus, SimulationInterface } from "../SimulationInterface";
import { ChecklistMode } from "../types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@livekit/components-react", () => ({
  RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
  useLocalParticipant: () => ({ localParticipant: { isSpeaking: false } }),
  useRemoteParticipants: () => [{ isSpeaking: false }],
}));

vi.mock("../SessionSidebar", () => ({
  SessionSidebar: (props: any) => (
    <div data-testid="session-sidebar" data-reminders={JSON.stringify(props.reminders)} />
  ),
}));
vi.mock("../UserCallCard", () => ({
  UserCallCard: (props: any) => (
    <div
      data-testid={props.compact ? "user-call-card-local" : "user-call-card-remote"}
      data-name={props.userData?.name}
    />
  ),
}));

const baseProps = {
  roomStatus: RoomStatus.AGENT_JOINED,
  roomData: {},
  events: [],
  isFocusMode: false,
  isMuted: false,
  isMicrophoneGranted: true,
  onEnableMicrophone: vi.fn(),
};

describe("SimulationInterface", () => {
  it("always renders the AI card in the middle column and the learner as a compact PiP self-view", () => {
    render(<SimulationInterface {...baseProps} />);

    expect(screen.getByTestId("simulation-middle-column")).toBeInTheDocument();
    expect(screen.getByTestId("user-call-card-remote")).toBeInTheDocument();
    const pip = screen.getByTestId("simulation-pip-self-view");
    expect(pip).toBeInTheDocument();
    expect(screen.getByTestId("user-call-card-local")).toBeInTheDocument();
    // The local card must render INSIDE the PiP wrapper, not as a sibling column.
    expect(pip.contains(screen.getByTestId("user-call-card-local"))).toBe(true);
  });

  it("renders the sidebar with Reminders/Description content when session info exists", () => {
    render(
      <SimulationInterface
        {...baseProps}
        roomData={{ reminders: ["Stay calm"], description: "A challenging caller" }}
      />,
    );

    const sidebar = screen.getByTestId("simulation-sidebar-column");
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByTestId("session-sidebar")).toBeInTheDocument();
  });

  it("does not render the sidebar when there is no reminders, description, progress, checklist, or events content", () => {
    render(<SimulationInterface {...baseProps} roomData={{}} />);

    expect(screen.queryByTestId("simulation-sidebar-column")).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-sidebar")).not.toBeInTheDocument();
  });

  it("renders the sidebar when checklist items exist", () => {
    render(
      <SimulationInterface
        {...baseProps}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet the caller" }]}
      />,
    );

    expect(screen.getByTestId("simulation-sidebar-column")).toBeInTheDocument();
    expect(screen.getByTestId("session-sidebar")).toBeInTheDocument();
  });

  it("renders the sidebar when there are state names (stepper) even with no other content", () => {
    render(
      <SimulationInterface {...baseProps} stateNames={[{ name: "Resistive", stateId: "1" }]} />,
    );

    expect(screen.getByTestId("simulation-sidebar-column")).toBeInTheDocument();
  });

  it("hides the sidebar in focus mode but keeps the AI card and PiP self-view", () => {
    render(
      <SimulationInterface
        {...baseProps}
        isFocusMode
        roomData={{ reminders: ["Stay calm"] }}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet the caller" }]}
      />,
    );

    expect(screen.queryByTestId("simulation-sidebar-column")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulation-middle-column")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-pip-self-view")).toBeInTheDocument();
  });
});
