import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useTranslation } from "react-i18next";

import { TooltipLocation } from "@constants";

import AppTooltip from "../AppTooltip";

vi.mock("@api", () => ({
  useGetActiveTooltipsQuery: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

import { useGetActiveTooltipsQuery } from "@api";

const mockUseGetActiveTooltipsQuery = useGetActiveTooltipsQuery as ReturnType<typeof vi.fn>;
const mockUseTranslation = useTranslation as ReturnType<typeof vi.fn>;

const mockTooltip = {
  id: "tooltip-uuid-1",
  location: TooltipLocation.LOGIN_BUTTON,
  tipText: "tooltips.login",
};

const mockT = (key: string) => {
    if (key === "tooltips.login") {
        return "Translated Login Tooltip";
    }
    return key;
}

describe("AppTooltip i18n", () => {
  beforeEach(() => {
    mockUseGetActiveTooltipsQuery.mockReturnValue({ data: [mockTooltip], isLoading: false });
    mockUseTranslation.mockReturnValue({
        t: mockT,
        i18n: {
            language: 'mr'
        }
    });
  });

  it("shows translated tooltip text on hover", async () => {
    render(
      <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
        <button>Click me</button>
      </AppTooltip>,
    );

    await userEvent.hover(screen.getByText("Click me"));

    expect(await screen.findByText("Translated Login Tooltip")).toBeInTheDocument();
    expect(screen.queryByText("tooltips.login")).not.toBeInTheDocument();
  });
});
