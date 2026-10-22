import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { en } from "@constants";
import {
  mapServerMessagesToFeed,
  useCharacterInterviewStream,
} from "@hooks/useCharacterInterviewStream";

vi.mock("sonner", () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));

describe("mapServerMessagesToFeed", () => {
  it("keeps a failed turn on screen after a reload", () => {
    // A turn that died left a row with no prose, which rendered as nothing at
    // all — so the admin's own message sat there answered by silence,
    // indistinguishable from the agent still thinking. That matters most on
    // the final turn, where the character draft is what went missing.
    const feed = mapServerMessagesToFeed([
      { id: "u1", seq: 1, role: "user", content: "Build her now." },
      {
        id: "a1",
        seq: 2,
        role: "assistant",
        content: null,
        metadata: { errored: true, errorMessage: "No character was created." },
      },
    ] as never);

    expect(feed).toHaveLength(2);
    expect(feed[1].error).toBe("No character was created.");
  });

  it("falls back to generic copy when the server sent no reason", () => {
    const feed = mapServerMessagesToFeed([
      { id: "a1", seq: 1, role: "assistant", content: null, metadata: { errored: true } },
    ] as never);

    expect(feed[0].error).toBe(en.characterInterview.streamFailed);
  });

  it("still drops a genuinely empty row that did not fail", () => {
    const feed = mapServerMessagesToFeed([
      { id: "a1", seq: 1, role: "assistant", content: "" },
    ] as never);

    expect(feed).toHaveLength(0);
  });

  // The server stores an answered card's turn for the model — prefix, labels, then the selected
  // ids. A resumed feed showed that suffix on both the locked card and the bubble, where the live
  // feed had shown only the admin's words.
  it("shows a resumed structured answer as the admin's words alone", () => {
    const feed = mapServerMessagesToFeed([
      {
        id: "a1",
        seq: 1,
        role: "assistant",
        content: "",
        metadata: {
          questions: [
            {
              id: "q1",
              prompt: "What is her home life like?",
              kind: "singleSelect",
              options: [{ id: "husband_distant", label: "Lives with her husband, but distant" }],
            },
          ],
        },
      },
      {
        id: "u1",
        seq: 2,
        role: "user",
        content:
          "[answers question q1] Lives with her husband, but distant [selected ids: husband_distant]",
        metadata: { questionId: "q1", answer: { selectedOptionIds: ["husband_distant"] } },
      },
    ] as never);

    const card = feed.find(entry => entry.question);
    expect(card?.answeredWith).toBe("Lives with her husband, but distant");
    expect(card?.answeredAnswer).toEqual({ selectedOptionIds: ["husband_distant"] });
    // Drawn once, on the card — not again as a bubble under it, which reads like a double click.
    expect(feed.filter(entry => entry.role === "user")).toHaveLength(0);
  });

  it("rebuilds a turn's receipt", () => {
    const feed = mapServerMessagesToFeed([
      {
        id: "a1",
        seq: 1,
        role: "assistant",
        content: "Asha's draft is ready for your review.",
        metadata: {
          receipt: {
            read: [],
            searched: [],
            changed: ["Character draft saved: Asha"],
            failed: [],
            warnings: [],
          },
        },
      },
      // Not a receipt: dropped rather than half-drawn.
      { id: "a2", seq: 2, role: "assistant", content: "Hi", metadata: { receipt: "nope" } },
    ] as never);

    expect(feed[0].receipt?.changed).toEqual(["Character draft saved: Asha"]);
    expect(feed[1].receipt).toBeUndefined();
  });

  it("keeps an answer whose question is not in the feed", () => {
    // "The card could not be drawn" must never read as "the admin said nothing".
    const feed = mapServerMessagesToFeed([
      {
        id: "u1",
        seq: 1,
        role: "user",
        content: "[answers question q9] Make her older",
        metadata: { questionId: "q9" },
      },
    ] as never);

    expect(feed).toEqual([{ id: "u1", role: "user", content: "Make her older" }]);
  });
});

/** A response whose body streams `frames` as SSE, the way the server does. */
const sseResponse = (frames: string[]) =>
  ({
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
  }) as unknown as Response;

describe("useCharacterInterviewStream — a refused turn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * The session's turn mutex was still held — an earlier turn whose stream the
   * admin had walked away from — so the server never read this message. It
   * used to be rendered as a failed turn: the answer sat in the feed under a
   * raw "another interview turn is already streaming for this session", the
   * question card stayed locked on it, and the only way on was to retype it in
   * the composer. Nothing of it exists server-side, so it should look as if it
   * had never been sent.
   */
  it("rolls the bubbles back and reports that nothing was sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: error\ndata: {"code":"turn_in_progress","message":"Another interview turn is already streaming for this session"}\n\n',
          ]),
        ),
    );

    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    let delivered: boolean | undefined;
    await act(async () => {
      delivered = await result.current.sendMessage("Yes, create the character");
    });

    expect(delivered).toBe(false);
    await waitFor(() => expect(result.current.messages).toHaveLength(0));
  });

  it("keeps a turn the server did run", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: token\ndata: {"delta":"Working on it"}\n\n',
            'event: done\ndata: {"messageSeq":2}\n\n',
          ]),
        ),
    );

    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    let delivered: boolean | undefined;
    await act(async () => {
      delivered = await result.current.sendMessage("Her name is Asha");
    });

    expect(delivered).toBe(true);
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
  });

  it("puts the turn's receipt on its bubble and drops the live tool notes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: tool_call\ndata: {"name":"get_voices","input":{}}\n\n',
            'event: token\ndata: {"delta":"Here are her voices."}\n\n',
            'event: receipt\ndata: {"read":[],"searched":["Voices — 6 voices"],"changed":[],"failed":[],"warnings":[]}\n\n',
            'event: done\ndata: {"messageSeq":2}\n\n',
          ]),
        ),
    );
    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    await act(async () => {
      await result.current.sendMessage("Pick a voice");
    });

    const assistant = result.current.messages.find(m => m.role === "assistant");
    await waitFor(() => expect(assistant?.receipt?.searched).toEqual(["Voices — 6 voices"]));
    expect(assistant?.toolNotes).toBeUndefined();
  });

  it("shows a generic error when the stream fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: error\ndata: {"message": ""}\n\n',
          ]),
        ),
    );
    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    await act(async () => {
      await result.current.sendMessage("Pick a voice");
    });

    const assistant = result.current.messages.find(m => m.role === "assistant");
    await waitFor(() => expect(assistant?.error).toEqual(en.characterInterview.streamFailed));
  });
});

describe("useCharacterInterviewStream — answering a question card", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A feed holding one unanswered question card, as a resume leaves it. */
  const withOpenCard = (sendMessageFrames: string[]) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(sendMessageFrames)));
    const hook = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));
    act(() => {
      hook.result.current.hydrateMessages([
        {
          id: "a1",
          seq: 1,
          role: "assistant",
          content: "",
          metadata: {
            questions: [{ id: "q1", prompt: "Which voice fits her?", kind: "singleSelect" }],
          },
        },
      ] as never);
    });
    return hook;
  };

  const answer = { selectedOptionIds: ["voice-a"] };

  it("marks the card it answers instead of adding a bubble under it", async () => {
    const { result } = withOpenCard([
      'event: token\ndata: {"delta":"Anushka it is."}\n\n',
      'event: done\ndata: {"messageSeq":3}\n\n',
    ]);

    await act(async () => {
      await result.current.sendMessage("Anushka", { questionId: "q1", answer });
    });

    const card = result.current.messages.find(message => message.question);
    expect(card?.answeredWith).toBe("Anushka");
    // What the voice shortlist strip reads to show the chosen voice without a reload.
    expect(card?.answeredAnswer).toEqual(answer);
    expect(result.current.messages.filter(message => message.role === "user")).toHaveLength(0);
  });

  it("unmarks the card when the turn was refused, so it can be answered again", async () => {
    const { result } = withOpenCard([
      'event: error\ndata: {"code":"turn_in_progress","message":"Another interview turn is already streaming for this session"}\n\n',
    ]);

    let delivered: boolean | undefined;
    await act(async () => {
      delivered = await result.current.sendMessage("Anushka", { questionId: "q1", answer });
    });

    expect(delivered).toBe(false);
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    const card = result.current.messages[0];
    expect(card.answeredWith).toBeUndefined();
    expect(card.answeredAnswer).toBeUndefined();
  });
});
