import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CodeActivityResponse } from "@api";

vi.mock("@api", () => ({
  useLazyGetPublicCodeActivityQuery: vi.fn(),
}));

import { useLazyGetPublicCodeActivityQuery } from "@api";

import { CodeActivityHeatmap } from "../CodeActivityHeatmap";
import { addDays } from "../codeActivity";

const mockUseLazy = useLazyGetPublicCodeActivityQuery as ReturnType<typeof vi.fn>;

/** A 30-day page ending on `until`, with `churnFor` deciding each day. */
const pageEnding = (
  until: string,
  overrides: Partial<CodeActivityResponse> = {},
  churnFor: (date: string) => number = () => 0,
): CodeActivityResponse => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(until, i - 29);
    const churn = churnFor(date);
    return { date, added: churn, deleted: 0, churn, partial: date === "2026-09-30" };
  });
  return {
    days,
    from: days[0].date,
    until,
    today: "2026-09-30",
    earliestDate: "2025-04-23",
    hasOlder: false,
    incomplete: false,
    computedAt: "2026-09-30T12:00:00Z",
    ...overrides,
  };
};

let trigger: ReturnType<typeof vi.fn>;

const respondWith = (...pages: (CodeActivityResponse | Error)[]) => {
  pages.forEach(page => {
    trigger.mockImplementationOnce(() => ({
      unwrap: () => (page instanceof Error ? Promise.reject(page) : Promise.resolve(page)),
    }));
  });
};

const cells = () => screen.getAllByTestId("code-activity-cell");

describe("CodeActivityHeatmap", () => {
  beforeEach(() => {
    trigger = vi.fn();
    mockUseLazy.mockReturnValue([trigger, {}]);
  });

  it("shows the latest 30 days, newest at the right, with the month's total", async () => {
    respondWith(pageEnding("2026-09-30", {}, date => (date === "2026-09-15" ? 12_000 : 100)));

    render(<CodeActivityHeatmap />);

    expect(screen.getByRole("status", { name: "Loading code activity" })).toBeInTheDocument();
    await waitFor(() => expect(cells()).toHaveLength(30));

    expect(trigger).toHaveBeenCalledWith({ until: undefined, days: 30 }, true);
    const items = screen.getAllByRole("listitem");
    expect(items[29]).toHaveAttribute("data-date", "2026-09-30");
    expect(items[29].getAttribute("aria-label")).toMatch(/100 lines changed so far today$/);
    // 29 × 100 + 12,000
    expect(screen.getByText("14,900")).toBeInTheDocument();
    expect(screen.getByText(/lines changed in the last 30 days/)).toBeInTheDocument();
  });

  it("colours a day by its fixed level", async () => {
    respondWith(pageEnding("2026-09-30", {}, date => (date === "2026-09-15" ? 12_000 : 0)));

    render(<CodeActivityHeatmap />);
    await waitFor(() => expect(cells()).toHaveLength(30));

    const busy = screen.getAllByRole("listitem").find(li => li.dataset.date === "2026-09-15")!;
    const quiet = screen.getAllByRole("listitem").find(li => li.dataset.date === "2026-09-14")!;
    expect(within(busy).getByTestId("code-activity-cell")).toHaveStyle({ backgroundColor: "#B34F2C" });
    expect(within(quiet).getByTestId("code-activity-cell")).toHaveStyle({ backgroundColor: "#EDE9E1" });
  });

  it("reads a day out on hover", async () => {
    respondWith(pageEnding("2026-09-30", {}, date => (date === "2026-09-15" ? 1_234 : 0)));

    render(<CodeActivityHeatmap />);
    await waitFor(() => expect(cells()).toHaveLength(30));

    const target = screen.getAllByRole("listitem").find(li => li.dataset.date === "2026-09-15")!;
    fireEvent.mouseEnter(target);

    expect(screen.getByText(/1,234 lines changed/)).toBeInTheDocument();
    expect(screen.getByText(/\(\+1,234 \/ −0\)/)).toBeInTheDocument();
  });

  it("moves between days with the arrow keys", async () => {
    respondWith(pageEnding("2026-09-30", {}, date => (date === "2026-09-29" ? 42 : 0)));

    render(<CodeActivityHeatmap />);
    await waitFor(() => expect(cells()).toHaveLength(30));

    const strip = screen.getByLabelText(/Use the arrow keys/);
    fireEvent.keyDown(strip, { key: "ArrowLeft" });
    fireEvent.keyDown(strip, { key: "ArrowLeft" });

    expect(screen.getByText(/42 lines changed/)).toBeInTheDocument();
  });

  it("loads the previous month when the strip is at its oldest edge, and stops at the first commit", async () => {
    respondWith(
      pageEnding("2026-09-30", { hasOlder: true }),
      pageEnding("2026-08-31", { hasOlder: false }),
    );

    render(<CodeActivityHeatmap />);

    await waitFor(() => expect(cells()).toHaveLength(60));
    expect(trigger).toHaveBeenNthCalledWith(2, { until: "2026-08-31", days: 30 }, true);
    expect(trigger).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("data-date", "2026-08-02");
  });

  it("offers a retry when an older month fails, keeping what is shown", async () => {
    respondWith(
      pageEnding("2026-09-30", { hasOlder: true }),
      new Error("offline"),
      pageEnding("2026-08-31", { hasOlder: false }),
    );

    render(<CodeActivityHeatmap />);

    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(cells()).toHaveLength(30);

    fireEvent.click(retry);

    await waitFor(() => expect(cells()).toHaveLength(60));
  });

  it("says the totals may be low when a source could not be read", async () => {
    respondWith(pageEnding("2026-09-30", { incomplete: true }, () => 10));

    render(<CodeActivityHeatmap />);

    expect(await screen.findByText(/totals may be lower than the real figure/)).toBeInTheDocument();
  });

  it("does not draw an empty strip when nothing could be read at all", async () => {
    respondWith(pageEnding("2026-09-30", { incomplete: true }));

    render(<CodeActivityHeatmap />);

    expect(await screen.findByText(/isn’t available right now/)).toBeInTheDocument();
    expect(screen.queryAllByTestId("code-activity-cell")).toHaveLength(0);
  });

  it("says so when the request fails", async () => {
    respondWith(new Error("503"));

    render(<CodeActivityHeatmap />);

    expect(await screen.findByText(/isn’t available right now/)).toBeInTheDocument();
  });
});
