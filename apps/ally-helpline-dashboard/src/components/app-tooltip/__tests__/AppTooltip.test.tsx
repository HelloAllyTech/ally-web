import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { TooltipLocation } from "@constants";

import AppTooltip from "../AppTooltip";

vi.mock("@api", () => ({
  useGetActiveTooltipsQuery: vi.fn(),
}));

import { useGetActiveTooltipsQuery } from "@api";

const mockUseGetActiveTooltipsQuery = useGetActiveTooltipsQuery as ReturnType<typeof vi.fn>;

const mockTooltip = {
  id: "tooltip-uuid-1",
  location: TooltipLocation.LOGIN_BUTTON,
  tipText: "Click on the login button to see more",
};

describe("AppTooltip", () => {
  beforeEach(() => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [mockTooltip], isLoading: false });
  });

  it("renders children when no matching tooltip exists for location", () => {
    render(
      <AppTooltip location={"nonexistent_location" as TooltipLocation}>
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders children while loading", () => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [], isLoading: true });

    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders children when tooltips list is empty", () => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [], isLoading: false });

    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders child element when matching tooltip exists", () => {
    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("shows tooltip text on hover", async () => {
    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    await userEvent.hover(screen.getByText("Click me"));

    expect(await screen.findByText("Click on the login button to see more")).toBeInTheDocument();
  });

  it("does not force a refetch on every mount, so a failing endpoint isn't re-hit on every page navigation", () => {
    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    const options = mockUseGetActiveTooltipsQuery.mock.calls[0]?.[1];
    // `true` forces a brand-new network request on every single mount, even
    // one that just failed moments ago — since AppTooltip wraps controls on
    // nearly every routed page, ordinary navigation between pages retries a
    // failing endpoint repeatedly with no backoff and no error surfaced.
    expect(options?.refetchOnMountOrArgChange).not.toBe(true);
  });
});
