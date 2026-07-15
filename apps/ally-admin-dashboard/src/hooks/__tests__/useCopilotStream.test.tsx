import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopilotStream, parseSseBuffer } from "@hooks/useCopilotStream";
import roleplaySpecSlice, { hydrateSpec } from "@reducer/roleplaySpecReducer";
import { createEmptyRoleplaySpec } from "@utils/roleplaySpec";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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

/** A one-shot SSE response (closes after the scripted frames). */
const streamResponse = (frames: string[]) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      frames.forEach(frame => controller.enqueue(encoder.encode(frame)));
      controller.close();
    },
  });
  return { ok: true, status: 200, body } as unknown as Response;
};

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

  it("renders behaviour_review events as structured messages", async () => {
    const review = {
      id: "r1",
      prompt: "Review behaviours",
      helpful: [{ id: "h1", name: "Reflect feelings", checked: true }],
      unhelpful: [{ id: "u1", name: "Give advice", checked: true }],
      allowCustom: true,
    };
    vi.stubGlobal(
      "fetch",
      mockSseFetch([
        sseFrame("behaviour_review", review),
        sseFrame("done", { messageSeq: 2, specVersionId: "v1" }),
      ]),
    );

    const store = buildStore();
    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    await waitFor(() => {
      const message = result.current.messages.find(m => m.behaviourReview);
      expect(message?.behaviourReview).toEqual(review);
      expect(message?.content).toBe("Review behaviours");
    });
  });

  it("posts a structured answer for select/behaviour cards", async () => {
    const fetchMock = mockSseFetch([sseFrame("done", { messageSeq: 3, specVersionId: "v1" })]);
    vi.stubGlobal("fetch", fetchMock);

    const store = buildStore();
    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("Empathy, Active Listening", {
        questionId: "q-comp",
        answer: { selectedOptionIds: ["c1", "c2"] },
      });
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      message: "Empathy, Active Listening",
      questionId: "q-comp",
      answer: { selectedOptionIds: ["c1", "c2"] },
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

  it("recovers a missing session: re-creates one and replays the turn once", async () => {
    // 1: turn fails with session_not_found. 2: replayed turn on the fresh session.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse([
          sseFrame("error", {
            code: "session_not_found",
            message: "Copilot session not found: sess-1",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        streamResponse([
          sseFrame("token", { delta: "Recovered" }),
          sseFrame("done", { messageSeq: 1, specVersionId: "v1" }),
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const onSessionInvalid = vi.fn(async () => "sess-2");
    const store = buildStore();
    const { result } = renderHook(
      () => useCopilotStream({ sessionId: "sess-1", onSessionInvalid }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    // Recovered exactly once, replaying against the new session id.
    expect(onSessionInvalid).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("sess-2");

    await waitFor(() => {
      const assistant = result.current.messages.find(message => message.role === "assistant");
      expect(assistant?.content).toBe("Recovered");
      expect(assistant?.error).toBeUndefined();
    });

    // The failed pair was dropped — only the replayed user + assistant remain.
    expect(result.current.messages.map(message => message.role)).toEqual(["user", "assistant"]);
  });

  it("surfaces the failure when no recovery is available (no onSessionInvalid)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamResponse([
          sseFrame("error", {
            code: "session_not_found",
            message: "Copilot session not found: sess-1",
          }),
        ]),
      ),
    );

    const store = buildStore();
    const { result } = renderStream(store);

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    // Without a recovery hook the pair is still dropped and streaming settles.
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
    expect(result.current.messages).toEqual([]);
  });
});

describe("mapServerMessagesToFeed", () => {
  const rows = [
    { id: "m1", seq: 1, role: "user" as const, content: "Build me a roleplay" },
    {
      id: "m2",
      seq: 2,
      role: "assistant" as const,
      content: "Let's start.",
      metadata: {
        questions: [{ id: "q-1", prompt: "Which skill?", kind: "freeText" as const }],
        testCaseSuggestions: [
          { id: "s-1", title: "Leak check", condition: "probe", test: "no leak" },
          { id: "s-2", title: "Escalation", condition: "escalate", test: "holds" },
        ],
      },
      toolResults: [{ name: "compile_spec", result: { summary: "Spec compiles cleanly" } }],
    },
    {
      id: "m3",
      seq: 3,
      role: "user" as const,
      content: "[answers question q-1] Reflective listening",
      metadata: { questionId: "q-1" },
    },
    {
      id: "m4",
      seq: 4,
      role: "user" as const,
      content: "[accepted 1 suggested test case(s): Leak check]",
      metadata: { kind: "test_cases_accepted" as const, suggestionIds: ["s-1"] },
    },
    {
      id: "m5",
      seq: 5,
      role: "assistant" as const,
      content: "**Round 1 rehearsed** — overall **65**",
      metadata: {
        kind: "improvement_update" as const,
        subkind: "round_scored",
        improvementRunId: "run-1",
        roundNumber: 1,
        scores: { overall: 65, testCounts: { passed: 1, failed: 1, inconclusive: 0 } },
      },
    },
    {
      id: "m6",
      seq: 6,
      role: "assistant" as const,
      content: "Ready to test live & publish.",
      metadata: {
        kind: "improvement_ready" as const,
        improvementRunId: "run-1",
        specId: "spec-1",
        bestVersionId: "v-best",
        acceptedVersionId: "v-accepted",
      },
    },
  ];

  it("reconstructs the full card fidelity from persisted rows", async () => {
    const { mapServerMessagesToFeed } = await import("@hooks/useCopilotStream");
    const feed = mapServerMessagesToFeed(rows as never);

    // m2 expands into: text bubble (+ tool note), question card, suggestions card.
    const textBubble = feed.find(m => m.content === "Let's start.");
    expect(textBubble?.toolNotes).toEqual(["compile_spec: Spec compiles cleanly"]);

    const questionCard = feed.find(m => m.question?.id === "q-1");
    expect(questionCard?.answeredWith).toBe("Reflective listening");

    const suggestionsCard = feed.find(m => (m.testCaseSuggestions?.length ?? 0) > 0);
    expect(suggestionsCard?.acceptedSuggestionIds).toEqual(["s-1"]);

    // The answer row strips its bracket prefix; the marker row is a system note.
    const answerBubble = feed.find(m => m.content === "Reflective listening" && m.role === "user");
    expect(answerBubble).toBeDefined();
    const markerNote = feed.find(m => m.systemNote);
    expect(markerNote?.content).toContain("accepted 1 suggested");

    // Loop rows become dedicated cards.
    const progress = feed.find(m => m.improvementUpdate);
    expect(progress?.improvementUpdate?.scores?.overall).toBe(65);
    const ready = feed.find(m => m.improvementReady);
    expect(ready?.improvementReady?.bestVersionId).toBe("v-best");
  });

  it("leaves unanswered questions interactive", async () => {
    const { mapServerMessagesToFeed } = await import("@hooks/useCopilotStream");
    const feed = mapServerMessagesToFeed([rows[1]] as never);
    const questionCard = feed.find(m => m.question?.id === "q-1");
    expect(questionCard?.answeredWith).toBeUndefined();
  });

  it("reconstructs structured multi-select answers and behaviour-review cards", async () => {
    const { mapServerMessagesToFeed } = await import("@hooks/useCopilotStream");
    const resumeRows = [
      {
        id: "a1",
        seq: 1,
        role: "assistant" as const,
        content: "Pick competencies",
        metadata: {
          questions: [
            {
              id: "q-c",
              prompt: "Pick competencies",
              kind: "multiSelect" as const,
              options: [{ id: "c1", label: "Empathy" }],
              allowNone: true,
            },
          ],
          behaviourReviews: [
            {
              id: "r-1",
              prompt: "Review behaviours",
              helpful: [{ id: "h1", name: "Reflect", checked: true }],
              unhelpful: [{ id: "u1", name: "Advise", checked: true }],
            },
          ],
        },
      },
      {
        id: "u1",
        seq: 2,
        role: "user" as const,
        content: "[answers question q-c] Empathy [selected ids: c1]",
        metadata: { questionId: "q-c", answer: { selectedOptionIds: ["c1"] } },
      },
      {
        id: "u2",
        seq: 3,
        role: "user" as const,
        content: "[answers question r-1] helpful: Reflect",
        metadata: { questionId: "r-1", answer: { helpful: ["Reflect"], unhelpful: ["Advise"] } },
      },
    ];

    const feed = mapServerMessagesToFeed(resumeRows as never);

    const questionCard = feed.find(m => m.question?.id === "q-c");
    expect(questionCard?.answeredAnswer).toEqual({ selectedOptionIds: ["c1"] });

    const behaviourCard = feed.find(m => m.behaviourReview?.id === "r-1");
    expect(behaviourCard?.behaviourReview?.helpful[0].name).toBe("Reflect");
    expect(behaviourCard?.answeredAnswer).toEqual({ helpful: ["Reflect"], unhelpful: ["Advise"] });
  });
});
