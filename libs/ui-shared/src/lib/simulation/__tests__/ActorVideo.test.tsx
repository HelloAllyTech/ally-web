import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ActorVideo } from "../ActorVideo";

const useTracks = vi.fn();

vi.mock("@livekit/components-react", () => ({
  useTracks: (...args: any[]) => useTracks(...args),
  VideoTrack: (props: any) => <div data-testid="livekit-video-track" {...props} />,
}));

vi.mock("livekit-client", () => ({
  Track: { Source: { Camera: "camera" } },
}));

const remoteTrack = () => ({
  participant: { isLocal: false },
  publication: { track: {} },
});

describe("ActorVideo", () => {
  beforeEach(() => {
    useTracks.mockReset();
  });

  it("renders the actor's video when a remote camera track is publishing", () => {
    useTracks.mockReturnValue([remoteTrack()]);
    render(<ActorVideo />);
    expect(screen.getByTestId("simulation-actor-video")).toBeInTheDocument();
  });

  it("renders nothing when no track has arrived", () => {
    // The audio-only fallback: the agent's own kill-switch is off, or the
    // avatar failed to start and the session degraded. Nothing is drawn, so
    // the call card underneath simply stays visible — no error, no spinner.
    useTracks.mockReturnValue([]);
    const { container } = render(<ActorVideo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores the learner's own camera", () => {
    useTracks.mockReturnValue([{ participant: { isLocal: true }, publication: { track: {} } }]);
    const { container } = render(<ActorVideo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores a published track that is not yet flowing", () => {
    useTracks.mockReturnValue([{ participant: { isLocal: false }, publication: {} }]);
    const { container } = render(<ActorVideo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("subscribes only to camera tracks that are actually subscribed", () => {
    useTracks.mockReturnValue([]);
    render(<ActorVideo />);
    expect(useTracks).toHaveBeenCalledWith(["camera"], { onlySubscribed: true });
  });
});
