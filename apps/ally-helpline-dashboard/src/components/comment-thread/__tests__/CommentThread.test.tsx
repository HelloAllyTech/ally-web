import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import CommentThread from "../CommentThread";

// Mock AccountCircle
vi.mock("@assets", () => ({
  AccountCircle: ({ className }: any) => <div data-testid="account-circle" className={className} />,
}));

// Mock CommentCard
vi.mock("../../comment-card/CommentCard", () => ({
  default: ({ comment, showLike, showReply }: any) => (
    <div
      data-testid={`comment-card-${comment.id}`}
      data-show-like={showLike}
      data-show-reply={showReply}
    >
      <span data-testid="comment-content">{comment.content}</span>
      <span data-testid="comment-author">{comment.createdBy.name}</span>
    </div>
  ),
}));

// Mock Input component
vi.mock("../../input", () => ({
  default: ({ placeholder, className, value, onChange, onKeyDown }: any) => (
    <input
      data-testid="comment-input"
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  ),
}));

describe("CommentThread Component", () => {
  const mockComments = [
    {
      id: 1,
      createdBy: {
        id: 1,
        name: "John Doe",
        profileUrl: "https://example.com/john.jpg",
      },
      createdAt: "2024-01-15T10:00:00Z",
      content: "First comment",
      reactions: {},
      replyCount: 0,
    },
    {
      id: 2,
      createdBy: {
        id: 2,
        name: "Jane Smith",
        profileUrl: "https://example.com/jane.jpg",
      },
      createdAt: "2024-01-15T11:00:00Z",
      content: "Second comment",
      reactions: { "1f44d": 3 },
      replyCount: 2,
    },
    {
      id: 3,
      createdBy: {
        id: 3,
        name: "Bob Wilson",
        profileUrl: null,
      },
      createdAt: "2024-01-15T12:00:00Z",
      content: "Third comment",
      reactions: {},
      replyCount: 0,
    },
  ];

  const mockOnCommentAddition = vi.fn();

  const defaultProps = {
    comments: mockComments,
    onCommentAddition: mockOnCommentAddition,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Test ---
  it("should match snapshot when rendered", () => {
    const { asFragment } = render(<CommentThread {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with empty comments", () => {
    const { asFragment } = render(
      <CommentThread comments={[]} onCommentAddition={mockOnCommentAddition} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render Comment Thread header", () => {
      render(<CommentThread {...defaultProps} />);
      expect(screen.getByText("Comment Thread")).toBeInTheDocument();
    });

    it("should render AccountCircle for input section", () => {
      render(<CommentThread {...defaultProps} />);
      expect(screen.getByTestId("account-circle")).toBeInTheDocument();
    });

    it("should render comment input with placeholder", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Add comment");
    });

    it("should render all comments", () => {
      render(<CommentThread {...defaultProps} />);
      expect(screen.getByTestId("comment-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("comment-card-3")).toBeInTheDocument();
    });

    it("should render empty state when no comments", () => {
      render(<CommentThread comments={[]} onCommentAddition={mockOnCommentAddition} />);
      expect(screen.queryByTestId(/comment-card-/)).not.toBeInTheDocument();
    });
  });

  // --- Comment Input Tests ---
  describe("Comment Input", () => {
    it("should update input value when typing", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "New comment" } });
      expect(input).toHaveValue("New comment");
    });

    it("should call onCommentAddition when Enter is pressed", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "New comment" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnCommentAddition).toHaveBeenCalledWith("New comment");
    });

    it("should clear input after submitting comment", async () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "New comment" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("should not submit on other key presses", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "New comment" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(mockOnCommentAddition).not.toHaveBeenCalled();
    });

    it("should submit empty string if input is empty", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnCommentAddition).toHaveBeenCalledWith("");
    });
  });

  // --- CommentCard Props Tests ---
  describe("CommentCard Props", () => {
    it("should pass showLike prop to CommentCard", () => {
      render(<CommentThread {...defaultProps} />);
      const commentCards = screen.getAllByTestId(/comment-card-/);
      commentCards.forEach(card => {
        expect(card).toHaveAttribute("data-show-like", "true");
      });
    });

    it("should pass showReply prop to CommentCard", () => {
      render(<CommentThread {...defaultProps} />);
      const commentCards = screen.getAllByTestId(/comment-card-/);
      commentCards.forEach(card => {
        expect(card).toHaveAttribute("data-show-reply", "true");
      });
    });

    it("should pass correct comment data to each CommentCard", () => {
      render(<CommentThread {...defaultProps} />);

      expect(screen.getByText("First comment")).toBeInTheDocument();
      expect(screen.getByText("Second comment")).toBeInTheDocument();
      expect(screen.getByText("Third comment")).toBeInTheDocument();
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have white background", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
    });

    it("should have rounded corners", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("rounded-lg");
    });

    it("should have shadow", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("shadow-lg");
    });

    it("should have fixed width of 400px", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("w-[400px]");
    });

    it("should have border on header", () => {
      render(<CommentThread {...defaultProps} />);
      const header = screen.getByText("Comment Thread");
      expect(header).toHaveClass("border-b-[0.5px]");
    });
  });

  // --- Scrollable Area Tests ---
  describe("Scrollable Area", () => {
    it("should have max height on comments container", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const commentsContainer = container.querySelector(".max-h-80");
      expect(commentsContainer).toBeInTheDocument();
    });

    it("should have overflow-y-auto on comments container", () => {
      const { container } = render(<CommentThread {...defaultProps} />);
      const commentsContainer = container.querySelector(".overflow-y-auto");
      expect(commentsContainer).toBeInTheDocument();
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle single comment", () => {
      const singleComment = [mockComments[0]];
      render(<CommentThread comments={singleComment} onCommentAddition={mockOnCommentAddition} />);
      expect(screen.getByTestId("comment-card-1")).toBeInTheDocument();
      expect(screen.queryByTestId("comment-card-2")).not.toBeInTheDocument();
    });

    it("should handle many comments", () => {
      const manyComments = Array.from({ length: 20 }, (_, i) => ({
        ...mockComments[0],
        id: i + 1,
        content: `Comment ${i + 1}`,
      }));
      render(<CommentThread comments={manyComments} onCommentAddition={mockOnCommentAddition} />);
      expect(screen.getAllByTestId(/comment-card-/).length).toBe(20);
    });

    it("should handle special characters in input", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "<script>alert('xss')</script>" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnCommentAddition).toHaveBeenCalledWith("<script>alert('xss')</script>");
    });

    it("should handle emoji in input", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "Hello 👋 World 🌍" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnCommentAddition).toHaveBeenCalledWith("Hello 👋 World 🌍");
    });

    it("should handle whitespace-only input", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnCommentAddition).toHaveBeenCalledWith("   ");
    });
  });

  // --- Input Focus State ---
  describe("Input State", () => {
    it("should have empty initial value", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");
      expect(input).toHaveValue("");
    });

    it("should maintain value during typing", () => {
      render(<CommentThread {...defaultProps} />);
      const input = screen.getByTestId("comment-input");

      fireEvent.change(input, { target: { value: "H" } });
      expect(input).toHaveValue("H");

      fireEvent.change(input, { target: { value: "He" } });
      expect(input).toHaveValue("He");

      fireEvent.change(input, { target: { value: "Hello" } });
      expect(input).toHaveValue("Hello");
    });
  });
});
