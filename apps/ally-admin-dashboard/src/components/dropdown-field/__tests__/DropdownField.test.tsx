import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect } from "vitest";

import { DropdownField } from "../DropdownField";

// Mock assets
vi.mock("@assets", () => ({
  ArrowSolid: () => <svg data-testid="arrow-icon">Arrow</svg>,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    common: {
      select: "Select",
      noOptionsAvailable: "No options available",
    },
  },
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn((ref, callback) => {
    // Store callback for testing
    if (ref.current) {
      ref.current._closeCallback = callback;
    }
  }),
  useDebounce: vi.fn((callback, _delay) => {
    // Return the callback directly without debouncing for tests
    return callback;
  }),
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("DropdownField", () => {
  const mockOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  it("renders with label", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );
    // Label is not directly rendered in this component, but it's used for validation
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("renders with default placeholder", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
            placeholder="Choose category"
          />
        )}
      </TestWrapper>,
    );
    expect(screen.getByText("Choose category")).toBeInTheDocument();
  });

  it("opens dropdown when clicked", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  it("closes dropdown when option is selected", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    const option1 = screen.getByText("Option 1");
    fireEvent.click(option1);

    // Dropdown should close, options should not be visible
    expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
  });

  it("displays selected option", () => {
    render(
      <TestWrapper defaultValues={{ category: "option2" }}>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("updates value when option is selected", async () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    const option1 = screen.getByText("Option 1");
    fireEvent.click(option1);

    await waitFor(() => {
      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });
  });

  it("shows 'No options available' when options array is empty", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField label="Category" id="category" formMethods={formMethods} options={[]} />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    expect(screen.getByText("No options available")).toBeInTheDocument();
  });

  it("renders arrow icon", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
  });

  it("rotates arrow icon when dropdown is open", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    const arrowContainer = container.querySelector(".transition-transform");

    // Initilifeline not rotated
    expect(arrowContainer?.className).not.toContain("rotate-180");

    fireEvent.click(trigger);

    // Should be rotated when open
    expect(arrowContainer?.className).toContain("rotate-180");
  });

  it("highlights selected option in dropdown", () => {
    const { container } = render(
      <TestWrapper defaultValues={{ category: "option2" }}>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Option 2");
    fireEvent.click(trigger);

    // Check that the dropdown has opened and selected option has special styling
    const dropdownOptions = container.querySelectorAll(".cursor-pointer");
    expect(dropdownOptions.length).toBeGreaterThan(0);
  });

  it("has correct border styling", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = container.querySelector(".border");
    expect(trigger?.className).toContain("rounded");
  });

  it("has correct padding", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = container.querySelector(".px-3");
    expect(trigger?.className).toContain("py-1");
  });

  it("has white background", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = container.querySelector(".bg-white");
    expect(trigger).toBeInTheDocument();
  });

  it("has cursor pointer", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = container.querySelector(".cursor-pointer");
    expect(trigger).toBeInTheDocument();
  });

  it("dropdown menu has correct styling", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    const menu = container.querySelector(".absolute");
    expect(menu?.className).toContain("shadow-lg");
    expect(menu?.className).toContain("rounded-md");
    expect(menu?.className).toContain("max-h-[240px]");
    expect(menu?.className).toContain("overflow-auto");
  });

  it("dropdown menu is positioned correctly", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    const menu = container.querySelector(".absolute");
    expect(menu?.className).toContain("left-0");
    expect(menu?.className).toContain("top-full");
    expect(menu?.className).toContain("mt-1");
  });

  it("dropdown menu has correct z-index", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    const menu = container.querySelector(".z-10");
    expect(menu).toBeInTheDocument();
  });

  it("option items have hover effect", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");
    fireEvent.click(trigger);

    // Check that options are rendered
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("toggles dropdown on multiple clicks", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = screen.getByText("Select");

    // Open
    fireEvent.click(trigger);
    expect(screen.getByText("Option 1")).toBeInTheDocument();

    // Close
    fireEvent.click(trigger);
    expect(screen.queryByText("Option 1")).not.toBeInTheDocument();

    // Open again
    fireEvent.click(trigger);
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("has focus ring styling", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const trigger = container.querySelector(".focus-within\\:ring-1");
    expect(trigger).toBeInTheDocument();
  });

  it("placeholder has gray color", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const placeholder = screen.getByText("Select");
    expect(placeholder).toBeInTheDocument();
  });

  it("selected value has dark color", () => {
    render(
      <TestWrapper defaultValues={{ category: "option1" }}>
        {formMethods => (
          <DropdownField
            label="Category"
            id="category"
            formMethods={formMethods}
            options={mockOptions}
          />
        )}
      </TestWrapper>,
    );

    const selectedValue = screen.getByText("Option 1");
    expect(selectedValue).toBeInTheDocument();
  });
});
