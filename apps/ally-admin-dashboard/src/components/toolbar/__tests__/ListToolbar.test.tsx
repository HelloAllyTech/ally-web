import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ListToolbarProps, FilterChipProps } from "@components/types";

import { ListToolbar } from "../ListToolbar";

// Mock the assets
vi.mock("@assets", () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Add: () => <div data-testid="add-icon">+</div>,
}));

// Mock the Button component
vi.mock("@components", () => ({
  Button: ({ onClick, children, className, variant }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-testid="action-button"
    >
      {children}
    </button>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    common: {
      search: "Search...",
    },
  },
}));

// Mock formatCapitalizedEnum utility
vi.mock("@utils", () => ({
  formatCapitalizedEnum: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
}));

describe("ListToolbar", () => {
  const defaultProps: ListToolbarProps = {
    searchValue: "",
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders search input with default placeholder", () => {
      render(<ListToolbar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toBeInTheDocument();
    });

    it("renders search input with custom placeholder", () => {
      render(<ListToolbar {...defaultProps} placeholder="Search users..." />);

      const searchInput = screen.getByPlaceholderText("Search users...");
      expect(searchInput).toBeInTheDocument();
    });

    it("renders search icon", () => {
      const { container } = render(<ListToolbar {...defaultProps} />);

      // Carbon's Search draws its own magnifier, so there is no @assets search-icon testid to
      // find any more. Asserting on Carbon's magnifier class keeps the original intent —
      // "the field is visibly a search field" — without reintroducing a hand-rolled icon.
      expect(container.querySelector(".cds--search-magnifier-icon")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      const { container } = render(
        <ListToolbar {...defaultProps} className="custom-toolbar-class" />,
      );

      const toolbar = container.firstChild;
      expect(toolbar).toHaveClass("custom-toolbar-class");
    });

    it("renders without optional props", () => {
      render(<ListToolbar {...defaultProps} />);

      expect(screen.queryByTestId("action-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("plus-icon")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("displays search value in input", () => {
      render(<ListToolbar {...defaultProps} searchValue="test query" />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveValue("test query");
    });

    it("calls onSearchChange when typing in search input", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();

      render(<ListToolbar {...defaultProps} onSearchChange={mockOnSearchChange} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "a");

      expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
      expect(mockOnSearchChange).toHaveBeenCalledWith("a");
    });

    it("shows clear button when search value is not empty", () => {
      const { container } = render(<ListToolbar {...defaultProps} searchValue="test" />);

      // Carbon ALWAYS renders the clear button and hides it with a class, rather than mounting
      // it conditionally the way the old input did — so "shown" is the absence of that class.
      const clearButton = container.querySelector(".cds--search-close");
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).not.toHaveClass("cds--search-close--hidden");
    });

    it("does not show clear button when search value is empty", () => {
      const { container } = render(<ListToolbar {...defaultProps} searchValue="" />);

      expect(container.querySelector(".cds--search-close")).toHaveClass(
        "cds--search-close--hidden",
      );
    });

    it("clears search value when clear button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();

      render(
        <ListToolbar
          {...defaultProps}
          searchValue="test query"
          onSearchChange={mockOnSearchChange}
        />,
      );

      const clearButton = screen.getByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith("");
    });
  });

  describe("Filter Slot", () => {
    it("renders filter content when provided", () => {
      render(
        <ListToolbar {...defaultProps} filter={<div data-testid="access-filter">Filter</div>} />,
      );

      expect(screen.getByTestId("access-filter")).toBeInTheDocument();
    });

    it("does not render filter content when not provided", () => {
      render(<ListToolbar {...defaultProps} />);

      expect(screen.queryByTestId("access-filter")).not.toBeInTheDocument();
    });

    it("renders the filter in the same group as the search input", () => {
      render(
        <ListToolbar {...defaultProps} filter={<div data-testid="access-filter">Filter</div>} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      const filter = screen.getByTestId("access-filter");
      // Walk to the flex row that holds both, rather than a fixed number of parents: Carbon's
      // Search nests the input deeper than the bare <input> did, and counting levels is what
      // made this assertion brittle in the first place.
      const searchGroup = searchInput.closest(".cds--search")?.parentElement?.parentElement;
      expect(searchGroup).toContainElement(filter);
    });

    it("composes with the search input", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();

      render(
        <ListToolbar
          {...defaultProps}
          onSearchChange={mockOnSearchChange}
          filter={<div data-testid="access-filter">Filter</div>}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "a");

      expect(mockOnSearchChange).toHaveBeenCalledWith("a");
      expect(screen.getByTestId("access-filter")).toBeInTheDocument();
    });
  });

  describe("Filter Chips", () => {
    const mockFilterChips: FilterChipProps[] = [
      {
        label: "Status",
        value: "active",
        allValue: ["active", "inactive"],
        onClear: vi.fn(),
      },
      {
        label: "Role",
        value: "admin",
        allValue: ["admin", "user", "moderator"],
        onClear: vi.fn(),
      },
    ];

    it("renders filter chips when provided", () => {
      render(<ListToolbar {...defaultProps} filterChips={mockFilterChips} />);

      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Role:")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("does not render filter chips when array is empty", () => {
      render(<ListToolbar {...defaultProps} filterChips={[]} />);

      expect(screen.queryByText("Status:")).not.toBeInTheDocument();
      expect(screen.queryByText("Role:")).not.toBeInTheDocument();
    });

    it("calls onClear when filter chip close button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnClear = vi.fn();
      const chips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: ["active"],
          onClear: mockOnClear,
        },
      ];

      render(<ListToolbar {...defaultProps} filterChips={chips} />);

      const closeButtons = screen.getAllByTestId("close-icon");
      const chipCloseButton = closeButtons[0].parentElement as HTMLElement;
      await user.click(chipCloseButton);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it("displays tooltip with all filter values", () => {
      render(<ListToolbar {...defaultProps} filterChips={mockFilterChips} />);

      const statusChip = screen.getByText("Active");
      expect(statusChip).toBeInTheDocument();
    });

    it("renders multiple filter chips correctly", () => {
      const multipleChips: FilterChipProps[] = [
        {
          label: "Type",
          value: "simulation",
          allValue: ["simulation"],
          onClear: vi.fn(),
        },
        {
          label: "Status",
          value: "published",
          allValue: ["published"],
          onClear: vi.fn(),
        },
        {
          label: "Category",
          value: "medical",
          allValue: ["medical"],
          onClear: vi.fn(),
        },
      ];

      render(<ListToolbar {...defaultProps} filterChips={multipleChips} />);

      expect(screen.getByText("Type:")).toBeInTheDocument();
      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText("Category:")).toBeInTheDocument();
    });
  });

  describe("Add Filter Button", () => {
    it("renders add filter button when addFilterCta is provided", () => {
      const mockOnClick = vi.fn();
      const addFilterCta = {
        label: "Add Filter",
        onClick: mockOnClick,
      };

      render(<ListToolbar {...defaultProps} addFilterCta={addFilterCta} />);

      expect(screen.getByText("Add Filter")).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("does not render add filter button when addFilterCta is not provided", () => {
      render(<ListToolbar {...defaultProps} />);

      expect(screen.queryByText("Add Filter")).not.toBeInTheDocument();
    });

    it("calls onClick when add filter button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const addFilterCta = {
        label: "Add Filter",
        onClick: mockOnClick,
      };

      render(<ListToolbar {...defaultProps} addFilterCta={addFilterCta} />);

      const addFilterButton = screen.getByText("Add Filter");
      await user.click(addFilterButton);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("attaches ref to add filter button when provided", () => {
      const buttonRef = { current: null };
      const addFilterCta = {
        label: "Add Filter",
        onClick: vi.fn(),
      };

      render(
        <ListToolbar
          {...defaultProps}
          addFilterCta={addFilterCta}
          addFilterButtonRef={buttonRef as React.RefObject<HTMLButtonElement>}
        />,
      );

      expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);
      expect(buttonRef.current?.textContent).toContain("Add Filter");
    });
  });

  describe("Action Button", () => {
    it("renders action button when action is provided", () => {
      const action = {
        label: "Create New",
        onClick: vi.fn(),
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveTextContent("Create New");
    });

    it("does not render action button when action is not provided", () => {
      render(<ListToolbar {...defaultProps} />);

      expect(screen.queryByTestId("action-button")).not.toBeInTheDocument();
    });

    it("calls onClick when action button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const action = {
        label: "Create New",
        onClick: mockOnClick,
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      await user.click(actionButton);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("renders action button with custom icon", () => {
      const customIcon = <span data-testid="custom-icon">★</span>;
      const action = {
        label: "Create",
        onClick: vi.fn(),
        icon: customIcon,
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("renders action button with default plus icon when no icon provided", () => {
      const action = {
        label: "Create",
        onClick: vi.fn(),
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      expect(actionButton.textContent).toContain("+");
    });

    it("applies correct variant to action button", () => {
      const action = {
        label: "Delete",
        onClick: vi.fn(),
        variant: "danger" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      expect(actionButton).toHaveAttribute("data-variant", "danger");
    });
  });

  describe("Secondary Action Button", () => {
    it("renders the secondary action when provided", () => {
      const secondaryAction = {
        label: "Bulk Add",
        onClick: vi.fn(),
        variant: "secondary" as const,
      };

      render(<ListToolbar {...defaultProps} secondaryAction={secondaryAction} />);

      expect(screen.getByText("Bulk Add")).toBeInTheDocument();
    });

    it("does not render a secondary action when not provided", () => {
      render(<ListToolbar {...defaultProps} action={{ label: "Add", onClick: vi.fn() }} />);

      expect(screen.queryByText("Bulk Add")).not.toBeInTheDocument();
    });

    it("calls onClick when the secondary action is clicked", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(
        <ListToolbar
          {...defaultProps}
          secondaryAction={{ label: "Bulk Add", onClick: mockOnClick }}
        />,
      );

      await user.click(screen.getByText("Bulk Add"));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("renders both the primary and secondary actions together", () => {
      render(
        <ListToolbar
          {...defaultProps}
          action={{ label: "Add User", onClick: vi.fn() }}
          secondaryAction={{ label: "Bulk Add", onClick: vi.fn() }}
        />,
      );

      expect(screen.getByText("Add User")).toBeInTheDocument();
      expect(screen.getByText("Bulk Add")).toBeInTheDocument();
      expect(screen.getAllByTestId("action-button")).toHaveLength(2);
    });
  });

  describe("Combined Functionality", () => {
    it("renders all components together", () => {
      const mockFilterChips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: ["active"],
          onClear: vi.fn(),
        },
      ];

      const addFilterCta = {
        label: "Add Filter",
        onClick: vi.fn(),
      };

      const action = {
        label: "Create New",
        onClick: vi.fn(),
        variant: "primary" as const,
      };

      render(
        <ListToolbar
          {...defaultProps}
          searchValue="test"
          filterChips={mockFilterChips}
          addFilterCta={addFilterCta}
          action={action}
        />,
      );

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText("Add Filter")).toBeInTheDocument();
      expect(screen.getByTestId("action-button")).toBeInTheDocument();
    });

    it("maintains search value while interacting with other elements", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();
      const mockActionClick = vi.fn();

      const action = {
        label: "Create",
        onClick: mockActionClick,
        variant: "primary" as const,
      };

      render(
        <ListToolbar
          {...defaultProps}
          searchValue="test query"
          onSearchChange={mockOnSearchChange}
          action={action}
        />,
      );

      const actionButton = screen.getByTestId("action-button");
      await user.click(actionButton);

      expect(mockActionClick).toHaveBeenCalled();
      expect(screen.getByPlaceholderText("Search...")).toHaveValue("test query");
    });

    it("handles multiple filter chips with search", async () => {
      const user = userEvent.setup();
      const mockOnClear1 = vi.fn();
      const mockOnClear2 = vi.fn();

      const chips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: ["active"],
          onClear: mockOnClear1,
        },
        {
          label: "Role",
          value: "admin",
          allValue: ["admin"],
          onClear: mockOnClear2,
        },
      ];

      render(<ListToolbar {...defaultProps} searchValue="test" filterChips={chips} />);

      const closeButtons = screen.getAllByTestId("close-icon");

      // First close button should be for search clear
      await user.click(closeButtons[0].parentElement as HTMLElement);

      // Next close buttons are for filter chips
      await user.click(closeButtons[1].parentElement as HTMLElement);

      await waitFor(() => {
        expect(mockOnClear1).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Layout and Styling", () => {
    it("applies correct flex layout classes", () => {
      const { container } = render(<ListToolbar {...defaultProps} />);

      const toolbar = container.firstChild;
      expect(toolbar).toHaveClass("flex", "items-center", "justify-between");
    });

    it("applies min-height class to toolbar", () => {
      const { container } = render(<ListToolbar {...defaultProps} />);

      const toolbar = container.firstChild;
      expect(toolbar).toHaveClass("min-h-[50px]");
    });

    it("search input has correct styling classes", () => {
      render(<ListToolbar {...defaultProps} />);

      // Carbon owns the field's appearance now, so this asserts the Carbon input class and the
      // md size rather than the Tailwind utilities the hand-rolled input carried. Pinning the
      // size matters: it is what keeps all 32 toolbars at the same height as before.
      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveClass("cds--search-input");
      expect(searchInput.closest(".cds--search")).toHaveClass("cds--search--md");
    });

    it("filter chips have correct styling", () => {
      const chips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: ["active"],
          onClear: vi.fn(),
        },
      ];

      const { container } = render(<ListToolbar {...defaultProps} filterChips={chips} />);

      const chip = container.querySelector('[class*="rounded-[20px]"]');
      expect(chip).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty string search value", () => {
      render(<ListToolbar {...defaultProps} searchValue="" />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveValue("");
    });

    it("handles very long search value", () => {
      const longSearchValue = "a".repeat(1000);
      render(<ListToolbar {...defaultProps} searchValue={longSearchValue} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveValue(longSearchValue);
    });

    it("handles filter chip with empty allValue array", () => {
      const chips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: [],
          onClear: vi.fn(),
        },
      ];

      render(<ListToolbar {...defaultProps} filterChips={chips} />);

      expect(screen.getByText("Status:")).toBeInTheDocument();
    });

    it("handles filter chip with single value in allValue", () => {
      const chips: FilterChipProps[] = [
        {
          label: "Status",
          value: "active",
          allValue: ["active"],
          onClear: vi.fn(),
        },
      ];

      render(<ListToolbar {...defaultProps} filterChips={chips} />);

      // Carbon's Tooltip renders the label ("Active") in its popover too, so the
      // chip value ("Active") appears twice; target the chip value span.
      const chipValue = screen
        .getAllByText("Active")
        .find(el => el.className.includes("font-medium"));
      expect(chipValue).toBeInTheDocument();
    });

    it("handles action without onClick handler", () => {
      const action = {
        label: "View Only",
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      expect(actionButton).toBeInTheDocument();
    });

    it("handles addFilterCta without onClick handler", () => {
      const addFilterCta = {
        label: "Add Filter",
      };

      render(<ListToolbar {...defaultProps} addFilterCta={addFilterCta} />);

      expect(screen.getByText("Add Filter")).toBeInTheDocument();
    });

    it("handles special characters in search value", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();

      render(<ListToolbar {...defaultProps} onSearchChange={mockOnSearchChange} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "!@#$%^&*()");

      expect(mockOnSearchChange).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("search input is accessible", () => {
      render(<ListToolbar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveAttribute("placeholder");
    });

    it("buttons are keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockActionClick = vi.fn();

      const action = {
        label: "Create",
        onClick: mockActionClick,
        variant: "primary" as const,
      };

      render(<ListToolbar {...defaultProps} action={action} />);

      const actionButton = screen.getByTestId("action-button");
      actionButton.focus();

      await user.keyboard("{Enter}");

      expect(mockActionClick).toHaveBeenCalled();
    });

    it("clear search button is accessible", async () => {
      const user = userEvent.setup();
      const mockOnSearchChange = vi.fn();

      render(
        <ListToolbar {...defaultProps} searchValue="test" onSearchChange={mockOnSearchChange} />,
      );

      // Reachable BY ROLE AND NAME, which is the point of the test — the old markup had a
      // bare <button> with an icon and no accessible name at all, so this could only be found
      // through a testid.
      const clearButton = screen.getByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith("");
    });
  });
});
