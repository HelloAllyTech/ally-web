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
  SUPERVISOR_TOPIC: "supervisor",
  SUPERVISOR_NOTE_EVENT_TYPE: "supervisor.note",
  EVENT_FEED_TOPICS: [undefined, "", "events"],
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
  ANALYTICS_EVENTS: {
    SIMULATION_AGENT_AUDIO_TIMING: "simulation_agent_audio_timing",
    SIMULATION_STARTED: "simulation_started",
    SIMULATION_COMPLETED: "simulation_completed",
  },
  ANALYTICS_PROPS: {
    SIMULATION_ID: "simulation_id",
    SCENARIO_ID: "scenario_id",
  },
}));

import { captureEvent } from "@utils";

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

  describe("supervisor notes (topic-scoped data packets)", () => {
    const note = (seq: number, text: string) => ({
      type: "supervisor.note",
      note: text,
      seq,
      turn_index: seq * 2,
      timestamp: "2026-08-21T10:00:00Z",
    });

    const send = async (payload: unknown, topic?: string) => {
      await act(async () => {
        const handler = roomEventHandlers.get("dataReceived");
        handler?.(payload, undefined, undefined, topic);
      });
    };

    it("collects notes published on the supervisor topic", async () => {
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send(note(1, "Stay with the fear."), "supervisor");

      expect(result.current.supervisorNotes).toEqual([
        {
          note: "Stay with the fear.",
          seq: 1,
          turn_index: 2,
          timestamp: "2026-08-21T10:00:00Z",
        },
      ]);
    });

    it("keeps supervisor notes out of events and out of the score", async () => {
      // The pre-existing handler treated ANY packet as a scored coaching
      // event, so an unfiltered note would both appear in the Live feed and
      // corrupt the score.
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send(note(1, "Slow down."), "supervisor");

      expect(result.current.events).toEqual([]);
      expect(result.current.score).toBe(0);
    });

    it("de-duplicates a redelivered note by seq", async () => {
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send(note(1, "Slow down."), "supervisor");
      await send(note(1, "Slow down."), "supervisor");
      await send(note(2, "She named a fear."), "supervisor");

      expect(result.current.supervisorNotes.map(n => n.seq)).toEqual([1, 2]);
    });

    it("ignores a supervisor-topic packet with the wrong type or no text", async () => {
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send({ type: "something.else", note: "x", seq: 1 }, "supervisor");
      await send({ type: "supervisor.note", note: "", seq: 2 }, "supervisor");

      expect(result.current.supervisorNotes).toEqual([]);
      expect(result.current.events).toEqual([]);
    });

    it("drops packets on other non-default topics instead of scoring them", async () => {
      // e.g. the v2 director topic, which the learner UI has no use for.
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send({ type: "director.turn", score: 5 }, "director");

      expect(result.current.events).toEqual([]);
      expect(result.current.supervisorNotes).toEqual([]);
    });

    it.each([[undefined], ["events"]])(
      "still records coaching events sent on topic %p",
      async topic => {
        // The agent publishes scored coaching events on "events" and the
        // AGENT_STATE/control packets with no topic; both must keep working.
        const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
        await waitForConnection();

        await send({ version: "1.0", data: { score: 3, emoji: "🎯", message: "Nice" } }, topic);

        expect(result.current.events).toHaveLength(1);
        expect(result.current.score).toBe(3);
      },
    );

    it("still handles AGENT_STATE packets, which carry no topic", async () => {
      const { result } = renderHook(() => useLiveKitRoom(handleDisconnect, endSessionButtonRef));
      await waitForConnection();

      await send({ type: "AGENT_STATE", state: "thinking" });

      expect(result.current.agentTurnStatus).toBe("thinking");
    });
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

  describe("simulation_completed tracking", () => {
    it("records simulation_completed when the learner navigates away in-app instead of ending the session", async () => {
      // Reproduces leaving a live simulation via an in-app route change: React
      // unmounts the hook (effect cleanup -> cleanupRoom), not a
      // RoomEvent.Disconnected firing while listeners are still attached.
      const { result, unmount } = renderHook(() =>
        useLiveKitRoom(handleDisconnect, endSessionButtonRef),
      );

      await waitForConnection();

      // Agent starts speaking, which transitions the session into
      // AGENT_JOINED and marks simulation_started as having fired.
      await act(async () => {
        const handler = roomEventHandlers.get("activeSpeakersChanged");
        handler?.([{ identity: "agent-user" }]);
      });
      expect(result.current.agentTurnStatus).toBe("speaking");

      (captureEvent as any).mockClear();

      unmount();

      expect(captureEvent).toHaveBeenCalledWith(
        "simulation_completed",
        expect.objectContaining({
          simulation_id: "session-123",
          ended_by_learner: false,
        }),
      );
    });
  });
});
