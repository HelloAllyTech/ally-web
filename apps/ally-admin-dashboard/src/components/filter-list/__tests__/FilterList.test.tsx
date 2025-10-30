import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FilterList } from "../FilterList";

vi.mock("@assets", () => ({
  Close: () => <svg data-testid="close-icon" />,
}));

vi.mock("@hooks", () => ({
  useClickOutside: () => {},
}));

// Use real constants; pass explicit options in props for predictable behavior

describe("FilterList", () => {
  const options = [
    { id: "open", label: "Open" },
    { id: "closed", label: "Closed" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when closed", () => {
    const { container } = render(
      <FilterList
        isOpen={false}
        onClose={vi.fn()}
        onApply={vi.fn()}
        selectedFilters={[]}
        options={options}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders options and applies selected filters", () => {
    const onApply = vi.fn();
    render(
      <FilterList
        isOpen={true}
        onClose={vi.fn()}
        onApply={onApply}
        selectedFilters={[{ id: "open", label: "Open" }]}
        options={options}
      />,
    );

    // Open should be checked, closed unchecked
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);

    // Toggle closed
    fireEvent.click(checkboxes[1]);

    // Apply
    fireEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith([
      { id: "open", label: "Open" },
      { id: "closed", label: "Closed" },
    ]);
  });

  it("closes via close button", () => {
    const onClose = vi.fn();
    render(<FilterList isOpen={true} onClose={onClose} onApply={vi.fn()} selectedFilters={[]} />);

    const closeBtn = screen.getByTestId("close-icon").closest("button")!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
