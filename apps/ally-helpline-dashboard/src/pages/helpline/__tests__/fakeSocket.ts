/**
 * A fake socket.io client for the workspace tests. Deliberately imports nothing
 * from the app: `vi.mock("socket.io-client", ...)` loads this module, and the
 * app modules import socket.io-client, so any app import here would deadlock.
 */
import { vi } from "vitest";

export interface FakeSocket {
  connected: boolean;
  emitted: { event: string; payload: any }[];
  acked: { event: string; payload: any }[];
  emit: ReturnType<typeof vi.fn>;
  fire: (event: string, payload?: unknown) => void;
  connect: () => void;
}

export const fakeSockets: FakeSocket[] = [];
export const lastSocket = () => fakeSockets[fakeSockets.length - 1];
/** Every event sent, acked or not. */
export const allEmits = () => fakeSockets.flatMap(socket => [...socket.emitted, ...socket.acked]);

/** Default ack per event; tests can override with `ackOverrides`. */
export const ackOverrides: Record<string, (payload: any) => unknown> = {};

export const createFakeIo = () =>
  vi.fn(() => {
    const handlers: Record<string, ((payload?: unknown) => void)[]> = {};
    const socket: any = {
      connected: false,
      emitted: [],
      acked: [],
      on: vi.fn((event: string, cb: (payload?: unknown) => void) => {
        (handlers[event] ||= []).push(cb);
        return socket;
      }),
      emit: vi.fn((event: string, payload: unknown) => socket.emitted.push({ event, payload })),
      timeout: vi.fn(() => ({
        emit: (event: string, payload: any, cb: (err: Error | null, res?: unknown) => void) => {
          socket.acked.push({ event, payload });
          const override = ackOverrides[event];
          if (override) return cb(null, override(payload));
          if (event === "SEND_MESSAGE") {
            return cb(null, {
              ok: true,
              message: {
                id: 900 + socket.acked.length,
                chatId: payload.chatId,
                clientMessageId: payload.clientMessageId,
                type: "TEXT",
                senderRole: "LISTENER",
                senderUserId: 42,
                senderName: null,
                systemKind: null,
                content: payload.content,
                parentMessageId: null,
                visibleToTalker: true,
                metadata: null,
                createdAt: new Date().toISOString(),
                erased: false,
              },
            });
          }
          if (event === "SYNC_SINCE") return cb(null, { ok: true, messages: [] });
          return cb(null, { ok: true });
        },
      })),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      fire(event: string, payload?: unknown) {
        handlers[event]?.forEach(cb => cb(payload));
      },
      connect() {
        socket.connected = true;
        socket.fire("connect");
      },
    };
    fakeSockets.push(socket);
    return socket;
  });
