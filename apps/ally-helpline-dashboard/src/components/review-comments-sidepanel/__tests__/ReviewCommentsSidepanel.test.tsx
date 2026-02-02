import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ReviewCommentsSidepanel from "../ReviewCommentsSidepanel";

// Mock MUI Skeleton
vi.mock("@mui/material", () => ({
  Skeleton: ({ variant, className }: any) => (
    <div data-testid="skeleton" data-variant={variant} className={className} />
  ),
}));

// Mock ThreadCard component
vi.mock("@components", () => ({
  ThreadCard: ({ thread, isFeedOwner }: any) => (
    <div data-testid={`thread-card-${thread.id}`} data-is-feed-owner={isFeedOwner}>
      <span data-testid="thread-text">{thread.selection.text}</span>
      <span data-testid="comment-count">{thread.comments.length}</span>
    </div>
  ),
}));

describe("ReviewCommentsSidepanel Component", () => {
  const mockThreads = [
    {
      id: "thread-1",
      selection: {
        text: "Selected text 1",
        startIndex: 0,
        endIndex: 15,
        messageId: 101,
      },
      comments: [
        {
          id: "1",
          createdBy: { id: 1, name: "John Doe", profileImage: null },
          createdAt: "2024-01-15T10:00:00Z",
          content: "First comment",
          reactions: {},
          replyCount: 0,
        },
      ],
    },
    {
      id: "thread-2",
      selection: {
        text: "Selected text 2",
        startIndex: 20,
        endIndex: 35,
        messageId: 102,
      },
      comments: [
        {
          id: "2",
          createdBy: { id: 2, name: "Jane Smith", profileImage: null },
          createdAt: "2024-01-15T11:00:00Z",
          content: "Second comment",
          reactions: { "1f44d": 3 },
          replyCount: 2,
        },
        {
          id: "3",
          createdBy: { id: 3, name: "Bob Wilson", profileImage: null },
          createdAt: "2024-01-15T12:00:00Z",
          content: "Reply to second",
          reactions: {},
          replyCount: 0,
        },
      ],
    },
  ];

  const mockOnCommentClick = vi.fn();

  const defaultProps = {
    threads: mockThreads,
    totalComments: 3,
    onCommentClick: mockOnCommentClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  it("should match snapshot with threads", async () => {
    const { asFragment } = render(<ReviewCommentsSidepanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with loading state", () => {
    const { asFragment } = render(<ReviewCommentsSidepanel {...defaultProps} threads={null} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with empty threads", async () => {
    const { asFragment } = render(
      <ReviewCommentsSidepanel {...defaultProps} threads={[]} totalComments={0} />,
    );
    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Header Tests ---
  describe("Header", () => {
    it("should display correct comment count with plural", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} totalComments={5} />);
      await waitFor(() => {
        expect(screen.getByText("5 Comments")).toBeInTheDocument();
      });
    });

    it("should display singular 'Comment' for count of 1", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} totalComments={1} />);
      await waitFor(() => {
        expect(screen.getByText("1 Comment")).toBeInTheDocument();
      });
    });

    it("should display '0 Comments' when totalComments is 0", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} totalComments={0} threads={[]} />);
      await waitFor(() => {
        expect(screen.getByText("0 Comments")).toBeInTheDocument();
      });
    });

    it("should display '0 Comments' when totalComments is undefined", async () => {
      render(<ReviewCommentsSidepanel threads={[]} totalComments={undefined as any} />);
      await waitFor(() => {
        expect(screen.getByText("0 Comments")).toBeInTheDocument();
      });
    });
  });

  // --- Loading State Tests ---
  describe("Loading State", () => {
    it("should show skeleton loaders when threads is null", () => {
      render(<ReviewCommentsSidepanel {...defaultProps} threads={null} />);
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render 10 skeleton cards while loading", () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} threads={null} />);
      const skeletonCards = container.querySelectorAll(".h-\\[140px\\]");
      expect(skeletonCards.length).toBe(10);
    });

    it("should hide skeletons when threads are loaded", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
      });
    });

    it("should show content when threads is empty array (not null)", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} threads={[]} totalComments={0} />);
      await waitFor(() => {
        expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
        expect(screen.getByText("No comments yet")).toBeInTheDocument();
      });
    });
  });

  // --- Thread Rendering Tests ---
  describe("Thread Rendering", () => {
    it("should render all threads with comments", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
        expect(screen.getByTestId("thread-card-thread-2")).toBeInTheDocument();
      });
    });

    it("should not render threads without comments[0]", async () => {
      const threadsWithEmpty = [
        ...mockThreads,
        {
          id: "thread-empty",
          selection: { text: "Empty", startIndex: 0, endIndex: 5, messageId: 103 },
          comments: [],
        },
      ];
      render(<ReviewCommentsSidepanel {...defaultProps} threads={threadsWithEmpty} />);
      await waitFor(() => {
        expect(screen.queryByTestId("thread-card-thread-empty")).not.toBeInTheDocument();
      });
    });

    it("should pass isFeedOwner prop to ThreadCard", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} isFeedOwner={true} />);
      await waitFor(() => {
        const threadCard = screen.getByTestId("thread-card-thread-1");
        expect(threadCard).toHaveAttribute("data-is-feed-owner", "true");
      });
    });

    it("should show empty state when threads array is empty", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} threads={[]} totalComments={0} />);
      await waitFor(() => {
        expect(screen.getByText("No comments yet")).toBeInTheDocument();
      });
    });
  });

  // --- Click Handler Tests ---
  describe("Click Handler", () => {
    it("should call onCommentClick with correct params when thread is clicked", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
      });

      const threadContainer = screen.getByTestId("thread-card-thread-1").parentElement;
      fireEvent.click(threadContainer!);

      expect(mockOnCommentClick).toHaveBeenCalledWith([
        {
          threadId: "thread-1",
          messageId: "101",
          startIndex: 0,
          endIndex: 15,
        },
      ]);
    });

    it("should call onCommentClick with correct messageId as string", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-2")).toBeInTheDocument();
      });

      const threadContainer = screen.getByTestId("thread-card-thread-2").parentElement;
      fireEvent.click(threadContainer!);

      expect(mockOnCommentClick).toHaveBeenCalledWith([
        {
          threadId: "thread-2",
          messageId: "102",
          startIndex: 20,
          endIndex: 35,
        },
      ]);
    });

    it("should use default empty function when onCommentClick not provided", async () => {
      render(<ReviewCommentsSidepanel threads={mockThreads} totalComments={3} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
      });

      const threadContainer = screen.getByTestId("thread-card-thread-1").parentElement;
      // Should not throw
      expect(() => fireEvent.click(threadContainer!)).not.toThrow();
    });
  });

  // --- Animation/Transition Tests ---
  // Animation styles (transform, opacity, transitionDelay) are on the grandparent of thread-card
  const getAnimatedThreadWrapper = (el: HTMLElement) => el.parentElement?.parentElement;

  describe("Animations", () => {
    it("should apply open styles when isOpen is true", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} isOpen={true} />);
      await waitFor(() => {
        const animatedWrapper = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-1"),
        );
        expect(animatedWrapper).toHaveStyle({ transform: "translateY(0)", opacity: "1" });
      });
    });

    it("should apply closed styles when isOpen is false", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} isOpen={false} />);
      await waitFor(() => {
        const animatedWrapper = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-1"),
        );
        expect(animatedWrapper).toHaveStyle({ transform: "translateY(-100%)", opacity: "0" });
      });
    });

    it("should have staggered transition delays based on index when open", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} isOpen={true} />);
      await waitFor(() => {
        const thread1Container = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-1"),
        );
        const thread2Container = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-2"),
        );

        expect(thread1Container).toHaveStyle({ transitionDelay: "0ms" });
        expect(thread2Container).toHaveStyle({ transitionDelay: "50ms" });
      });
    });

    it("should have reverse staggered delays when closing", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} isOpen={false} />);
      await waitFor(() => {
        const thread1Container = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-1"),
        );
        const thread2Container = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-2"),
        );

        // When closing: (threads.length - index) * 30ms
        // thread1: (2 - 0) * 30 = 60ms
        // thread2: (2 - 1) * 30 = 30ms
        expect(thread1Container).toHaveStyle({ transitionDelay: "60ms" });
        expect(thread2Container).toHaveStyle({ transitionDelay: "30ms" });
      });
    });

    it("should default isOpen to true", async () => {
      render(<ReviewCommentsSidepanel threads={mockThreads} totalComments={3} />);
      await waitFor(() => {
        const animatedWrapper = getAnimatedThreadWrapper(
          screen.getByTestId("thread-card-thread-1"),
        );
        expect(animatedWrapper).toHaveStyle({ opacity: "1" });
      });
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have white background", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
    });

    it("should have left border", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("border-l-[0.5px]");
    });

    it("should have overflow hidden", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("overflow-hidden");
    });

    it("should have transition classes", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("transition-all", "duration-300");
    });

    it("should apply custom className", async () => {
      const { container } = render(
        <ReviewCommentsSidepanel {...defaultProps} className="custom-class w-96" />,
      );
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("custom-class", "w-96");
    });

    it("should have cursor-pointer on thread items", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        const threadContainer = screen.getByTestId("thread-card-thread-1").parentElement;
        expect(threadContainer).toHaveClass("cursor-pointer");
      });
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle single thread", async () => {
      const singleThread = [mockThreads[0]];
      render(
        <ReviewCommentsSidepanel {...defaultProps} threads={singleThread} totalComments={1} />,
      );
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
        expect(screen.getByText("1 Comment")).toBeInTheDocument();
      });
    });

    it("should handle many threads", async () => {
      const manyThreads = Array.from({ length: 20 }, (_, i) => ({
        id: `thread-${i}`,
        selection: { text: `Text ${i}`, startIndex: i * 10, endIndex: i * 10 + 5, messageId: i },
        comments: [
          {
            id: String(i),
            createdBy: { id: i, name: `User ${i}`, profileImage: null },
            createdAt: "2024-01-15T10:00:00Z",
            content: `Comment ${i}`,
            reactions: {},
            replyCount: 0,
          },
        ],
      }));
      render(
        <ReviewCommentsSidepanel {...defaultProps} threads={manyThreads} totalComments={20} />,
      );
      await waitFor(() => {
        expect(screen.getAllByTestId(/thread-card-/).length).toBe(20);
      });
    });

    it("should handle large totalComments number", async () => {
      render(<ReviewCommentsSidepanel {...defaultProps} totalComments={999} />);
      await waitFor(() => {
        expect(screen.getByText("999 Comments")).toBeInTheDocument();
      });
    });

    it("should handle thread with null comments[0]", async () => {
      const threadsWithNull = [
        {
          id: "thread-null",
          selection: { text: "Null", startIndex: 0, endIndex: 4, messageId: 1 },
          comments: [null as any],
        },
        ...mockThreads,
      ];
      render(<ReviewCommentsSidepanel {...defaultProps} threads={threadsWithNull} />);
      await waitFor(() => {
        expect(screen.queryByTestId("thread-card-thread-null")).not.toBeInTheDocument();
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
      });
    });
  });

  // --- Scrollable Container Tests ---
  describe("Scrollable Container", () => {
    it("should have scrollable container with custom scrollbar", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        const scrollContainer = container.querySelector(".overflow-auto");
        expect(scrollContainer).toBeInTheDocument();
        expect(scrollContainer).toHaveClass("custom-scrollbar");
      });
    });

    it("should have calculated height for scroll area", async () => {
      const { container } = render(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        const scrollContainer = container.querySelector(".h-\\[calc\\(100\\%-40px\\)\\]");
        expect(scrollContainer).toBeInTheDocument();
      });
    });
  });
});
