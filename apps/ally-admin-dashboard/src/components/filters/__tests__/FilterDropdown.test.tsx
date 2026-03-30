import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FilterDropdown } from "../FilterDropdown";

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    Trash: () => <svg data-testid="trash-icon" />,
  };
});

// Use real constants to avoid side-effects; test with generic expectations

// Use real utils to avoid breaking other exports

describe("FilterDropdown", () => {
  const anchorRect = { top: 0, left: 10, bottom: 20, right: 200, height: 20, width: 190 } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when closed", () => {
    const { container } = render(
      <FilterDropdown
        isOpen={false}
        onClose={vi.fn()}
        organizations={["org1", "org2"]}
        onApplyFilters={vi.fn()}
        anchorRect={anchorRect}
        currentFilters={{ organizations: [], roles: [], statuses: [] }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("closes on overlay click and ESC key", () => {
    const onClose = vi.fn();
    render(
      <FilterDropdown
        isOpen={true}
        onClose={onClose}
        organizations={[]}
        onApplyFilters={vi.fn()}
        anchorRect={anchorRect}
        currentFilters={{ organizations: [], roles: [], statuses: [] }}
      />,
    );

    // Overlay click
    const overlay = document.querySelector(".fixed.inset-0") as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);

    // ESC key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("navigates to sublist, selects items, shows count and applies filters", () => {
    const onApply = vi.fn();
    render(
      <FilterDropdown
        isOpen={true}
        onClose={vi.fn()}
        organizations={["org1", "org2"]}
        onApplyFilters={onApply}
        anchorRect={anchorRect}
        currentFilters={{ organizations: ["org1"], roles: ["viewer"], statuses: [] }}
      />,
    );

    // Open organization sublist (text may vary like Organisation)
    const orgButton = screen.getByText(/organ/i);
    fireEvent.click(orgButton);

    // org1 is checked initilifeline, toggle org2
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
    fireEvent.click(checkboxes[1]);

    // Apply
    fireEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledTimes(1);
    const args = (onApply as any).mock.calls[0][0];
    expect(args.organizations).toEqual(["org1", "org2"]);
  });

  it("clears a filter section", () => {
    render(
      <FilterDropdown
        isOpen={true}
        onClose={vi.fn()}
        organizations={["org1"]}
        onApplyFilters={vi.fn()}
        anchorRect={anchorRect}
        currentFilters={{ organizations: ["org1"], roles: [], statuses: [] }}
      />,
    );

    // Open organization sublist
    const orgButton = screen.getByText(/organ/i);
    fireEvent.click(orgButton);

    // Click clear (trash)
    const clearBtn = screen.getByTestId("trash-icon").closest("button")!;
    fireEvent.click(clearBtn);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });
});
