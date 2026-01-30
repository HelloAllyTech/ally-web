import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import SelectableText from "../SelectableText";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AddComment icon
vi.mock("@ally-ui-mono/ui-shared/assets", () => ({
  AddComment: ({ className }: any) => <div data-testid="add-comment-icon" className={className} />,
}));

// Mock CommentAdditionDialog
vi.mock("@src/components/comment-addition-dialog/CommentAdditionDialog", () => ({
  default: ({ onCancel, onComment }: any) => (
    <div data-testid="comment-addition-dialog">
      <button data-testid="dialog-cancel" onClick={onCancel}>
        Cancel
      </button>
      <button data-testid="dialog-submit" onClick={() => onComment("Test comment")}>
        Submit
      </button>
    </div>
  ),
}));

// Mock CommentThread
vi.mock("@src/components/comment-thread/CommentThread", () => ({
  default: ({ id, isFeedOwner, comments, onCommentAddition, onReplyComment }: any) => (
    <div
      data-testid="comment-thread"
      data-id={id}
      data-is-feed-owner={isFeedOwner}
      data-comment-count={comments?.length || 0}
    >
      <button data-testid="thread-add-comment" onClick={() => onCommentAddition("New comment")}>
        Add Comment
      </button>
      <button data-testid="thread-reply" onClick={() => onReplyComment("Reply text", "parent-123")}>
        Reply
      </button>
    </div>
  ),
}));

// Mock useClickOutside hook
vi.mock("@src/hooks", () => ({
  useClickOutside: vi.fn(),
}));

describe("SelectableText Component", () => {
  const mockSegment = {
    text: "This is selectable text",
    commentIds: [],
    start: 0,
    end: 23,
  };

  const mockSegmentWithComments = {
    text: "Commented text",
    commentIds: ["thread-1"],
    start: 10,
    end: 24,
  };

  const mockTranscript = {
    id: 101,
    speaker: "Agent",
    message: "Full transcript message",
    time: 1000,
    threads: [
      {
        id: "thread-1",
        selection: { startIndex: 10, endIndex: 24 },
        comments: [],
      },
    ],
  };

  const mockCommentsList = [
    {
      id: "1",
      createdBy: { id: 1, name: "John Doe", profileImage: null },
      createdAt: "2024-01-15T10:00:00Z",
      content: "First comment",
      reactions: {},
      replyCount: 0,
    },
  ];

  const mockSelectedCommentRef = { current: null };

  const mockSetAddCommentDialogOpen = vi.fn();
  const mockOnCloseSelectedComment = vi.fn();
  const mockHandleCreateComment = vi.fn();
  const mockHandleCommentClick = vi.fn();
  const mockSetNewCommentSelection = vi.fn();
  const mockOnCancelComment = vi.fn();

  const defaultProps = {
    segment: mockSegment,
    newCommentSelection: null,
    selectedThreadId: "",
    isFeedOwner: false,
    index: 0,
    segIdx: 0,
    setAddCommentDialogOpen: mockSetAddCommentDialogOpen,
    addCommentDialogOpen: null,
    onCloseSelectedComment: mockOnCloseSelectedComment,
    isSelectedComment: false,
    selectedCommentRef: mockSelectedCommentRef as React.RefObject<HTMLSpanElement>,
    selectedMessageId: "",
    transcript: mockTranscript as any,
    selectedEndIndex: 0,
    commentsList: [],
    handleCreateComment: mockHandleCreateComment,
    isLoading: false,
    handleCommentClick: mockHandleCommentClick,
    isCreateCommentSuccess: false,
    setNewCommentSelection: mockSetNewCommentSelection,
    onCancelComment: mockOnCancelComment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  it("should match snapshot with basic segment", () => {
    const { asFragment } = render(<SelectableText {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with add comment button visible", () => {
    const { asFragment } = render(
      <SelectableText
        {...defaultProps}
        newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with comment addition dialog open", () => {
    const { asFragment } = render(
      <SelectableText
        {...defaultProps}
        newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
        addCommentDialogOpen="0-0"
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render segment text", () => {
      render(<SelectableText {...defaultProps} />);
      expect(screen.getByText("This is selectable text")).toBeInTheDocument();
    });

    it("should render as span element", () => {
      const { container } = render(<SelectableText {...defaultProps} />);
      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("should not show add comment button when no selection", () => {
      render(<SelectableText {...defaultProps} />);
      expect(screen.queryByText("Add Comment")).not.toBeInTheDocument();
    });

    it("should not show comment thread when not selected", () => {
      render(<SelectableText {...defaultProps} />);
      expect(screen.queryByTestId("comment-thread")).not.toBeInTheDocument();
    });
  });

  // --- Add Comment Button Tests ---
  describe("Add Comment Button", () => {
    it("should show add comment button when newCommentSelection matches segment", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
        />,
      );
      expect(screen.getByText("Add Comment")).toBeInTheDocument();
      expect(screen.getByTestId("add-comment-icon")).toBeInTheDocument();
    });

    it("should not show add comment button when selection does not match", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 50, endIndex: 60, transcriptId: 101 }}
        />,
      );
      expect(screen.queryByText("Add Comment")).not.toBeInTheDocument();
    });

    it("should not show add comment button when transcriptId does not match", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 999 }}
        />,
      );
      expect(screen.queryByText("Add Comment")).not.toBeInTheDocument();
    });

    it("should not show add comment button when dialog is open", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
        />,
      );
      expect(screen.queryByText("Add Comment")).not.toBeInTheDocument();
    });

    it("should call setAddCommentDialogOpen when add comment button is clicked", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
        />,
      );
      const addButton = screen.getByText("Add Comment").parentElement;
      fireEvent.click(addButton!);
      expect(mockSetAddCommentDialogOpen).toHaveBeenCalledWith("0-0");
    });

    it("should use correct index-segIdx format for dialog open", () => {
      render(
        <SelectableText
          {...defaultProps}
          index={2}
          segIdx={5}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
        />,
      );
      const addButton = screen.getByText("Add Comment").parentElement;
      fireEvent.click(addButton!);
      expect(mockSetAddCommentDialogOpen).toHaveBeenCalledWith("2-5");
    });
  });

  // --- Comment Addition Dialog Tests ---
  describe("Comment Addition Dialog", () => {
    it("should show dialog when addCommentDialogOpen matches", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
        />,
      );
      expect(screen.getByTestId("comment-addition-dialog")).toBeInTheDocument();
    });

    it("should not show dialog when addCommentDialogOpen does not match", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="1-2"
        />,
      );
      expect(screen.queryByTestId("comment-addition-dialog")).not.toBeInTheDocument();
    });

    it("should call handleCreateComment with correct params when comment is submitted", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
        />,
      );
      fireEvent.click(screen.getByTestId("dialog-submit"));
      expect(mockHandleCreateComment).toHaveBeenCalledWith({
        comment: "Test comment",
        selection: { startIndex: 0, endIndex: 23 },
        transcriptId: 101,
        threadId: null,
        parentCommentId: null,
      });
    });

    it("should handle cancel from dialog", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
        />,
      );
      fireEvent.click(screen.getByTestId("dialog-cancel"));
      expect(mockSetAddCommentDialogOpen).toHaveBeenCalledWith(null);
      expect(mockSetNewCommentSelection).toHaveBeenCalledWith(null);
      expect(mockOnCancelComment).toHaveBeenCalled();
    });

    it("should apply reduced opacity when loading", () => {
      const { container } = render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
          isLoading={true}
        />,
      );
      const dialogContainer = screen.getByTestId("comment-addition-dialog").parentElement;
      expect(dialogContainer).toHaveStyle({ opacity: "0.5" });
    });

    it("should have full opacity when not loading", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
          isLoading={false}
        />,
      );
      const dialogContainer = screen.getByTestId("comment-addition-dialog").parentElement;
      expect(dialogContainer).toHaveStyle({ opacity: "1" });
    });
  });

  // --- Comment Thread Tests ---
  describe("Comment Thread", () => {
    const propsWithThread = {
      ...defaultProps,
      segment: mockSegmentWithComments,
      isSelectedComment: true,
      selectedThreadId: "thread-1",
      selectedMessageId: "101",
      commentsList: mockCommentsList,
    };

    it("should show comment thread when isSelectedComment and selectedThreadId matches", () => {
      render(<SelectableText {...propsWithThread} />);
      expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    });

    it("should not show comment thread when isSelectedComment is false", () => {
      render(<SelectableText {...propsWithThread} isSelectedComment={false} />);
      expect(screen.queryByTestId("comment-thread")).not.toBeInTheDocument();
    });

    it("should not show comment thread when selectedThreadId does not match", () => {
      render(<SelectableText {...propsWithThread} selectedThreadId="different-thread" />);
      expect(screen.queryByTestId("comment-thread")).not.toBeInTheDocument();
    });

    it("should pass correct props to CommentThread", () => {
      render(<SelectableText {...propsWithThread} isFeedOwner={true} />);
      const thread = screen.getByTestId("comment-thread");
      expect(thread).toHaveAttribute("data-id", "thread-1");
      expect(thread).toHaveAttribute("data-is-feed-owner", "true");
      expect(thread).toHaveAttribute("data-comment-count", "1");
    });

    it("should call handleCreateComment when adding comment to thread", () => {
      render(<SelectableText {...propsWithThread} />);
      fireEvent.click(screen.getByTestId("thread-add-comment"));
      expect(mockHandleCreateComment).toHaveBeenCalledWith({
        comment: "New comment",
        selection: { startIndex: 10, endIndex: 24 },
        transcriptId: 101,
        threadId: "thread-1",
        parentCommentId: null,
      });
    });

    it("should call handleCreateComment with parentCommentId when replying", () => {
      render(<SelectableText {...propsWithThread} />);
      fireEvent.click(screen.getByTestId("thread-reply"));
      expect(mockHandleCreateComment).toHaveBeenCalledWith({
        comment: "Reply text",
        selection: { startIndex: 10, endIndex: 24 },
        transcriptId: 101,
        threadId: "thread-1",
        parentCommentId: "parent-123",
      });
    });
  });

  // --- Highlighting Tests ---
  describe("Highlighting", () => {
    it("should have amber-50 background for segment with comments (not selected)", () => {
      const { container } = render(
        <SelectableText {...defaultProps} segment={mockSegmentWithComments} selectedMessageId="" />,
      );
      const span = container.querySelector("span");
      expect(span).toHaveClass("bg-amber-50");
    });

    it("should have amber-200 background when segment is selected", () => {
      const { container } = render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          selectedMessageId="101"
          selectedThreadId="thread-1"
        />,
      );
      const span = container.querySelector("span");
      expect(span).toHaveClass("bg-amber-200");
    });

    it("should have blue background for new comment selection", () => {
      const { container } = render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          newCommentSelection={{ startIndex: 10, endIndex: 24, transcriptId: 101 }}
        />,
      );
      const span = container.querySelector("span");
      expect(span).toHaveClass("bg-[#E1F1FE]");
    });

    it("should have cursor-pointer for segments with comments (not part of new selection)", () => {
      const { container } = render(
        <SelectableText {...defaultProps} segment={mockSegmentWithComments} />,
      );
      const span = container.querySelector("span");
      expect(span).toHaveClass("cursor-pointer");
    });

    it("should not have cursor-pointer for segments with comments that are part of new selection", () => {
      const { container } = render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          newCommentSelection={{ startIndex: 10, endIndex: 24, transcriptId: 101 }}
        />,
      );
      const span = container.querySelector("span");
      expect(span).not.toHaveClass("cursor-pointer");
    });

    it("should not have cursor-pointer for segments without comments", () => {
      const { container } = render(<SelectableText {...defaultProps} />);
      const span = container.querySelector("span");
      expect(span).not.toHaveClass("cursor-pointer");
    });

    it("should have amber border for commented segments", () => {
      const { container } = render(
        <SelectableText {...defaultProps} segment={mockSegmentWithComments} />,
      );
      const span = container.querySelector("span");
      expect(span).toHaveClass("border-b", "border-amber-400");
    });
  });

  // --- Click Handler Tests ---
  describe("Click Handlers", () => {
    it("should call handleCommentClick when clicking on commented segment", () => {
      render(
        <SelectableText {...defaultProps} segment={mockSegmentWithComments} selectedMessageId="" />,
      );
      fireEvent.click(screen.getByText("Commented text"));
      expect(mockHandleCommentClick).toHaveBeenCalledWith({
        messageId: "101",
        startIndex: 10,
        endIndex: 24,
        threadId: "thread-1",
      });
    });

    it("should not call handleCommentClick when segment has no comments", () => {
      render(<SelectableText {...defaultProps} />);
      fireEvent.click(screen.getByText("This is selectable text"));
      expect(mockHandleCommentClick).not.toHaveBeenCalled();
    });

    it("should not call handleCommentClick when already selected", () => {
      render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          selectedMessageId="101"
          selectedEndIndex={24}
        />,
      );
      fireEvent.click(screen.getByText("Commented text"));
      expect(mockHandleCommentClick).not.toHaveBeenCalled();
    });

    it("should not call handleCommentClick when segment is part of new selection", () => {
      render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          newCommentSelection={{ startIndex: 10, endIndex: 24, transcriptId: 101 }}
          selectedMessageId=""
        />,
      );
      fireEvent.click(screen.getByText("Commented text"));
      expect(mockHandleCommentClick).not.toHaveBeenCalled();
    });
  });

  // --- Ref Tests ---
  describe("Refs", () => {
    it("should assign selectedCommentRef when isSelectedComment is true", () => {
      const ref = { current: null };
      render(
        <SelectableText
          {...defaultProps}
          isSelectedComment={true}
          selectedCommentRef={ref as React.RefObject<HTMLSpanElement>}
        />,
      );
      expect(ref.current).not.toBeNull();
    });

    it("should not assign selectedCommentRef when isSelectedComment is false", () => {
      const ref = { current: null };
      render(
        <SelectableText
          {...defaultProps}
          isSelectedComment={false}
          selectedCommentRef={ref as React.RefObject<HTMLSpanElement>}
        />,
      );
      expect(ref.current).toBeNull();
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle empty text", () => {
      render(<SelectableText {...defaultProps} segment={{ ...mockSegment, text: "" }} />);
      const { container } = render(<SelectableText {...defaultProps} />);
      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("should handle multiple comment IDs", () => {
      const segmentWithMultipleComments = {
        ...mockSegmentWithComments,
        commentIds: ["thread-1", "thread-2", "thread-3"],
      };
      render(
        <SelectableText
          {...defaultProps}
          segment={segmentWithMultipleComments}
          selectedMessageId=""
        />,
      );
      fireEvent.click(screen.getByText("Commented text"));
      // Should use first comment ID
      expect(mockHandleCommentClick).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: "thread-1" }),
      );
    });

    it("should handle special characters in text", () => {
      render(
        <SelectableText
          {...defaultProps}
          segment={{ ...mockSegment, text: "<script>alert('xss')</script>" }}
        />,
      );
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
    });

    it("should handle emoji in text", () => {
      render(
        <SelectableText
          {...defaultProps}
          segment={{ ...mockSegment, text: "Hello 👋 World 🌍" }}
        />,
      );
      expect(screen.getByText("Hello 👋 World 🌍")).toBeInTheDocument();
    });

    it("should handle very long text", () => {
      const longText = "A".repeat(10000);
      render(<SelectableText {...defaultProps} segment={{ ...mockSegment, text: longText }} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have relative positioning", () => {
      const { container } = render(<SelectableText {...defaultProps} />);
      expect(container.querySelector("span")).toHaveClass("relative");
    });

    it("should have fixed positioning for dialog", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
          addCommentDialogOpen="0-0"
        />,
      );
      const dialogWrapper = screen.getByTestId("comment-addition-dialog").parentElement;
      expect(dialogWrapper).toHaveClass("fixed", "z-50");
    });

    it("should have fixed positioning for comment thread", () => {
      render(
        <SelectableText
          {...defaultProps}
          segment={mockSegmentWithComments}
          isSelectedComment={true}
          selectedThreadId="thread-1"
          selectedMessageId="101"
          commentsList={mockCommentsList}
        />,
      );
      const threadWrapper = screen.getByTestId("comment-thread").parentElement;
      expect(threadWrapper).toHaveClass("fixed", "z-50");
    });

    it("should have proper styling for add comment button", () => {
      render(
        <SelectableText
          {...defaultProps}
          newCommentSelection={{ startIndex: 0, endIndex: 23, transcriptId: 101 }}
        />,
      );
      const addButton = screen.getByText("Add Comment").parentElement;
      expect(addButton).toHaveClass(
        "shadow-lg",
        "border",
        "rounded-[100px]",
        "bg-white",
        "cursor-pointer",
      );
    });
  });
});
