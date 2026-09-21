import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UseFormReturn } from "react-hook-form";

import { useAgentBuilderGeneration } from "../useAgentBuilderGeneration";

/**
 * The wizard's orchestration is the part unit tests of the parsers can't reach:
 * two of its calls are SEQUENCED (spoken_languages decides the language fan-out;
 * language_voices waits on persona), and a Stop has to cancel calls that didn't
 * exist when it was pressed. These cover that shape.
 */

const CATALOG_FOR_MOCK = [
  {
    language_id: 1,
    value: "en-IN",
    label: "English (India)",
    translationCode: "en",
    voices: [{ id: "en-f", name: "Anushka", provider: "SARVAM", gender: "female", age: "adult" }],
  },
  {
    language_id: 2,
    value: "hi-IN",
    label: "Hindi (India)",
    translationCode: "hi",
    voices: [{ id: "hi-m", name: "Raju", provider: "ELEVENLABS", gender: "male", age: null }],
  },
];

/**
 * Mocked module state lives in `vi.hoisted` because the `vi.mock` factories are
 * hoisted above the file's own consts.
 *
 * Neither factory spreads `importOriginal()`: `@api` and `@hooks` are barrels
 * that reach `@store`, which reads `baseAPI.reducerPath` at module load — with
 * `@api` mid-mock that is undefined, and the suite either fails to load or
 * deadlocks. The real `useResolvedPrimaryLanguageId` is pulled in by path
 * instead, so the primary-language split is the genuine one.
 */
const mocks = vi.hoisted(() => {
  /** Per-field canned responses; each `trigger` resolves from here. */
  const state: { responses: Record<string, unknown>; failing: Set<string> } = {
    responses: {},
    failing: new Set<string>(),
  };
  const requests: Array<Record<string, unknown>> = [];
  const aborts = vi.fn();
  const trigger = vi.fn((body: Record<string, unknown>) => {
    requests.push(body);
    const field = String(body.field);
    return {
      abort: aborts,
      unwrap: () =>
        state.failing.has(field)
          ? Promise.reject({ data: { message: "boom" } })
          : Promise.resolve({ value: state.responses[field] }),
    };
  });
  return { state, requests, aborts, trigger };
});

const { state, requests, aborts, trigger } = mocks;

vi.mock("@api", () => ({
  useGenerateAgentBuilderFieldMutation: () => [mocks.trigger],
  useGetAvailableLanguageVoicesQuery: () => ({ data: CATALOG_FOR_MOCK, isLoading: false }),
}));

// `agentBuilderApply` reaches `@store` through the `@constants` barrel, and
// `@store` reads `baseAPI.reducerPath` at module load — undefined while `@api`
// is mocked. Nothing here dispatches, so a stub store keeps that module out of
// the graph entirely.
vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: () => ({}), subscribe: vi.fn() },
}));

vi.mock("@hooks", async () => ({
  // The states field is gated on the selected main prompt; keep it out so the
  // plan under test is just the language behaviour.
  useIsPlaceholderUsed: () => ({ isUsed: false }),
  useResolvedPrimaryLanguageId: (await import("../../../hooks/useResolvedPrimaryLanguageId"))
    .useResolvedPrimaryLanguageId,
}));

const makeForm = (values: Record<string, unknown> = {}) => {
  const store: Record<string, unknown> = { ...values };
  const setValue = vi.fn((key: string, next: unknown) => {
    store[key] = next;
  });
  return {
    store,
    setValue,
    form: {
      setValue,
      getValues: (key?: string) => (key ? store[key] : store),
      watch: (key: string) => store[key],
      trigger: vi.fn().mockResolvedValue(true),
    } as unknown as UseFormReturn<any>,
  };
};

const INPUTS = {
  actorDescription: "Suchi speaks English and Hindi.",
  competency: "Active listening",
  agentTestCases: "Client deflects",
};

const fieldsRequested = () => requests.map(r => String(r.field));

beforeEach(() => {
  requests.length = 0;
  aborts.mockClear();
  trigger.mockClear();
  state.failing = new Set();
  state.responses = {
    role_instruction: "Be guarded.",
    title: "A tired daughter-in-law",
    challenge_description: "She minimises.",
    persona: { name: "Suchi", age: 34, gender: "female" },
    backstory: "Moved from Tamil Nadu.",
    knowledge_sources: [{ title: "Dementia basics", content: "…" }],
    reminders: "Slow down",
    spoken_languages: [
      { languageId: "1", label: "English (India)", code: "en" },
      { languageId: "2", label: "Hindi (India)", code: "hi" },
    ],
    opening_statements: "I just want some information.",
    linguistic_style_samples: ["I'm managing fine."],
    allowed_filler_words: ["um", "I mean"],
    language_voices: [
      {
        languageId: "1",
        languageLabel: "English (India)",
        voiceId: "en-f",
        voiceName: "Anushka",
        voiceGender: "female",
      },
    ],
  };
});

describe("useAgentBuilderGeneration", () => {
  it("fans the language-scoped fields out once per spoken language", async () => {
    const { form } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    const requested = fieldsRequested();
    // One detection call, then three fields x two languages.
    expect(requested.filter(f => f === "spoken_languages")).toHaveLength(1);
    for (const field of [
      "opening_statements",
      "linguistic_style_samples",
      "allowed_filler_words",
    ]) {
      const perField = requests.filter(r => r.field === field);
      expect(perField.map(r => r.languageId).sort()).toEqual(["1", "2"]);
    }
    // Every per-language row is labelled with its language.
    expect(result.current.tasks.map(t => t.label)).toContain(
      "Linguistic style samples (Hindi (India))",
    );
    expect(result.current.tasks.find(t => t.field === "spoken_languages")?.label).toBe(
      "Languages the client speaks: English (India), Hindi (India)",
    );
  });

  it("writes each language into its own tab, English on the primary field", async () => {
    const { form, store } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(store.openingStatements).toBe("I just want some information.");
    expect(store.translationOpeningStatements).toEqual({
      "2": ["I just want some information."],
    });
    expect(store.linguisticStyleSamples).toEqual({
      "1": ["I'm managing fine."],
      "2": ["I'm managing fine."],
    });
    expect(store.allowedFillerWords).toEqual({
      "1": ["um", "I mean"],
      "2": ["um", "I mean"],
    });
  });

  it("casts voices for the spoken languages and reports what it picked", async () => {
    const { form, store } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    const castRequest = requests.find(r => r.field === "language_voices");
    // Cast after the persona, so it knows who it is voicing.
    expect(castRequest).toMatchObject({ personaGender: "female", personaAge: 34 });
    expect(castRequest?.languageIds).toEqual(["1", "2"]);

    // Hindi wasn't cast by the model, so the deterministic picker filled it —
    // and the summary says both which voice and that it's a fallback.
    expect(store.languageVoices).toEqual({ "1": "en-f", "2": "hi-m" });
    const voiceTask = result.current.tasks.find(t => t.key === "language_voices");
    expect(voiceTask?.status).toBe("done");
    expect(voiceTask?.label).toBe(
      "Language–Voice mapping: English (India) → Anushka, " +
        "Hindi (India) → Raju (no female voice, default pick)",
    );
  });

  it("never moves a voice the trainer already chose", async () => {
    const { form, store } = makeForm({ languageVoices: { "1": "trainer-pick" } });
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(requests.find(r => r.field === "language_voices")?.languageIds).toEqual(["2"]);
    expect((store.languageVoices as Record<string, string>)["1"]).toBe("trainer-pick");
  });

  it("falls back to the picker when the cast call fails", async () => {
    state.failing = new Set(["language_voices"]);
    const { form, store } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    // Mandatory to publish, so a failed cast must still leave a usable mapping.
    expect(store.languageVoices).toEqual({ "1": "en-f", "2": "hi-m" });
    expect(result.current.tasks.find(t => t.key === "language_voices")?.status).toBe("done");
  });

  it("marks a failed field without stopping the rest of the batch", async () => {
    state.failing = new Set(["title"]);
    const { form, store } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(result.current.tasks.find(t => t.field === "title")?.status).toBe("error");
    expect(store.linguisticStyleSamples).toBeDefined();
  });

  it("generates nothing per-language when detection returns no languages", async () => {
    state.responses.spoken_languages = [];
    const { form, store } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(fieldsRequested()).not.toContain("linguistic_style_samples");
    expect(fieldsRequested()).not.toContain("language_voices");
    expect(store.languageVoices).toBeUndefined();
    expect(result.current.tasks.find(t => t.field === "spoken_languages")?.status).toBe("empty");
  });

  it("aborts every in-flight call, including ones the fan-out added later", async () => {
    const { form } = makeForm();
    const { result } = renderHook(() => useAgentBuilderGeneration(form));

    act(() => result.current.start(INPUTS));
    // Let the fan-out be scheduled before stopping, so the later handles exist.
    await waitFor(() => expect(fieldsRequested()).toContain("linguistic_style_samples"));
    act(() => result.current.abort());

    expect(result.current.phase).toBe("aborted");
    // One abort per request made, the per-language ones included.
    expect(aborts).toHaveBeenCalledTimes(requests.length);
  });
});
