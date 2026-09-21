import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

// `@constants` first: the admin app's barrel does module-load-time work, and a
// mock registered after another import that pulls it in arrives too late.
import "@constants";

const mockUseGetAiTasksQuery = vi.fn();

// Partial mock: the admin store imports `baseAPI` from this barrel at module
// load, so replacing it wholesale takes the store down with it.
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useGetAiTasksQuery: () => mockUseGetAiTasksQuery(),
}));

import { AiTasks } from "../AiTasks";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "autofill-field",
  task: "autofill_field",
  runtime: "ally-be",
  trigger: "An author clicks Generate on a simulation field",
  detail: null,
  hotPath: false,
  kind: "completion",
  provider: "openai",
  defaultModel: "gpt-5-mini",
  effectiveModel: "gpt-5-mini",
  modelSource: "deployment",
  configuredBy: "OPENAI_AUTOFILL_MODEL",
  ...overrides,
});

const withRows = (data: unknown[], extra: Record<string, unknown> = {}) =>
  mockUseGetAiTasksQuery.mockReturnValue({
    data,
    isFetching: false,
    isError: false,
    ...extra,
  });

describe("AiTasks", () => {
  beforeEach(() => {
    mockUseGetAiTasksQuery.mockReset();
  });

  it("summarises how many calls are registered and how many are hot-path", () => {
    withRows([row(), row({ id: "agent-turn", hotPath: true, trigger: "Learner speaks" })]);
    render(<AiTasks />);

    expect(screen.getByText(/2 of 2 calls/)).toBeInTheDocument();
    expect(screen.getByText(/1 on the live voice path/)).toBeInTheDocument();
  });

  it("says so when a search matches nothing, rather than showing a bare table", async () => {
    withRows([row()]);
    render(<AiTasks />);

    await userEvent.type(
      screen.getByPlaceholderText("Search by action, model or env var..."),
      "nothing-matches-this",
    );

    expect(screen.getByText("No AI tasks match this search.")).toBeInTheDocument();
  });

  it("distinguishes an empty registry from a failed load", () => {
    withRows([]);
    const { unmount } = render(<AiTasks />);
    expect(screen.getByText("No AI tasks are registered.")).toBeInTheDocument();
    unmount();

    withRows([], { isError: true });
    render(<AiTasks />);
    expect(screen.getByText(/Could not load the AI task registry/)).toBeInTheDocument();
  });

  it("explains that a model can still be overridden downstream", () => {
    // The screen is read as authoritative, so the four-layer resolution has to
    // be on the page — not only in the doc nobody opens.
    withRows([row()]);
    render(<AiTasks />);

    expect(screen.getByText(/overridden per language/)).toBeInTheDocument();
  });
});
