import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Audio before any imports that might use it
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
})) as any;

// Capture event handlers registered on the room so tests can emit events
const roomEventHandlers = new Map<string, Function>();

const mockRoom = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  on: vi.fn((event: string, handler: Function) => {
    roomEventHandlers.set(event, handler);
  }),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  localParticipant: {
    setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
    identity: "local-user",
  },
  remoteParticipants: { size: 0 },
};

vi.mock("livekit-client", () => ({
  Room: vi.fn(() => mockRoom),
  RoomEvent: {
    DataReceived: "dataReceived",
    Disconnected: "disconnected",
    ParticipantConnected: "participantConnected",
    ActiveSpeakersChanged: "activeSpeakersChanged",
    TrackPublished: "trackPublished",
    TrackSubscribed: "trackSubscribed",
  },
  Track: { Kind: { Audio: "audio", Video: "video" } },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "session-123" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@ally-ui-mono/ui-shared/assets", () => ({
  AutoTermination: "",
}));

vi.mock("@constants", () => ({
  LIVEKIT_CONFIG: {},
  LOCAL_STORAGE_KEYS: { ROOM_DATA: "room_data" },
  ROUTES: { LEARN: "/learn" },
  AGENT_STATE_EVENT_TYPE: "AGENT_STATE",
  AGENT_STATE_THINKING: "thinking",
  AGENT_STATE_DONE_THINKING: "done_thinking",
  AGENT_STATE_SPEAKING: "speaking",
}));

// The audio-timing diagnostic is exercised directly in
// utils/__tests__/agentAudioTiming.test.ts; here it only needs to be inert.
const mockAudioTimer = {
  markConnected: vi.fn(),
  markAgentParticipant: vi.fn(),
  markTrackPublished: vi.fn(),
  markTrackSubscribed: vi.fn(),
  markFirstAudio: vi.fn(),
  flush: vi.fn(),
  reset: vi.fn(),
};

vi.mock("@utils", () => ({
  decodeUint8ToJson: vi.fn((payload: any) => payload),
  createAgentAudioTimer: vi.fn(() => mockAudioTimer),
  captureEvent: vi.fn(),
}));

vi.mock("@constants/analyticsEvents", () => ({
  ANALYTICS_EVENTS: { SIMULATION_AGENT_AUDIO_TIMING: "simulation_agent_audio_timing" },
}));

import { useLiveKitRoom } from "../useLiveKitRoom";

// Just needs to be > STRICT_MODE_GUARD_MS (100ms) so the deferred connect fires.
const CONNECT_TIMER_ADVANCE_MS = 500;

const ROOM_DATA = {
  accessToken: "test-token",
  serverUrl: "wss://test.livekit.example.com",
};

async function waitForConnection() {
  await act(async () => {
    vi.advanceTimersByTime(CONNECT_TIMER_ADVANCE_MS);
    // Flush microtasks so the async connectToRoom body (after await room.connect) completes
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useLiveKitRoom", () => {
  const handleDisconnect = vi.fn();
  const endSessionButtonRef = { current: false };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    roomEventHandlers.clear();
    localStorage.setItem("room_data", JSON.stringify(ROOM_DATA));
    mockRoom.remoteParticipants = { size: 0 };
    mockRoom.connect.mockResolvedValue(undefined);
    mockRoom.localParticipant.setMicrophoneEnabled.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("initializes agentTurnStatus as user_turn before agent joins", () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
    expect(result.current.agentTurnStatus).toBe("user_turn");
  });

  it("sets agentTurnStatus to thinking when the remote agent joins (opening dialogue fix)", async () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));

    await waitForConnection();

    // Simulate the agent joining the LiveKit room
    await act(async () => {
      const handler = roomEventHandlers.get("participantConnected");
      handler?.();
    });

    expect(result.current.agentTurnStatus).toBe("thinking");
  });

  it("sets agentTurnStatus to thinking when AGENT_STATE_THINKING data event received", async () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));

    await waitForConnection();

    await act(async () => {
      const handler = roomEventHandlers.get("dataReceived");
      handler?.({ type: "AGENT_STATE", state: "thinking" });
    });

    expect(result.current.agentTurnStatus).toBe("thinking");
  });

  it("sets agentTurnStatus back to user_turn when AGENT_STATE_DONE_THINKING received and not speaking", async () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));

    await waitForConnection();

    // First go to thinking
    await act(async () => {
      const handler = roomEventHandlers.get("dataReceived");
      handler?.({ type: "AGENT_STATE", state: "thinking" });
    });
    expect(result.current.agentTurnStatus).toBe("thinking");

    // Then done thinking — should revert to user_turn since not speaking
    await act(async () => {
      const handler = roomEventHandlers.get("dataReceived");
      handler?.({ type: "AGENT_STATE", state: "done_thinking" });
    });

    expect(result.current.agentTurnStatus).toBe("user_turn");
  });

  it("sets agentTurnStatus to speaking when agent becomes active speaker", async () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));

    await waitForConnection();

    await act(async () => {
      const handler = roomEventHandlers.get("activeSpeakersChanged");
      // A speaker with a non-local identity counts as the agent speaking
      handler?.([{ identity: "agent-user" }]);
    });

    expect(result.current.agentTurnStatus).toBe("speaking");
  });

  it("resets agentTurnStatus to user_turn when no active speakers (and not thinking)", async () => {
    const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));

    await waitForConnection();

    // Set to speaking first
    await act(async () => {
      const handler = roomEventHandlers.get("activeSpeakersChanged");
      handler?.([{ identity: "agent-user" }]);
    });
    expect(result.current.agentTurnStatus).toBe("speaking");

    // Now no active speakers
    await act(async () => {
      const handler = roomEventHandlers.get("activeSpeakersChanged");
      handler?.([]);
    });

    expect(result.current.agentTurnStatus).toBe("user_turn");
  });
});
