import React from "react";

import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import BoxBreathing from "../BoxBreathing";

vi.mock("@assets", () => ({
  BoxBreathingBottomGradient: (props: any) => <div data-testid="bbg" {...props} />,
  BoxBreathingTopGradient: (props: any) => <div data-testid="btg" {...props} />,
  MindfullnessVideo: "video.mp4",
  PauseIcon: () => <span data-testid="pause-icon" />,
  PlayIcon: () => <span data-testid="play-icon" />,
  VolumeOffIcon: () => <span data-testid="vol-off" />,
  VolumeUpIcon: () => <span data-testid="vol-up" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  ButtonVariant: { ICON: "icon" },
}));

vi.mock("@utils", () => ({
  getKeyFromIndex: (i: number, p: string) => `${p}-${i}`,
}));

// vi.mock("../constants", () => ({
//   BOX_BREATHING_STEPS: [
//     { label: "Inhale", duration: 4 },
//     { label: "Hold", duration: 4 },
//     { label: "Exhale", duration: 4 },
//     { label: "Hold", duration: 4 },
//   ],
// }));

vi.mock("../constants", () => ({
  getBoxBreathingSteps: () => [
    { label: "Inhale now", duration: 4 },
    { label: "Hold breathe", duration: 4 },
    { label: "Exhale", duration: 4 },
    { label: "Hold breathe", duration: 4 },
  ],
}));

// Stub HTMLMediaElement methods used
beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BoxBreathing", () => {
  it("renders and toggles play/pause updating seconds with timers", () => {
    vi.useFakeTimers();
    const { container } = render(<BoxBreathing onClose={vi.fn()} onViewSummary={vi.fn()} />);

    // initial seconds
    expect(container.textContent).toContain("1");

    // click play (first control button)
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[0]);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toContain("2");

    // pause
    fireEvent.click(buttons[0]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // still 2 because paused
    expect(container.textContent).toContain("2");
    vi.useRealTimers();
  });

  it("toggles mute state on video", () => {
    const { container } = render(<BoxBreathing onClose={vi.fn()} onViewSummary={vi.fn()} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    // default muted true
    // clicking second control button toggles mute off
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[1]);
    expect(video.muted).toBe(false);
  });

  it("playOnMount starts timer on video load", async () => {
    vi.useFakeTimers();
    const { container } = render(
      <BoxBreathing playOnMount onClose={vi.fn()} onViewSummary={vi.fn()} />,
    );
    const video = container.querySelector("video") as HTMLVideoElement;

    // fire loaded event
    act(() => {
      fireEvent.loadedData(video);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.textContent).toContain("3");
    vi.useRealTimers();
  });

  it("toggle maximize shows View Call Summary when enabled", () => {
    const { container, queryByText, getByText } = render(
      <BoxBreathing showViewSummaryButton onClose={vi.fn()} onViewSummary={vi.fn()} />,
    );
    expect(queryByText("View Call Summary")).toBeNull();

    // click sizing control (cursor-pointer div)
    const sizing = container.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(sizing);

    expect(getByText("View Call Summary")).toBeInTheDocument();
  });

  it("clicking sizing control calls onClose in full screen mode", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BoxBreathing isFullScreenMode onClose={onClose} onViewSummary={vi.fn()} />,
    );
    const sizing = container.querySelector(".cursor-pointer") as HTMLElement;
    fireEvent.click(sizing);
    expect(onClose).toHaveBeenCalled();
  });
});
