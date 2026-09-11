import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SocketDisconnectionReasons } from "@constants";
import { SocketEvent } from "@types";

/**
 * The failure this covers is the one production kept producing silently: the
 * microphone never opens, so nothing is ever recorded, and the counsellor is
 * told only at the summary screen — "No audio detected", a whole session late.
 *
 * So the assertions are about what the counsellor is told and what is created:
 * a reason they can act on, and no chat row for a session that could never have
 * been recorded. Whether a MediaRecorder is wired up is deliberately not tested
 * here — it cannot be, because on this path there is no stream to wire it to.
 */

const { mockEmitSocketEvent, capturedSocketCallbacks } = vi.hoisted(() => ({
  mockEmitSocketEvent: vi.fn(),
  capturedSocketCallbacks: { current: {} as Record<string, (data?: unknown) => void> },
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
    vi.fn().mockResolvedValue({ data: [] }),
    { isLoading: false },
  ],
  useGetNudgeStatusQuery: () => ({ data: null }),
}));

vi.mock("@hooks", () => ({
  useAnalytics: () => ({ track: vi.fn() }),
  useSocket: ({ eventCallbacks }: { eventCallbacks: Record<string, (d?: unknown) => void> }) => {
    capturedSocketCallbacks.current = eventCallbacks;
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      emitSocketEvent: mockEmitSocketEvent,
    };
  },
}));

import { useMicrophoneMode } from "../useMicrophoneMode";

const domException = (name: string) => {
  const error = new Error(name);
  error.name = name;
  return error;
};

// test-setup.ts installs navigator.mediaDevices as writable but NOT configurable,
// so this reassigns the value rather than redefining the property.
const setGetUserMedia = (impl: () => Promise<MediaStream>) => {
  (navigator as unknown as { mediaDevices: unknown }).mediaDevices = {
    getUserMedia: vi.fn(impl),
    enumerateDevices: vi.fn(),
  };
};

const fakeStream = () =>
  ({
    getTracks: () => [{ stop: vi.fn(), enabled: true }],
    getAudioTracks: () => [{ stop: vi.fn(), enabled: true }],
  }) as unknown as MediaStream;

const startAudioChatEmits = () =>
  mockEmitSocketEvent.mock.calls.filter(([event]) => event === SocketEvent.START_AUDIO_CHAT);

describe("useMicrophoneMode — microphone acquisition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSocketCallbacks.current = {};
    (navigator as unknown as { permissions: unknown }).permissions = {
      query: vi.fn().mockResolvedValue({ state: "denied" }),
    };
  });

  it("tells the counsellor the browser blocked the microphone", async () => {
    setGetUserMedia(() => Promise.reject(domException("NotAllowedError")));

    const { result } = renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() =>
      expect(result.current.socketDisconnectionReason).toBe(
        SocketDisconnectionReasons.MICROPHONE_BLOCKED,
      ),
    );
    expect(result.current.isSocketDisconnected).toBe(true);
  });

  it("distinguishes a missing or busy device from a blocked one", async () => {
    setGetUserMedia(() => Promise.reject(domException("NotReadableError")));

    const { result } = renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() =>
      expect(result.current.socketDisconnectionReason).toBe(
        SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE,
      ),
    );
  });

  it("does not start a session it cannot record", async () => {
    setGetUserMedia(() => Promise.reject(domException("NotAllowedError")));

    const { result } = renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() =>
      expect(capturedSocketCallbacks.current[SocketEvent.SESSION_CREATED]).toBeDefined(),
    );
    act(() => capturedSocketCallbacks.current[SocketEvent.SESSION_CREATED]());

    await waitFor(() => expect(result.current.isSocketDisconnected).toBe(true));
    // The chat row only exists once this is emitted, so never emitting it is
    // what keeps a dead session out of the counsellor's call log — and stops it
    // blocking their next attempt as an ACTIVE chat.
    expect(startAudioChatEmits()).toHaveLength(0);
  });

  it("still starts a session once the microphone is open", async () => {
    setGetUserMedia(() => Promise.resolve(fakeStream()));

    renderHook(() => useMicrophoneMode("microphone"));

    await waitFor(() =>
      expect(capturedSocketCallbacks.current[SocketEvent.SESSION_CREATED]).toBeDefined(),
    );
    act(() => capturedSocketCallbacks.current[SocketEvent.SESSION_CREATED]());

    await waitFor(() => expect(startAudioChatEmits()).toHaveLength(1));
    expect(startAudioChatEmits()[0][1]).toMatchObject({ platform: "WEB", sampleRate: 48000 });
  });
});
