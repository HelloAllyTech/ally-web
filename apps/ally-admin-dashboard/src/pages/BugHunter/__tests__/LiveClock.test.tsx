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
