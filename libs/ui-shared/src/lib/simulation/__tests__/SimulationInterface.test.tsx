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

vi.mock("../SessionInfoTabs", () => ({
  SessionInfoTabs: (props: any) => (
    <div data-testid="session-info-tabs" data-reminders={JSON.stringify(props.reminders)} />
  ),
}));
vi.mock("../SessionChecklist", () => ({
  SessionChecklist: () => <div data-testid="session-checklist" />,
}));
vi.mock("../SessionProgress", () => ({
  SessionProgress: () => <div data-testid="session-progress" />,
}));
vi.mock("../SimulationEvents", () => ({
  SimulationEvents: () => <div data-testid="simulation-events" />,
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

  it("renders the left column with Reminders/Description when session info exists", () => {
    render(
      <SimulationInterface
        {...baseProps}
        roomData={{ reminders: ["Stay calm"], description: "A challenging caller" }}
      />,
    );

    const left = screen.getByTestId("simulation-left-column");
    expect(left).toBeInTheDocument();
    expect(screen.getByTestId("session-info-tabs")).toBeInTheDocument();
  });

  it("does not render the left column when there are no reminders and no description", () => {
    render(<SimulationInterface {...baseProps} roomData={{}} />);

    expect(screen.queryByTestId("simulation-left-column")).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-info-tabs")).not.toBeInTheDocument();
  });

  it("renders the right column with the checklist when checklist items exist", () => {
    render(
      <SimulationInterface
        {...baseProps}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet the caller" }]}
      />,
    );

    expect(screen.getByTestId("simulation-right-column")).toBeInTheDocument();
    expect(screen.getByTestId("session-checklist")).toBeInTheDocument();
  });

  it("does not render the right column when there is no progress, checklist, or events content", () => {
    render(<SimulationInterface {...baseProps} />);

    expect(screen.queryByTestId("simulation-right-column")).not.toBeInTheDocument();
  });

  it("hides both side columns in focus mode but keeps the AI card and PiP self-view", () => {
    render(
      <SimulationInterface
        {...baseProps}
        isFocusMode
        roomData={{ reminders: ["Stay calm"] }}
        checklistMode={ChecklistMode.GUIDED}
        checklistItems={[{ id: "1", name: "Greet the caller" }]}
      />,
    );

    expect(screen.queryByTestId("simulation-left-column")).not.toBeInTheDocument();
    expect(screen.queryByTestId("simulation-right-column")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulation-middle-column")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-pip-self-view")).toBeInTheDocument();
  });
});
