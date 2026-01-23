import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import CommentCard from "../CommentCard";

// Mock emoji-picker-react
vi.mock("emoji-picker-react", () => ({
  Emoji: ({ unified }: { unified: string }) => (
    <span data-testid={`emoji-${unified}`}>{unified}</span>
  ),
  EmojiStyle: {
    NATIVE: "native",
  },
}));

// Mock CustomImage
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  CustomImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
  FEATURE_FLAGS_MAP: {
    PEER_REVIEW_FLAG: true,
  },
}));

// Mock AccountCircle - partially mock to keep other exports
vi.mock("@src/assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@src/assets")>();
  return {
    ...actual,
    AccountCircle: ({ className }: any) => (
      <div data-testid="account-circle" className={className} />
    ),
  };
});

// Mock formatRelativeTime
vi.mock("@utils", () => ({
  formatRelativeTime: (date: string) => "2 hours ago",
}));

// Mock Input component
vi.mock("../../input", () => ({
  default: ({ placeholder, className, value, onChange, onKeyDown, autoFocus }: any) => (
    <input
      data-testid="reply-input"
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
    />
  ),
}));

// Mock API
vi.mock("@api", () => ({
  useAddCommentReactionMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("CommentCard Component", () => {
  const mockComment = {
    id: 1,
    createdBy: {
      id: 1,
      name: "John Doe",
      profileImage: "https://example.com/profile.jpg",
    },
    createdAt: "2024-01-15T10:00:00Z",
    content: "This is a test comment",
    reactions: {},
    replyCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Test ---
  it("should match snapshot when rendered with basic props", () => {
    const { asFragment } = render(<CommentCard comment={mockComment} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with all props enabled", () => {
    const commentWithReactions = {
      ...mockComment,
      reactions: { "1f44d": 5, "2764": 3, "1f389": 2 },
      replyCount: 3,
    };
    const { asFragment } = render(
      <CommentCard comment={commentWithReactions} showLike showReply onReplyClick={vi.fn()} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render commenter name", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render comment content", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.getByText("This is a test comment")).toBeInTheDocument();
    });

    it("should render formatted time", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    });

    it("should render profile image when profileImage is provided", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.getByTestId("custom-image")).toBeInTheDocument();
      expect(screen.getByTestId("custom-image")).toHaveAttribute(
        "src",
        "https://example.com/profile.jpg",
      );
    });

    it("should render AccountCircle when no profileImage", () => {
      const commentWithoutProfile = {
        ...mockComment,
        createdBy: {
          ...mockComment.createdBy,
          profileImage: null,
        },
      };
      render(<CommentCard comment={commentWithoutProfile} />);
      expect(screen.getByTestId("account-circle")).toBeInTheDocument();
    });
  });

  // --- Like Button Tests ---
  describe("Like Button", () => {
    it("should show Like button when showLike is true", () => {
      render(<CommentCard comment={mockComment} showLike />);
      expect(screen.getByText("Like")).toBeInTheDocument();
    });

    it("should not show Like button when showLike is false", () => {
      render(<CommentCard comment={mockComment} showLike={false} />);
      expect(screen.queryByText("Like")).not.toBeInTheDocument();
    });

    it("should not show Like button by default", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.queryByText("Like")).not.toBeInTheDocument();
    });
  });

  // --- Reply Button Tests ---
  describe("Reply Button", () => {
    it("should show Reply button when showReply is true", () => {
      render(<CommentCard comment={mockComment} showReply />);
      expect(screen.getByText("Reply")).toBeInTheDocument();
    });

    it("should not show Reply button when showReply is false", () => {
      render(<CommentCard comment={mockComment} showReply={false} />);
      expect(screen.queryByText("Reply")).not.toBeInTheDocument();
    });

    it("should not show Reply button by default", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.queryByText("Reply")).not.toBeInTheDocument();
    });
  });

  // --- Reactions Tests ---
  describe("Reactions", () => {
    it("should display reactions when showLike is false and reactions exist", () => {
      const commentWithReactions = {
        ...mockComment,
        reactions: { "1f44d": 5, "2764": 3 },
      };
      render(<CommentCard comment={commentWithReactions} showLike={false} />);
      expect(screen.getByTestId("emoji-1f44d")).toBeInTheDocument();
      expect(screen.getByTestId("emoji-2764")).toBeInTheDocument();
    });

    it("should display reaction count", () => {
      const commentWithReactions = {
        ...mockComment,
        reactions: { "1f44d": 5, "2764": 3 },
      };
      render(<CommentCard comment={commentWithReactions} showLike={false} />);
      expect(screen.getByText("2")).toBeInTheDocument(); // Number of unique reactions
    });

    it("should not display reactions when showLike is true", () => {
      const commentWithReactions = {
        ...mockComment,
        reactions: { "1f44d": 5 },
      };
      render(<CommentCard comment={commentWithReactions} showLike />);
      expect(screen.queryByTestId("emoji-1f44d")).not.toBeInTheDocument();
    });

    it("should display maximum 3 reaction emojis", () => {
      const commentWithManyReactions = {
        ...mockComment,
        reactions: { "1f44d": 5, "2764": 3, "1f389": 2, "1f60a": 1 },
      };
      render(<CommentCard comment={commentWithManyReactions} showLike={false} />);
      // Should show only first 3
      expect(screen.getByTestId("emoji-1f44d")).toBeInTheDocument();
      expect(screen.getByTestId("emoji-2764")).toBeInTheDocument();
      expect(screen.getByTestId("emoji-1f389")).toBeInTheDocument();
      expect(screen.queryByTestId("emoji-1f60a")).not.toBeInTheDocument();
    });
  });

  // --- Reply Count Tests ---
  describe("Reply Count", () => {
    it("should show reply count when replyCount is greater than 0", () => {
      const commentWithReplies = {
        ...mockComment,
        replyCount: 5,
      };
      render(<CommentCard comment={commentWithReplies} />);
      expect(screen.getByText("5 replies")).toBeInTheDocument();
    });

    it("should show singular 'reply' when replyCount is 1", () => {
      const commentWithOneReply = {
        ...mockComment,
        replyCount: 1,
      };
      render(<CommentCard comment={commentWithOneReply} />);
      expect(screen.getByText("1 reply")).toBeInTheDocument();
    });

    it("should not show reply count when replyCount is 0", () => {
      render(<CommentCard comment={mockComment} />);
      expect(screen.queryByText(/repl/)).not.toBeInTheDocument();
    });

    it("should call onReplyClick when reply count is clicked", () => {
      const onReplyClick = vi.fn();
      const commentWithReplies = {
        ...mockComment,
        replyCount: 3,
      };
      render(<CommentCard comment={commentWithReplies} onReplyClick={onReplyClick} />);

      const replyCountElement = screen.getByText("3 replies");
      fireEvent.click(replyCountElement);

      expect(onReplyClick).toHaveBeenCalledTimes(1);
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should apply correct class to commenter name", () => {
      render(<CommentCard comment={mockComment} />);
      const nameElement = screen.getByText("John Doe");
      expect(nameElement).toHaveClass("text-[14px]", "font-medium");
    });

    it("should apply correct class to timestamp", () => {
      render(<CommentCard comment={mockComment} />);
      const timestampElement = screen.getByText("2 hours ago");
      expect(timestampElement).toHaveClass("text-[12px]", "text-gray-500");
    });

    it("should apply line-clamp-2 to comment content", () => {
      render(<CommentCard comment={mockComment} />);
      const contentElement = screen.getByText("This is a test comment");
      expect(contentElement).toHaveClass("line-clamp-2");
    });

    it("should apply cursor-pointer to Like button", () => {
      render(<CommentCard comment={mockComment} showLike />);
      const likeButton = screen.getByText("Like");
      expect(likeButton).toHaveClass("cursor-pointer");
    });

    it("should apply cursor-pointer to Reply button", () => {
      render(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      expect(replyButton).toHaveClass("cursor-pointer");
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const commentWithEmptyContent = {
        ...mockComment,
        content: "",
      };
      render(<CommentCard comment={commentWithEmptyContent} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should handle very long content", () => {
      const longContent = "A".repeat(500);
      const commentWithLongContent = {
        ...mockComment,
        content: longContent,
      };
      render(<CommentCard comment={commentWithLongContent} />);
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("should handle empty reactions object", () => {
      const commentWithEmptyReactions = {
        ...mockComment,
        reactions: {},
      };
      render(<CommentCard comment={commentWithEmptyReactions} showLike={false} />);
      // Should not throw or show reactions section
      expect(screen.queryByTestId(/emoji-/)).not.toBeInTheDocument();
    });

    it("should handle special characters in content", () => {
      const commentWithSpecialChars = {
        ...mockComment,
        content: "Hello <script>alert('test')</script> & < > \" '",
      };
      render(<CommentCard comment={commentWithSpecialChars} />);
      expect(
        screen.getByText("Hello <script>alert('test')</script> & < > \" '"),
      ).toBeInTheDocument();
    });
  });

  // --- Divider Tests ---
  describe("Dividers", () => {
    it("should show divider between reactions and reply count", () => {
      const commentWithReactionsAndReplies = {
        ...mockComment,
        reactions: { "1f44d": 5 },
        replyCount: 3,
      };
      const { container } = render(
        <CommentCard comment={commentWithReactionsAndReplies} showLike={false} />,
      );
      const dividers = container.querySelectorAll(".bg-\\[\\#D9D9D9\\]");
      expect(dividers.length).toBeGreaterThan(0);
    });

    it("should show divider before Reply button when showReply is true", () => {
      const { container } = render(<CommentCard comment={mockComment} showReply />);
      const dividers = container.querySelectorAll(".bg-\\[\\#D9D9D9\\]");
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  // --- Reply Input Tests ---
  describe("Reply Input", () => {
    it("should not show reply input by default", () => {
      render(<CommentCard comment={mockComment} showReply />);
      expect(screen.queryByTestId("reply-input")).not.toBeInTheDocument();
    });

    it("should show reply input when Reply button is clicked", () => {
      render(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);
      expect(screen.getByTestId("reply-input")).toBeInTheDocument();
    });

    it("should stop event propagation when Reply is clicked", () => {
      const parentClickHandler = vi.fn();
      render(
        <div onClick={parentClickHandler}>
          <CommentCard comment={mockComment} showReply />
        </div>,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("should have correct placeholder on reply input", () => {
      render(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);
      expect(screen.getByTestId("reply-input")).toHaveAttribute("placeholder", "Write a reply...");
    });

    it("should update reply input value when typing", () => {
      render(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "My reply" } });
      expect(input).toHaveValue("My reply");
    });

    it("should call onReply when Enter is pressed with text", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "My reply" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReply).toHaveBeenCalledWith("My reply");
    });

    it("should not call onReply when Enter is pressed with empty text", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReply).not.toHaveBeenCalled();
    });

    it("should not call onReply when Enter is pressed with whitespace only", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReply).not.toHaveBeenCalled();
    });

    it("should hide reply input after successful submission", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "My reply" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.queryByTestId("reply-input")).not.toBeInTheDocument();
    });

    it("should clear input value after successful submission", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      // First submission
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      let input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "My reply" } });
      fireEvent.keyDown(input, { key: "Enter" });

      // Re-open input
      fireEvent.click(replyButton);
      input = screen.getByTestId("reply-input");
      expect(input).toHaveValue("");
    });

    it("should hide reply input when Escape is pressed", () => {
      render(<CommentCard comment={mockComment} showReply />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByTestId("reply-input")).not.toBeInTheDocument();
    });

    it("should clear input value when Escape is pressed", () => {
      render(<CommentCard comment={mockComment} showReply />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      let input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "Draft reply" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Re-open input
      fireEvent.click(replyButton);
      input = screen.getByTestId("reply-input");
      expect(input).toHaveValue("");
    });

    it("should not show reply input without showReply prop", () => {
      render(<CommentCard comment={mockComment} />);
      // Reply button should not exist, so input cannot be shown
      expect(screen.queryByText("Reply")).not.toBeInTheDocument();
      expect(screen.queryByTestId("reply-input")).not.toBeInTheDocument();
    });

    it("should handle special characters in reply", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "<script>alert('xss')</script>" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReply).toHaveBeenCalledWith("<script>alert('xss')</script>");
    });

    it("should handle emojis in reply", () => {
      const onReply = vi.fn();
      render(<CommentCard comment={mockComment} showReply onReply={onReply} />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const input = screen.getByTestId("reply-input");
      fireEvent.change(input, { target: { value: "Great work! 👍🎉" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReply).toHaveBeenCalledWith("Great work! 👍🎉");
    });
  });
});
