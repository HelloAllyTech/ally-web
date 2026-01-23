import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { EditableTagList } from "../EditableTagList";

describe("EditableTagList Component", () => {
  const mockTags = ["bug", "feature", "urgent"];
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render list of editable tags", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      expect(screen.getByText("bug")).toBeInTheDocument();
      expect(screen.getByText("feature")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    it("should render remove buttons for all tags", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByText("×");
      expect(removeButtons).toHaveLength(3);
    });

    it("should render empty state with default text when tags is null", () => {
      render(<EditableTagList tags={null} onRemove={mockOnRemove} />);
      expect(screen.getByText("No tags")).toBeInTheDocument();
    });

    it("should render empty state with default text when tags is undefined", () => {
      render(<EditableTagList tags={undefined} onRemove={mockOnRemove} />);
      expect(screen.getByText("No tags")).toBeInTheDocument();
    });

    it("should render empty state with default text when tags is empty array", () => {
      render(<EditableTagList tags={[]} onRemove={mockOnRemove} />);
      expect(screen.getByText("No tags")).toBeInTheDocument();
    });

    it("should render custom empty text", () => {
      render(<EditableTagList tags={[]} onRemove={mockOnRemove} emptyText="No tags added yet" />);
      expect(screen.getByText("No tags added yet")).toBeInTheDocument();
    });

    it("should apply custom className to wrapper", () => {
      const { container } = render(
        <EditableTagList tags={mockTags} onRemove={mockOnRemove} className="custom-class" />,
      );
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("custom-class");
    });

    it("should apply default wrapper classes", () => {
      const { container } = render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("flex", "flex-wrap", "gap-2");
    });

    it("should apply custom tagClassName to all tags", () => {
      const { container } = render(
        <EditableTagList tags={mockTags} onRemove={mockOnRemove} tagClassName="bg-red-100" />,
      );
      const tags = container.querySelectorAll("span");

      tags.forEach(tag => {
        expect(tag).toHaveClass("bg-red-100");
      });
    });
  });

  describe("Interactions", () => {
    it("should call onRemove with correct index when first tag is removed", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[0]); // Remove "bug"

      expect(mockOnRemove).toHaveBeenCalledWith(0);
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("should call onRemove with correct index when middle tag is removed", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[1]); // Remove "feature"

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("should call onRemove with correct index when last tag is removed", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[2]); // Remove "urgent"

      expect(mockOnRemove).toHaveBeenCalledWith(2);
    });

    it("should call onRemove multiple times for multiple removals", () => {
      render(<EditableTagList tags={mockTags} onRemove={mockOnRemove} />);

      const removeButtons = screen.getAllByText("×");
      fireEvent.click(removeButtons[0]);
      fireEvent.click(removeButtons[1]);

      expect(mockOnRemove).toHaveBeenCalledTimes(2);
      expect(mockOnRemove).toHaveBeenNthCalledWith(1, 0);
      expect(mockOnRemove).toHaveBeenNthCalledWith(2, 1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single tag", () => {
      render(<EditableTagList tags={["single"]} onRemove={mockOnRemove} />);

      expect(screen.getByText("single")).toBeInTheDocument();
      expect(screen.getAllByText("×")).toHaveLength(1);
    });

    it("should handle tags with special characters", () => {
      render(<EditableTagList tags={["tag#1", "tag@2", "tag$3"]} onRemove={mockOnRemove} />);

      expect(screen.getByText("tag#1")).toBeInTheDocument();
      expect(screen.getByText("tag@2")).toBeInTheDocument();
      expect(screen.getByText("tag$3")).toBeInTheDocument();
    });

    it("should handle duplicate tags with correct indices", () => {
      render(
        <EditableTagList tags={["duplicate", "duplicate", "duplicate"]} onRemove={mockOnRemove} />,
      );

      const removeButtons = screen.getAllByText("×");
      expect(removeButtons).toHaveLength(3);

      fireEvent.click(removeButtons[1]); // Remove second duplicate
      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("should handle very long tag names", () => {
      const longTag = "This is an extremely long tag name that might wrap or need truncation";
      render(<EditableTagList tags={[longTag]} onRemove={mockOnRemove} />);

      expect(screen.getByText(longTag)).toBeInTheDocument();
    });

    it("should handle empty string tags", () => {
      render(<EditableTagList tags={["", "valid", ""]} onRemove={mockOnRemove} />);

      expect(screen.getByText("valid")).toBeInTheDocument();
      const removeButtons = screen.getAllByText("×");
      expect(removeButtons).toHaveLength(3); // All tags including empty ones
    });
  });

  describe("Prop Combinations", () => {
    it("should work with all custom props", () => {
      const { container } = render(
        <EditableTagList
          tags={["test"]}
          onRemove={mockOnRemove}
          emptyText="Custom empty"
          className="wrapper-class"
          tagClassName="tag-class"
        />,
      );

      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("wrapper-class");

      const tag = container.querySelector("span");
      expect(tag).toHaveClass("tag-class");
    });

    it("should prioritize showing tags over empty text when tags exist", () => {
      render(
        <EditableTagList tags={["exists"]} onRemove={mockOnRemove} emptyText="Should not show" />,
      );

      expect(screen.getByText("exists")).toBeInTheDocument();
      expect(screen.queryByText("Should not show")).not.toBeInTheDocument();
    });
  });

  describe("Component Updates", () => {
    it("should update when tags prop changes", () => {
      const { rerender } = render(<EditableTagList tags={["initial"]} onRemove={mockOnRemove} />);

      expect(screen.getByText("initial")).toBeInTheDocument();

      rerender(<EditableTagList tags={["updated"]} onRemove={mockOnRemove} />);

      expect(screen.queryByText("initial")).not.toBeInTheDocument();
      expect(screen.getByText("updated")).toBeInTheDocument();
    });

    it("should update from tags to empty state", () => {
      const { rerender } = render(
        <EditableTagList tags={["tag"]} onRemove={mockOnRemove} emptyText="Empty now" />,
      );

      expect(screen.getByText("tag")).toBeInTheDocument();

      rerender(<EditableTagList tags={[]} onRemove={mockOnRemove} emptyText="Empty now" />);

      expect(screen.queryByText("tag")).not.toBeInTheDocument();
      expect(screen.getByText("Empty now")).toBeInTheDocument();
    });

    it("should update from empty state to tags", () => {
      const { rerender } = render(
        <EditableTagList tags={[]} onRemove={mockOnRemove} emptyText="Empty" />,
      );

      expect(screen.getByText("Empty")).toBeInTheDocument();

      rerender(<EditableTagList tags={["new-tag"]} onRemove={mockOnRemove} emptyText="Empty" />);

      expect(screen.queryByText("Empty")).not.toBeInTheDocument();
      expect(screen.getByText("new-tag")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have button type for remove buttons", () => {
      render(<EditableTagList tags={["test"]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByText("×").closest("button");
      expect(removeButton).toHaveAttribute("type", "button");
    });

    it("should have cursor-pointer class on remove buttons", () => {
      render(<EditableTagList tags={["test"]} onRemove={mockOnRemove} />);

      const removeButton = screen.getByText("×").closest("button");
      expect(removeButton).toHaveClass("cursor-pointer");
    });
  });
});
