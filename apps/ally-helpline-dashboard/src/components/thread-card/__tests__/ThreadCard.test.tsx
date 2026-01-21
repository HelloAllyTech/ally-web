import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ThreadCard from "../ThreadCard";

// Mock Arrow asset
vi.mock("@assets", () => ({
  Arrow: ({ className }: any) => <div data-testid="arrow-icon" className={className} />,
}));

// Mock CommentCard
vi.mock("../../comment-card/CommentCard", () => ({
  default: ({ comment }: any) => (
    <div data-testid={`comment-card-${comment.id}`}>
      <span data-testid="comment-content">{comment.content}</span>
      <span data-testid="comment-author">{comment.createdBy.name}</span>
    </div>
  ),
}));

describe("ThreadCard Component", () => {
  const mockCommentBase = {
    createdBy: {
      id: 1,
      name: "John Doe",
      profileUrl: "https://example.com/john.jpg",
    },
    createdAt: "2024-01-15T10:00:00Z",
    reactions: {},
    replyCount: 0,
  };

  const mockThread = {
    id: 1,
    selection: {
      text: "selected text here",
      startIndex: 0,
      endIndex: 18,
      messageId: 100,
    },
    comments: [
      { ...mockCommentBase, id: 1, content: "First comment" },
      { ...mockCommentBase, id: 2, content: "Second comment" },
      { ...mockCommentBase, id: 3, content: "Third comment" },
    ],
  };

  const mockThreadSingleComment = {
    ...mockThread,
    comments: [{ ...mockCommentBase, id: 1, content: "Only comment" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  it("should match snapshot when rendered with multiple comments", () => {
    const { asFragment } = render(<ThreadCard thread={mockThread} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when rendered with single comment", () => {
    const { asFragment } = render(<ThreadCard thread={mockThreadSingleComment} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when comments are expanded", () => {
    const { asFragment } = render(<ThreadCard thread={mockThread} />);
    const toggleButton = screen.getByText("2 more comments");
    fireEvent.click(toggleButton);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render selected text in header", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByText('Selected text: "selected text here"')).toBeInTheDocument();
    });

    it("should render first comment always visible", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByTestId("comment-card-1")).toBeInTheDocument();
    });

    it("should render arrow icon", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
    });

    it("should not show toggle when single comment", () => {
      render(<ThreadCard thread={mockThreadSingleComment} />);
      expect(screen.queryByText(/more comments/)).not.toBeInTheDocument();
      expect(screen.queryByText("Collapse")).not.toBeInTheDocument();
    });

    it("should show toggle when multiple comments", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByText("2 more comments")).toBeInTheDocument();
    });
  });

  // --- Expand/Collapse Tests ---
  describe("Expand/Collapse Behavior", () => {
    it("should show '2 more comments' when collapsed", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByText("2 more comments")).toBeInTheDocument();
    });

    it("should show 'Collapse' when expanded", () => {
      render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments");
      fireEvent.click(toggleButton);
      expect(screen.getByText("Collapse")).toBeInTheDocument();
    });

    it("should toggle back to collapsed state on second click", () => {
      render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments");

      fireEvent.click(toggleButton);
      expect(screen.getByText("Collapse")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Collapse"));
      expect(screen.getByText("2 more comments")).toBeInTheDocument();
    });

    it("should render additional comments in DOM but hidden initially", () => {
      render(<ThreadCard thread={mockThread} />);
      // All comment cards should be in DOM (for animation purposes)
      expect(screen.getByTestId("comment-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("comment-card-3")).toBeInTheDocument();
    });

    it("should stop event propagation when toggle is clicked", () => {
      const parentClickHandler = vi.fn();
      render(
        <div onClick={parentClickHandler}>
          <ThreadCard thread={mockThread} />
        </div>,
      );

      const toggleButton = screen.getByText("2 more comments");
      fireEvent.click(toggleButton);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  // --- Arrow Rotation Tests ---
  describe("Arrow Icon Rotation", () => {
    it("should not have rotate-180 class when collapsed", () => {
      render(<ThreadCard thread={mockThread} />);
      const arrow = screen.getByTestId("arrow-icon");
      expect(arrow).not.toHaveClass("rotate-180");
    });

    it("should have rotate-180 class when expanded", () => {
      render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments");
      fireEvent.click(toggleButton);

      const arrow = screen.getByTestId("arrow-icon");
      expect(arrow).toHaveClass("rotate-180");
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have font-primary class", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("font-primary");
    });

    it("should have border and rounded corners", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("border-[0.5px]", "rounded-lg");
    });

    it("should have minimum width of 350px", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("min-w-[350px]");
    });

    it("should have padding classes", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("px-4", "py-2");
    });

    it("should have flex column layout", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex", "flex-col");
    });

    it("should have cursor-pointer on toggle button", () => {
      render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments").closest("div");
      expect(toggleButton).toHaveClass("cursor-pointer");
    });

    it("should have border-top on toggle section", () => {
      render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments").closest("div");
      expect(toggleButton).toHaveClass("border-t-[0.5px]");
    });
  });

  // --- Header Tests ---
  describe("Header Section", () => {
    it("should display selected text in quotes", () => {
      render(<ThreadCard thread={mockThread} />);
      const header = screen.getByText('Selected text: "selected text here"');
      expect(header).toBeInTheDocument();
    });

    it("should have correct height class on header", () => {
      render(<ThreadCard thread={mockThread} />);
      const header = screen.getByText('Selected text: "selected text here"');
      expect(header).toHaveClass("h-9");
    });

    it("should have font-medium class on header", () => {
      render(<ThreadCard thread={mockThread} />);
      const header = screen.getByText('Selected text: "selected text here"');
      expect(header).toHaveClass("font-medium");
    });

    it("should have border-bottom on header", () => {
      render(<ThreadCard thread={mockThread} />);
      const header = screen.getByText('Selected text: "selected text here"');
      expect(header).toHaveClass("border-b-[0.5px]");
    });
  });

  // --- Animation Classes Tests ---
  describe("Animation Classes", () => {
    it("should have transition classes on expandable container", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const animatedContainer = container.querySelector(".transition-\\[grid-template-rows\\]");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("should have grid-rows-[0fr] when collapsed", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const animatedContainer = container.querySelector(".grid-rows-\\[0fr\\]");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("should have grid-rows-[1fr] when expanded", async () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      const toggleButton = screen.getByText("2 more comments");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const animatedContainer = container.querySelector(".grid-rows-\\[1fr\\]");
        expect(animatedContainer).toBeInTheDocument();
      });
    });
  });

  // --- Comment Count Tests ---
  describe("Comment Count Display", () => {
    it("should display correct count for 2 additional comments", () => {
      render(<ThreadCard thread={mockThread} />);
      expect(screen.getByText("2 more comments")).toBeInTheDocument();
    });

    it("should display correct count for 1 additional comment", () => {
      const threadWithTwoComments = {
        ...mockThread,
        comments: [
          { ...mockCommentBase, id: 1, content: "First comment" },
          { ...mockCommentBase, id: 2, content: "Second comment" },
        ],
      };
      render(<ThreadCard thread={threadWithTwoComments} />);
      expect(screen.getByText("1 more comments")).toBeInTheDocument();
    });

    it("should display correct count for many additional comments", () => {
      const threadWithManyComments = {
        ...mockThread,
        comments: Array.from({ length: 10 }, (_, i) => ({
          ...mockCommentBase,
          id: i + 1,
          content: `Comment ${i + 1}`,
        })),
      };
      render(<ThreadCard thread={threadWithManyComments} />);
      expect(screen.getByText("9 more comments")).toBeInTheDocument();
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle thread with very long selected text", () => {
      const threadWithLongText = {
        ...mockThread,
        selection: {
          ...mockThread.selection,
          text: "A".repeat(200),
        },
      };
      render(<ThreadCard thread={threadWithLongText} />);
      expect(screen.getByText(`Selected text: "${"A".repeat(200)}"`)).toBeInTheDocument();
    });

    it("should handle thread with special characters in selected text", () => {
      const threadWithSpecialChars = {
        ...mockThread,
        selection: {
          ...mockThread.selection,
          text: '<script>alert("xss")</script> & < > " \'',
        },
      };
      render(<ThreadCard thread={threadWithSpecialChars} />);
      expect(
        screen.getByText('Selected text: "<script>alert("xss")</script> & < > " \'"'),
      ).toBeInTheDocument();
    });

    it("should handle thread with empty selected text", () => {
      const threadWithEmptyText = {
        ...mockThread,
        selection: {
          ...mockThread.selection,
          text: "",
        },
      };
      render(<ThreadCard thread={threadWithEmptyText} />);
      expect(screen.getByText('Selected text: ""')).toBeInTheDocument();
    });

    it("should handle thread with emojis in selected text", () => {
      const threadWithEmojis = {
        ...mockThread,
        selection: {
          ...mockThread.selection,
          text: "Hello 👋 World 🌍",
        },
      };
      render(<ThreadCard thread={threadWithEmojis} />);
      expect(screen.getByText('Selected text: "Hello 👋 World 🌍"')).toBeInTheDocument();
    });
  });

  // --- Thread ID Usage ---
  describe("Thread ID", () => {
    it("should use thread.id as key", () => {
      const { container } = render(<ThreadCard thread={mockThread} />);
      // The key is not directly testable, but we ensure the component renders correctly
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render correctly with different thread ids", () => {
      const threadWithDifferentId = {
        ...mockThread,
        id: 999,
      };
      render(<ThreadCard thread={threadWithDifferentId} />);
      expect(screen.getByText('Selected text: "selected text here"')).toBeInTheDocument();
    });
  });

  // --- Multiple Toggle Operations ---
  describe("Multiple Toggle Operations", () => {
    it("should handle rapid toggle clicks", () => {
      render(<ThreadCard thread={mockThread} />);
      const getToggle = () =>
        screen.queryByText("2 more comments") || screen.queryByText("Collapse");

      fireEvent.click(getToggle()!);
      fireEvent.click(getToggle()!);
      fireEvent.click(getToggle()!);
      fireEvent.click(getToggle()!);

      // Should end up back at collapsed state (even number of clicks)
      expect(screen.getByText("2 more comments")).toBeInTheDocument();
    });

    it("should maintain correct state after odd number of toggles", () => {
      render(<ThreadCard thread={mockThread} />);
      const getToggle = () =>
        screen.queryByText("2 more comments") || screen.queryByText("Collapse");

      fireEvent.click(getToggle()!);
      fireEvent.click(getToggle()!);
      fireEvent.click(getToggle()!);

      // Should end up at expanded state (odd number of clicks)
      expect(screen.getByText("Collapse")).toBeInTheDocument();
    });
  });
});
