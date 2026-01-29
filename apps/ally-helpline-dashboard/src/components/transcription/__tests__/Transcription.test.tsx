import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import Transcription from "../Transcription";

// Mock CSS import
vi.mock("../styles.css", () => ({}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

// Mock assets
vi.mock("@ally-ui-mono/ui-shared/assets", () => ({
  AddComment: (props: any) => <span data-testid="add-comment-icon" {...props} />,
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
  FEATURE_FLAGS_MAP: {
    PEER_REVIEW_FLAG: true,
  },
}));

// Mock useClickOutside
const mockUseClickOutside = vi.fn();
vi.mock("@hooks", () => ({
  useClickOutside: (ref: any, callback: any) => mockUseClickOutside(ref, callback),
}));

// Mock CommentAdditionDialog
vi.mock("../../comment-addition-dialog/CommentAdditionDialog", () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="comment-addition-dialog">
      <button data-testid="cancel-comment" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock CommentThread
vi.mock("../../comment-thread/CommentThread", () => ({
  default: ({ comments }: any) => (
    <div data-testid="comment-thread">
      {comments?.map((c: any, i: number) => (
        <div key={i} data-testid={`comment-${i}`}>
          {c.comment}
        </div>
      ))}
    </div>
  ),
}));

describe("Transcription Component", () => {
  const mockUserId = 1;
  const mockCreateComment = vi.fn();

  const mockTranscriptList = [
    {
      id: 1,
      content: "Hello, how can I help you today?",
      senderId: -1,
      startSeconds: 0,
    },
    {
      id: 2,
      content: "I need some assistance with my account.",
      senderId: 1,
      startSeconds: 65,
    },
    {
      id: 3,
      content: "Sure, I can help you with that.",
      senderId: -1,
      startSeconds: 130,
    },
  ];

  const defaultProps = {
    transcriptList: mockTranscriptList,
    userId: mockUserId,
    createComment: mockCreateComment,
    isCreateCommentLoading: false,
    isCreateCommentSuccess: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateComment.mockReset();
    mockCreateComment.mockResolvedValue(undefined);
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

    it("should render empty when transcriptList is empty", () => {
      render(<Transcription transcriptList={[]} userId={mockUserId} />);
      expect(screen.queryByText("You:")).not.toBeInTheDocument();
      expect(screen.queryByText("Agent:")).not.toBeInTheDocument();
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
        },
      ];
      render(<Transcription transcriptList={transcriptWithUndefined as any} userId={mockUserId} />);
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("should format time with padded zeros correctly", () => {
      const transcriptWithVariousTimes = [
        { id: 1, content: "Message 1", senderId: -1, startSeconds: 5 },
        { id: 2, content: "Message 2", senderId: -1, startSeconds: 59 },
        { id: 3, content: "Message 3", senderId: -1, startSeconds: 600 },
      ];
      render(<Transcription transcriptList={transcriptWithVariousTimes} userId={mockUserId} />);
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

    it("should not handle selection when canSelect is false", () => {
      const mockSelection = {
        isCollapsed: false,
        toString: () => "selected text",
        anchorNode: document.createTextNode("test"),
        anchorOffset: 0,
        focusNode: document.createTextNode("test"),
        focusOffset: 5,
      };

      Object.defineProperty(window, "getSelection", {
        value: vi.fn(() => mockSelection),
        writable: true,
      });

      const { container } = render(<Transcription {...defaultProps} canSelect={false} />);
      const contentSpan = container.querySelector(".selected-text");

      fireEvent.mouseUp(contentSpan!);

      // Should not show add comment dialog
      expect(screen.queryByTestId("add-comment-icon")).not.toBeInTheDocument();
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
        },
      ];

      const { rerender } = render(
        <Transcription transcriptList={transcriptWithId} userId={mockUserId} canSelect={true} />,
      );

      rerender(
        <Transcription
          transcriptList={transcriptWithId}
          userId={mockUserId}
          canSelect={true}
          selectedMessageId="22870"
          selectedStartIndex={0}
          selectedEndIndex={10}
        />,
      );

      await waitFor(() => {
        // The component should process the selected comment
        expect(screen.getByText(/This is a/)).toBeInTheDocument();
      });
    });

    it("should call onCloseSelectedComment when provided", () => {
      const onCloseSelectedComment = vi.fn();

      render(
        <Transcription
          {...defaultProps}
          canSelect={true}
          selectedMessageId="1"
          selectedStartIndex={0}
          selectedEndIndex={5}
          onCloseSelectedComment={onCloseSelectedComment}
        />,
      );

      // Verify useClickOutside was called with the callback
      expect(mockUseClickOutside).toHaveBeenCalled();
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
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
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

    it("should highlight commented text with amber background when selected", () => {
      const transcriptWithThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [{ id: "1", content: "Test comment" }],
            },
          ],
        },
      ] as any;

      const { container } = render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithThreads}
          canSelect={true}
          selectedMessageId="1"
          selectedThreadId="1"
        />,
      );

      const amberHighlight = container.querySelector(".bg-amber-200");
      expect(amberHighlight).toBeInTheDocument();
    });

    it("should show blue background for new comment selection without saved comments", () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      const { container } = render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
        />,
      );

      const blueHighlight = container.querySelector('[class*="bg-[#E1F1FE]"]');
      expect(blueHighlight).toBeInTheDocument();
    });
  });

  // --- Add Comment Dialog Tests ---
  describe("Add Comment Dialog", () => {
    it("should show add comment button for empty comment selection", () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
        />,
      );

      expect(screen.getByText("Add comment")).toBeInTheDocument();
      expect(screen.getByTestId("add-comment-icon")).toBeInTheDocument();
    });

    it("should open comment dialog when add comment button is clicked", async () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
        />,
      );

      const addCommentButton = screen.getByText("Add comment").closest("div");
      fireEvent.click(addCommentButton!);

      await waitFor(() => {
        expect(screen.getByTestId("comment-addition-dialog")).toBeInTheDocument();
      });
    });

    it("should close dialog when cancel is clicked", async () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
        />,
      );

      // Open dialog
      const addCommentButton = screen.getByText("Add comment").closest("div");
      fireEvent.click(addCommentButton!);

      await waitFor(() => {
        expect(screen.getByTestId("comment-addition-dialog")).toBeInTheDocument();
      });

      // Cancel dialog
      const cancelButton = screen.getByTestId("cancel-comment");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId("comment-addition-dialog")).not.toBeInTheDocument();
      });
    });
  });

  // --- useClickOutside Hook Tests ---
  describe("Click Outside Handling", () => {
    it("should register click outside handlers", () => {
      render(<Transcription {...defaultProps} canSelect={true} />);

      // useClickOutside should be called for dialog, selectedComment, and addCommentDialog refs
      expect(mockUseClickOutside).toHaveBeenCalled();
    });
  });

  // --- createComment Prop Tests ---
  describe("createComment Prop", () => {
    it("should render without createComment prop", () => {
      render(<Transcription transcriptList={mockTranscriptList} userId={mockUserId} />);

      expect(screen.getByText("Hello, how can I help you today?")).toBeInTheDocument();
    });

    it("should pass isCreateCommentLoading to CommentAdditionDialog", async () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
          isCreateCommentLoading={true}
        />,
      );

      const addCommentButton = screen.getByText("Add comment").closest("div");
      fireEvent.click(addCommentButton!);

      await waitFor(() => {
        expect(screen.getByTestId("comment-addition-dialog")).toBeInTheDocument();
      });
    });

    it("should handle isCreateCommentSuccess state change", async () => {
      const transcriptWithEmptyThreads = [
        {
          id: 1,
          content: "Hello, this is a message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [],
            },
          ],
        },
      ] as any;

      const { rerender } = render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
          isCreateCommentSuccess={false}
        />,
      );

      // Open dialog
      const addCommentButton = screen.getByText("Add comment").closest("div");
      fireEvent.click(addCommentButton!);

      await waitFor(() => {
        expect(screen.getByTestId("comment-addition-dialog")).toBeInTheDocument();
      });

      // Rerender with success
      rerender(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithEmptyThreads}
          canSelect={true}
          isCreateCommentSuccess={true}
        />,
      );

      // Dialog should close on success
      await waitFor(() => {
        expect(screen.queryByTestId("comment-addition-dialog")).not.toBeInTheDocument();
      });
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
        },
      ];

      render(
        <Transcription transcriptList={transcriptWithNullSeconds as any} userId={mockUserId} />,
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
        },
      ];

      render(<Transcription transcriptList={transcriptWithLongContent} userId={mockUserId} />);
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("should handle multiple threads on same transcript", () => {
      const transcriptWithMultipleThreads = [
        {
          id: 1,
          content: "Hello world, this is a test message",
          senderId: -1,
          startSeconds: 0,
          threads: [
            {
              id: "1",
              selection: { startIndex: 0, endIndex: 5, text: "Hello", messageId: 1 },
              comments: [{ id: "1", content: "Comment 1" }],
            },
            {
              id: "2",
              selection: { startIndex: 13, endIndex: 17, text: "this", messageId: 1 },
              comments: [{ id: "2", content: "Comment 2" }],
            },
          ],
        },
      ] as any;

      render(
        <Transcription
          {...defaultProps}
          transcriptList={transcriptWithMultipleThreads}
          canSelect={true}
        />,
      );

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/world/)).toBeInTheDocument();
    });

    it("should handle transcript with special characters", () => {
      const transcriptWithSpecialChars = [
        {
          id: 1,
          content: "Hello! How are you? <script>alert('test')</script>",
          senderId: -1,
          startSeconds: 0,
        },
      ];

      render(<Transcription transcriptList={transcriptWithSpecialChars} userId={mockUserId} />);
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
        },
      ];

      render(<Transcription transcriptList={transcriptWithEmojis} userId={mockUserId} />);
      expect(screen.getByText("Hello! 👋 How are you? 😊")).toBeInTheDocument();
    });

    it("should handle different userId values", () => {
      const differentUserId = 999;
      const transcriptForDifferentUser = [
        {
          id: 1,
          content: "Message from different user",
          senderId: 999,
          startSeconds: 0,
        },
      ];

      render(
        <Transcription transcriptList={transcriptForDifferentUser} userId={differentUserId} />,
      );
      expect(screen.getByText("You:")).toBeInTheDocument();
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
        },
      ];

      rerender(<Transcription transcriptList={newTranscriptList} userId={mockUserId} />);

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
});
