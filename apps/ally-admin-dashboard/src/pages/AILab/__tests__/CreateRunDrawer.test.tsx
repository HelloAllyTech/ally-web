import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateRun = vi.fn();

// The real @constants barrel pulls in heavy grid/config modules that don't load
// under jsdom, so mock it down to the strings CreateRunDrawer actually reads.
// The factory is hoisted above imports, so the object must be inline here.
vi.mock("@constants", () => ({
  en: {
    common: { cancel: "Cancel" },
    aiLab: {
      runs: {
        drawerTitle: "Create New Run",
        selectSkills: "Select skills",
        selectSkillsHelp: "Pick one or more skills to run.",
        noSkills: "Create a skill first.",
        variablesHeading: "Variable values",
        variablesHelp: "Choose a value for every variable.",
        noVariablesNeeded: "The selected skills use no variables.",
        missingValues: "Some variables have no values yet.",
        matrixSummary: "{runs} run(s) will be created.",
        tooManyRuns: "That's {runs} runs — reduce to {max} or fewer.",
        run: "Run",
        runningProgress: "Running {done} of {total}…",
        validationSkills: "Select at least one skill",
        validationValues: "Select a value for every variable",
        runsComplete: "Run complete",
        runsFailed: "Run failed",
        runsPartial: "{failed} of {total} runs failed",
        failuresTitle: "Some runs didn't complete",
        failuresHelp: "The skills below failed to run.",
        dismissFailures: "Back to form",
        close: "Close",
      },
      values: { noVariables: "No values", variablePlaceholder: "Select a value" },
    },
  },
}));

// Resolves to the mocked module above (vi.mock is hoisted before imports).
import { en } from "@constants";
import { cartesian } from "../CreateRunDrawer";

describe("cartesian", () => {
  it("returns a single empty combo for no variables", () => {
    expect(cartesian([], {})).toEqual([{}]);
  });

  it("expands the product across variables", () => {
    const combos = cartesian(["a", "b"], { a: ["1", "2"], b: ["x"] });
    expect(combos).toEqual([
      { a: "1", b: "x" },
      { a: "2", b: "x" },
    ]);
  });

  it("collapses to zero combos when a variable has no chosen values", () => {
    expect(cartesian(["a", "b"], { a: ["1"], b: [] })).toEqual([]);
  });
});

// One variable-free skill so a run needs only a skill selection (no values).
vi.mock("@api", () => ({
  useGetLabSkillsQuery: () => ({
    data: {
      items: [{ id: "s1", name: "Skill One", content: "hello world", description: "" }],
      count: 1,
    },
  }),
  useGetLabValuesQuery: () => ({ data: { items: [], count: 0 } }),
  useCreateLabRunMutation: () => [mockCreateRun, { isLoading: false }],
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

// Imported after mocks so the component picks up the mocked modules.
import { CreateRunDrawer } from "../CreateRunDrawer";

const selectSkillAndRun = () => {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText(en.aiLab.runs.run));
};

describe("CreateRunDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes and toasts success when every skill run succeeds", async () => {
    mockCreateRun.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const onClose = vi.fn();
    const onComplete = vi.fn();

    render(<CreateRunDrawer isOpen onClose={onClose} onComplete={onComplete} />);
    selectSkillAndRun();

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(onComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText(en.aiLab.runs.failuresTitle)).not.toBeInTheDocument();
  });

  it("surfaces the failing skill and keeps the drawer open on an HTTP error", async () => {
    mockCreateRun.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "boom" } }),
    });
    const onClose = vi.fn();
    const onComplete = vi.fn();

    render(<CreateRunDrawer isOpen onClose={onClose} onComplete={onComplete} />);
    selectSkillAndRun();

    // Failure panel names the skill and the server message; drawer stays open.
    await waitFor(() => expect(screen.getByText(en.aiLab.runs.failuresTitle)).toBeInTheDocument());
    // "Skill One" also appears in the (still-rendered) skill list, so allow >1.
    expect(screen.getAllByText("Skill One").length).toBeGreaterThan(0);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(toastError).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled(); // log still refreshed for any successes
    expect(onClose).not.toHaveBeenCalled();
  });
});
