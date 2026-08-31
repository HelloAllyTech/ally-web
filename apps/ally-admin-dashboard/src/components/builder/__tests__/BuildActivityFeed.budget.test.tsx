import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderBuildEvent } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// eslint-disable-next-line import/first
import { BuildActivityFeed } from "../BuildActivityFeed";

/**
 * A mid-run budget hold is neither progress nor failure: the run stopped itself
 * and is holding an hour of unpushed work while it waits for a spend decision.
 * If the feed renders that as an error, a person reads "the work is gone" and
 * reaches for a retry — which is precisely what the hold exists to avoid.
 */

let seq = 0;
const event = (payload: Record<string, unknown>): BuilderBuildEvent =>
  ({
    id: `event-${(seq += 1)}`,
    runId: "run-1",
    sessionId: "session-1",
    seq,
    stage: null,
    type: "budget_hold",
    payload,
    createdAt: new Date().toISOString(),
  }) as unknown as BuilderBuildEvent;

const renderFeed = (events: BuilderBuildEvent[]) =>
  render(<BuildActivityFeed events={events} isLive={false} />);

describe("budget holds in the feed", () => {
  it("says the work is being held, not lost", () => {
    renderFeed([event({ state: "held", spentUsd: 16.7668, budgetUsd: 15 })]);

    const row = screen.getByText(/holding this run's work/);
    expect(row.textContent).toContain("$16.77");
    expect(row.textContent).toContain("$15.00");
    expect(row.className).not.toContain("support-error");
  });

  it("records the raise that released it", () => {
    renderFeed([event({ state: "raised", budgetUsd: 30, spentUsd: 16.7668 })]);

    expect(screen.getByText("Budget raised to $30.00 — carrying on.")).toBeTruthy();
  });

  it("reads as a failure only once the window has closed", () => {
    renderFeed([event({ state: "expired", spentUsd: 16.7668, budgetUsd: 15 })]);

    const row = screen.getByText(/Nobody raised the budget in time/);
    expect(row.className).toContain("support-error");
  });

  it("falls back to the held wording for a payload with no state", () => {
    renderFeed([event({ spentUsd: 16.7668, budgetUsd: 15 })]);

    expect(screen.getByText(/holding this run's work/)).toBeTruthy();
  });
});
