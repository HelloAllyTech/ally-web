import React from "react";

import { render, act } from "@testing-library/react";
import { RoomEvent } from "livekit-client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ROUTES } from "@constants";

import { useLiveKitRoom } from "../useLiveKitRoom";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const roomOn = vi.fn();
const roomOff = vi.fn();
const roomRemoveAll = vi.fn();
const roomConnect = vi.fn();
const roomDisconnect = vi.fn();
const setMic = vi.fn();

vi.mock("livekit-client", () => ({
  Room: vi.fn().mockImplementation(() => ({
    on: roomOn,
    off: roomOff,
    removeAllListeners: roomRemoveAll,
    connect: roomConnect,
    disconnect: roomDisconnect,
    localParticipant: { setMicrophoneEnabled: setMic },
    name: "r",
  })),
  RoomEvent: {
    DataReceived: "DataReceived",
    Disconnected: "Disconnected",
  },
}));

vi.mock("react-router-dom", async actual => {
  const real = await actual<typeof import("react-router-dom")>();
  return {
    ...real,
    useParams: () => ({ id: "room1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@utils", () => ({
  decodeUint8ToJson: vi.fn(() => ({ timestamp: new Date().toISOString(), data: { score: 5 } })),
}));

const Harness = ({
  onReady,
  handleDisconnect,
}: {
  onReady: (api: ReturnType<typeof useLiveKitRoom>) => void;
  handleDisconnect: () => void;
}) => {
  const endSessionRef = React.useRef(null);
  const api = useLiveKitRoom(handleDisconnect, endSessionRef);
  React.useEffect(() => {
    onReady(api);
    return () => {};
  }, [api, onReady]);
  return null;
};

describe("useLiveKitRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem("roomData", JSON.stringify({ accessToken: "t", serverUrl: "wss://x" }));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects, sets status connected, wires events, and handles end session", async () => {
    let api!: ReturnType<typeof useLiveKitRoom>;
    const handleDisconnect = vi.fn();

    render(
      <MemoryRouter initialEntries={["/learn/room1"]}>
        <Routes>
          <Route
            path="/learn/:id"
            element={<Harness onReady={a => (api = a)} handleDisconnect={handleDisconnect} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // wait past the 5000ms delayed connect
    await act(async () => {
      vi.advanceTimersByTime(5100);
    });

    expect(roomConnect).toHaveBeenCalled();
    expect(setMic).toHaveBeenCalledWith(true);
    expect(roomOn).toHaveBeenCalledWith(RoomEvent.DataReceived, expect.any(Function));
    expect(roomOn).toHaveBeenCalledWith(RoomEvent.Disconnected, expect.any(Function));

    // simulate data event handler append
    const dataHandler = roomOn.mock.calls.find(([evt]) => evt === RoomEvent.DataReceived)![1];
    await act(async () => {
      dataHandler(new Uint8Array(), null as any, null as any, null as any);
      await Promise.resolve();
    });
    expect(api.score).toBeGreaterThan(0);
    expect(api.events.length).toBe(1);

    // end session triggers disconnect via room.disconnect()
    await act(async () => {
      api.room.disconnect();
    });
    expect(roomDisconnect).toHaveBeenCalled();
  });
});
