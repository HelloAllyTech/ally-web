import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MIN_CATEGORY_WIDTH, ScrollableChart } from "../chartKit";

/**
 * The wrapper that stops a long series from being compressed into an unreadable
 * smear. Two behaviours matter and neither is visible in a snapshot: the width it
 * demands for the plot, and the fact that the scroll affordances (the tab stop and
 * the note saying part of the range is off-screen) appear only when something is
 * genuinely out of view. A note that always shows would be a caveat about nothing;
 * a tab stop that always exists is an extra keypress on every chart on the page.
 */

/** jsdom reports 0 for every layout box, so overflow has to be faked. */
const fakeLayout = (scrollWidth: number, clientWidth: number) => {
  const spies = [
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth),
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth),
  ];
  return () => spies.forEach(s => s.mockRestore());
};

const series = (keys: string[]) => keys.map(key => ({ group: "Series", key, value: 1 }));

describe("ScrollableChart", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks for room per distinct x category, not per data point", () => {
    // Two series over the same three buckets is three categories, not six.
    const stacked = [
      ...series(["Jan", "Feb", "Mar"]),
      ...[{ group: "Other", key: "Jan", value: 2 }],
    ];
    const { container } = render(
      <ScrollableChart data={stacked}>
        <div>plot</div>
      </ScrollableChart>,
    );

    const inner = container.querySelector(".analytics-chart-scroll > div") as HTMLElement;
    expect(inner.style.minWidth).toBe(`${3 * MIN_CATEGORY_WIDTH + 88}px`);
    expect(screen.getByText("plot")).toBeInTheDocument();
  });

  it("stays a plain container when the categories fit", () => {
    const restore = fakeLayout(400, 400);
    const { container } = render(
      <ScrollableChart data={series(["Jan", "Feb"])}>
        <div>plot</div>
      </ScrollableChart>,
    );

    const scroller = container.querySelector(".analytics-chart-scroll") as HTMLElement;
    expect(scroller.getAttribute("tabindex")).toBeNull();
    expect(screen.queryByText(/Scroll sideways/)).not.toBeInTheDocument();
    restore();
  });

  it("becomes keyboard-scrollable and says so once part of the range is off-screen", () => {
    const restore = fakeLayout(1400, 500);
    const { container } = render(
      <ScrollableChart data={series(Array.from({ length: 50 }, (_, i) => `2026-06-${i + 1}`))}>
        <div>plot</div>
      </ScrollableChart>,
    );

    const scroller = container.querySelector(".analytics-chart-scroll") as HTMLElement;
    expect(scroller.getAttribute("tabindex")).toBe("0");
    expect(scroller.getAttribute("aria-label")).toBe("Chart, scrollable horizontally");
    // The caveat is on the surface, not in a tooltip: a plot cut off at the card
    // edge otherwise reads as the whole series.
    expect(screen.getByText(/Scroll sideways for the rest of the range/)).toBeInTheDocument();
    restore();
  });
});
