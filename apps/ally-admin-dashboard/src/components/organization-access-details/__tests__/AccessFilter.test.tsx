import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AccessFilterValue } from "@types";

import { AccessFilter } from "../AccessFilter";

vi.mock("@constants", () => ({
  en: {
    userManagement: {
      all: "All",
      enabled: "Enabled",
      disabled: "Disabled",
      filterByAccess: "Filter by access",
    },
  },
}));

describe("AccessFilter", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three filter options", () => {
    render(<AccessFilter value={AccessFilterValue.ALL} onChange={mockOnChange} />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enabled" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disabled" })).toBeInTheDocument();
  });

  it("is labelled as an access filter group", () => {
    render(<AccessFilter value={AccessFilterValue.ALL} onChange={mockOnChange} />);

    expect(screen.getByRole("group", { name: "Filter by access" })).toBeInTheDocument();
  });

  it("marks the selected option as pressed", () => {
    render(<AccessFilter value={AccessFilterValue.ENABLED} onChange={mockOnChange} />);

    expect(screen.getByRole("button", { name: "Enabled" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Disabled" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the clicked option", async () => {
    const user = userEvent.setup();
    render(<AccessFilter value={AccessFilterValue.ALL} onChange={mockOnChange} />);

    await user.click(screen.getByRole("button", { name: "Disabled" }));

    expect(mockOnChange).toHaveBeenCalledWith(AccessFilterValue.DISABLED);
  });

  it("calls onChange even when the selected option is clicked again", async () => {
    const user = userEvent.setup();
    render(<AccessFilter value={AccessFilterValue.ENABLED} onChange={mockOnChange} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));

    expect(mockOnChange).toHaveBeenCalledWith(AccessFilterValue.ENABLED);
  });
});
