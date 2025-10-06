import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

import { circleList } from "../constants";
import SimulationWaveform from "../SimulationWaveform";

vi.mock("@livekit/components-react", () => ({
  useRemoteParticipants: vi.fn(() => []),
}));

vi.mock("@hooks", () => ({
  useAudioLevel: vi.fn(() => 0.02),
}));

vi.mock("livekit-client", () => ({
  Track: {
    Kind: { Audio: "audio" },
    Source: { Microphone: "microphone" },
  },
}));

describe("SimulationWaveform", () => {
  it("renders snapshot with no participants", () => {
    const { container } = render(<SimulationWaveform />);
    expect(container).toMatchSnapshot();
  });

  it("renders cover image from localStorage", () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.ROOM_DATA,
      JSON.stringify({ coverImageUrl: "https://example.com/img.png" }),
    );

    render(<SimulationWaveform />);
    expect(screen.getByAltText("Speaker avatar")).toBeInTheDocument();

    localStorage.removeItem(LOCAL_STORAGE_KEYS.ROOM_DATA);
  });

  it("renders expected number of circles", () => {
    const { container } = render(<SimulationWaveform />);
    const circles = container.querySelectorAll("div.absolute.rounded-full.transition-all");
    expect(circles.length).toBe(circleList.length);
  });
});
