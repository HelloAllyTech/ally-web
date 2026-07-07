import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopilotStream, parseSseBuffer } from "@hooks/useCopilotStream";
import roleplaySpecSlice, { hydrateSpec } from "@reducer/roleplaySpecReducer";
import { createEmptyRoleplaySpec } from "@utils/roleplaySpec";

const sseFrame = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** fetch mock returning a scripted SSE body. `hang` keeps the stream open
 *  until the request signal aborts (erroring the reader, like real fetch). */
const mockSseFetch = (frames: string[], { hang = false } = {}) =>
  vi.fn(async (_url: string, init: RequestInit) => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        frames.forEach(frame => controller.enqueue(encoder.encode(frame)));
        if (hang) {
          init.signal?.addEventListener("abort", () => {
            try {
              controller.error(new DOMException("Aborted", "AbortError"));
            } catch {
              /* already closed */
            }
          });
        } else {
          controller.close();
        }
      },
    });
    return { ok: true, status: 200, body } as unknown as Response;
  });

const buildStore = () => configureStore({ reducer: { roleplaySpec: roleplaySpecSlice.reducer } });

const renderStream = (store: ReturnType<typeof buildStore>) =>
  renderHook(() => useCopilotStream({ sessionId: "sess-1" }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

describe("parseSseBuffer", () => {
  it("parses complete frames and returns the unconsumed remainder", () => {
    const buffer = sseFrame("token", { delta: "Hi" }) + 'event: token\ndata: {"delta":"part';
    const { events, rest } = parseSseBuffer(buffer);
    expect(events).toEqual([{ type: "token", data: { delta: "Hi" } }]);
    expect(rest).toContain("part");
  });

  it("drops malformed frames and frames without event names", () => {
    const buffer = "event: token\ndata: {not-json}\n\n" + 'data: {"delta":"x"}\n\n';
    const { events } = parseSseBuffer(buffer);
    expect(events).toEqual([]);
  });

  it("joins multi-line data fields", () => {
    const { events } = parseSseBuffer('event: token\ndata: {"delta":\ndata: "y"}\n\n');
    expect(events).toEqual([{ type: "token", data: { delta: "y" } }]);
  });
});

describe("useCopilotStream", () => {
  beforeEach(() => {
    localStorage.setItem("adminAccessToken", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("streams tokens, applies spec patches, and finishes on done", async () => {
    const fetchMock = mockSseFetch([
      sseFrame("token", { delta: "Hel" }),
      sseFrame("token", { delta: "lo" }),
      sseFrame("spec_patch", {
        patchId: "p1",
        summary: "Set title",
        specVersionId: "v2",
        ops: [{ op: "replace", path: "/openingStatement", value: "Welcome" }],
      }),
      sseFrame("done", { messageSeq: 1, specVersionId: "v2" }),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const store = buildStore();
    store.dispatch(
      hydrateSpec({
        spec: createEmptyRoleplaySpec("Stream test"),
        specId: "spec-1",
        versionId: "v1",
        updatedAt: null,
      }),
    );

    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("Build me a persona");
    });

    // Bearer auth header from localStorage, mirroring baseApi.
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-token");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ message: "Build me a persona" });

    await waitFor(() => {
      const assistant = result.current.messages.find(message => message.role === "assistant");
      expect(assistant?.content).toBe("Hello");
      expect(assistant?.streaming).toBe(false);
    });

    // spec_patch dispatched into the slice (persisted server-side: not dirty).
    const slice = store.getState().roleplaySpec;
    expect(slice.spec?.openingStatement).toBe("Welcome");
    expect(slice.versionId).toBe("v2");
    expect(slice.revision).toBe(slice.savedRevision);
    expect(slice.isStreaming).toBe(false);
    expect(result.current.isStreaming).toBe(false);

    expect(result.current.messages.map(message => message.role)).toEqual(["user", "assistant"]);
  });

  it("renders question events as structured messages", async () => {
    const question = {
      id: "q1",
      prompt: "Pick a difficulty",
      kind: "choice",
      options: ["Easy", "Hard"],
    };
    vi.stubGlobal(
      "fetch",
      mockSseFetch([
        sseFrame("question", question),
        sseFrame("done", { messageSeq: 2, specVersionId: "v1" }),
      ]),
    );

    const store = buildStore();
    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    await waitFor(() => {
      const questionMessage = result.current.messages.find(message => message.question);
      expect(questionMessage?.question).toEqual(question);
      expect(questionMessage?.content).toBe("Pick a difficulty");
    });
  });

  it("keeps partial text marked interrupted on abort", async () => {
    vi.stubGlobal("fetch", mockSseFetch([sseFrame("token", { delta: "Partial" })], { hang: true }));

    const store = buildStore();
    const { result } = renderStream(store);

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = result.current.sendMessage("never finishes") as Promise<void>;
    });

    // Wait for the partial token to land, then abort mid-stream.
    await waitFor(() => {
      const assistant = result.current.messages.find(message => message.role === "assistant");
      expect(assistant?.content).toBe("Partial");
    });

    act(() => {
      result.current.stop();
    });
    await act(async () => {
      await sendPromise;
    });

    const assistant = result.current.messages.find(message => message.role === "assistant");
    expect(assistant?.content).toBe("Partial");
    expect(assistant?.interrupted).toBe(true);
    expect(assistant?.streaming).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(store.getState().roleplaySpec.isStreaming).toBe(false);
  });

  it("retries once through the refresh flow on 401", async () => {
    const encoder = new TextEncoder();
    const streamBody = () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(sseFrame("token", { delta: "ok" })));
          controller.enqueue(
            encoder.encode(sseFrame("done", { messageSeq: 1, specVersionId: "v1" })),
          );
          controller.close();
        },
      });

    localStorage.setItem("adminRefreshToken", "refresh-1");
    const fetchMock = vi
      .fn()
      // 1: stream request -> 401
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      // 2: refresh -> new tokens
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "new-access", refreshToken: "new-refresh" }),
      } as unknown as Response)
      // 3: retried stream request -> success
      .mockResolvedValueOnce({ ok: true, status: 200, body: streamBody() } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const store = buildStore();
    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem("adminAccessToken")).toBe("new-access");
    const retryInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).authorization).toBe("Bearer new-access");
    await waitFor(() => {
      const assistant = result.current.messages.find(message => message.role === "assistant");
      expect(assistant?.content).toBe("ok");
    });
  });
});
