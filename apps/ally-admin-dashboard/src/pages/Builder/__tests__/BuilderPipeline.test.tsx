import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  CarbonDropdown: ({ items, selectedItem, onChange, titleText }: any) => (
    <select
      aria-label={titleText}
      value={selectedItem?.id}
      onChange={event =>
        onChange({ selectedItem: items.find((i: any) => String(i.id) === event.target.value) })
      }
    >
      {items.map((item: any) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  ),
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Tag: ({ children, type }: any) => <span data-tag-type={type}>{children}</span>,
}));

// `src/utils/index.ts` pulls in loggerWithRedux, which builds the real store,
// which wants the real `@api`. Stubbed here — as the sibling Builder page tests
// do — so the module graph under test stays the page itself.
vi.mock("@utils", () => ({}));
vi.mock("@components", () => ({ cellTypes: {} }));

let healthResult: any;
let lastQueryArgs: any;
const refetch = vi.fn();

vi.mock("@api", () => ({
  useGetBuilderPipelineHealthQuery: (args: any) => {
    lastQueryArgs = args;
    return healthResult;
  },
}));

// eslint-disable-next-line import/first
import { BuilderPipeline } from "../BuilderPipeline";

const baseData = {
  windowDays: 30,
  phases: [
    {
      phase: "code-1",
      model: "claude-sonnet-5",
      invocations: 2,
      totalCostUsd: 8.92,
      medianCostUsd: 4.46,
      medianWallMs: 2_008_802,
      p95WallMs: 2_008_802,
      medianApiMs: 775_569,
      medianTurns: 148,
    },
    {
      // A run from before the runner reported timings: cost, no clock.
      phase: "plan",
      model: "claude-opus-5",
      invocations: 1,
      totalCostUsd: 2,
      medianCostUsd: 2,
      medianWallMs: null,
      p95WallMs: null,
      medianApiMs: null,
      medianTurns: null,
    },
  ],
  gates: [
    { repo: "ally-be", kind: "test", results: 2, passed: 1, passRate: 0.5 },
    { repo: "ally-web", kind: "lint", results: 0, passed: 0, passRate: null },
  ],
  outcomes: [
    { status: "FAILED", mode: "build", runs: 1, medianRunnerMinutes: 0 },
    { status: "SUCCEEDED", mode: "build", runs: 1, medianRunnerMinutes: 18 },
  ],
};

describe("BuilderPipeline", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    refetch.mockClear();
    lastQueryArgs = undefined;
    healthResult = { data: baseData, isLoading: false, isError: false, refetch };
  });

  it("shows an empty state when nothing has finished in the window", () => {
    healthResult = {
      data: { windowDays: 30, phases: [], gates: [], outcomes: [] },
      isLoading: false,
      isError: false,
      refetch,
    };
    render(<BuilderPipeline />);
    expect(screen.getByText("No finished runs in this window yet.")).toBeInTheDocument();
  });

  it("offers a retry when the load fails", () => {
    healthResult = { data: undefined, isLoading: false, isError: true, refetch };
    render(<BuilderPipeline />);
    expect(screen.getByText("Couldn't load the pipeline view.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders a measured phase's clock and an unmeasured one as a dash", () => {
    render(<BuilderPipeline />);

    // Measured.
    expect(screen.getAllByText("33m 29s").length).toBeGreaterThan(0);
    expect(screen.getByText("148")).toBeInTheDocument();

    // Unmeasured — and critically NOT "0s". The plan row still shows its cost,
    // so this proves the dash is about the missing clock, not a missing row.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    // Twice: the plan phase's total and its median are both $2.00.
    expect(screen.getAllByText("$2.00")).toHaveLength(2);
    expect(screen.queryByText("0s")).not.toBeInTheDocument();
    expect(screen.queryByText("0ms")).not.toBeInTheDocument();
  });

  it("shows the model-versus-tools split for a measured phase only", () => {
    render(<BuilderPipeline />);
    // 775569 / 2008802 = 39%.
    expect(
      screen.getByLabelText("39% waiting on the model, 61% running its tools"),
    ).toBeInTheDocument();
  });

  it("distinguishes a failed gate from one with no evidence", () => {
    render(<BuilderPipeline />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    // ally-web lint has zero results — that is not a 0% pass rate.
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("tags a failed run differently from a succeeded one", () => {
    render(<BuilderPipeline />);
    expect(screen.getByText("FAILED").getAttribute("data-tag-type")).toBe("red");
    expect(screen.getByText("SUCCEEDED").getAttribute("data-tag-type")).toBe("green");
  });

  it("refetches on a new window", () => {
    render(<BuilderPipeline />);
    expect(lastQueryArgs).toEqual({ windowDays: 30 });
    fireEvent.change(screen.getByLabelText("Window"), { target: { value: "7" } });
    expect(lastQueryArgs).toEqual({ windowDays: 7 });
  });
});
