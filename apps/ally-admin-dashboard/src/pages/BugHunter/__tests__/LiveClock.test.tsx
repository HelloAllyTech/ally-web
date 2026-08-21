import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveClock } from "../LiveClock";

describe("LiveClock — rollover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says just now at zero elapsed seconds", () => {
    render(<LiveClock since={Date.now()} />);
    expect(screen.getByText("Updated just now")).toBeInTheDocument();
  });

  it("counts in seconds under a minute", () => {
    render(<LiveClock since={Date.now() - 45_000} />);
    expect(screen.getByText("Updated 45s ago")).toBeInTheDocument();
  });

  // The defect this whole component exists to fix: it used to report "Updated
  // 156s ago" instead of rolling over to minutes.
  it("rolls over to minutes at 60 seconds, rather than reporting 156s ago", () => {
    render(<LiveClock since={Date.now() - 156_000} />);
    expect(screen.getByText("Updated 2m ago")).toBeInTheDocument();
    expect(screen.queryByText(/156s ago/)).not.toBeInTheDocument();
  });

  it("rolls over to hours at 60 minutes", () => {
    render(<LiveClock since={Date.now() - 90 * 60_000} />);
    expect(screen.getByText("Updated 1h ago")).toBeInTheDocument();
  });

  it("keeps ticking every second off the fixed `since` timestamp", () => {
    render(<LiveClock since={Date.now()} />);
    expect(screen.getByText("Updated just now")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Updated 5s ago")).toBeInTheDocument();
  });

  it("accepts an ISO string, the shape RTK Query's fulfilledTimeStamp is fed through as", () => {
    render(<LiveClock since="2026-08-18T11:58:00.000Z" />);
    expect(screen.getByText("Updated 2m ago")).toBeInTheDocument();
  });
});

/**
 * The second mode, which `LiveWorkBoard` puts on every in-flight row: a bare
 * duration, because the caller's own words say what it is a duration of.
 */
describe("LiveClock — elapsed mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a bare duration with no 'Updated' prefix", () => {
    render(<LiveClock since={Date.now() - 45_000} mode="elapsed" />);

    expect(screen.getByText("45s")).toBeInTheDocument();
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  // A counter climbing from 0s is the point of this mode, so unlike the
  // freshness readout it has no "just now" case to fall into.
  it("starts at 0s rather than saying just now, and climbs", () => {
    render(<LiveClock since={Date.now()} mode="elapsed" />);
    expect(screen.getByText("0s")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByText("3s")).toBeInTheDocument();
  });

  it("shares the same rollover through minutes and hours", () => {
    const { unmount } = render(<LiveClock since={Date.now() - 156_000} mode="elapsed" />);
    expect(screen.getByText("2m")).toBeInTheDocument();
    unmount();

    render(<LiveClock since={Date.now() - 90 * 60_000} mode="elapsed" />);
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  /**
   * A bare "2m" is legible beside a row you can see and meaningless read out on
   * its own, so the caller passes the sentence it stands for.
   */
  it("takes its accessible name from the caller, with the duration substituted in", () => {
    render(
      <LiveClock since={Date.now() - 120_000} mode="elapsed" srLabel="{duration} on this step" />,
    );

    expect(screen.getByLabelText("2m on this step")).toBeInTheDocument();
  });

  // Findings carry a server timestamp, and a client a few seconds behind the
  // API must not render "-3s".
  it("clamps at zero when the client clock is behind the timestamp", () => {
    render(<LiveClock since={Date.now() + 5_000} mode="elapsed" />);
    expect(screen.getByText("0s")).toBeInTheDocument();
  });
});
