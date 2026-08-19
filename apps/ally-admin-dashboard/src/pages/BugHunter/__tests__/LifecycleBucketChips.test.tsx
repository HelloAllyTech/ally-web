import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Same treatment as the suite this replaces (AgentWorkloadStrip's): real
// framer-motion timing isn't what this is about, and a pass-through keeps the
// assertions deterministic while preserving the one behaviour under test — that
// a `key` change on the value forces a remount rather than an in-place patch.
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useReducedMotion: () => false,
}));

vi.mock("@components", () => ({ cellTypes: {} }));

import { LifecycleBucketChips } from "../LifecycleBucketChips";
import { BucketCounts, emptyBucketCounts } from "../lifecycleBucket";

const counts = (overrides: Partial<BucketCounts> = {}): BucketCounts => ({
  ...emptyBucketCounts(),
  ...overrides,
});

describe("LifecycleBucketChips", () => {
  it("renders every bucket including the empty ones, so the row never reflows on a poll", () => {
    render(
      <LifecycleBucketChips
        counts={counts({ needs_you: 2 })}
        total={2}
        value="all"
        onChange={vi.fn()}
      />,
    );

    [
      "Everything",
      "Needs your call",
      "Went red",
      "On the list",
      "In progress",
      "In review",
      "Live",
      "Closed",
    ].forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("sets the filter to the bucket that was clicked", () => {
    const onChange = vi.fn();
    render(
      <LifecycleBucketChips
        counts={counts({ problem: 1 })}
        total={1}
        value="all"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText("Went red"));
    expect(onChange).toHaveBeenCalledWith("problem");
  });

  it("marks the active chip as pressed rather than only colouring it", () => {
    render(
      <LifecycleBucketChips counts={counts()} total={0} value="in_review" onChange={vi.fn()} />,
    );

    expect(screen.getByText("In review").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Everything").closest("button")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("remounts a count when it changes, so a poll registers as an event", () => {
    const { rerender } = render(
      <LifecycleBucketChips
        counts={counts({ in_flight: 2 })}
        total={2}
        value="all"
        onChange={vi.fn()}
      />,
    );
    // Scoped to this chip: the "Everything" chip carries the same number, so an
    // unscoped lookup matches twice.
    const chip = () => screen.getByText("In progress").closest("button") as HTMLElement;
    const before = within(chip()).getByText("2");

    rerender(
      <LifecycleBucketChips
        counts={counts({ in_flight: 4 })}
        total={4}
        value="all"
        onChange={vi.fn()}
      />,
    );
    const after = within(chip()).getByText("4");

    // Not the same node with new text: a genuinely different DOM node, which
    // only happens because `key={chip.count}` tore the old one down.
    expect(after).not.toBe(before);
  });

  it("blocks clicks while a fresh page is in flight", () => {
    const { container } = render(
      <LifecycleBucketChips
        counts={counts()}
        total={0}
        value="all"
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(container.firstChild).toHaveClass("pointer-events-none");
  });
});
