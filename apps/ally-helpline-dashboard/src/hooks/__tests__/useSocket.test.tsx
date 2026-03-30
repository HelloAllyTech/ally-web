import React, { useEffect } from "react";

import { render, cleanup } from "@testing-library/react";
import { io } from "socket.io-client";
import { describe, it, expect, vi, afterEach, type Mock } from "vitest";

import { SocketConnectionTypes } from "@constants";
import { SocketEvent } from "@types";

import { useSocket } from "../useSocket";

vi.mock("socket.io-client", () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  } as any;

  return {
    io: vi.fn(() => socket),
  };
});

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn(), debug: vi.fn() },
}));

const TestHarness = ({ onReady }: { onReady: (api: ReturnType<typeof useSocket>) => void }) => {
  const api = useSocket({
    eventCallbacks: { CUSTOM: vi.fn() },
    connectionType: SocketConnectionTypes.MICROPHONE_MODE,
  } as any);

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  return null;
};

describe("useSocket", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("connects, sends, emits, manages listeners, checks connectivity, and cleans up", () => {
    localStorage.setItem("accessToken", "t");

    let api!: ReturnType<typeof useSocket>;
    const { unmount } = render(<TestHarness onReady={a => (api = a)} />);

    // connect
    api.connect();
    const socket = (io as unknown as Mock).mock.results[0].value;
    expect(socket.connect).toHaveBeenCalled();

    // send message
    api.sendMessage({ hello: "world" });
    expect(socket.emit).toHaveBeenCalledWith(SocketEvent.SEND_MESSAGE, { hello: "world" });

    // emit custom event
    api.emitSocketEvent(SocketEvent.USER_JOINED, { a: 1 });
    expect(socket.emit).toHaveBeenCalledWith(SocketEvent.USER_JOINED, { a: 1 });

    // add/remove listener
    const cb = vi.fn();
    api.setListenerForEvent(SocketEvent.USER_JOINED, cb);
    expect(socket.on).toHaveBeenCalledWith(SocketEvent.USER_JOINED, cb);

    api.removeIfListenerPresent(SocketEvent.USER_JOINED);
    expect(socket.off).toHaveBeenCalledWith(SocketEvent.USER_JOINED);

    // connected state
    expect(api.isConnected()).toBe(true);

    // cleanup on unmount
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
