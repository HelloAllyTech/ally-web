import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { DebriefTab } from "../DebriefTab";

/**
 * `readOnly` is the revisit mode: the learner's own session logs, and their org
 * admin's view of the same session under org logs. It is a privacy boundary as
 * much as a layout choice, so these tests assert what is NOT rendered and NOT
 * fetched, not just what is.
 */

const mockChatHistoryQuery = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => undefined,
}));

vi.mock("@api", () => ({
  useGetChatHistoryQuery: (...args: unknown[]) => mockChatHistoryQuery(...args),
}));

vi.mock("@assets", () => ({
  AskAiIcon: () => <svg data-testid="ally-avatar" />,
  Refresh: () => <svg />,
}));

vi.mock("@hooks", () => ({
  useSendMessage: () => mockSendMessage(),
}));

vi.mock("@reducer", () => ({ initSession: vi.fn() }));
vi.mock("@store", () => ({}));

vi.mock("../SupervisorNote", () => ({
  SupervisorNote: ({ note }: { note: string }) => <div data-testid="supervisor-note">{note}</div>,
}));

vi.mock("../DebriefReplyInput", () => ({
  DebriefReplyInput: () => <div data-testid="reply-input" />,
}));

const NOTE = "You opened well and stayed with her silence.";

const summaryWithNote = () =>
  ({
    details: { summary: { feedback: { supervisorNote: NOTE } } },
  }) as any;

describe("DebriefTab — readOnly (revisit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatHistoryQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockSendMessage.mockReturnValue({
      messages: [
        { role: "user", content: "Why was that a miss?" },
        { role: "assistant", content: "At [4:12] you moved on." },
      ],
      streamingMessage: undefined,
      isStreaming: false,
      error: undefined,
      sendMessage: vi.fn(),
      retryLastMessage: vi.fn(),
    });
  });

  it("shows the note", () => {
    render(
      <DebriefTab
        sessionId="s-1"
        summaryData={summaryWithNote()}
        retryMaxReached={false}
        readOnly
      />,
    );

    expect(screen.getByTestId("supervisor-note")).toHaveTextContent(NOTE);
  });

  it("hides the past conversation, not merely the composer", () => {
    render(
      <DebriefTab
        sessionId="s-1"
        summaryData={summaryWithNote()}
        retryMaxReached={false}
        readOnly
      />,
    );

    expect(screen.queryByText("Why was that a miss?")).not.toBeInTheDocument();
    expect(screen.queryByText(/you moved on/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("reply-input")).not.toBeInTheDocument();
  });

  it("does not even fetch the conversation", () => {
    // The privacy point: an org admin opening a learner's session must not
    // pull that learner's coaching thread into the store, whether or not it
    // would have been painted.
    render(
      <DebriefTab
        sessionId="s-1"
        summaryData={summaryWithNote()}
        retryMaxReached={false}
        readOnly
      />,
    );

    expect(mockChatHistoryQuery).toHaveBeenCalledWith({ sessionId: "s-1" }, { skip: true });
  });

  it("does not invite a reply", () => {
    render(
      <DebriefTab
        sessionId="s-1"
        summaryData={summaryWithNote()}
        retryMaxReached={false}
        readOnly
      />,
    );

    expect(screen.queryByText("postSim.debrief.replyPrompt")).not.toBeInTheDocument();
  });
});

describe("DebriefTab — full mode (just finished)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatHistoryQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockSendMessage.mockReturnValue({
      messages: [{ role: "user", content: "Why was that a miss?" }],
      streamingMessage: undefined,
      isStreaming: false,
      error: undefined,
      sendMessage: vi.fn(),
      retryLastMessage: vi.fn(),
    });
  });

  it("shows the thread and the composer, and fetches the history", () => {
    render(<DebriefTab sessionId="s-1" summaryData={summaryWithNote()} retryMaxReached={false} />);

    expect(screen.getByTestId("supervisor-note")).toBeInTheDocument();
    expect(screen.getByText("Why was that a miss?")).toBeInTheDocument();
    expect(screen.getByTestId("reply-input")).toBeInTheDocument();
    expect(mockChatHistoryQuery).toHaveBeenCalledWith({ sessionId: "s-1" }, { skip: false });
  });
});
