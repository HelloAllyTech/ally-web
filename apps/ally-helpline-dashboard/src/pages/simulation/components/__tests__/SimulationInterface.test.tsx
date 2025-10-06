import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { RoomStatus } from "@types";

import SimulationInterface from "../SimulationInterface";

vi.mock("@livekit/components-react", () => ({
  RoomAudioRenderer: () => <div data-testid="room-audio" />,
  useRemoteParticipants: () => [],
}));

// Minimal localStorage setup
const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

describe("SimulationInterface", () => {
  it("shows connecting message when status is CONNECTING", () => {
    getItemSpy.mockReturnValueOnce(null);
    const { asFragment } = render(<SimulationInterface roomStatus={RoomStatus.CONNECTING} />);
    expect(screen.getByText(/allow us to use your microphone/i)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders audio and waveform when connected", () => {
    getItemSpy.mockReturnValueOnce(JSON.stringify({ name: "Test Room" }));
    const { asFragment } = render(<SimulationInterface roomStatus={RoomStatus.CONNECTED} />);
    expect(screen.getByTestId("room-audio")).toBeInTheDocument();
    expect(screen.getByText("Test Room")).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });
});
