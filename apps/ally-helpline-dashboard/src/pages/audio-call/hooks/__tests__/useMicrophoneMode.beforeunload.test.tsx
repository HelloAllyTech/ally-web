import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CallProvider } from "@constants";

/**
 * Reloading a tab that is recording ends the chat on the server (the socket
 * drops), so the browser's "leave page?" prompt must guard every tab that is
 * recording — including one that rejoined an ACTIVE web chat after a reload or
 * a second tab, which the guard used to skip. A chat recorded on another
 * platform (mobile) is only being viewed here, so reloading costs nothing.
 */

const { counsellorChat } = vi.hoisted(() => ({
  counsellorChat: { current: [] as unknown },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      user: {
        user: { userId: 1 },
        availableChatTypes: [],
        permissions: [],
      },
    }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

vi.mock("@api", () => ({
  useEndCallMutation: () => [vi.fn(), { isLoading: false }],
  useLazyGetCounsellorChatQuery: () => [
    vi.fn(() => Promise.resolve({ data: counsellorChat.current })),
    { isLoading: false },
  ],
  useGetNudgeStatusQuery: () => ({ data: null }),
}));

vi.mock("@hooks", () => ({
  useAnalytics: () => ({ track: vi.fn() }),
  useSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    emitSocketEvent: vi.fn(),
  }),
}));

import { useMicrophoneMode } from "../useMicrophoneMode";

const fireBeforeUnload = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("useMicrophoneMode — leave-page guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counsellorChat.current = [];
    (navigator as unknown as { mediaDevices: unknown }).mediaDevices = {
      getUserMedia: vi.fn(() => new Promise(() => {})),
      enumerateDevices: vi.fn(),
    };
    (navigator as unknown as { permissions: unknown }).permissions = {
      query: vi.fn().mockResolvedValue({ state: "granted" }),
    };
  });

  it("guards a tab that rejoined an active web microphone chat", async () => {
    counsellorChat.current = {
      chatId: 42,
      platform: "WEB",
      provider: CallProvider.MICROPHONE,
      messages: [],
    };

    const { result } = renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() => expect(result.current.activeChat?.chatId).toBe(42));
    expect(fireBeforeUnload()).toBe(true);
  });

  it("does not guard a chat being recorded on another platform", async () => {
    counsellorChat.current = {
      chatId: 43,
      platform: "MOBILE",
      provider: CallProvider.MICROPHONE,
      messages: [],
    };

    const { result } = renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() => expect(result.current.activeChat?.chatId).toBe(43));
    expect(fireBeforeUnload()).toBe(false);
  });

  it("does not guard before any session exists", async () => {
    renderHook(() => useMicrophoneMode("microphone"));

    expect(fireBeforeUnload()).toBe(false);
  });
});
