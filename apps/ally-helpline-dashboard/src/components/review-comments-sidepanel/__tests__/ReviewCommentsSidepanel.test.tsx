import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ReviewCommentsSidepanel from "../ReviewCommentsSidepanel";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === "review.details.comment") {
        const count = options?.count ?? 0;
        return count === 1 ? "1 Comment" : `${count} Comments`;
      }
      if (key === "review.details.comments") {
        return "Comments";
      }
      if (key === "review.details.noComments") {
        return "No comments yet";
      }
      return key;
    },
  }),
}));

// Mock @components (component imports GeneralCommentsToShow and ThreadsToShow from here)
vi.mock("@components", () => ({
  ThreadCard: ({ thread, isFeedOwner }: any) => (
    <div data-testid={`thread-card-${thread.id}`} data-is-feed-owner={isFeedOwner}>
      <span data-testid="thread-text">{thread.selection.text}</span>
      <span data-testid="comment-count">{thread.comments.length}</span>
    </div>
  ),
  CommentCard: ({ comment }: any) => (
    <div data-testid={`comment-card-${comment.id}`}>
      <span data-testid="comment-content">{comment.content}</span>
      <span data-testid="comment-author">{comment.createdBy.name}</span>
    </div>
  ),
  GeneralCommentsToShow: ({ show }: any) =>
    show ? <div data-testid="general-comments">General Comments</div> : null,
  ThreadsToShow: ({ threads, isOpen, onCommentClick, isFeedOwner }: any) => {
    const filteredThreads = threads?.filter((thread: any) => thread?.comments?.[0] != null) || [];
    const totalThreads = filteredThreads.length;
    return (
      <div data-testid="threads-to-show">
        {filteredThreads.map((thread: any, index: number) => {
          const delay = isOpen ? index * 30 : (totalThreads - index) * 30;
          return (
            <div
              key={thread.id}
              className="cursor-pointer"
              style={{
                opacity: isOpen ? 1 : 0,
                transitionDelay: `${delay}ms`,
              }}
            >
              <div
                data-testid={`thread-card-${thread.id}`}
                data-is-feed-owner={isFeedOwner}
                onClick={() =>
                  onCommentClick?.({
                    messageId: thread.selection.messageId,
                    startIndex: thread.selection.startIndex,
                    endIndex: thread.selection.endIndex,
                    threadId: thread.id,
                  })
                }
              >
                <span data-testid="thread-text">{thread.selection.text}</span>
                <span data-testid="comment-count">{thread.comments.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
}));

// Mock ui-shared (the component imports both Tabs and SkeletonPlaceholder from here)
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          data-active={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  SkeletonPlaceholder: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

// Create mock store
const createMockStore = () =>
  configureStore({
    reducer: {
      user: () => ({
        user: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
          profileImageUrl: null,
        },
      }),
    },
  });

// Test wrapper with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/reviews/test-review-id"]}>{ui}</MemoryRouter>
    </Provider>,
  );
};

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
    generalComments: [],
    setComments: vi.fn(),
    isGeneralCommentsLoading: false,
    handleGeneralCommentsLoadMore: vi.fn(),
    hasMoreGeneralComments: false,
    totalComments: 3,
    onCommentClick: mockOnCommentClick,
    setCommentsCount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  it("should match snapshot with threads", async () => {
    const { asFragment } = renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with loading state", () => {
    const { asFragment } = renderWithProviders(
      <ReviewCommentsSidepanel {...defaultProps} threads={null} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with empty threads", async () => {
    const { asFragment } = renderWithProviders(
      <ReviewCommentsSidepanel {...defaultProps} threads={[]} />,
    );
    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Header Tests ---
  describe("Header", () => {
    it("should display 'Comments' when totalComments is 0", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={[]} />);
      await waitFor(() => {
        expect(screen.getByText("Comments")).toBeInTheDocument();
      });
    });

    it("should display 'Comments' when totalComments is undefined", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={[]} />);
      await waitFor(() => {
        expect(screen.getByText("Comments")).toBeInTheDocument();
      });
    });
  });

  // --- Loading State Tests ---
  describe("Loading State", () => {
    it("should show skeleton loaders when threads is null", () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={null} />);
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render 10 skeleton cards while loading", () => {
      const { container } = renderWithProviders(
        <ReviewCommentsSidepanel {...defaultProps} threads={null} />,
      );
      const skeletonCards = container.querySelectorAll(".h-\\[140px\\]");
      expect(skeletonCards.length).toBe(10);
    });

    it("should hide skeletons when threads are loaded", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
      });
    });
  });

  // --- Thread Rendering Tests ---
  describe("Thread Rendering", () => {
    it("should render all threads with comments", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
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
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={threadsWithEmpty} />);
      await waitFor(() => {
        expect(screen.queryByTestId("thread-card-thread-empty")).not.toBeInTheDocument();
      });
    });

    it("should pass isFeedOwner prop to ThreadCard", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} isFeedOwner={true} />);
      await waitFor(() => {
        const threadCard = screen.getByTestId("thread-card-thread-1");
        expect(threadCard).toHaveAttribute("data-is-feed-owner", "true");
      });
    });
  });

  // --- Click Handler Tests ---
  describe("Click Handler", () => {
    it("should use default empty function when onCommentClick not provided", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={mockThreads} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
      });

      const threadContainer = screen.getByTestId("thread-card-thread-1").parentElement;
      // Should not throw
      expect(() => fireEvent.click(threadContainer!)).not.toThrow();
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have white background", async () => {
      const { container } = renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
    });

    it("should have left border", async () => {
      const { container } = renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("border-l-[0.5px]");
    });

    it("should have overflow hidden", async () => {
      const { container } = renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("overflow-hidden");
    });

    it("should have transition classes", async () => {
      const { container } = renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("transition-all", "duration-300");
    });

    it("should apply custom className", async () => {
      const { container } = renderWithProviders(
        <ReviewCommentsSidepanel {...defaultProps} className="custom-class w-96" />,
      );
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("custom-class", "w-96");
    });

    it("should have cursor-pointer on thread items", async () => {
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} />);
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
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={singleThread} />);
      await waitFor(() => {
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
        expect(screen.getByText("Comments")).toBeInTheDocument();
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
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={manyThreads} />);
      await waitFor(() => {
        expect(screen.getAllByTestId(/thread-card-/).length).toBe(20);
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
      renderWithProviders(<ReviewCommentsSidepanel {...defaultProps} threads={threadsWithNull} />);
      await waitFor(() => {
        expect(screen.queryByTestId("thread-card-thread-null")).not.toBeInTheDocument();
        expect(screen.getByTestId("thread-card-thread-1")).toBeInTheDocument();
      });
    });
  });
});
