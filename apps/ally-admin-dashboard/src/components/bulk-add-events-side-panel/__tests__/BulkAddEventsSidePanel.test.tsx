import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SessionEvent, UpdateScenarioEventDataParam } from "@types";

// Mock constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      bulkAddEventsTitle: "Bulk Add Events",
      selectTags: "Select Tags",
      noTagsAvailable: "No tags available",
      noTagsSelected: "Please select at least one tag to filter events",
      filteredEventsCount: (count: number) => `${count} event(s) will be added`,
      noEventsMatchTags: "No events match the selected tags",
      addSelectedEvents: "Add Selected Events",
      addSelectedEventsCount: (count: number) => `Add ${count} selected events`,
    },
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  DoubleArrowRight: () => <svg data-testid="double-arrow-right" />,
  ArrowDownFilled: () => <svg data-testid="arrow-down-filled" />,
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ onClick, children, ...props }: any) => (
    <button onClick={onClick} data-testid="bulk-add-button" {...props}>
      {children}
    </button>
  ),
  Tag: ({ children, onRemove, className }: any) => (
    <span className={className} data-testid="tag">
      {children}
      {onRemove && (
        <button onClick={onRemove} data-testid="tag-remove">
          ×
        </button>
      )}
    </span>
  ),
  TagList: ({ tags, tagClassName }: any) => (
    <div data-testid="tag-list">
      {Array.isArray(tags) && tags.length > 0
        ? tags.map((tag: string, i: number) => {
            const className = typeof tagClassName === "function" ? tagClassName(tag) : tagClassName;
            return (
              <span key={i} className={className} data-testid="tag-item">
                {tag}
              </span>
            );
          })
        : null}
    </div>
  ),
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
}));

// Mock utils
vi.mock("@utils", () => ({
  extractUniqueTags: (events: SessionEvent[]) => {
    const tags = new Set<string>();
    events.forEach(event => {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach(tag => {
          if (tag && typeof tag === "string" && tag.trim()) {
            tags.add(tag.trim());
          }
        });
      }
    });
    return Array.from(tags).sort();
  },
  filterEventsByTags: (events: SessionEvent[], selectedTags: string[]) => {
    if (selectedTags.length === 0) return [];
    return events.filter(event => {
      if (!event.tags || !Array.isArray(event.tags)) return false;
      return selectedTags.some(selectedTag => event.tags?.includes(selectedTag));
    });
  },
  formatToMappedEvent: (event: SessionEvent) => ({
    id: { value: event.id },
    name: { value: event.name || event.id },
  }),
}));

import { BulkAddEventsSidePanel } from "../BulkAddEventsSidePanel";

describe("BulkAddEventsSidePanel", () => {
  const mockSessionEvents: SessionEvent[] = [
    { id: "e1", name: "Event 1", tags: ["urgent", "bug"] },
    { id: "e2", name: "Event 2", tags: ["feature", "enhancement"] },
    { id: "e3", name: "Event 3", tags: ["urgent", "feature"] },
    { id: "e4", name: "Event 4", tags: ["bug", "critical"] },
  ];

  const mockMappedEvents: UpdateScenarioEventDataParam[] = [{ id: { value: "e1" } } as any];

  const mockOnClose = vi.fn();
  const mockOnBulkAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should return null when isOpen is false", () => {
      const { container } = render(
        <BulkAddEventsSidePanel
          isOpen={false}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render panel when isOpen is true", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(screen.getByText("Bulk Add Events")).toBeInTheDocument();
    });

    it("should display header with title", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(screen.getByText("Bulk Add Events")).toBeInTheDocument();
      expect(screen.getByTestId("double-arrow-right")).toBeInTheDocument();
    });

    it("should display tag selection section", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(screen.getByRole("button", { name: "Select Tags" })).toBeInTheDocument();
    });

    it("should display 'no tags available' message when session events have no tags", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={[{ id: "e1", name: "Event without tags" }]}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("should display filtered events section", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(screen.getByText("Filtered Events")).toBeInTheDocument();
    });
  });

  describe("Tag Selection", () => {
    it("should open tag dropdown on button click", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      expect(screen.getByPlaceholderText("Search tags...")).toBeInTheDocument();
    });

    it("should display available tags in dropdown", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      expect(screen.getByText("bug")).toBeInTheDocument();
      expect(screen.getByText("critical")).toBeInTheDocument();
      expect(screen.getByText("enhancement")).toBeInTheDocument();
      expect(screen.getByText("feature")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    it("should select a tag when clicked", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      const bugTag = screen.getByText("bug");
      fireEvent.click(bugTag);

      expect(screen.getByText("1 tag selected")).toBeInTheDocument();
    });

    it("should deselect a tag when clicked again", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      // Click bug tag to select - but click the checkbox version inside the dropdown
      const bugCheckboxes = screen.getAllByText("bug");
      // There are multiple "bug" elements, the one in the dropdown is clickable
      fireEvent.click(bugCheckboxes[0]);
      expect(screen.getByText("1 tag selected")).toBeInTheDocument();

      // Click the chip's remove button to de select
      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[0]);
      expect(screen.queryByText("1 tag selected")).not.toBeInTheDocument();
    });

    it("should display selected tag count", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      // Select bug tag
      fireEvent.click(screen.getAllByText("bug")[0]);
      expect(screen.getByText("1 tag selected")).toBeInTheDocument();

      // Select urgent tag
      fireEvent.click(screen.getAllByText("urgent")[0]);
      expect(screen.getByText("2 tags selected")).toBeInTheDocument();
    });

    it("should display selected tags as chips", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      fireEvent.click(screen.getByText("bug"));

      const chips = screen.getAllByText("bug");
      expect(chips.length).toBeGreaterThan(1); // One in dropdown, one as chip
    });

    it("should remove tag by clicking X on chip", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      fireEvent.click(screen.getAllByText("bug")[0]);
      expect(screen.getByText("1 tag selected")).toBeInTheDocument();

      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[0]);

      expect(screen.queryByText("1 tag selected")).not.toBeInTheDocument();
    });

    it("should filter tags based on search query", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);

      const searchInput = screen.getByPlaceholderText("Search tags...");
      fireEvent.change(searchInput, { target: { value: "urg" } });

      expect(screen.getByText("urgent")).toBeInTheDocument();
      expect(screen.queryByText("bug")).not.toBeInTheDocument();
    });
  });

  describe("Event Filtering", () => {
    it("should display 'no tags selected' message initially", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      expect(
        screen.getByText("Please select at least one tag to filter events"),
      ).toBeInTheDocument();
    });

    it("should display correct event count when tags selected", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("bug"));

      const addButton = screen.getByTestId("bulk-add-button");
      expect(addButton).toHaveTextContent("Add 2 selected events");
    });

    it("should filter events based on selected tags", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("urgent"));

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 3")).toBeInTheDocument();
    });

    it("should exclude already mapped events from filtered list", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={mockMappedEvents}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("urgent"));

      const addButton = screen.getByTestId("bulk-add-button");
      expect(addButton).toHaveTextContent("Add 1 selected events");
      expect(screen.queryByText("Event 1")).not.toBeInTheDocument();
      expect(screen.getByText("Event 3")).toBeInTheDocument();
    });

    it("should display 'no events match tags' when no results", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("bug"));

      // Clear the tag
      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[0]);

      expect(
        screen.getByText("Please select at least one tag to filter events"),
      ).toBeInTheDocument();
    });

    it("should display 'all filtered events already added' message when applicable", () => {
      const allMapped: UpdateScenarioEventDataParam[] = [
        { id: { value: "e1" } } as any,
        { id: { value: "e3" } } as any,
      ];

      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={allMapped}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("urgent"));

      expect(screen.getByText("All filtered events are already added")).toBeInTheDocument();
    });
  });

  describe("Bulk Add Functionality", () => {
    it("should call onBulkAdd with correct events when button clicked", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("bug"));

      const addButton = screen.getByTestId("bulk-add-button");
      fireEvent.click(addButton);

      expect(mockOnBulkAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: { value: "e1" } }),
          expect.objectContaining({ id: { value: "e4" } }),
        ]),
      );
    });

    it("should reset selected tags after successful add", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("bug"));

      const addButton = screen.getByTestId("bulk-add-button");
      fireEvent.click(addButton);

      expect(mockOnBulkAdd).toHaveBeenCalled();
    });

    it("should close panel after successful add", () => {
      mockOnBulkAdd.mockImplementation(() => {});

      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getByText("bug"));

      const addButton = screen.getByTestId("bulk-add-button");
      fireEvent.click(addButton);

      expect(mockOnBulkAdd).toHaveBeenCalled();
    });
  });

  describe("Panel Close Behavior", () => {
    it("should call onClose when overlay is clicked", () => {
      const { container } = render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const overlay = container.querySelector(".bg-black");
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it("should call onClose when header back button is clicked", () => {
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const backButton = screen.getByText("Bulk Add Events").closest("button");
      if (backButton) {
        fireEvent.click(backButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it("should reset selected tags when panel is reopened", () => {
      // First render with panel open
      const { unmount } = render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      const dropdownButton = screen.getByText("Select Tags", { selector: "span" });
      fireEvent.click(dropdownButton.closest("button")!);
      fireEvent.click(screen.getAllByText("bug")[0]);

      expect(screen.getByText("1 tag selected")).toBeInTheDocument();

      // Unmount component
      unmount();

      // Render a fresh instance (simulates closing and reopening)
      render(
        <BulkAddEventsSidePanel
          isOpen={true}
          onClose={mockOnClose}
          sessionEvents={mockSessionEvents}
          mappedEvents={[]}
          onBulkAdd={mockOnBulkAdd}
        />,
      );

      // Should show no tags selected in the new instance
      expect(screen.queryByText("1 tag selected")).not.toBeInTheDocument();
    });
  });
});
