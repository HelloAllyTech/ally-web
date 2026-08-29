import { render, screen, fireEvent, act } from "@testing-library/react";
import { useForm, UseFormReturn } from "react-hook-form";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { Competency } from "../Competency";

/**
 * These tests cover the "Pick Competency" dropdown in the roleplay editor's
 * Basic Settings pane, and specifically the eager custom-competency
 * materialisation that runs (debounced) alongside it.
 *
 * The reported failure was "I am unable to select a competency from the drop
 * down menu" on a draft that already had a filled Scoring Rubric: the
 * materialisation fired on its own and wrote a machine-generated
 * `your_custom_N` competency over whatever the author picked.
 */

const COMPETENCIES = [
  { id: "c-listen", name: "Active Listening" },
  { id: "c-risk", name: "Risk Assessment" },
];

const behavioursById: Record<string, { helpful: any[]; unhelpful: any[] }> = {
  "c-listen": {
    helpful: [{ id: "b1", name: "Reflects feelings" }],
    unhelpful: [{ id: "b2", name: "Interrupts" }],
  },
  "c-risk": {
    helpful: [{ id: "b3", name: "Asks directly about suicide" }],
    unhelpful: [{ id: "b4", name: "Changes the subject" }],
  },
};

const mockCreateCompetency = vi.fn();
const mockSetCompetencyBehaviours = vi.fn();
const mockFetchBehaviours = vi.fn();

vi.mock("@api", () => {
  // The @constants barrel transitively wires up the configured store, so the
  // two API slices it needs are faked alongside the competency endpoints.
  const apiSliceStub = (reducerPath: string) => ({
    reducerPath,
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    injectEndpoints: () => ({}),
  });
  return {
    baseAPI: apiSliceStub("baseAPI"),
    evaluatorAPI: apiSliceStub("evaluatorAPI"),
    useGetCompetenciesQuery: () => ({ data: { data: COMPETENCIES, count: 2 }, isLoading: false }),
    useLazyGetCompetencyBehavioursQuery: () => [mockFetchBehaviours],
    useGetCompetencyBehavioursQuery: (id: string, opts?: { skip?: boolean }) => ({
      data: opts?.skip ? undefined : behavioursById[id],
    }),
    useCreateCompetencyMutation: () => [mockCreateCompetency],
    useSetCompetencyBehavioursMutation: () => [mockSetCompetencyBehaviours],
    useUpdateCompetencyMutation: () => [vi.fn()],
    useDeleteCompetencyMutation: () => [vi.fn()],
    useGetActiveTooltipsQuery: () => ({ data: [] }),
  };
});

vi.mock("@hooks", () => ({
  useClickOutside: () => undefined,
  useUser: () => ({ user: { id: 7 } }),
}));

/** Scoring-rubric rows shaped like the ones the editor persists. */
const rubricRows = (competencyId: string) => [
  {
    id: "row-1",
    category: "SHOULD_DO",
    behaviors: behavioursById[competencyId].helpful,
    instructions: [],
    stateInstructions: [],
  },
  {
    id: "row-2",
    category: "SHOULD_NOT_DO",
    behaviors: behavioursById[competencyId].unhelpful,
    instructions: [],
    stateInstructions: [],
  },
];

let form: UseFormReturn<any>;

/**
 * Mirrors CreateSimulation: one `useForm` whose values arrive later via
 * `reset()` once GET /simulations/:id resolves, with the page-level `watch()`
 * subscription in place. `form` is exposed so tests can drive that load and
 * simulate edits made by the behaviour table.
 */
const Harness = () => {
  const formMethods = useForm<any>({ mode: "onChange", reValidateMode: "onChange" });
  form = formMethods;
  formMethods.watch();
  return (
    <>
      <Competency id="competency" formMethods={formMethods} isMandatory label="Pick Competency" />
      <output data-testid="value">{JSON.stringify(formMethods.watch("competency") ?? null)}</output>
    </>
  );
};

const trigger = () => document.querySelector(".focus-within\\:ring-primary") as HTMLElement;
const triggerLabel = () => trigger().querySelector("span")!.textContent;
const openDropdown = () => fireEvent.click(trigger());
const option = (name: string) =>
  [...document.querySelectorAll("span")].find(s => s.textContent === name)!.parentElement!;
const competencyValue = () => JSON.parse(screen.getByTestId("value").textContent || "null");

/** Runs pending microtasks and lets React flush the resulting renders. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Fires the 700ms materialisation debounce and flushes what it triggers. */
const runSyncDebounce = async () => {
  await act(async () => {
    vi.advanceTimersByTime(800);
  });
  await flush();
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockFetchBehaviours.mockImplementation((id: string) => ({
    unwrap: async () => behavioursById[id],
  }));
  mockCreateCompetency.mockImplementation(() => ({
    unwrap: async () => ({ id: "c-custom", name: "7_custom_1", isCustom: true }),
  }));
  mockSetCompetencyBehaviours.mockImplementation(() => ({ unwrap: async () => ({}) }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Competency — opening a draft that already has a scoring rubric", () => {
  it("does not invent a competency when the simulation loads after the debounce has ticked", async () => {
    render(<Harness />);

    // GET /simulations/:id is still in flight, so the first debounce tick sees
    // an empty form. This is the tick that used to record a bogus "empty"
    // baseline.
    await runSyncDebounce();

    // The draft arrives: a filled Scoring Rubric, no competency picked yet.
    await act(async () => {
      form.reset({ behaviorInstructions: rubricRows("c-listen") });
    });
    await runSyncDebounce();

    // Rows the author never touched are not a divergence to capture.
    expect(mockCreateCompetency).not.toHaveBeenCalled();
    expect(competencyValue()).toBeFalsy();
  });
});

describe("Competency — picking a competency", () => {
  it("keeps the author's pick when a custom materialisation is still in flight", async () => {
    const create = deferred<{ id: string; name: string; isCustom: boolean }>();
    mockCreateCompetency.mockImplementation(() => ({ unwrap: () => create.promise }));

    render(<Harness />);
    await act(async () => {
      form.reset({ behaviorInstructions: rubricRows("c-listen") });
    });
    await runSyncDebounce();

    // The author hand-edits the rubric (× on a behaviour), which legitimately
    // materialises a custom competency to capture the divergence...
    await act(async () => {
      form.setValue("behaviorInstructions", [rubricRows("c-listen")[0]], { shouldDirty: true });
    });
    await runSyncDebounce();
    expect(mockCreateCompetency).toHaveBeenCalledTimes(1);

    // ...and while those requests are in flight, they pick a real competency.
    openDropdown();
    fireEvent.click(option("Risk Assessment"));
    fireEvent.click(screen.getByText("Accept"));
    await flush();
    expect(competencyValue()?.id).toBe("c-risk");

    // The materialisation now completes. It must not overwrite the pick.
    await act(async () => {
      create.resolve({ id: "c-custom", name: "7_custom_1", isCustom: true });
    });
    await flush();
    await runSyncDebounce();

    expect(competencyValue()?.id).toBe("c-risk");
    expect(triggerLabel()).toBe("Risk Assessment");
  });

  it("still materialises and selects a custom competency for a hand-edited rubric", async () => {
    render(<Harness />);
    await act(async () => {
      form.reset({ competency: COMPETENCIES[0], behaviorInstructions: rubricRows("c-listen") });
    });
    await runSyncDebounce();
    expect(mockCreateCompetency).not.toHaveBeenCalled();

    await act(async () => {
      form.setValue("behaviorInstructions", [rubricRows("c-listen")[0]], { shouldDirty: true });
    });
    await runSyncDebounce();

    expect(mockCreateCompetency).toHaveBeenCalledTimes(1);
    expect(competencyValue()?.id).toBe("c-custom");
    expect(triggerLabel()).toBe("your_custom_1");
  });
});
