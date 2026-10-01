import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicProductUpdate } from "@api";

const { mockUseGetPublicProductUpdatesQuery } = vi.hoisted(() => ({
  mockUseGetPublicProductUpdatesQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPublicProductUpdatesQuery: (args: unknown) => mockUseGetPublicProductUpdatesQuery(args),
}));

import { ProductUpdatesFeed } from "../ProductUpdatesFeed";

const update = (overrides: Partial<PublicProductUpdate>): PublicProductUpdate => ({
  id: "u1",
  slug: "2026-09-29-characters-pause-more-naturally",
  title: "Characters pause more naturally before they reply",
  summary: "A character now takes a breath or says a short phrase before answering.",
  kind: "improved",
  surfaces: ["web_app", "mobile_app"],
  area: "Roleplays",
  liveAt: "2026-09-30T08:56:31Z",
  ...overrides,
});

const respond = (updates: PublicProductUpdate[], count = updates.length, extra = {}) =>
  mockUseGetPublicProductUpdatesQuery.mockReturnValue({
    data: { updates, count },
    currentData: { updates, count },
    isFetching: false,
    isError: false,
    ...extra,
  });

describe("ProductUpdatesFeed", () => {
  beforeEach(() => {
    mockUseGetPublicProductUpdatesQuery.mockReset();
  });

  it("shows a day's highlights as cards and its fixes as one list", () => {
    respond([
      update({}),
      update({
        id: "u2",
        slug: "fix-sign-in",
        kind: "fixed",
        title: "The sign-in page no longer goes blank",
        liveAt: "2026-09-30T03:00:00Z",
        summary: "Signing in works again on every browser.",
        surfaces: ["web_app"],
      }),
    ]);

    render(<ProductUpdatesFeed />);

    expect(screen.getByRole("heading", { level: 2, name: /30.*2026/ })).toBeInTheDocument();
    expect(screen.queryByText(/Week of/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Characters pause more naturally before they reply" }),
    ).toBeInTheDocument();
    const card = within(screen.getByRole("article"));
    expect(card.getByText("Improved")).toBeInTheDocument();
    expect(card.getByText("Mobile app")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fixes" })).toBeInTheDocument();
    expect(screen.getByText("The sign-in page no longer goes blank.")).toBeInTheDocument();
  });

  it("opens every day, and folds one away when its heading is pressed", () => {
    respond([update({})]);

    render(<ProductUpdatesFeed />);
    const toggle = screen.getByRole("button", { name: /30.*2026/ });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("1 improved");
    expect(screen.getByRole("article")).toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole("article")).toBeVisible();
  });

  it("collapses and expands every day at once", () => {
    respond([
      update({}),
      update({ id: "u2", slug: "older", title: "An older update", liveAt: "2026-09-28T10:00:00Z" }),
    ]);

    render(<ProductUpdatesFeed />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    for (const day of screen.getAllByRole("button", { expanded: false })) {
      expect(day).toHaveAttribute("aria-expanded", "false");
    }

    // One day reopened is no longer "all collapsed", but not all open either.
    fireEvent.click(screen.getByRole("button", { name: /28.*2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeInTheDocument();
  });

  it("hides Collapse all when there is only one day", () => {
    respond([update({})]);

    render(<ProductUpdatesFeed />);

    expect(screen.queryByRole("button", { name: "Collapse all" })).not.toBeInTheDocument();
  });

  it("shows the update's area and copies a link straight to it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    respond([update({})]);

    render(<ProductUpdatesFeed />);
    const card = within(screen.getByRole("article"));
    expect(card.getByText("Roleplays")).toBeInTheDocument();

    fireEvent.click(card.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/blog/changelog#${update({}).slug}`,
    );
    expect(await card.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  it("asks for one surface when a filter is chosen, and starts again from the top", () => {
    respond([update({})], 40);

    render(<ProductUpdatesFeed />);
    fireEvent.click(screen.getByRole("button", { name: "Mobile app" }));

    expect(mockUseGetPublicProductUpdatesQuery).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 30,
      surface: "mobile_app",
    });
    expect(screen.getByRole("button", { name: "Mobile app" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("loads the next page on View more", () => {
    respond([update({})], 40);

    render(<ProductUpdatesFeed />);
    fireEvent.click(screen.getByRole("button", { name: "View more" }));

    expect(mockUseGetPublicProductUpdatesQuery).toHaveBeenLastCalledWith({ offset: 30, limit: 30 });
  });

  it("offers a way back when a filter has nothing yet", () => {
    respond([]);

    render(<ProductUpdatesFeed />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));

    expect(screen.getByText(/Nothing for the WhatsApp yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See all updates" }));
    expect(mockUseGetPublicProductUpdatesQuery).toHaveBeenLastCalledWith({ offset: 0, limit: 30 });
  });

  it("says so when there is nothing at all, or the request fails", () => {
    respond([]);
    const { unmount } = render(<ProductUpdatesFeed />);
    expect(screen.getByText("No updates yet. Check back soon!")).toBeInTheDocument();
    unmount();

    respond([], 0, { isError: true, currentData: undefined, data: undefined });
    render(<ProductUpdatesFeed />);
    expect(screen.getByText(/Something went wrong loading the changelog/)).toBeInTheDocument();
  });
});
