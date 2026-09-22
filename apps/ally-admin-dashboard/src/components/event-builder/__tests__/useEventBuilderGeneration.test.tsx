import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEventBuilderGeneration } from "../useEventBuilderGeneration";

/**
 * The orchestration is what unit tests of the parsers cannot reach: the batch
 * is SEQUENCED (`classifier` gates the three fields that need its class name),
 * results land out of order and must not overwrite each other, a Stop has to
 * cancel calls that did not exist when it was pressed, and a regenerate has to
 * use the class name the author edited rather than the one the batch produced.
 */

/**
 * Mocked module state lives in `vi.hoisted` because the `vi.mock` factory is
 * hoisted above this file's own consts.
 *
 * The factory does not spread `importOriginal()`: `@api` is a barrel reaching
 * `@store`, which reads `baseAPI.reducerPath` at module load — with `@api`
 * mid-mock that is undefined and the suite deadlocks.
 */
const mocks = vi.hoisted(() => {
  const state: {
    responses: Record<string, unknown>;
    failing: Set<string>;
    /** Fields whose promise is held open until the test releases it. */
    deferred: Map<string, { resolve: () => void; promise: Promise<void> }>;
  } = { responses: {}, failing: new Set<string>(), deferred: new Map() };
  const requests: Array<Record<string, unknown>> = [];
  const aborts = vi.fn();
  const trigger = vi.fn((body: Record<string, unknown>) => {
    requests.push(body);
    const field = String(body.field);
    return {
      abort: aborts,
      unwrap: async () => {
        const gate = state.deferred.get(field);
        if (gate) await gate.promise;
        if (state.failing.has(field)) throw { data: { message: "boom" } };
        return { field, value: state.responses[field] };
      },
    };
  });
  return { state, requests, aborts, trigger };
});

const { state, requests, aborts, trigger } = mocks;

vi.mock("@api", () => ({
  useGenerateEventBuilderFieldMutation: () => [mocks.trigger],
}));

const INPUTS = {
  eventDescription: "The counsellor asks an open-ended question.",
  simulationContext: "Supporting a caregiver after a diagnosis",
  competency: "Active listening",
};

const requestFor = (field: string) => requests.find(r => r.field === field);
const taskFor = (tasks: { key: string; status: string }[], field: string) =>
  tasks.find(t => t.key === field);

beforeEach(() => {
  requests.length = 0;
  aborts.mockClear();
  trigger.mockClear();
  state.failing = new Set();
  state.deferred = new Map();
  state.responses = {
    classifier: { name: "Open-Ended Question", className: "Open-ended question" },
    tags: ["active-listening", "questioning"],
    examples: {
      positiveExamples: [{ text: "What was that like for you?" }],
      negativeExamples: [{ text: "Are you okay?" }],
    },
    feedback: { message: "You gave them room to say more", emoji: "👏", score: 5 },
    branch_instruction: "You open up a little.",
  };
});

/** Hold a field's response open so the test can observe the in-flight state. */
const defer = (field: string) => {
  let resolve!: () => void;
  const promise = new Promise<void>(r => {
    resolve = r;
  });
  state.deferred.set(field, { resolve, promise });
  return resolve;
};

describe("useEventBuilderGeneration", () => {
  it("fills every part of the draft from one brief", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(result.current.draft).toEqual(
      expect.objectContaining({
        name: "Open-Ended Question",
        className: "Open-ended question",
        positiveExamples: [{ text: "What was that like for you?" }],
        negativeExamples: [{ text: "Are you okay?" }],
        message: "You gave them room to say more",
        emoji: "👏",
        score: 5,
        branchInstruction: "You open up a little.",
        tags: ["active-listening", "questioning"],
      }),
    );
    expect(result.current.appliedCount).toBe(5);
  });

  it("holds the class-name-dependent fields until the classifier lands", async () => {
    const release = defer("classifier");
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));

    // First wave only: tags does not need a class name, so it goes immediately.
    await waitFor(() => expect(requestFor("tags")).toBeDefined());
    expect(requestFor("examples")).toBeUndefined();
    expect(taskFor(result.current.tasks, "examples")?.status).toBe("waiting");

    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.phase).toBe("done"));
    expect(requestFor("examples")).toBeDefined();
  });

  it("passes the generated class name to the dependent fields", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    for (const field of ["examples", "feedback", "branch_instruction"]) {
      expect(requestFor(field)?.className).toBe("Open-ended question");
    }
  });

  it("never steers the classifier with a class name, so a regenerate is not a no-op", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));
    requests.length = 0;

    act(() => result.current.regenerateField("classifier", INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(requestFor("classifier")?.className).toBeUndefined();
  });

  it("regenerates against the class name the author edited, not the generated one", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    // Fixing a wrong class name has to change what the examples describe;
    // otherwise every example still calibrates the classifier to the old one.
    act(() => result.current.patchDraft({ className: "Reflective summary" }));
    requests.length = 0;

    act(() => result.current.regenerateField("examples", INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(requestFor("examples")?.className).toBe("Reflective summary");
  });

  it("runs the dependent fields anyway when the classifier fails", async () => {
    // The dependent prompts read sensibly with no class name, so a failed
    // classifier degrades them rather than blocking the whole generation.
    state.failing = new Set(["classifier"]);
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(taskFor(result.current.tasks, "classifier")?.status).toBe("error");
    expect(requestFor("examples")).toBeDefined();
    expect(result.current.draft.message).toBe("You gave them room to say more");
  });

  it("marks a field that produced nothing, rather than silently succeeding", async () => {
    state.responses.examples = { positiveExamples: [], negativeExamples: [] };
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(taskFor(result.current.tasks, "examples")?.status).toBe("empty");
    expect(result.current.appliedCount).toBe(4);
  });

  it("surfaces the server's message on a failed field", async () => {
    state.failing = new Set(["tags"]);
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(taskFor(result.current.tasks, "tags")?.error).toBe("boom");
  });

  it("caps the examples it asks for below the server ceiling", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(requestFor("examples")?.numExamples).toBe(4);
    // Only `examples` is budgeted; nothing else should carry the field.
    expect(requestFor("feedback")?.numExamples).toBeUndefined();
  });

  it("aborts in-flight calls and stops applying results", async () => {
    const release = defer("classifier");
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(requestFor("classifier")).toBeDefined());

    act(() => result.current.abort());
    expect(aborts).toHaveBeenCalled();
    expect(result.current.phase).toBe("aborted");

    await act(async () => {
      release();
    });

    // The late classifier result must not paint into a draft the author
    // already walked away from.
    expect(result.current.draft.className).toBe("");
    expect(taskFor(result.current.tasks, "examples")?.status).toBe("aborted");
  });

  it("ignores a re-entrant start while a batch is running", async () => {
    const release = defer("classifier");
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(requestFor("classifier")).toBeDefined());

    act(() => result.current.start(INPUTS));
    expect(requests.filter(r => r.field === "classifier")).toHaveLength(1);

    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.phase).toBe("done"));
  });

  it("does not fire on an empty brief", () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start({ eventDescription: "   " }));

    expect(trigger).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("clears the previous run's draft when a new brief is generated", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    // Keeping the old examples beside a new class name would leave the
    // classifier calibrated against a behaviour nobody asked for.
    state.responses.classifier = { name: "Premature Advice", className: "Premature advice" };
    state.responses.examples = { positiveExamples: [], negativeExamples: [] };

    act(() => result.current.start({ eventDescription: "The counsellor gives advice too early." }));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(result.current.draft.className).toBe("Premature advice");
    expect(result.current.draft.positiveExamples).toEqual([]);
  });

  it("reset clears the feed and the draft", async () => {
    const { result } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    act(() => result.current.reset());

    expect(result.current.phase).toBe("idle");
    expect(result.current.tasks).toEqual([]);
    expect(result.current.draft.className).toBe("");
  });

  it("cancels in-flight calls when the panel unmounts", async () => {
    defer("classifier");
    const { result, unmount } = renderHook(() => useEventBuilderGeneration());

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(requestFor("classifier")).toBeDefined());

    unmount();
    expect(aborts).toHaveBeenCalled();
  });
});
