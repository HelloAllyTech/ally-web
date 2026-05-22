import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import AppTooltip from "../AppTooltip";

vi.mock("@api", () => ({
  useGetActiveTooltipsQuery: vi.fn(),
}));

import { useGetActiveTooltipsQuery } from "@api";

const mockUseGetActiveTooltipsQuery = useGetActiveTooltipsQuery as ReturnType<typeof vi.fn>;

const mockTooltip = {
  id: "tooltip-uuid-1",
  location: "login_button",
  tipText: "Click on the login button to see more",
  icon: "😀",
};

describe("AppTooltip", () => {
  beforeEach(() => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [mockTooltip] });
  });

  it("renders children when no matching tooltip exists for location", () => {
    render(
      <AppTooltip location="nonexistent_location">
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders children when tooltips list is empty", () => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [] });

    render(
      <AppTooltip location="login_button">
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders child element when matching tooltip exists", () => {
    render(
      <AppTooltip location="login_button">
        <button>Click me</button>
      </AppTooltip>,
    );

    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("shows tooltip text with icon on hover", async () => {
    render(
      <AppTooltip location="login_button">
        <button>Click me</button>
      </AppTooltip>,
    );

    await userEvent.hover(screen.getByText("Click me"));

    expect(await screen.findByText("😀 Click on the login button to see more")).toBeInTheDocument();
  });

  it("shows tooltip text without emoji when icon is not set", async () => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({
      data: [{ ...mockTooltip, icon: null }],
    });

    render(
      <AppTooltip location="login_button">
        <button>Click me</button>
      </AppTooltip>,
    );

    await userEvent.hover(screen.getByText("Click me"));

    expect(await screen.findByText("Click on the login button to see more")).toBeInTheDocument();
  });
});
