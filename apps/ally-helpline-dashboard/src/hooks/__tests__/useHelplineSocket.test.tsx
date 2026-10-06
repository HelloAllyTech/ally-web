import { act, renderHook } from "@testing-library/react";
import { io } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { HelplineSocketStatus, useHelplineSocket } from "../useHelplineSocket";

const { sockets } = vi.hoisted(() => ({ sockets: [] as any[] }));

vi.mock("@ally-ui-mono/ui-shared", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => {
    const handlers: Record<string, ((payload?: unknown) => void)[]> = {};
    const timedEmit = vi.fn();
    const socket: any = {
      connected: false,
      on: vi.fn((event: string, cb: (payload?: unknown) => void) => {
        (handlers[event] ||= []).push(cb);
        return socket;
      }),
      emit: vi.fn(),
      timedEmit,
      timeout: vi.fn(() => ({ emit: timedEmit })),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      fire(event: string, payload?: unknown) {
        handlers[event]?.forEach(cb => cb(payload));
      },
    };
    sockets.push(socket);
    return socket;
  }),
}));

describe("useHelplineSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    sockets.length = 0;
    (io as unknown as Mock).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const setup = (overrides: Partial<Parameters<typeof useHelplineSocket>[0]> = {}) =>
    renderHook(props => useHelplineSocket(props), {
      initialProps: {
        label: "test",
        getToken: () => "token-1",
        handlers: {},
        ...overrides,
      },
    });

  it("connects to the helpline-chat namespace with the token read at connect time", () => {
    setup();
    expect(io).toHaveBeenCalledWith(
      "http://api.test/helpline-chat",
      expect.objectContaining({
        transports: ["websocket", "polling"],
        auth: { token: "token-1" },
        reconnection: false,
      }),
    );
  });

  it("does not connect while disabled or without a token", () => {
    setup({ enabled: false });
    setup({ getToken: () => null });
    expect(io).not.toHaveBeenCalled();
  });

  it("acks: resolves the server's answer, and 'disconnected' / 'timeout' instead of throwing", async () => {
    const { result } = setup();
    const socket = sockets[0];

    await expect(result.current.emitWithAck("SEND_MESSAGE", {})).resolves.toEqual({
      ok: false,
      error: "disconnected",
    });

    act(() => {
      socket.connected = true;
      socket.fire("connect");
    });
    socket.timedEmit.mockImplementationOnce((_e: string, _p: unknown, cb: any) =>
      cb(null, { ok: true, message: { id: 1 } }),
    );
    await expect(result.current.emitWithAck("SEND_MESSAGE", { a: 1 })).resolves.toEqual({
      ok: true,
      message: { id: 1 },
    });
    expect(socket.timeout).toHaveBeenCalledWith(8000);

    socket.timedEmit.mockImplementationOnce((_e: string, _p: unknown, cb: any) =>
      cb(new Error("operation has timed out")),
    );
    await expect(result.current.emitWithAck("SEND_MESSAGE", {})).resolves.toEqual({
      ok: false,
      error: "timeout",
    });
  });

  it("heartbeats every 15 s while connected and tells onConnected whether it is a reconnect", () => {
    const onConnected = vi.fn();
    const { result } = setup({ onConnected });
    const first = sockets[0];

    act(() => {
      first.connected = true;
      first.fire("connect");
    });
    expect(result.current.status).toBe(HelplineSocketStatus.CONNECTED);
    expect(onConnected).toHaveBeenLastCalledWith({ isReconnect: false });

    act(() => vi.advanceTimersByTime(15_000));
    expect(first.emit).toHaveBeenCalledWith("HEARTBEAT", {});

    // Server drops us: we reconnect on our own, with backoff, and never give up.
    act(() => {
      first.connected = false;
      first.fire("disconnect", "transport close");
    });
    expect(result.current.status).toBe(HelplineSocketStatus.RECONNECTING);
    act(() => vi.advanceTimersByTime(1500));
    const second = sockets[1];
    expect(second).toBeDefined();
    act(() => {
      second.connected = true;
      second.fire("connect");
    });
    expect(onConnected).toHaveBeenLastCalledWith({ isReconnect: true });
  });

  it("routes server events to the latest handlers without reconnecting", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = setup({ handlers: { MESSAGE_RECEIVED: first } });
    rerender({ label: "test", getToken: () => "token-1", handlers: { MESSAGE_RECEIVED: second } });

    sockets[0].fire("MESSAGE_RECEIVED", { chatId: "c" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ chatId: "c" });
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("reports an unauthorized handshake to the caller", () => {
    const onConnectError = vi.fn();
    setup({ onConnectError });
    sockets[0].fire("connect_error", new Error("unauthorized"));
    expect(onConnectError).toHaveBeenCalledWith("unauthorized");
  });
});
