/**
 * The connect effect's lifetime, pinned.
 *
 * These cover one production incident: the admin preview showed
 * "Connecting to session…" forever while the agent joined the room, waited its
 * 30s, and shut down as orphaned. The cause was the connect effect depending on
 * `connectToRoom` and `cleanupRoom`, both of which change identity on almost
 * every render — so the effect's cleanup ran constantly, and that cleanup calls
 * `room.disconnect()`, aborting the in-flight `room.connect()`.
 *
 * The failure is invisible from the outside: no error, no rejected promise,
 * just a page that never finishes connecting. So the invariant is asserted
 * directly — re-rendering must not disconnect — rather than left to a reviewer
 * noticing a dependency array.
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
})) as any;

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
  },
  Participant: class {},
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "preview-466-abc" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@ally-ui-mono/ui-shared/assets", () => ({ AutoTermination: "" }));

vi.mock("@api", () => ({
  useEndScenarioPreviewMutation: () => [vi.fn(() => ({ unwrap: vi.fn() }))],
  useDispatchPreviewAgentMutation: () => [vi.fn(() => ({ unwrap: vi.fn() }))],
}));

vi.mock("@constants", () => ({
  LIVEKIT_CONFIG: {},
  LOCAL_STORAGE_KEYS: { PREVIEW_ROOM_DATA: "previewRoomData" },
  ROUTES: { SIMULATION_STUDIO: "/simulation-studio" },
  SUPERVISOR_TOPIC: "supervisor",
  SUPERVISOR_NOTE_EVENT_TYPE: "supervisor.note",
  EVENT_FEED_TOPICS: [undefined, "", "events"],
}));

vi.mock("@utils", () => ({ decodeUint8ToJson: vi.fn((payload: any) => payload) }));

import { useLiveKitRoom } from "../useLiveKitRoom";

// Comfortably greater than STRICT_MODE_GUARD_MS (100ms).
const CONNECT_TIMER_ADVANCE_MS = 500;

const ROOM_DATA = {
  accessToken: "test-token",
  serverUrl: "wss://test.livekit.example.com",
  useDirectAgentDispatch: false,
};

async function settleConnect() {
  await act(async () => {
    vi.advanceTimersByTime(CONNECT_TIMER_ADVANCE_MS);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useLiveKitRoom connection lifetime", () => {
  const endSessionButtonRef = { current: false };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    roomEventHandlers.clear();
    localStorage.setItem("previewRoomData", JSON.stringify(ROOM_DATA));
    mockRoom.remoteParticipants = { size: 0 };
    mockRoom.connect.mockResolvedValue(undefined);
    mockRoom.localParticipant.setMicrophoneEnabled.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("connects once and publishes the microphone", async () => {
    renderHook(() => useLiveKitRoom(() => undefined, endSessionButtonRef));
    await settleConnect();

    expect(mockRoom.connect).toHaveBeenCalledTimes(1);
    expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  });

  it("does not disconnect when the component re-renders", async () => {
    // An inline arrow per render is what the real call site passes, and is
    // exactly what made the effect churn.
    const { rerender } = renderHook(() => useLiveKitRoom(() => undefined, endSessionButtonRef));
    await settleConnect();
    expect(mockRoom.connect).toHaveBeenCalledTimes(1);

    rerender();
    rerender();
    rerender();
    await settleConnect();

    // The regression: each re-render tore the room down mid-connect, so the
    // local participant never actually joined.
    expect(mockRoom.disconnect).not.toHaveBeenCalled();
    expect(mockRoom.connect).toHaveBeenCalledTimes(1);
  });

  it("still disconnects when the page unmounts", async () => {
    const { unmount } = renderHook(() => useLiveKitRoom(() => undefined, endSessionButtonRef));
    await settleConnect();

    unmount();

    expect(mockRoom.disconnect).toHaveBeenCalledTimes(1);
  });
});
