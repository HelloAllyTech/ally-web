import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const queryMock = vi.fn();
const refetchMock = vi.fn();

// Full replacement, not a partial spread: this tab calls exactly one hook, so
// there is no need to pull in the real `@api` barrel's import graph.
vi.mock("@api", () => ({
  useGetOrgEngagementQuery: (args: unknown) => queryMock(args),
}));

import { OrgEngagementSubTab } from "../OrgEngagementSubTab";

const response = () => ({
  levels: [],
  funnel: [],
  orgs: 40,
  activityDays: 28,
  activeOrgs: 20,
  eligibleOrgs: 40,
  activeSharePct: 50,
  activityTrend: [
    { month: "2026-06-01", activeOrgs: 10, totalOrgs: 30, activeSharePct: 33 },
    { month: "2026-07-01", activeOrgs: 20, totalOrgs: 40, activeSharePct: 50 },
  ],
  scoping: { tenantId: null, unscopedSections: ["activity"] },
  computedAt: "2026-08-01T00:00:00.000Z",
});

describe("OrgEngagementSubTab", () => {
  beforeEach(() => {
    queryMock.mockReset();
    refetchMock.mockReset();
    queryMock.mockReturnValue({
      data: response(),
      isLoading: false,
      error: undefined,
      refetch: refetchMock,
    });
  });

  it("opens the percentage chart's own detail, not the raw-count chart's", async () => {
    render(<OrgEngagementSubTab />);

    await userEvent.click(
      screen.getByRole("button", { name: /Expand Share of orgs active each month/i }),
    );

    // Regression: expanding the SHARE card previously opened a modal hardcoded
    // to the raw-count chart, under the count chart's title.
    const modal = within(screen.getByRole("dialog"));
    expect(
      modal.getByRole("heading", { level: 2, name: "Share of orgs active each month" }),
    ).toBeInTheDocument();

    // The count series' own legend groups ("Active orgs", "All orgs") must not
    // appear inside the percentage chart's modal — only its own series does.
    // (The count card behind the modal keeps its own copy on the page, so this
    // has to be scoped to the dialog rather than the whole document.)
    expect(modal.queryByText("All orgs")).not.toBeInTheDocument();
    expect(modal.getByText("Active share")).toBeInTheDocument();
  });

  it("still opens the raw-count chart's own detail when that card is expanded", async () => {
    render(<OrgEngagementSubTab />);

    await userEvent.click(screen.getByRole("button", { name: /Expand Orgs active per month/i }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Orgs active per month" }),
    ).toBeInTheDocument();
  });
});
