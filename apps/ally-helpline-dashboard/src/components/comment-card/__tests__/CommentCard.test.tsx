import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";

import CommentCard from "../CommentCard";

// Mock NativeEmoji component
vi.mock("@components", async () => {
  const actual = await vi.importActual("@components");
  return {
    ...actual,
    NativeEmoji: ({ unified }: { unified: string }) => (
      <span data-testid={`emoji-${unified}`} role="img" aria-label={`emoji-${unified}`}>
        {unified}
      </span>
    ),
  };
});

// Mock ui-shared
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  CustomImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
  AutoExpandableTextarea: ({ value, onChange, placeholder, className }: any) => (
    <textarea
      data-testid="reply-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  ),
  InfiniteScroll: ({ onInfiniteScroll, isLoading, children }: any) => (
    <div data-testid="infinite-scroll">
      {children}
      <button data-testid="infinite-scroll-button" onClick={onInfiniteScroll} disabled={isLoading}>
        Load more
      </button>
    </div>
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
    Smiley: ({ className }: any) => <div data-testid="smiley-icon" className={className} />,
    MoreVertIcon: ({ className }: any) => (
      <div data-testid="more-vert-icon" className={className} />
    ),
    ArrowUp: ({ className }: any) => <div data-testid="arrow-up-icon" className={className} />,
  };
});

// Mock formatRelativeTime
vi.mock("@utils", () => ({
  formatRelativeTime: (date: string) => "2 hours ago",
}));

// Mock Button component
vi.mock("@components", () => ({
  Button: ({ children, onClick, className, variant }: any) => (
    <button onClick={onClick} className={className} data-testid={`button-${variant}`}>
      {children}
    </button>
  ),
  ReactionSelector: () => <div data-testid="reaction-selector" />,
  CustomMenu: () => null,
}));
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    Button: ({ children, onClick, className, variant }: any) => (
      <button onClick={onClick} className={className} data-testid={`button-${variant}`}>
        {children}
      </button>
    ),
    ReactionSelector: ({ handleEmojiClick }: { handleEmojiClick: (emoji: string) => void }) => (
      <div data-testid="reaction-selector">
        <button data-testid="emoji-thumb-up" onClick={() => handleEmojiClick("1f44d")}>
          👍
        </button>
      </div>
    ),
    CustomMenu: ({
      anchorElement,
      items,
      onClose,
    }: {
      anchorElement: any;
      items: any[];
      onClose: () => void;
    }) => {
      if (!anchorElement) return null;
      return (
        <div data-testid="custom-menu">
          {items.map((item: any) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    },
    ConfirmationPopover: ({
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      confirmText,
      cancelText,
      isLoading,
    }: {
      isOpen: boolean;
      onClose: () => void;
      onConfirm: () => void;
      title?: React.ReactNode;
      message?: React.ReactNode;
      confirmText?: string;
      cancelText?: string;
      isLoading?: boolean;
    }) => {
      if (!isOpen) return null;
      return (
        <div data-testid="confirmation-popover">
          <div data-testid="confirmation-title">{title}</div>
          <div data-testid="confirmation-message">{message}</div>
          <button data-testid="confirmation-cancel" onClick={onClose} disabled={isLoading}>
            {cancelText || "Cancel"}
          </button>
          <button data-testid="confirmation-confirm" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "..." : confirmText || "Confirm"}
          </button>
        </div>
      );
    },
  };
});

// Mock API
const addCommentReactionUnwrap = vi.fn();
const toggleCommentVisibilityUnwrap = vi.fn();
const deleteCommentUnwrap = vi.fn();
const editCommentUnwrap = vi.fn();
const getRepliesUnwrap = vi.fn();

const addCommentReactionMock = vi.fn().mockReturnValue({ unwrap: addCommentReactionUnwrap });
const toggleCommentVisibilityMock = vi
  .fn()
  .mockReturnValue({ unwrap: toggleCommentVisibilityUnwrap });
const deleteCommentMock = vi.fn().mockReturnValue({ unwrap: deleteCommentUnwrap });
const editCommentMock = vi.fn().mockReturnValue({ unwrap: editCommentUnwrap });
const getRepliesMock = vi.fn().mockReturnValue({ unwrap: getRepliesUnwrap });

const createCommentMock = vi.fn().mockReturnValue({ unwrap: vi.fn() });

vi.mock("@api", () => ({
  useAddCommentReactionMutation: () => [addCommentReactionMock, { isLoading: false }],
  useToggleCommentVisibilityMutation: () => [toggleCommentVisibilityMock, { isLoading: false }],
  useDeleteCommentMutation: () => [deleteCommentMock, { isLoading: false }],
  useEditCommentMutation: () => [editCommentMock, { isLoading: false }],
  useLazyGetCommentRepliesQuery: () => [getRepliesMock, { isLoading: false }],
  useCreateCommentMutation: () => [createCommentMock, { data: null }],
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ reviewId: "review-123" }),
}));

// Create a mock Redux store
const createMockStore = (userId = 999) => {
  return configureStore({
    reducer: {
      user: () => ({
        user: {
          id: userId,
          name: "Test User",
          profileImageUrl: "https://example.com/test-user.jpg",
        },
      }),
    },
  });
};

describe("CommentCard Component", () => {
  let mockStore: ReturnType<typeof createMockStore>;
  const mockComment = {
    id: "1",
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
    addCommentReactionUnwrap.mockResolvedValue({});
    toggleCommentVisibilityUnwrap.mockResolvedValue({});
    deleteCommentUnwrap.mockResolvedValue({});
    editCommentUnwrap.mockResolvedValue({});
    getRepliesUnwrap.mockResolvedValue({ data: [] });
    createCommentMock.mockClear();
    mockStore = createMockStore();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<Provider store={mockStore}>{component}</Provider>);
  };

  // --- Snapshot Test ---
  it("should match snapshot when rendered with basic props", () => {
    const { asFragment } = renderWithProvider(<CommentCard comment={mockComment} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with all props enabled", () => {
    const commentWithReactions = {
      ...mockComment,
      reactions: { "1f44d": 5, "2764": 3, "1f389": 2 },
      replyCount: 3,
    };
    const { asFragment } = renderWithProvider(
      <CommentCard
        comment={commentWithReactions}
        showLike
        showReply
        selectedThreadId="thread-1"
        messageId="101"
        selection={{ startIndex: 10, endIndex: 24 }}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render commenter name", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render comment content", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      expect(screen.getByText("This is a test comment")).toBeInTheDocument();
    });

    it("should render formatted time", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    });

    it("should render profile image when profileImage is provided", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      expect(screen.getByTestId("custom-image")).toBeInTheDocument();
      expect(screen.getByTestId("custom-image")).toHaveAttribute(
        "src",
        "https://example.com/profile.jpg",
      );
    });

    it("should render CustomImage with fallback when no profileImage", () => {
      const commentWithoutProfile = {
        ...mockComment,
        createdBy: {
          ...mockComment.createdBy,
          profileImage: null,
        },
      };
      renderWithProvider(<CommentCard comment={commentWithoutProfile} />);
      // CustomImage component handles the fallback internally
      expect(screen.getByTestId("custom-image")).toBeInTheDocument();
    });
  });

  // --- Reply Button Tests ---
  describe("Reply Button", () => {
    it("should show Reply button when showReply is true", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
      expect(screen.getByText("Reply")).toBeInTheDocument();
    });

    it("should not show Reply button when showReply is false", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply={false} />);
      expect(screen.queryByText("Reply")).not.toBeInTheDocument();
    });

    it("should not show Reply button by default", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
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
      renderWithProvider(<CommentCard comment={commentWithReactions} showLike={false} />);
      expect(screen.getByLabelText("emoji-1f44d")).toBeInTheDocument();
      expect(screen.getByLabelText("emoji-2764")).toBeInTheDocument();
    });

    it("should display reaction count", () => {
      const commentWithReactions = {
        ...mockComment,
        reactions: { "1f44d": 5, "2764": 3 },
      };
      renderWithProvider(<CommentCard comment={commentWithReactions} showLike={false} />);
      expect(screen.getByText("8")).toBeInTheDocument(); // Total reaction count (5 + 3)
    });

    it("should display reactions even when showLike is true", () => {
      const commentWithReactions = {
        ...mockComment,
        reactions: { "1f44d": 5 },
      };
      renderWithProvider(<CommentCard comment={commentWithReactions} showLike />);
      expect(screen.getByLabelText("emoji-1f44d")).toBeInTheDocument();
    });

    it("should display maximum 3 reaction emojis", () => {
      const commentWithManyReactions = {
        ...mockComment,
        reactions: { "1f44d": 5, "2764": 3, "1f389": 2, "1f60a": 1 },
      };
      renderWithProvider(<CommentCard comment={commentWithManyReactions} showLike={false} />);
      // Should show only first 3
      expect(screen.getByLabelText("emoji-1f44d")).toBeInTheDocument();
      expect(screen.getByLabelText("emoji-2764")).toBeInTheDocument();
      expect(screen.getByLabelText("emoji-1f389")).toBeInTheDocument();
      expect(screen.queryByLabelText("emoji-1f60a")).not.toBeInTheDocument();
    });
  });
  it("should call addCommentReaction when an emoji is selected", async () => {
    renderWithProvider(<CommentCard comment={mockComment} showLike />);

    // The smiley icon is inside the clickable div
    const smileyContainer = screen.getByTestId("smiley-icon").parentElement;
    fireEvent.click(smileyContainer!);

    // Now the reaction selector should be visible
    const emojiButton = await screen.findByTestId("emoji-thumb-up");
    fireEvent.click(emojiButton);

    expect(addCommentReactionMock).toHaveBeenCalledWith({
      commentId: mockComment.id,
      reaction: { reaction: "1f44d", action: "ADD" },
    });
    expect(addCommentReactionUnwrap).toHaveBeenCalledTimes(1);
  });

  // --- Reply Count Tests ---
  describe("Reply Count", () => {
    it("should show reply count when replyCount is greater than 0", () => {
      const commentWithReplies = {
        ...mockComment,
        replyCount: 5,
      };
      renderWithProvider(<CommentCard comment={commentWithReplies} />);
      expect(screen.getByText("5 replies")).toBeInTheDocument();
    });

    it("should show singular 'reply' when replyCount is 1", () => {
      const commentWithOneReply = {
        ...mockComment,
        replyCount: 1,
      };
      renderWithProvider(<CommentCard comment={commentWithOneReply} />);
      expect(screen.getByText("1 reply")).toBeInTheDocument();
    });

    it("should not show reply count when replyCount is 0", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      expect(screen.queryByText(/repl/)).not.toBeInTheDocument();
    });

    it("should fetch replies when reply count is clicked and onReplyClick is not provided", async () => {
      const commentWithReplies = {
        ...mockComment,
        replyCount: 3,
      };
      renderWithProvider(<CommentCard comment={commentWithReplies} />);

      const replyCountElement = screen.getByText("3 replies");
      fireEvent.click(replyCountElement);

      expect(getRepliesMock).toHaveBeenCalledWith({
        commentId: commentWithReplies.id,
        limit: 10,
        offset: 0,
      });
      await waitFor(() => {
        expect(getRepliesUnwrap).toHaveBeenCalledTimes(1);
      });
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should apply correct class to commenter name", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      const nameElement = screen.getByText("John Doe");
      expect(nameElement).toHaveClass("text-[14px]", "font-medium");
    });

    it("should apply correct class to timestamp", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      const timestampElement = screen.getByText("2 hours ago");
      expect(timestampElement).toHaveClass("text-[12px]", "text-gray-500");
    });

    it("should apply cursor-pointer to Reply button", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
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
      renderWithProvider(<CommentCard comment={commentWithEmptyContent} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should handle very long content", () => {
      const longContent = "A".repeat(500);
      const commentWithLongContent = {
        ...mockComment,
        content: longContent,
      };
      renderWithProvider(<CommentCard comment={commentWithLongContent} />);
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("should handle empty reactions object", () => {
      const commentWithEmptyReactions = {
        ...mockComment,
        reactions: {},
      };
      renderWithProvider(<CommentCard comment={commentWithEmptyReactions} showLike={false} />);
      // Should not throw or show reactions section
      expect(screen.queryByTestId(/emoji-/)).not.toBeInTheDocument();
    });

    it("should handle special characters in content", () => {
      const commentWithSpecialChars = {
        ...mockComment,
        content: "Hello <script>alert('test')</script> & < > \" '",
      };
      renderWithProvider(<CommentCard comment={commentWithSpecialChars} />);
      expect(
        screen.getByText("Hello <script>alert('test')</script> & < > \" '"),
      ).toBeInTheDocument();
    });
  });

  // --- Reply Input Tests ---
  describe("Reply Input", () => {
    it("should not show reply input by default", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
      expect(screen.queryByTestId("reply-textarea")).not.toBeInTheDocument();
    });

    it("should show reply textarea when Reply button is clicked", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);
      expect(screen.getByTestId("reply-textarea")).toBeInTheDocument();
    });

    it("should stop event propagation when Reply is clicked", () => {
      const parentClickHandler = vi.fn();
      renderWithProvider(
        <div onClick={parentClickHandler}>
          <CommentCard comment={mockComment} showReply />
        </div>,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("should have correct placeholder on reply textarea", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);
      expect(screen.getByTestId("reply-textarea")).toHaveAttribute("placeholder", "Add reply");
    });

    it("should update reply textarea value when typing", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);
      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const textarea = screen.getByTestId("reply-textarea");
      fireEvent.change(textarea, { target: { value: "My reply" } });
      expect(textarea).toHaveValue("My reply");
    });

    it("should call createComment when Reply button is clicked with text", () => {
      renderWithProvider(
        <CommentCard
          comment={mockComment}
          showReply
          selectedThreadId="thread-1"
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
        />,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const textarea = screen.getByTestId("reply-textarea");
      fireEvent.change(textarea, { target: { value: "My reply" } });

      const submitButton = screen.getByTestId("button-primary");
      fireEvent.click(submitButton);

      expect(createCommentMock).toHaveBeenCalledWith({
        reviewId: "review-123",
        body: {
          threadId: "thread-1",
          parentCommentId: mockComment.id,
          messageId: "101",
          content: "My reply",
          selection: { startIndex: 10, endIndex: 24 },
        },
      });
    });

    it("should not call createComment when Reply button is clicked with empty text", () => {
      renderWithProvider(
        <CommentCard
          comment={mockComment}
          showReply
          selectedThreadId="thread-1"
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
        />,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const submitButton = screen.getByTestId("button-primary");
      fireEvent.click(submitButton);

      expect(createCommentMock).not.toHaveBeenCalled();
    });

    it("should not call createComment when Reply button is clicked with whitespace only", () => {
      renderWithProvider(
        <CommentCard
          comment={mockComment}
          showReply
          selectedThreadId="thread-1"
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
        />,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const textarea = screen.getByTestId("reply-textarea");
      fireEvent.change(textarea, { target: { value: "   " } });

      const submitButton = screen.getByTestId("button-primary");
      fireEvent.click(submitButton);

      expect(createCommentMock).not.toHaveBeenCalled();
    });

    it("should hide reply textarea when Cancel button is clicked", () => {
      renderWithProvider(<CommentCard comment={mockComment} showReply />);

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const cancelButton = screen.getByTestId("button-secondary");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("reply-textarea")).not.toBeInTheDocument();
    });

    it("should not show reply textarea without showReply prop", () => {
      renderWithProvider(<CommentCard comment={mockComment} />);
      // Reply button should not exist, so textarea cannot be shown
      expect(screen.queryByText("Reply")).not.toBeInTheDocument();
      expect(screen.queryByTestId("reply-textarea")).not.toBeInTheDocument();
    });

    it("should handle special characters in reply", () => {
      renderWithProvider(
        <CommentCard
          comment={mockComment}
          showReply
          selectedThreadId="thread-1"
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
        />,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const textarea = screen.getByTestId("reply-textarea");
      fireEvent.change(textarea, { target: { value: "<script>alert('xss')</script>" } });

      const submitButton = screen.getByTestId("button-primary");
      fireEvent.click(submitButton);

      expect(createCommentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            content: "<script>alert('xss')</script>",
          }),
        }),
      );
    });

    it("should handle emojis in reply", () => {
      renderWithProvider(
        <CommentCard
          comment={mockComment}
          showReply
          selectedThreadId="thread-1"
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
        />,
      );

      const replyButton = screen.getByText("Reply");
      fireEvent.click(replyButton);

      const textarea = screen.getByTestId("reply-textarea");
      fireEvent.change(textarea, { target: { value: "Great work! 👍🎉" } });

      const submitButton = screen.getByTestId("button-primary");
      fireEvent.click(submitButton);

      expect(createCommentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            content: "Great work! 👍🎉",
          }),
        }),
      );
    });
  });

  describe("Menu Options", () => {
    it("should open confirmation popover when delete is clicked for own comment", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 }, // current user id from mockStore
        createdAt: new Date().toISOString(), // not expired
      };
      renderWithProvider(<CommentCard comment={myComment} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      // Confirmation popover should be open
      expect(screen.getByTestId("confirmation-popover")).toBeInTheDocument();
      // Delete should NOT be called yet
      expect(deleteCommentMock).not.toHaveBeenCalled();
    });

    it("should call deleteComment only after confirming in the popover", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 }, // current user id from mockStore
        createdAt: new Date().toISOString(), // not expired
      };
      renderWithProvider(<CommentCard comment={myComment} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      // Click confirm in the popover
      const confirmButton = screen.getByTestId("confirmation-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(deleteCommentMock).toHaveBeenCalledWith({ commentId: myComment.id });
        expect(deleteCommentUnwrap).toHaveBeenCalledTimes(1);
      });
    });

    it("should close confirmation popover when cancel is clicked", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 },
        createdAt: new Date().toISOString(),
      };
      renderWithProvider(<CommentCard comment={myComment} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      // Popover should be open
      expect(screen.getByTestId("confirmation-popover")).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByTestId("confirmation-cancel");
      fireEvent.click(cancelButton);

      // Popover should be closed
      expect(screen.queryByTestId("confirmation-popover")).not.toBeInTheDocument();
      // Delete should NOT have been called
      expect(deleteCommentMock).not.toHaveBeenCalled();
    });

    it("should display correct title for comment delete confirmation", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 },
        createdAt: new Date().toISOString(),
      };
      renderWithProvider(<CommentCard comment={myComment} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      const titleElement = screen.getByTestId("confirmation-title");
      expect(titleElement).toHaveTextContent("Comment");
    });

    it("should display correct title for reply delete confirmation when onDelete is provided", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 },
        createdAt: new Date().toISOString(),
      };
      const onDeleteMock = vi.fn();
      renderWithProvider(<CommentCard comment={myComment} onDelete={onDeleteMock} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      const titleElement = screen.getByTestId("confirmation-title");
      expect(titleElement).toHaveTextContent("Reply");
    });

    it("should call onDelete callback after successful deletion", async () => {
      const myComment = {
        ...mockComment,
        createdBy: { ...mockComment.createdBy, id: 999 },
        createdAt: new Date().toISOString(),
      };
      const onDeleteMock = vi.fn();
      renderWithProvider(<CommentCard comment={myComment} onDelete={onDeleteMock} />);

      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);

      const deleteButton = await screen.findByText("Delete");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirmation-confirm");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onDeleteMock).toHaveBeenCalledWith(myComment.id);
      });
    });

    it("should call toggleCommentVisibility when hide is clicked by feed owner", async () => {
      const commentToHide = { ...mockComment, hidden: false };
      // Render with a different user ID in store to ensure isMyComment is false
      const otherUserStore = createMockStore(123);
      render(
        <Provider store={otherUserStore}>
          <CommentCard comment={commentToHide} isFeedOwner={true} />
        </Provider>,
      );
      const menuButton = screen.getByLabelText("Comment options");
      fireEvent.click(menuButton);
      const hideButton = await screen.findByText("Hide");
      fireEvent.click(hideButton);
      expect(toggleCommentVisibilityMock).toHaveBeenCalledWith({
        commentId: commentToHide.id,
        hidden: true,
      });
      expect(toggleCommentVisibilityUnwrap).toHaveBeenCalledTimes(1);
    });
  });
});
