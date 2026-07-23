import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SessionTimeBar } from "../SessionTimeBar";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("SessionTimeBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when startTime is missing", () => {
    const { container } = render(<SessionTimeBar maxTimeSeconds={600} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when maxTimeSeconds is missing", () => {
    const { container } = render(
      <SessionTimeBar startTime={new Date("2024-01-01T10:00:00Z").toISOString()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows elapsed / max time and advances every second", () => {
    render(
      <SessionTimeBar
        startTime={new Date("2024-01-01T10:00:00Z").toISOString()}
        maxTimeSeconds={600}
      />,
    );

    expect(screen.getByTestId("session-time-bar-value")).toHaveTextContent("00:00 / 10:00");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("session-time-bar-value")).toHaveTextContent("00:05 / 10:00");
  });

  it("freezes while paused", () => {
    render(
      <SessionTimeBar
        startTime={new Date("2024-01-01T10:00:00Z").toISOString()}
        maxTimeSeconds={600}
        isPaused
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("session-time-bar-value")).toHaveTextContent("00:00 / 10:00");
  });
});
