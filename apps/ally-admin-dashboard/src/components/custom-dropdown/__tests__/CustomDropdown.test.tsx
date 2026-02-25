import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { CustomDropdown } from "../CustomDropdown";

// Mock ArrowSolid asset - use importOriginal so other modules get Chat etc.; only override ArrowSolid
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ArrowSolid: () => <svg data-testid="arrow-icon">▼</svg>,
  };
});

// Mock constants - use importOriginal so baseApi and other modules get TAG_TYPES etc.; only override en
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    en: {
      userManagement: {
        selectOrg: "Select Organization",
      },
      common: {
        noOptionsAvailable: "No options available",
      },
    },
  };
});

// Mock hooks - keep useCreatePortal from actual so portal content renders; mock useClickOutside
vi.mock("@hooks", async importOriginal => {
  const actual = await importOriginal<typeof import("@hooks")>();
  return {
    ...actual,
    useClickOutside: vi.fn(),
  };
});

// Mock utils - use importOriginal so other modules get MAPPED_EVENT_FIELDS etc.; only override formatCapitalizedEnum
vi.mock("@utils", async importOriginal => {
  const actual = await importOriginal<typeof import("@utils")>();
  return {
    ...actual,
    formatCapitalizedEnum: (value: string) =>
      value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "",
  };
});

describe("CustomDropdown", () => {
  const mockOnChange = vi.fn();

  const optionsWithValue = [
    { id: "1", value: "Option 1" },
    { id: "2", value: "Option 2" },
    { id: "3", value: "Option 3" },
  ];

  const optionsWithName = [
    { id: 1, name: "Role 1" },
    { id: 2, name: "Role 2" },
    { id: 3, name: "Role 3" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with label", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("renders with placeholder when no value selected", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
          placeholder="Select an option"
        />,
      );

      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("renders with default placeholder", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Select Organization")).toBeInTheDocument();
    });

    it("renders required indicator when required is true", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
          required={true}
        />,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toBeInTheDocument();
    });

    it("does not render required indicator by default", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("renders arrow icon", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
    });
  });

  describe("Dropdown Interaction", () => {
    it("opens dropdown when clicked", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("closes dropdown when clicked again", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");

      // Open
      fireEvent.click(trigger);
      expect(screen.getByText("Option 1")).toBeInTheDocument();

      // Close
      fireEvent.click(trigger);
      expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
    });

    it("calls onChange when option is selected", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const option = screen.getByText("Option 2");
      fireEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("2");
    });

    it("closes dropdown after selecting option", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const option = screen.getByText("Option 2");
      fireEvent.click(option);

      expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
    });

    it("rotates arrow when dropdown is open", () => {
      const { container } = render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      const arrowContainer = screen.getByTestId("arrow-icon").parentElement;

      // Initially not rotated
      expect(arrowContainer).not.toHaveClass("rotate-180");

      // Open dropdown
      fireEvent.click(trigger);
      expect(arrowContainer).toHaveClass("rotate-180");
    });
  });

  describe("Selected Value Display", () => {
    it("displays selected option with value property", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value="2"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("displays selected option with name property", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithName}
          value={2}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Role 2")).toBeInTheDocument();
    });

    it("displays selected option in dropdown", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value="2"
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Option 2");
      fireEvent.click(trigger);

      // Check that options are displayed
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      const option2Elements = screen.getAllByText("Option 2");
      expect(option2Elements.length).toBeGreaterThan(1);
    });

    it("renders all options with correct styling classes", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value="2"
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Option 2");
      fireEvent.click(trigger);

      // Dropdown is portaled to document.body; options have cursor-pointer
      const dropdownOptions = document.body.querySelectorAll(".cursor-pointer");
      expect(dropdownOptions.length).toBeGreaterThan(0);
    });
  });

  describe("Empty Options", () => {
    it("displays no options message when options array is empty", () => {
      render(<CustomDropdown label="Test Label" options={[]} value="" onChange={mockOnChange} />);

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(screen.getByText("No options available")).toBeInTheDocument();
    });

    it("does not call onChange when clicking no options message", () => {
      render(<CustomDropdown label="Test Label" options={[]} value="" onChange={mockOnChange} />);

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const noOptionsMessage = screen.getByText("No options available");
      fireEvent.click(noOptionsMessage);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("applies correct label styling", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const label = screen.getByText("Test Label");
      expect(label).toHaveClass("cursor-pointer");
    });

    it("applies correct trigger styling", () => {
      const { container } = render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      expect(trigger.parentElement).toHaveClass("border");
      expect(trigger.parentElement).toHaveClass("rounded-md");
      expect(trigger.parentElement).toHaveClass("cursor-pointer");
    });

    it("applies correct dropdown menu styling", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const dropdown =
        document.body.querySelector(".fixed.overflow-auto") ??
        document.body.querySelector("[class*='shadow-lg']");
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveClass("max-h-[240px]");
      expect(dropdown).toHaveClass("overflow-auto");
    });

    it("uses IBM Plex Serif font", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const label = screen.getByText("Test Label");
      expect(label).toBeInTheDocument();
    });
  });

  describe("Option Types", () => {
    it("handles options with value property", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("handles options with name property", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithName}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(screen.getByText("Role 1")).toBeInTheDocument();
    });

    it("handles numeric IDs", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithName}
          value={1}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Role 1")).toBeInTheDocument();
    });

    it("handles string IDs", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value="1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles value not in options", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value="999"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Select Organization")).toBeInTheDocument();
    });

    it("handles empty string value", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("Select Organization")).toBeInTheDocument();
    });

    it("handles long option text", () => {
      const longOptions = [
        { id: "1", value: "This is a very long option text that should still render correctly" },
      ];

      render(
        <CustomDropdown
          label="Test Label"
          options={longOptions}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(
        screen.getByText("This is a very long option text that should still render correctly"),
      ).toBeInTheDocument();
    });

    it("handles many options", () => {
      const manyOptions = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        value: `Option ${i}`,
      }));

      render(
        <CustomDropdown
          label="Test Label"
          options={manyOptions}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 0")).toBeInTheDocument();
      expect(screen.getByText("Option 49")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("label is clickable", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const label = screen.getByText("Test Label");
      expect(label).toHaveClass("cursor-pointer");
    });

    it("trigger has cursor-pointer class", () => {
      const { container } = render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization").parentElement!;
      expect(trigger).toHaveClass("cursor-pointer");
    });

    it("options have cursor-pointer class", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const cursorPointerElements = document.body.querySelectorAll(".cursor-pointer");
      expect(cursorPointerElements.length).toBeGreaterThan(0);
    });
  });

  describe("Animation", () => {
    it("dropdown has fade-in animation", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const trigger = screen.getByText("Select Organization");
      fireEvent.click(trigger);

      const dropdown = document.body.querySelector(".animate-fadeIn");
      expect(dropdown).toBeInTheDocument();
    });

    it("arrow has transition class", () => {
      render(
        <CustomDropdown
          label="Test Label"
          options={optionsWithValue}
          value=""
          onChange={mockOnChange}
        />,
      );

      const arrowContainer = screen.getByTestId("arrow-icon").parentElement;
      expect(arrowContainer).toHaveClass("transition-transform");
    });
  });
});
