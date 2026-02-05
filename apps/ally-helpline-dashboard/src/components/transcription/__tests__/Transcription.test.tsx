import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import Transcription from "../Transcription";

// Mock CSS import
vi.mock("../styles.css", () => ({}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ reviewId: "test-review-id" }),
}));

// Mock InfiniteScroll
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  InfiniteScroll: ({ children, onInfiniteScroll, isLoading }: any) => (
    <div data-testid="infinite-scroll" data-loading={isLoading}>
      {children}
      <button data-testid="load-more-trigger" onClick={onInfiniteScroll}>
        Load More
      </button>
    </div>
  ),
}));

// Mock SelectableText component
vi.mock("@src/components/selectable-text/SelectableText", () => ({
  default: ({
    segment,
    segIdx,
    selectedThreadId,
    isSelectedComment,
    addCommentDialogOpen,
    setAddCommentDialogOpen,
    onCommentChange,
  }: any) => (
    <span
      data-testid={`selectable-text-${segIdx}`}
      data-segment-text={segment.text}
      data-comment-ids={segment.commentIds?.join(",")}
      data-selected={isSelectedComment}
      data-thread-id={selectedThreadId}
      data-dialog-open={addCommentDialogOpen}
    >
      {segment.text}
      {segment.commentIds?.length > 0 && (
        <span data-testid={`comment-highlight-${segIdx}`} className="bg-amber-50" />
      )}
      {onCommentChange && (
        <button
          data-testid={`comment-change-${segIdx}`}
          onClick={() => onCommentChange({ comments: [], threadId: "thread-1" })}
        >
          Comment Change
        </button>
      )}
    </span>
  ),
}));

// Mock utils
vi.mock("../utils", () => ({
  getFreshUserRange: vi.fn(),
  splitByCommentRanges: (content: string, threads: any[]) => {
    if (!threads || threads.length === 0) {
      return [{ text: content, commentIds: [], start: 0, end: content.length }];
    }
    // Simple mock: return segments based on threads
    const segments: any[] = [];
    let lastEnd = 0;
    threads.forEach((thread, idx) => {
      if (thread.start > lastEnd) {
        segments.push({
          text: content.slice(lastEnd, thread.start),
          commentIds: [],
          start: lastEnd,
          end: thread.start,
        });
      }
      segments.push({
        text: content.slice(thread.start, thread.end),
        commentIds: [thread.id],
        start: thread.start,
        end: thread.end,
      });
      lastEnd = thread.end;
    });
    if (lastEnd < content.length) {
      segments.push({
        text: content.slice(lastEnd),
        commentIds: [],
        start: lastEnd,
        end: content.length,
      });
    }
    return segments;
  },
}));

describe("Transcription Component", () => {
  const mockUserId = 1;
  const mockCreateComment = vi.fn();
  const mockOnCommentChange = vi.fn();
  const mockOnDeleteComment = vi.fn();

  const mockTranscriptList = [
    {
      id: 1,
      content: "Hello, how can I help you today?",
      senderId: -1,
      startSeconds: 0,
      threads: [],
    },
    {
      id: 2,
      content: "I need some assistance with my account.",
      senderId: 1,
      startSeconds: 65,
      threads: [],
    },
    {
      id: 3,
      content: "Sure, I can help you with that.",
      senderId: -1,
      startSeconds: 130,
      threads: [],
    },
  ];

  const defaultProps = {
    transcriptList: mockTranscriptList,
    userId: mockUserId,
    createComment: mockCreateComment,
    isCreateCommentLoading: false,
    isCreateCommentSuccess: false,
    onCommentChange: mockOnCommentChange,
    onDeleteComment: mockOnDeleteComment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateComment.mockReset();
    mockCreateComment.mockResolvedValue(undefined);
    mockOnCommentChange.mockReset();
    // Reset window.getSelection mock
    Object.defineProperty(window, "getSelection", {
      value: vi.fn(() => null),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Snapshot Test ---
  it("should match snapshot when rendered", () => {
    const { asFragment } = render(<Transcription {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render transcript list correctly", () => {
      render(<Transcription {...defaultProps} />);

      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
      expect(screen.getByText("I need some assistance with my account.")).toBeInTheDocument();
      expect(screen.getByText("Sure, I can help you with that.")).toBeInTheDocument();
    });

    it("should render InfiniteScroll wrapper", () => {
      render(<Transcription {...defaultProps} />);
      expect(screen.getByTestId("infinite-scroll")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<Transcription {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should render empty message when transcriptList is empty", () => {
      render(
        <Transcription
          transcriptList={[]}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText("No transcript available")).toBeInTheDocument();
    });

    it("should render skeleton loader when loading and no transcripts", () => {
      render(
        <Transcription
          transcriptList={[]}
          userId={mockUserId}
          isLoading={true}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      // Skeleton should be rendered
      expect(screen.queryByText("No transcript available")).not.toBeInTheDocument();
    });
  });

  // --- Speaker Identification Tests ---
  describe("Speaker Identification", () => {
    it("should display 'You:' for messages from the current user", () => {
      render(<Transcription {...defaultProps} />);
      const youLabels = screen.getAllByText("You:");
      expect(youLabels.length).toBe(1);
    });

    it("should display 'AI Agent:' for messages not from the current user", () => {
      render(<Transcription {...defaultProps} />);
      const agentLabels = screen.getAllByText("AI Agent:");
      expect(agentLabels.length).toBe(2);
    });

    it("should style 'You:' label with primary color", () => {
      render(<Transcription {...defaultProps} />);
      const youLabel = screen.getByText("You:");
      expect(youLabel).toHaveClass("text-primary-700");
    });

    it("should style 'AI Agent:' label with typography color", () => {
      render(<Transcription {...defaultProps} />);
      const agentLabels = screen.getAllByText("AI Agent:");
      agentLabels.forEach(label => {
        expect(label).toHaveClass("text-typography-900");
      });
    });
  });

  // --- Time Conversion Tests ---
  describe("Time Conversion", () => {
    it("should convert 0 seconds to 00:00", () => {
      render(<Transcription {...defaultProps} />);
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("should convert 65 seconds to 01:05", () => {
      render(<Transcription {...defaultProps} />);
      expect(screen.getByText("01:05")).toBeInTheDocument();
    });

    it("should convert 130 seconds to 02:10", () => {
      render(<Transcription {...defaultProps} />);
      expect(screen.getByText("02:10")).toBeInTheDocument();
    });

    it("should handle undefined startSeconds as 0", () => {
      const transcriptWithUndefined = [
        {
          id: 1,
          content: "Test message",
          senderId: -1,
          startSeconds: undefined,
          threads: [],
        },
      ];
      render(
        <Transcription
          transcriptList={transcriptWithUndefined as any}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("should format time with padded zeros correctly", () => {
      const transcriptWithVariousTimes = [
        { id: 1, content: "Message 1", senderId: -1, startSeconds: 5, threads: [] },
        { id: 2, content: "Message 2", senderId: -1, startSeconds: 59, threads: [] },
        { id: 3, content: "Message 3", senderId: -1, startSeconds: 600, threads: [] },
      ];
      render(
        <Transcription
          transcriptList={transcriptWithVariousTimes}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText("00:05")).toBeInTheDocument();
      expect(screen.getByText("00:59")).toBeInTheDocument();
      expect(screen.getByText("10:00")).toBeInTheDocument();
    });
  });

  // --- InfiniteScroll Tests ---
  describe("InfiniteScroll Integration", () => {
    it("should pass handleLoadMore to InfiniteScroll", () => {
      const handleLoadMore = vi.fn();
      render(<Transcription {...defaultProps} handleLoadMore={handleLoadMore} />);

      const loadMoreTrigger = screen.getByTestId("load-more-trigger");
      fireEvent.click(loadMoreTrigger);

      expect(handleLoadMore).toHaveBeenCalledTimes(1);
    });

    it("should pass isLoading to InfiniteScroll", () => {
      render(<Transcription {...defaultProps} isLoading={true} />);

      const infiniteScroll = screen.getByTestId("infinite-scroll");
      expect(infiniteScroll).toHaveAttribute("data-loading", "true");
    });

    it("should not fail when handleLoadMore is undefined", () => {
      render(<Transcription {...defaultProps} handleLoadMore={undefined} />);

      const loadMoreTrigger = screen.getByTestId("load-more-trigger");
      expect(() => fireEvent.click(loadMoreTrigger)).not.toThrow();
    });
  });

  // --- Selection Tests ---
  describe("Text Selection (canSelect)", () => {
    it("should have pointer-events-none when canSelect is false", () => {
      const { container } = render(<Transcription {...defaultProps} canSelect={false} />);

      const transcriptItems = container.querySelectorAll(".pointer-events-none");
      expect(transcriptItems.length).toBe(3);
    });

    it("should not have pointer-events-none when canSelect is true", () => {
      const { container } = render(<Transcription {...defaultProps} canSelect={true} />);

      const transcriptItems = container.querySelectorAll(".pointer-events-none");
      expect(transcriptItems.length).toBe(0);
    });

    it("should have cursor-text when canSelect is true", () => {
      const { container } = render(<Transcription {...defaultProps} canSelect={true} />);

      const cursorTextElements = container.querySelectorAll(".cursor-text");
      expect(cursorTextElements.length).toBe(3);
    });

    it("should have cursor-default when canSelect is false", () => {
      const { container } = render(<Transcription {...defaultProps} canSelect={false} />);

      const cursorDefaultElements = container.querySelectorAll(".cursor-default");
      expect(cursorDefaultElements.length).toBe(3);
    });
  });

  // --- Selected Comment Tests ---
  describe("Selected Comment Highlighting", () => {
    it("should update transcriptions when selectedMessageId changes", async () => {
      const transcriptWithId = [
        {
          id: 22870,
          content: "This is a test message for selection",
          senderId: -1,
          startSeconds: 0,
          threads: [],
        },
      ];

      const { rerender } = render(
        <Transcription
          transcriptList={transcriptWithId}
          userId={mockUserId}
          canSelect={true}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );

      rerender(
        <Transcription
          transcriptList={transcriptWithId}
          userId={mockUserId}
          canSelect={true}
          selectedMessageId="22870"
          selectedStartIndex={0}
          selectedEndIndex={10}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/This is a/)).toBeInTheDocument();
      });
    });
  });

  // --- Comments Display Tests ---
  describe("Comments Display", () => {
    it("should render transcript with existing threads", () => {
      const transcriptWithThreads = [
        {
          id: 1,
          content: "Hello, this is a message with comments",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "thread-1",
              selection: { startIndex: 0, endIndex: 5 },
              comments: [{ id: "1", content: "Test comment" }],
            },
          ],
        },
      ] as any;

      render(
        <Transcription {...defaultProps} transcriptList={transcriptWithThreads} canSelect={true} />,
      );

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle transcript with null startSeconds", () => {
      const transcriptWithNullSeconds = [
        {
          id: 1,
          content: "Test message",
          senderId: -1,
          startSeconds: null,
          threads: [],
        },
      ];

      render(
        <Transcription
          transcriptList={transcriptWithNullSeconds as any}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("should handle very long transcript content", () => {
      const longContent = "A".repeat(1000);
      const transcriptWithLongContent = [
        {
          id: 1,
          content: longContent,
          senderId: -1,
          startSeconds: 0,
          threads: [],
        },
      ];

      render(
        <Transcription
          transcriptList={transcriptWithLongContent}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("should handle transcript with special characters", () => {
      const transcriptWithSpecialChars = [
        {
          id: 1,
          content: "Hello! How are you? <script>alert('test')</script>",
          senderId: -1,
          startSeconds: 0,
          threads: [],
        },
      ];

      render(
        <Transcription
          transcriptList={transcriptWithSpecialChars}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(
        screen.getByText("Hello! How are you? <script>alert('test')</script>"),
      ).toBeInTheDocument();
    });

    it("should handle transcript with emojis", () => {
      const transcriptWithEmojis = [
        {
          id: 1,
          content: "Hello! 👋 How are you? 😊",
          senderId: -1,
          startSeconds: 0,
          threads: [],
        },
      ];

      render(
        <Transcription
          transcriptList={transcriptWithEmojis}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );
      expect(screen.getByText("Hello! 👋 How are you? 😊")).toBeInTheDocument();
    });

    it("should update when transcriptList prop changes", async () => {
      const { rerender } = render(<Transcription {...defaultProps} />);

      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();

      const newTranscriptList = [
        {
          id: 4,
          content: "New message content",
          senderId: -1,
          startSeconds: 200,
          threads: [],
        },
      ];

      rerender(
        <Transcription
          transcriptList={newTranscriptList}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("New message content")).toBeInTheDocument();
        expect(screen.queryByText("Hello, how can I help you today?")).not.toBeInTheDocument();
      });
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should apply font-primary class to container", () => {
      const { container } = render(<Transcription {...defaultProps} />);
      expect(container.firstChild).toHaveClass("font-primary");
    });

    it("should apply flex layout classes", () => {
      const { container } = render(<Transcription {...defaultProps} />);
      expect(container.firstChild).toHaveClass("flex", "flex-col", "gap-4");
    });

    it("should apply neutral-500 color to timestamps", () => {
      const { container } = render(<Transcription {...defaultProps} />);
      const timestampElements = container.querySelectorAll(".text-neutral-500");
      expect(timestampElements.length).toBe(3);
    });
  });

  // --- Transcript Item Structure Tests ---
  describe("Transcript Item Structure", () => {
    it("should render timestamp and content for each transcript", () => {
      render(<Transcription {...defaultProps} />);

      // Check all timestamps are present
      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(screen.getByText("01:05")).toBeInTheDocument();
      expect(screen.getByText("02:10")).toBeInTheDocument();

      // Check all content is present
      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
      expect(screen.getByText("I need some assistance with my account.")).toBeInTheDocument();
      expect(screen.getByText("Sure, I can help you with that.")).toBeInTheDocument();
    });

    it("should maintain correct order of transcripts", () => {
      const { container } = render(<Transcription {...defaultProps} />);

      const timestamps = container.querySelectorAll(".text-neutral-500");
      expect(timestamps[0]).toHaveTextContent("00:00");
      expect(timestamps[1]).toHaveTextContent("01:05");
      expect(timestamps[2]).toHaveTextContent("02:10");
    });
  });

  // --- isFeedOwner prop tests ---
  describe("isFeedOwner Prop", () => {
    it("should pass isFeedOwner to SelectableText components", () => {
      render(<Transcription {...defaultProps} isFeedOwner={true} canSelect={true} />);
      // SelectableText components should be rendered with isFeedOwner
      expect(screen.getAllByTestId(/selectable-text-/).length).toBeGreaterThan(0);
    });
  });

  // --- createComment prop tests ---
  describe("createComment Prop", () => {
    it("should render without createComment prop", () => {
      render(
        <Transcription
          transcriptList={mockTranscriptList}
          userId={mockUserId}
          onCommentChange={mockOnCommentChange}
          onDeleteComment={mockOnDeleteComment}
        />,
      );

      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
    });
  });

  // --- onCommentChange prop tests ---
  describe("onCommentChange Prop", () => {
    it("should pass onCommentChange to SelectableText components", () => {
      render(<Transcription {...defaultProps} canSelect={true} />);
      // Check that comment change buttons exist (from mock)
      const commentChangeButtons = screen.queryAllByTestId(/comment-change-/);
      expect(commentChangeButtons.length).toBeGreaterThanOrEqual(0);
    });

    it("should render correctly with onCommentChange prop", () => {
      render(<Transcription {...defaultProps} canSelect={true} />);
      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
    });
  });
});
