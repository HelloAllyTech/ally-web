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
const mockDeleteCompetency = vi.fn();

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
    // Both competencies live in one cluster, so the grouped dropdown and its
    // "Select all" have something real to act on.
    useGetCompetencyClustersQuery: () => ({
      data: {
        data: [
          { id: "cl-core", name: "Core Communication", competencyIds: ["c-listen", "c-risk"] },
        ],
        count: 1,
      },
    }),
    useLazyGetCompetencyBehavioursQuery: () => [mockFetchBehaviours],
    useGetCompetencyBehavioursQuery: (id: string, opts?: { skip?: boolean }) => ({
      data: opts?.skip ? undefined : behavioursById[id],
    }),
    useCreateCompetencyMutation: () => [mockCreateCompetency],
    useSetCompetencyBehavioursMutation: () => [mockSetCompetencyBehaviours],
    useUpdateCompetencyMutation: () => [vi.fn()],
    useDeleteCompetencyMutation: () => [mockDeleteCompetency],
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
      <output data-testid="selection">
        {JSON.stringify(formMethods.watch("competencies") ?? [])}
      </output>
    </>
  );
};

const trigger = () => document.querySelector(".focus-within\\:ring-primary") as HTMLElement;
const triggerLabel = () => trigger().querySelector("span")!.textContent;
const openDropdown = () => fireEvent.click(trigger());
const option = (name: string) =>
  [...document.querySelectorAll("span")].find(s => s.textContent === name)!.parentElement!;
const competencyValue = () => JSON.parse(screen.getByTestId("value").textContent || "null");
const selectionIds = (): string[] =>
  (JSON.parse(screen.getByTestId("selection").textContent || "[]") as { id: string }[]).map(
    entry => entry.id,
  );

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
  mockDeleteCompetency.mockImplementation(() => ({ unwrap: async () => ({}) }));
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
      form.reset({
        competency: COMPETENCIES[0],
        competencies: [COMPETENCIES[0]],
        behaviorInstructions: rubricRows("c-listen"),
      });
    });
    await runSyncDebounce();

    // The author hand-edits the rubric (× on a behaviour), which legitimately
    // forks Active Listening into a custom competency...
    await act(async () => {
      form.setValue("behaviorInstructions", [rubricRows("c-listen")[0]], { shouldDirty: true });
    });
    await runSyncDebounce();
    expect(mockCreateCompetency).toHaveBeenCalledTimes(1);

    // ...and while those requests are in flight, they tick a real competency.
    openDropdown();
    fireEvent.click(option("Risk Assessment"));
    await flush();
    expect(selectionIds()).toContain("c-risk");

    // The fork now completes. It must not overwrite what they picked.
    await act(async () => {
      create.resolve({ id: "c-custom", name: "7_custom_1", isCustom: true });
    });
    await flush();

    expect(selectionIds()).toContain("c-risk");

    // The custom minted mid-flight is orphaned — nothing will ever reference
    // "c-custom" again — so it is cleaned up rather than left behind.
    expect(mockDeleteCompetency).toHaveBeenCalledWith("c-custom");
  });

  it("forks only the competency whose rows were edited, leaving the others real", async () => {
    render(<Harness />);
    await act(async () => {
      form.reset({
        competency: COMPETENCIES[0],
        competencies: COMPETENCIES,
        behaviorInstructions: [...rubricRows("c-listen"), ...rubricRows("c-risk")].map(
          (row, index) => ({ ...row, id: `row-${index}` }),
        ),
      });
    });
    await runSyncDebounce();
    expect(mockCreateCompetency).not.toHaveBeenCalled();

    // Drop one behaviour from Active Listening's "should not do" row. Risk
    // Assessment's rows are untouched.
    const edited = [...rubricRows("c-listen").slice(0, 1), ...rubricRows("c-risk")].map(
      (row, index) => ({ ...row, id: `row-${index}` }),
    );
    await act(async () => {
      form.setValue("behaviorInstructions", edited, { shouldDirty: true });
    });
    await runSyncDebounce();

    // Exactly one fork, and Risk Assessment keeps its real identity — that is
    // what keeps the analytics competency map meaningful for this simulation.
    expect(mockCreateCompetency).toHaveBeenCalledTimes(1);
    expect(selectionIds()).toEqual(["c-custom", "c-risk"]);
  });

  it("drops a competency from the selection when its rows are removed entirely", async () => {
    render(<Harness />);
    await act(async () => {
      form.reset({
        competency: COMPETENCIES[0],
        competencies: COMPETENCIES,
        behaviorInstructions: [...rubricRows("c-listen"), ...rubricRows("c-risk")].map(
          (row, index) => ({ ...row, id: `row-${index}` }),
        ),
      });
    });
    await runSyncDebounce();

    // Removing both of Active Listening's rows means "this simulation no
    // longer assesses it" — not "fork it into an empty custom".
    await act(async () => {
      form.setValue(
        "behaviorInstructions",
        rubricRows("c-risk").map((row, index) => ({ ...row, id: `row-${index}` })),
        { shouldDirty: true },
      );
    });
    await runSyncDebounce();

    expect(mockCreateCompetency).not.toHaveBeenCalled();
    expect(selectionIds()).toEqual(["c-risk"]);
  });

  it("still forks a single hand-edited competency into a custom", async () => {
    render(<Harness />);
    await act(async () => {
      form.reset({
        competency: COMPETENCIES[0],
        competencies: [COMPETENCIES[0]],
        behaviorInstructions: rubricRows("c-listen"),
      });
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

describe("Competency — clusters", () => {
  // Scoped to inside the open dropdown: once the cluster is selected the
  // TRIGGER also reads "Core Communication" and carries cursor-pointer, so an
  // unscoped query finds the trigger first and merely closes the list.
  const clusterRow = () => {
    const list = document.querySelector(".shadow-lg")!;
    return [...list.querySelectorAll("div")].find(d =>
      d.textContent?.startsWith("Core Communication"),
    )!;
  };

  it("applies every competency in a cluster as one unit", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    fireEvent.click(clusterRow());
    await flush();

    expect(selectionIds().sort()).toEqual(["c-listen", "c-risk"]);
    // The trigger names what the author picked, not a count.
    expect(triggerLabel()).toBe("Core Communication");
  });

  it("gives each competency in the cluster its own “should do”/“should not do” pair", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    fireEvent.click(clusterRow());
    await flush();

    const rows = form.getValues("behaviorInstructions") as {
      category: string;
      competencyId: string;
    }[];
    expect(rows).toHaveLength(4);
    expect(rows.filter(row => row.competencyId === "c-listen").map(row => row.category)).toEqual([
      "SHOULD_DO",
      "SHOULD_NOT_DO",
    ]);
    expect(rows.filter(row => row.competencyId === "c-risk").map(row => row.category)).toEqual([
      "SHOULD_DO",
      "SHOULD_NOT_DO",
    ]);
  });

  it("still offers a clustered competency on its own while its cluster is unselected", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    // c-listen belongs to Core Communication, and is selectable by itself.
    fireEvent.click(option("Active Listening"));
    await flush();

    expect(selectionIds()).toEqual(["c-listen"]);
    expect(triggerLabel()).toBe("Active Listening");
  });

  it("stops offering a competency once its cluster has applied it", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    fireEvent.click(clusterRow());
    await flush();

    // Clicking the now-covered member is inert — it is already applied, so
    // selecting it again would mean nothing, and it must not toggle it OFF.
    fireEvent.click(option("Active Listening"));
    await flush();

    expect(selectionIds().sort()).toEqual(["c-listen", "c-risk"]);
  });

  it("re-offers the competencies when the cluster is deselected", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    fireEvent.click(clusterRow());
    await flush();
    fireEvent.click(clusterRow());
    await flush();

    expect(selectionIds()).toEqual([]);
    // Individually selectable again.
    fireEvent.click(option("Active Listening"));
    await flush();
    expect(selectionIds()).toEqual(["c-listen"]);
  });

  it("names both parts when a cluster and a loose competency are mixed", async () => {
    render(<Harness />);
    await runSyncDebounce();

    openDropdown();
    fireEvent.click(option("Risk Assessment"));
    await flush();
    fireEvent.click(clusterRow());
    await flush();

    // Risk Assessment is inside the cluster too, so the cluster completes the
    // set rather than adding a separate part.
    expect(selectionIds().sort()).toEqual(["c-listen", "c-risk"]);
    expect(triggerLabel()).toBe("Core Communication");
  });
});
