import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  useCreateReviewMutation,
  useGetAudioUrlQuery,
  useGetSimulationSummaryQuery,
  useGetSimulationTranscriptQuery,
  useUpdateReviewMutation,
} from "@api";
import { store } from "@store";
import SimulationTranscriptTab from "../SimulationTranscriptTab";

// Mock @api
const mockTranscriptData = {
  messages: [
    {
      senderId: -1,
      content: "Client message 1",
      createdAt: "2024-01-01T10:00:00Z",
      startSeconds: 0,
      id: 1,
    },
    {
      senderId: 2,
      content: "Counsellor message 1",
      createdAt: "2024-01-01T10:00:05Z",
      startSeconds: 5,
      id: 2,
    },
    {
      senderId: -1,
      content: "Client message 2",
      createdAt: "2024-01-01T10:00:10Z",
      startSeconds: 10,
      id: 3,
    },
  ],
};

vi.mock("@api", () => ({
  useGetSimulationTranscriptQuery: vi.fn(),
  useGetAudioUrlQuery: vi.fn(),
  useGetSimulationSummaryQuery: vi.fn(),
  useCreateReviewMutation: vi.fn(),
  useUpdateReviewMutation: vi.fn(),
}));

// Toasts are asserted against for the unresolvable-moment case.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// Mock TranscriptListing component
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    TranscriptListing: ({ transcriptList, handleLoadMore, isLoading, focusRequest }: any) => (
      <div
        data-testid="transcript-tab"
        // Spread rather than always-present attributes, so the unrelated
        // snapshot above stays untouched when no moment is requested.
        {...(focusRequest
          ? {
              "data-focus-message-id": focusRequest.messageId,
              "data-focus-request-id": String(focusRequest.requestId),
            }
          : {})}
      >
        {isLoading && transcriptList.length === 0 && <div data-testid="loading">Loading...</div>}
        <div data-testid="transcript-list">
          {transcriptList.map((item: any, index: number) => (
            <div key={index} data-testid={`transcript-item-${index}`}>
              <div data-testid={`sender-${index}`}>
                {item.senderId === -1 ? "Client" : "Counsellor"}
              </div>
              <div data-testid={`content-${index}`}>{item.content}</div>
            </div>
          ))}
        </div>
        {transcriptList.length > 0 &&
          transcriptList.length < mockTranscriptData.messages.length && (
            <button data-testid="load-more-button" onClick={handleLoadMore}>
              Load More
            </button>
          )}
      </div>
    ),
  };
});

// Mock @ally-ui-mono/ui-shared
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  Toggle: ({ items, onChange }: any) => (
    <div data-testid="toggle-component">
      {items.map((item: any, index: number) => (
        <button key={index} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  ),
  InfiniteScroll: ({ children, onInfiniteScroll }: any) => (
    <div data-testid="infinite-scroll">
      {children}
      <button data-testid="infinite-scroll-trigger" onClick={onInfiniteScroll}>
        Load More
      </button>
    </div>
  ),
  DropdownField: ({ value, onChange, options }: any) => (
    <div data-testid="dropdown-field">
      <span>{value}</span>
      {options?.map((option: string) => (
        <button key={option} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  ),
}));

// Mock constants - partially mock to keep other exports
vi.mock("@src/constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@src/constants")>();
  return {
    ...actual,
    REVIEW_PRIVACY_OPTIONS: [
      { label: "Keep it private", value: "HIDDEN" },
      { label: "Share for review", value: "IN_REVIEW" },
    ],
  };
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <Provider store={store}>{ui}</Provider>
    </BrowserRouter>,
  );
};

describe("SimulationTranscriptTab", () => {
  const mockSessionId = "session-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: mockTranscriptData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetSimulationSummaryQuery).mockReturnValue({
      data: { reviewId: null },
      isLoading: false,
    } as any);
    vi.mocked(useGetAudioUrlQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useCreateReviewMutation).mockReturnValue([vi.fn(), { isLoading: false }] as any);
    vi.mocked(useUpdateReviewMutation).mockReturnValue([vi.fn(), { isLoading: false }] as any);
  });

  // --- Snapshot Tests ---

  it("should match snapshot when rendered", () => {
    const { asFragment } = renderWithProvider(
      <SimulationTranscriptTab sessionId={mockSessionId} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render TranscriptTab component", () => {
    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);
    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
  });

  it("should map transcript data correctly", () => {
    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    waitFor(() => {
      expect(screen.getByTestId("transcript-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("sender-0")).toHaveTextContent("Client");
      expect(screen.getByTestId("content-0")).toHaveTextContent("Client message 1");
    });
  });

  it("should map senderId to correct speaker name", () => {
    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    waitFor(() => {
      // senderId === -1 should be "Client"
      expect(screen.getByTestId("sender-0")).toHaveTextContent("Client");
      // senderId !== -1 should be "Counsellor"
      expect(screen.getByTestId("sender-1")).toHaveTextContent("Counsellor");
    });
  });

  it("should display loading state", () => {
    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  // --- Full-transcript fetch (no pagination) ---
  // The transcript is fetched in one request. Paging it 30 turns at a time used
  // to truncate long sessions silently — the load-more sentinel never fired, so
  // a 17-minute session stopped rendering at ~6 minutes.

  it("should request the whole transcript with no limit or offset", () => {
    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    expect(useGetSimulationTranscriptQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-123",
        offset: undefined,
        limit: undefined,
      }),
    );
  });

  it("should refetch the whole transcript when sessionId changes", () => {
    const { rerender } = renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    rerender(
      <BrowserRouter>
        <Provider store={store}>
          <SimulationTranscriptTab sessionId="session-456" />
        </Provider>
      </BrowserRouter>,
    );

    expect(useGetSimulationTranscriptQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-456",
        offset: undefined,
        limit: undefined,
      }),
    );
  });

  it("should render every returned turn without a load-more step", async () => {
    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    await waitFor(() => {
      expect(screen.getByTestId("content-2")).toHaveTextContent("Client message 2");
    });
    expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
  });

  // --- Debrief moment anchors ---
  // A "See this moment" chip in the debrief note asks this tab to scroll to one
  // message. The tab mounts as the learner switches to it, so a request can
  // arrive before the transcript has loaded.

  it("should hand a resolvable moment to the transcript listing", async () => {
    renderWithProvider(
      <SimulationTranscriptTab
        sessionId={mockSessionId}
        focusMessage={{ messageId: "2", requestId: 1 }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("transcript-tab")).toHaveAttribute("data-focus-message-id", "2");
    });
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("should say so when the anchored moment is not in the transcript", async () => {
    renderWithProvider(
      <SimulationTranscriptTab
        sessionId={mockSessionId}
        focusMessage={{ messageId: "does-not-exist", requestId: 1 }}
      />,
    );

    // Opening the tab is still useful, so the transcript renders — but the
    // learner is told the jump didn't land rather than being left at the top.
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("moment"));
    });
    expect(screen.getByTestId("transcript-tab")).not.toHaveAttribute("data-focus-message-id");
  });

  it("should wait for the transcript before calling a moment unresolvable", async () => {
    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    } as any);

    const { rerender } = renderWithProvider(
      <SimulationTranscriptTab
        sessionId={mockSessionId}
        focusMessage={{ messageId: "3", requestId: 1 }}
      />,
    );

    // Still loading: the message may well be in the response that hasn't
    // arrived yet, so nothing is claimed either way.
    expect(toast.info).not.toHaveBeenCalled();
    expect(screen.getByTestId("transcript-tab")).not.toHaveAttribute("data-focus-message-id");

    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: mockTranscriptData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    rerender(
      <BrowserRouter>
        <Provider store={store}>
          <SimulationTranscriptTab
            sessionId={mockSessionId}
            focusMessage={{ messageId: "3", requestId: 1 }}
          />
        </Provider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("transcript-tab")).toHaveAttribute("data-focus-message-id", "3");
    });
    expect(toast.info).not.toHaveBeenCalled();
  });

  // --- Data Handling Tests ---

  it("should append new transcripts to existing list", () => {
    const initialData = {
      messages: [
        {
          senderId: -1,
          content: "Message 1",
          createdAt: "2024-01-01T10:00:00Z",
          startSeconds: 0,
          id: 1,
        },
      ],
    };

    vi.mocked(useGetSimulationTranscriptQuery)
      .mockReturnValueOnce({
        data: initialData,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        data: {
          messages: [
            ...initialData.messages,
            {
              senderId: 2,
              content: "Message 2",
              createdAt: "2024-01-01T10:00:05Z",
              startSeconds: 5,
              id: 2,
            },
          ],
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as any);

    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    waitFor(() => {
      expect(screen.getByText("Message 1")).toBeInTheDocument();
      expect(screen.getByText("Message 2")).toBeInTheDocument();
    });
  });

  it("should handle empty transcript data", () => {
    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: { messages: [] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("transcript-item-0")).not.toBeInTheDocument();
  });

  // --- Edge Cases ---

  it("should handle undefined transcriptData", () => {
    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);
    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
  });

  it("should handle different senderId values", () => {
    const variedData = {
      messages: [
        {
          senderId: -1,
          content: "Client",
          createdAt: "2024-01-01T10:00:00Z",
          startSeconds: 0,
          id: 1,
        },
        {
          senderId: 1,
          content: "Counsellor 1",
          createdAt: "2024-01-01T10:00:05Z",
          startSeconds: 5,
          id: 2,
        },
        {
          senderId: 999,
          content: "Counsellor 999",
          createdAt: "2024-01-01T10:00:10Z",
          startSeconds: 10,
          id: 3,
        },
      ],
    };

    vi.mocked(useGetSimulationTranscriptQuery).mockReturnValue({
      data: variedData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<SimulationTranscriptTab sessionId={mockSessionId} />);

    waitFor(() => {
      expect(screen.getByTestId("sender-0")).toHaveTextContent("Client");
      expect(screen.getByTestId("sender-1")).toHaveTextContent("Counsellor");
      expect(screen.getByTestId("sender-2")).toHaveTextContent("Counsellor");
    });
  });
});
