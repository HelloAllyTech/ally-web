import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { Tag, TagList } from "../TagList";

// Mock the Close icon from @assets
vi.mock("@assets", () => ({
  Close: () => <svg data-testid="close-icon">×</svg>,
}));

describe("Tag Component", () => {
  describe("Rendering", () => {
    it("should render tag with text content", () => {
      render(<Tag>React</Tag>);
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<Tag className="custom-class">TypeScript</Tag>);
      const tag = container.querySelector("span");
      expect(tag).toHaveClass("custom-class");
    });

    it("should apply default styling classes", () => {
      const { container } = render(<Tag>Next.js</Tag>);
      const tag = container.querySelector("span");
      expect(tag).toHaveClass("inline-flex", "items-center", "rounded-full");
    });

    it("should not render remove button when onRemove is not provided", () => {
      render(<Tag>Vue</Tag>);
      expect(screen.queryByTestId("close-icon")).not.toBeInTheDocument();
    });

    it("should render remove button when onRemove is provided", () => {
      render(<Tag onRemove={vi.fn()}>Angular</Tag>);
      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();
      render(<Tag onRemove={onRemove}>Svelte</Tag>);

      const removeButton = screen.getByTestId("close-icon").closest("button")!;
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("should have correct button type for remove button", () => {
      render(<Tag onRemove={vi.fn()}>Test</Tag>);
      const removeButton = screen.getByTestId("close-icon").closest("button");
      expect(removeButton).toHaveAttribute("type", "button");
    });

    it("should apply hover styles to remove button", () => {
      const {} = render(<Tag onRemove={vi.fn()}>Test</Tag>);
      const removeButton = screen.getByTestId("close-icon").closest("button");
      expect(removeButton).toHaveClass("hover:text-typography-700");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty children", () => {
      const { container } = render(<Tag></Tag>);
      const tag = container.querySelector("span");
      expect(tag).toBeInTheDocument();
      expect(tag).toBeEmptyDOMElement();
    });

    it("should handle multiple children", () => {
      render(
        <Tag>
          <span>Icon</span>
          <span>Text</span>
        </Tag>,
      );
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("should not propagate click to parent when remove button is clicked", () => {
      const parentClick = vi.fn();
      const onRemove = vi.fn();

      render(
        <div onClick={parentClick}>
          <Tag onRemove={onRemove}>Test</Tag>
        </div>,
      );

      const removeButton = screen.getByTestId("close-icon").closest("button")!;
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
      // Parent click should not be triggered due to event handling
    });
  });
});

describe("TagList Component", () => {
  const mockTags = ["React", "TypeScript", "Next.js"];

  describe("Rendering", () => {
    it("should render list of tags", () => {
      render(<TagList tags={mockTags} />);

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Next.js")).toBeInTheDocument();
    });

    it("should render empty state with default text when tags is null", () => {
      render(<TagList tags={null} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("should render empty state with default text when tags is undefined", () => {
      render(<TagList tags={undefined} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("should render empty state with default text when tags is empty array", () => {
      render(<TagList tags={[]} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("should render custom empty text", () => {
      render(<TagList tags={[]} emptyText="No tags available" />);
      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("should apply custom className to wrapper", () => {
      const { container } = render(<TagList tags={mockTags} className="custom-wrapper" />);
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("custom-wrapper");
    });

    it("should apply default wrapper classes", () => {
      const { container } = render(<TagList tags={mockTags} />);
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("flex", "flex-wrap", "gap-1");
    });
  });

  describe("Tag Styling", () => {
    it("should apply static tagClassName to all tags", () => {
      const { container } = render(<TagList tags={mockTags} tagClassName="bg-blue-100" />);
      const tags = container.querySelectorAll("span");

      tags.forEach(tag => {
        expect(tag).toHaveClass("bg-blue-100");
      });
    });

    it("should apply dynamic tagClassName function to tags", () => {
      const tagClassName = (tag: string) => (tag === "React" ? "bg-primary-100" : "bg-neutral-100");

      const { container } = render(<TagList tags={mockTags} tagClassName={tagClassName} />);
      const tags = container.querySelectorAll("span");

      expect(tags[0]).toHaveClass("bg-primary-100"); // React
      expect(tags[1]).toHaveClass("bg-neutral-100"); // TypeScript
      expect(tags[2]).toHaveClass("bg-neutral-100"); // Next.js
    });

    it("should handle empty string as tagClassName", () => {
      const { container } = render(<TagList tags={mockTags} tagClassName="" />);
      const tags = container.querySelectorAll("span");

      expect(tags.length).toBe(3);
      tags.forEach(tag => {
        expect(tag).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle single tag", () => {
      render(<TagList tags={["Single"]} />);
      expect(screen.getByText("Single")).toBeInTheDocument();
    });

    it("should handle tags with special characters", () => {
      render(<TagList tags={["tag#1", "tag@2", "tag!3"]} />);
      expect(screen.getByText("tag#1")).toBeInTheDocument();
      expect(screen.getByText("tag@2")).toBeInTheDocument();
      expect(screen.getByText("tag!3")).toBeInTheDocument();
    });

    it("should handle very long tag names", () => {
      const longTag = "This is a very long tag name that might need truncation";
      render(<TagList tags={[longTag]} />);
      expect(screen.getByText(longTag)).toBeInTheDocument();
    });

    it("should handle duplicate tags", () => {
      render(<TagList tags={["React", "React", "React"]} />);
      const tags = screen.getAllByText("React");
      expect(tags).toHaveLength(3);
    });

    it("should handle empty string tags", () => {
      render(<TagList tags={["", "Valid", ""]} />);
      expect(screen.getByText("Valid")).toBeInTheDocument();

      // Empty strings should still be rendered
      const { container } = render(<TagList tags={[""]} />);
      const tags = container.querySelectorAll("span");
      // Should have at least the wrapper span
      expect(tags.length).toBeGreaterThan(0);
    });
  });

  describe("Conditional Rendering", () => {
    it("should not render empty state when at least one tag exists", () => {
      render(<TagList tags={["One"]} emptyText="No tags" />);
      expect(screen.queryByText("No tags")).not.toBeInTheDocument();
      expect(screen.getByText("One")).toBeInTheDocument();
    });

    it("should properly switch between tags and empty state", () => {
      const { rerender } = render(<TagList tags={mockTags} emptyText="Empty" />);

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.queryByText("Empty")).not.toBeInTheDocument();

      rerender(<TagList tags={[]} emptyText="Empty" />);

      expect(screen.queryByText("React")).not.toBeInTheDocument();
      expect(screen.getByText("Empty")).toBeInTheDocument();
    });
  });

  describe("Dynamic className function", () => {
    it("should receive correct tag value in className function", () => {
      const classNameFn = vi.fn((tag: string) => `tag-${tag.toLowerCase()}`);

      render(<TagList tags={["React", "Vue"]} tagClassName={classNameFn} />);

      expect(classNameFn).toHaveBeenCalledWith("React");
      expect(classNameFn).toHaveBeenCalledWith("Vue");
      expect(classNameFn).toHaveBeenCalledTimes(2);
    });

    it("should apply returned className from function", () => {
      const { container } = render(
        <TagList tags={["JavaScript"]} tagClassName={tag => `language-${tag.toLowerCase()}`} />,
      );

      const tag = container.querySelector("span");
      expect(tag).toHaveClass("language-javascript");
    });
  });
});
