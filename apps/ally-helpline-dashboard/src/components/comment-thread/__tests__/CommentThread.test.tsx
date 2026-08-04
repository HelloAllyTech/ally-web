import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import CommentThread from "../CommentThread";

// Stable mock data - must be outside describe to prevent recreation
const stableApiResponse = { data: [], total: 0 };

// Mock all icons used in constants
vi.mock("@assets", () => ({
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  AccountCircle: ({ className }: any) => <div data-testid="account-circle" className={className} />,
  Badge: ({ className }: any) => <div data-testid="badge" className={className} />,
  Carousel1: ({ className }: any) => <div data-testid="carousel-1" className={className} />,
  Carousel2: ({ className }: any) => <div data-testid="carousel-2" className={className} />,
  Carousel3: ({ className }: any) => <div data-testid="carousel-3" className={className} />,
  Carousel4: ({ className }: any) => <div data-testid="carousel-4" className={className} />,
  SearchIcon: ({ className }: any) => <div data-testid="search-icon" className={className} />,
  StatsIcon: ({ className }: any) => <div data-testid="stats-icon" className={className} />,
  ScribeIcon: ({ className }: any) => <div data-testid="scribe-icon" className={className} />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  LearnIcon: ({ className }: any) => <div data-testid="learn-icon" className={className} />,
  Leaderboard: ({ className }: any) => <div data-testid="leaderboard" className={className} />,
  ReviewNavIcon: ({ className }: any) => (
    <div data-testid="review-nav-icon" className={className} />
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

// Mock API - return stable reference to prevent infinite re-renders
vi.mock("@src/api", () => ({
  useGetReviewThreadCommentsQuery: () => ({
    data: stableApiResponse,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

// Mock Button component
vi.mock("@components", () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="button">
      {children}
    </button>
  ),
  CommentCard: ({
    comment,
    showLike,
    showReply,
    isFeedOwner,
    selectedThreadId,
    messageId,
    selection,
    onDelete,
    onToggleHide,
    onUpdateComment,
  }: any) => (
    <div
      data-testid={`comment-card-${comment.id}`}
      data-show-like={showLike}
      data-show-reply={showReply}
      data-is-feed-owner={isFeedOwner}
      data-selected-thread-id={selectedThreadId}
      data-message-id={messageId}
      data-selection-start={selection?.startIndex}
      data-selection-end={selection?.endIndex}
    >
      <span data-testid="comment-content">{comment.content}</span>
      <span data-testid="comment-author">{comment.createdBy.name}</span>
      {onDelete && (
        <button data-testid="delete-comment" onClick={() => onDelete(comment.id)}>
          Delete
        </button>
      )}
      {onToggleHide && (
        <button data-testid="toggle-hide" onClick={() => onToggleHide(true, comment.id)}>
          Toggle Hide
        </button>
      )}
      {onUpdateComment && (
        <button data-testid="update-comment" onClick={() => onUpdateComment("updated", comment.id)}>
          Update
        </button>
      )}
    </div>
  ),
}));

// Mock ui-shared
vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder, className }: any) => (
    <textarea
      data-testid="comment-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  ),
  CustomImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
  InfiniteScroll: ({ children }: any) => <div data-testid="infinite-scroll">{children}</div>,
}));

// Create a mock Redux store
const createMockStore = () => {
  return configureStore({
    reducer: {
      user: () => ({
        user: {
          id: 1,
          name: "Test User",
          profileImageUrl: "https://example.com/test-user.jpg",
        },
      }),
    },
  });
};

describe("CommentThread Component", () => {
  let mockStore: ReturnType<typeof createMockStore>;
  const mockComments = [
    {
      id: "1",
      createdBy: {
        id: 1,
        name: "John Doe",
        profileImage: "https://example.com/john.jpg",
      },
      createdAt: "2024-01-15T10:00:00Z",
      content: "First comment",
      reactions: {},
      replyCount: 0,
    },
    {
      id: "2",
      createdBy: {
        id: 2,
        name: "Jane Smith",
        profileImage: "https://example.com/jane.jpg",
      },
      createdAt: "2024-01-15T11:00:00Z",
      content: "Second comment",
      reactions: { "1f44d": 3 },
      replyCount: 2,
    },
    {
      id: "3",
      createdBy: {
        id: 3,
        name: "Bob Wilson",
        profileImage: null,
      },
      createdAt: "2024-01-15T12:00:00Z",
      content: "Third comment",
      reactions: {},
      replyCount: 0,
    },
  ];

  const mockOnCommentAddition = vi.fn();
  const mockOnDeleteComment = vi.fn();
  const mockSetComments = vi.fn(fn => {
    if (typeof fn === "function") fn(mockComments);
  });
  const mockOnCommentChange = vi.fn();
  const mockSetThreadsOffset = vi.fn();
  const mockOnAddComment = vi.fn();

  const defaultProps = {
    id: "thread-1",
    comments: mockComments,
    onCommentAddition: mockOnCommentAddition,
    onDeleteComment: mockOnDeleteComment,
    messageId: "101",
    selection: { startIndex: 10, endIndex: 24 },
    setComments: mockSetComments,
    onCommentChange: mockOnCommentChange,
    threadsOffset: 0,
    setThreadsOffset: mockSetThreadsOffset,
    onAddComment: mockOnAddComment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockStore();
  });

  afterEach(() => {
    // The API mock returns this shared object; reset so per-test mutations
    // (used by the reseed-guard tests) don't leak into other tests.
    stableApiResponse.data = [];
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<Provider store={mockStore}>{component}</Provider>);
  };

  // --- Snapshot Test ---
  it("should match snapshot when rendered", () => {
    const { asFragment } = renderWithProvider(<CommentThread {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with empty comments", () => {
    const { asFragment } = renderWithProvider(
      <CommentThread
        id="thread-1"
        comments={[]}
        onCommentAddition={mockOnCommentAddition}
        onDeleteComment={mockOnDeleteComment}
        messageId="101"
        selection={{ startIndex: 10, endIndex: 24 }}
        setComments={mockSetComments}
        onCommentChange={mockOnCommentChange}
        threadsOffset={0}
        setThreadsOffset={mockSetThreadsOffset}
        onAddComment={mockOnAddComment}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render Comment Thread header", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      expect(screen.getByText("Comment Thread")).toBeInTheDocument();
    });

    it("should render user avatar for comment section", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      expect(screen.getByTestId("custom-image")).toBeInTheDocument();
    });

    it("should render add comment button initially", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      expect(screen.getByText("Add a comment")).toBeInTheDocument();
    });

    it("should render empty state when no comments", () => {
      renderWithProvider(
        <CommentThread
          id="thread-1"
          comments={[]}
          onCommentAddition={mockOnCommentAddition}
          onDeleteComment={mockOnDeleteComment}
          messageId="101"
          selection={{ startIndex: 10, endIndex: 24 }}
          setComments={mockSetComments}
          onCommentChange={mockOnCommentChange}
          threadsOffset={0}
          setThreadsOffset={mockSetThreadsOffset}
          onAddComment={mockOnAddComment}
        />,
      );
      expect(screen.queryByTestId(/comment-card-/)).not.toBeInTheDocument();
    });
  });

  // --- Comment Input Tests ---
  describe("Comment Input", () => {
    it("should show comment box when Add Comment is clicked", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const addButton = screen.getByText("Add a comment");

      fireEvent.click(addButton);

      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
    });

    it("should update textarea value when typing", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "New comment" } });

      expect(textarea).toHaveValue("New comment");
    });

    it("should call onCommentAddition when Comment button is clicked", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "New comment" } });

      const commentButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Comment");
      fireEvent.click(commentButton!);

      expect(mockOnCommentAddition).toHaveBeenCalledWith("New comment");
    });

    it("should clear textarea after submitting comment", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "New comment" } });

      const commentButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Comment");
      fireEvent.click(commentButton!);

      // After submitting, the comment box is hidden, so textarea should not be in the document
      expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument();
    });

    it("should hide comment box when Cancel is clicked", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "New comment" } });

      const cancelButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Cancel");
      fireEvent.click(cancelButton!);

      expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument();
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have white background", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
    });

    it("should have rounded corners", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("rounded-lg");
    });

    it("should have shadow", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("shadow-lg");
    });

    it("should cap width at 400px without overflowing narrow viewports", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("w-[min(400px,95vw)]");
    });

    it("should have border on header", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const header = screen.getByText("Comment Thread");
      expect(header).toHaveClass("border-b-[0.5px]");
    });
  });

  // --- Scrollable Area Tests ---
  describe("Scrollable Area", () => {
    it("should have max height on comments container", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const commentsContainer = container.querySelector(".max-h-80");
      expect(commentsContainer).toBeInTheDocument();
    });

    it("should have overflow-y-auto on comments container", () => {
      const { container } = renderWithProvider(<CommentThread {...defaultProps} />);
      const commentsContainer = container.querySelector(".overflow-y-auto");
      expect(commentsContainer).toBeInTheDocument();
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle special characters in textarea", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "<script>alert('xss')</script>" } });

      const commentButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Comment");
      fireEvent.click(commentButton!);

      expect(mockOnCommentAddition).toHaveBeenCalledWith("<script>alert('xss')</script>");
    });

    it("should handle emoji in textarea", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "Hello 👋 World 🌍" } });

      const commentButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Comment");
      fireEvent.click(commentButton!);

      expect(mockOnCommentAddition).toHaveBeenCalledWith("Hello 👋 World 🌍");
    });

    it("should handle whitespace-only textarea", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      fireEvent.change(textarea, { target: { value: "   " } });

      const commentButton = screen
        .getAllByTestId("button")
        .find(btn => btn.textContent === "Comment");
      fireEvent.click(commentButton!);

      expect(mockOnCommentAddition).toHaveBeenCalledWith("   ");
    });
  });

  // --- Textarea State ---
  describe("Textarea State", () => {
    it("should have empty initial value when opened", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");
      expect(textarea).toHaveValue("");
    });

    it("should maintain value during typing", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      fireEvent.click(screen.getByText("Add a comment"));

      const textarea = screen.getByTestId("comment-textarea");

      fireEvent.change(textarea, { target: { value: "H" } });
      expect(textarea).toHaveValue("H");

      fireEvent.change(textarea, { target: { value: "He" } });
      expect(textarea).toHaveValue("He");

      fireEvent.change(textarea, { target: { value: "Hello" } });
      expect(textarea).toHaveValue("Hello");
    });
  });

  // --- Comment Change Callback Tests ---
  describe("Comment Change Callbacks", () => {
    it("should call onCommentChange when toggle hide is triggered", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const toggleHideButton = screen.getAllByTestId("toggle-hide")[0];
      fireEvent.click(toggleHideButton);
      expect(mockOnCommentChange).toHaveBeenCalled();
    });

    it("should call setComments when toggle hide is triggered", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const toggleHideButton = screen.getAllByTestId("toggle-hide")[0];
      fireEvent.click(toggleHideButton);
      expect(mockSetComments).toHaveBeenCalled();
    });

    it("should call onCommentChange when update comment is triggered", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const updateButton = screen.getAllByTestId("update-comment")[0];
      fireEvent.click(updateButton);
      expect(mockOnCommentChange).toHaveBeenCalled();
    });

    it("should call onDeleteComment when delete is triggered", () => {
      renderWithProvider(<CommentThread {...defaultProps} />);
      const deleteButton = screen.getAllByTestId("delete-comment")[0];
      fireEvent.click(deleteButton);
      expect(mockOnDeleteComment).toHaveBeenCalledWith(mockComments.length - 1, 1);
    });
  });

  // --- Pagination Tests ---
  describe("Pagination", () => {
    it("should pass correct threadsOffset", () => {
      renderWithProvider(<CommentThread {...defaultProps} threadsOffset={10} />);
      // Component renders correctly with offset
      expect(screen.getByText("Comment Thread")).toBeInTheDocument();
    });
  });

  // --- Reseed guard: a locally-deleted comment must not reappear when the
  // force-refetching REVIEW query reseeds the list before the backend is
  // consistent (regression for "deleted comment still shows"). ---
  describe("Deleted-comment reseed guard", () => {
    it("excludes a locally-deleted comment when the thread list is reseeded", () => {
      // Server refetch still returns the just-deleted comment (read-after-delete lag).
      stableApiResponse.data = [mockComments[0]];
      const setComments = vi.fn();
      const deletedCommentIds = { current: new Set<string>([mockComments[0].id]) };

      renderWithProvider(
        <CommentThread
          {...defaultProps}
          comments={[]}
          setComments={setComments}
          deletedCommentIds={deletedCommentIds}
          threadsOffset={0}
        />,
      );

      // Reseed ran, but the deleted comment was filtered out.
      expect(setComments).toHaveBeenCalledWith([]);
    });

    it("reseeds normally when nothing was deleted", () => {
      stableApiResponse.data = [mockComments[0]];
      const setComments = vi.fn();
      const deletedCommentIds = { current: new Set<string>() };

      renderWithProvider(
        <CommentThread
          {...defaultProps}
          comments={[]}
          setComments={setComments}
          deletedCommentIds={deletedCommentIds}
          threadsOffset={0}
        />,
      );

      expect(setComments).toHaveBeenCalledWith([mockComments[0]]);
    });

    it("registers the id and removes it optimistically when a comment is deleted", () => {
      const setComments = vi.fn();
      const deletedCommentIds = { current: new Set<string>() };

      renderWithProvider(
        <CommentThread
          {...defaultProps}
          comments={mockComments}
          setComments={setComments}
          deletedCommentIds={deletedCommentIds}
        />,
      );

      // CommentCard mock exposes a delete button that calls onDelete(comment.id).
      fireEvent.click(screen.getAllByTestId("delete-comment")[0]);

      expect(deletedCommentIds.current.has(mockComments[0].id)).toBe(true);
      expect(setComments).toHaveBeenCalled();
    });
  });
});
