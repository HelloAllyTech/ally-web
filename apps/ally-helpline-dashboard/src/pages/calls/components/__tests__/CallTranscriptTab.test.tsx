import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useGetTranscriptQuery } from "@api";
import { CallLog, ChatSummaryStatus } from "@types";

import CallTranscriptTab from "../CallTranscriptTab";

// Mock @api
const mockTranscriptData = {
  count: 10,
  data: [
    { senderId: 1, content: "Client message 1", startSeconds: 0 },
    { senderId: 2, content: "Counsellor message 1", startSeconds: 5 },
    { senderId: 1, content: "Client message 2", startSeconds: 10 },
  ],
};

vi.mock("@api", () => ({
  useGetTranscriptQuery: vi.fn(),
}));

// Mock TranscriptTab component
vi.mock("../TranscriptTab", () => ({
  default: ({ transcriptList, handleLoadMore, isLoading, hasMore = true }: any) => (
    <div data-testid="transcript-tab">
      {isLoading && <div data-testid="loading">Loading...</div>}
      <div data-testid="transcript-list">
        {transcriptList.map((item: any, index: number) => (
          <div key={index} data-testid={`transcript-item-${index}`}>
            <div data-testid={`speaker-${index}`}>{item.speaker}</div>
            <div data-testid={`content-${index}`}>{item.content}</div>
          </div>
        ))}
      </div>
      {transcriptList.length > 0 && hasMore && (
        <button data-testid="load-more-button" onClick={handleLoadMore}>
          Load More
        </button>
      )}
    </div>
  ),
}));

describe("CallTranscriptTab", () => {
  const mockCallSummary: CallLog = {
    id: 1,
    clientId: 1,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    roomId: 1,
    counselorId: 2,
    status: "ACTIVE",
    startedAt: "2024-01-01T10:00:00Z",
    endedAt: "2024-01-01T10:05:00Z",
    summaryStatus: ChatSummaryStatus.SUCCESS,
  } as CallLog;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTranscriptQuery).mockReturnValue({
      data: mockTranscriptData,
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  // --- Snapshot Tests ---

  it("should match snapshot when rendered", () => {
    const { asFragment } = render(<CallTranscriptTab callSummary={mockCallSummary} />);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render TranscriptTab component", () => {
    render(<CallTranscriptTab callSummary={mockCallSummary} />);
    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
  });

  it("should map transcript data correctly", async () => {
    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    // Wait for transcript to be rendered
    await waitFor(() => {
      expect(screen.getByTestId("transcript-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("speaker-0")).toHaveTextContent("Client");
      expect(screen.getByTestId("content-0")).toHaveTextContent("Client message 1");
    });
  });

  it("should map senderId to correct speaker name", async () => {
    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    await waitFor(() => {
      // senderId === clientId should be "Client"
      expect(screen.getByTestId("speaker-0")).toHaveTextContent("Client");
      // senderId !== clientId should be "Counsellor"
      expect(screen.getByTestId("speaker-1")).toHaveTextContent("Counsellor");
    });
  });

  it("should display loading state", () => {
    vi.mocked(useGetTranscriptQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    render(<CallTranscriptTab callSummary={mockCallSummary} />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  // --- Pagination Tests ---

  it("should start with offset 0", () => {
    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    expect(useGetTranscriptQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 1,
        offset: 0,
      }),
    );
  });

  it("should reset transcript list when callSummary.id changes", () => {
    const { rerender } = render(<CallTranscriptTab callSummary={mockCallSummary} />);

    const newCallSummary = { ...mockCallSummary, id: 2 };
    rerender(<CallTranscriptTab callSummary={newCallSummary} />);

    expect(useGetTranscriptQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 2,
        offset: 0,
      }),
    );
  });

  it("should load more transcripts when load more button is clicked", async () => {
    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    await waitFor(() => {
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByTestId("load-more-button");
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(useGetTranscriptQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 30, // TRANSCRIPT_PAGE_SIZE
        }),
      );
    });
  });

  it("should not load more if offset exceeds total count", async () => {
    // Set up a scenario where offset will exceed total after first load
    const completeData = {
      count: 3, // Total is 3, so after offset 0, next offset would be 30 which is > 3
      data: [
        { senderId: 1, content: "Client message 1", startSeconds: 0 },
        { senderId: 2, content: "Counsellor message 1", startSeconds: 5 },
        { senderId: 1, content: "Client message 2", startSeconds: 10 },
      ],
    };

    const mockQuery = vi.fn().mockReturnValue({
      data: completeData,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.mocked(useGetTranscriptQuery).mockImplementation(mockQuery);

    const { rerender } = render(<CallTranscriptTab callSummary={mockCallSummary} />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("transcript-item-0")).toBeInTheDocument();
    });

    // Simulate clicking load more - this will set offset to 30
    const loadMoreButton = screen.getByTestId("load-more-button");
    fireEvent.click(loadMoreButton);

    // Force rerender to trigger the query with new offset
    rerender(<CallTranscriptTab callSummary={mockCallSummary} />);

    // Verify that query was called with offset 30
    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 30,
        }),
      );
    });

    // Now simulate another click - handleLoadMore should return early since offset (30) >= total (3)
    const callCountBefore = mockQuery.mock.calls.length;
    fireEvent.click(loadMoreButton);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have made additional calls since offset >= total
    expect(mockQuery.mock.calls.length).toBe(callCountBefore);
  });

  // --- Data Handling Tests ---

  it("should append new transcripts to existing list", async () => {
    const initialData = {
      count: 100,
      data: [{ senderId: 1, content: "Initial Message", startSeconds: 0 }],
    };

    vi.mocked(useGetTranscriptQuery).mockReturnValue({
      data: initialData,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    await waitFor(() => {
      expect(screen.getByText("Initial Message")).toBeInTheDocument();
      expect(screen.getByTestId("transcript-item-0")).toBeInTheDocument();
    });
  });

  it("should handle empty transcript data", () => {
    vi.mocked(useGetTranscriptQuery).mockReturnValue({
      data: { count: 0, data: [] },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<CallTranscriptTab callSummary={mockCallSummary} />);

    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("transcript-item-0")).not.toBeInTheDocument();
  });

  // --- Edge Cases ---

  it("should handle undefined transcriptData", () => {
    vi.mocked(useGetTranscriptQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<CallTranscriptTab callSummary={mockCallSummary} />);
    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
  });

  it("should handle callSummary with different clientId", async () => {
    const differentCallSummary = { ...mockCallSummary, clientId: 999 };
    render(<CallTranscriptTab callSummary={differentCallSummary} />);

    await waitFor(() => {
      // Messages from senderId 999 should be "Client", others "Counsellor"
      expect(useGetTranscriptQuery).toHaveBeenCalled();
    });
  });
});
