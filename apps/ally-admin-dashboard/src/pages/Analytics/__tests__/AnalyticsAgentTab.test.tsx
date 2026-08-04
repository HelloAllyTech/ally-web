import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Carbon charts draw through d3, which captures `requestAnimationFrame` at import
 * time and then reaches into SVG geometry jsdom does not implement. Hoisted stub,
 * for the same reason the sibling chart-render test hoists one: a `beforeAll`
 * runs after d3 has already taken its copy.
 */
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const askMock = vi.fn();

// Partial mock: the store wires every other slice off `@api`, so replacing the
// whole module would take the app's store down with it. Only the two hooks this
// tab calls are stubbed.
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<typeof import("@api")>()),
  useAskAnalyticsAgentMutation: () => [askMock, { isLoading: false }],
  useGetAnalyticsAgentCatalogQuery: () => ({
    data: {
      tables: [
        { name: "scenario_sessions", purpose: "One simulated roleplay run.", columns: ["id"] },
      ],
      deniedColumns: ["password", "email"],
      rowLimit: 500,
    },
    isLoading: false,
    isError: false,
  }),
}));

import { en } from "@constants";
import { AskAnalyticsAgentResponse } from "@types";

import { AnalyticsAgentTab } from "../tabs/AnalyticsAgentTab";

const strings = en.analyticsAgent;

const response = (
  overrides: Partial<AskAnalyticsAgentResponse> = {},
): AskAnalyticsAgentResponse => ({
  outcome: "answer",
  question: "How many sessions last week?",
  message: "",
  answer: "There were **412** sessions last week.",
  sql: "SELECT count(*) AS n FROM scenario_sessions LIMIT 1",
  rationale: "Counts sessions started in the last 7 days.",
  columns: ["n"],
  rows: [{ n: 412 }],
  rowCount: 1,
  truncated: false,
  chart: null,
  caveats: [],
  followUps: [],
  durationMs: 31,
  provenance: { plannerModel: "planner-x", answerModel: "answer-y", promptVersion: "v1" },
  ...overrides,
});

/** Resolve `ask(...)` the way RTK Query's mutation trigger does. */
const resolveWith = (value: AskAnalyticsAgentResponse) =>
  askMock.mockReturnValue({ unwrap: () => Promise.resolve(value) });

const rejectWith = (error: unknown) =>
  askMock.mockReturnValue({ unwrap: () => Promise.reject(error) });

/**
 * Wait for an answered turn to land.
 *
 * Deliberately not "wait for the number": a figure in the answer prose also
 * appears in the result table below it, so matching on it is ambiguous — which is
 * the app being right and the assertion being lazy.
 */
const answered = async () =>
  waitFor(() => expect(screen.getAllByText(strings.showQuery).length).toBeGreaterThan(0));

const ask = async (question: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText(strings.inputPlaceholder), question);
  await user.click(screen.getByRole("button", { name: strings.send }));
  return user;
};

describe("AnalyticsAgentTab", () => {
  beforeEach(() => {
    askMock.mockReset();
  });

  it("teaches what it can do before the first question", () => {
    render(<AnalyticsAgentTab />);

    expect(screen.getByText(strings.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(strings.emptySubtitle)).toBeInTheDocument();
    // Sample questions are the fastest way to learn what is answerable.
    expect(screen.getByRole("button", { name: strings.samples[0] })).toBeInTheDocument();
  });

  it("states what is readable, and the policy on what never is", () => {
    render(<AnalyticsAgentTab />);

    expect(screen.getByText("scenario_sessions")).toBeInTheDocument();
    expect(screen.getByText(strings.scopeDeniedIntro)).toBeInTheDocument();
  });

  it("shows the question and then the answer, with the SQL available", async () => {
    resolveWith(response());
    render(<AnalyticsAgentTab />);

    await ask("How many sessions last week?");

    // The question stays on screen — a thread, not a single-shot box.
    expect(screen.getByText("How many sessions last week?")).toBeInTheDocument();
    await answered();
    // The answer prose is rendered from markdown. Matched on wording the
    // question does not share, so this cannot pass by finding the question.
    expect(screen.getByText(/There were/)).toBeInTheDocument();
    // ...and the figure appears twice on purpose: in the prose and in the table
    // of rows underneath it.
    expect(screen.getAllByText(/412/).length).toBeGreaterThanOrEqual(2);
    // The SQL is one click away, so the number is checkable without leaving.
    expect(screen.getByText(strings.showQuery)).toBeInTheDocument();
  });

  it("names the models that produced the answer", async () => {
    resolveWith(response());
    render(<AnalyticsAgentTab />);

    await ask("q");

    await waitFor(() => expect(screen.getByText(/planner-x/)).toBeInTheDocument());
    expect(screen.getByText(/answer-y/)).toBeInTheDocument();
  });

  it("renders caveats next to the answer rather than hiding them", async () => {
    resolveWith(response({ caveats: ["Only 7 evaluated sessions in this period."] }));
    render(<AnalyticsAgentTab />);

    await ask("q");

    await waitFor(() =>
      expect(screen.getByText("Only 7 evaluated sessions in this period.")).toBeInTheDocument(),
    );
    expect(screen.getByText(strings.caveatsTitle)).toBeInTheDocument();
  });

  it("says so when the result was capped, where the numbers are", async () => {
    resolveWith(
      response({
        columns: ["org", "n"],
        rows: Array.from({ length: 500 }, (_, i) => ({ org: `org-${i}`, n: i })),
        rowCount: 500,
        truncated: true,
      }),
    );
    render(<AnalyticsAgentTab />);

    await ask("every org");

    await waitFor(() => expect(screen.getByText(/the full result is larger/)).toBeInTheDocument());
  });

  it("treats a clarifying question as information, not an error", async () => {
    resolveWith(
      response({ outcome: "clarify", answer: "", message: "Which period did you mean?" }),
    );
    render(<AnalyticsAgentTab />);

    await ask("how are we doing?");

    await waitFor(() => expect(screen.getByText(strings.clarifyTitle)).toBeInTheDocument());
    expect(screen.getByText("Which period did you mean?")).toBeInTheDocument();
  });

  it("shows the refused SQL, so a rejection can be understood", async () => {
    resolveWith(
      response({
        outcome: "rejected",
        answer: "",
        message: 'I could not run that safely: the query referenced "email".',
        sql: "SELECT email FROM users LIMIT 10",
        rows: [],
        rowCount: 0,
        columns: [],
      }),
    );
    render(<AnalyticsAgentTab />);

    await ask("list emails");

    await waitFor(() => expect(screen.getByText(strings.rejectedTitle)).toBeInTheDocument());
    expect(screen.getByText(strings.showQuery)).toBeInTheDocument();
  });

  it("keeps a failed turn in the thread instead of a toast that vanishes", async () => {
    rejectWith(new Error("network down"));
    render(<AnalyticsAgentTab />);

    await ask("anything");

    await waitFor(() => expect(screen.getByText(strings.requestFailed)).toBeInTheDocument());
    // The question is still there to retype or narrow.
    expect(screen.getByText("anything")).toBeInTheDocument();
  });

  it("sends prior answered turns as context, so a follow-up resolves", async () => {
    resolveWith(response());
    render(<AnalyticsAgentTab />);

    await ask("How many sessions last week?");
    await answered();

    resolveWith(response({ question: "and by language?", answer: "English leads." }));
    await ask("and by language?");

    await waitFor(() => expect(askMock).toHaveBeenCalledTimes(2));
    const secondCall = askMock.mock.calls[1][0];
    expect(secondCall.question).toBe("and by language?");
    expect(secondCall.history).toHaveLength(1);
    expect(secondCall.history[0].question).toBe("How many sessions last week?");
    expect(secondCall.history[0].sql).toContain("scenario_sessions");
  });

  it("does not send a failed turn as context", async () => {
    // Replaying a failure would teach the planner to repeat it.
    rejectWith(new Error("network down"));
    render(<AnalyticsAgentTab />);
    await ask("first");
    await waitFor(() => expect(screen.getByText(strings.requestFailed)).toBeInTheDocument());

    resolveWith(response());
    await ask("second");

    await waitFor(() => expect(askMock).toHaveBeenCalledTimes(2));
    expect(askMock.mock.calls[1][0].history).toEqual([]);
  });

  it("asks a suggested follow-up on one click", async () => {
    resolveWith(response({ followUps: ["And by organisation?"] }));
    render(<AnalyticsAgentTab />);

    await ask("sessions?");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "And by organisation?" })).toBeInTheDocument(),
    );

    resolveWith(response({ question: "And by organisation?" }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "And by organisation?" }));

    await waitFor(() => expect(askMock).toHaveBeenCalledTimes(2));
    expect(askMock.mock.calls[1][0].question).toBe("And by organisation?");
  });

  it("confirms before resetting, because the thread lives only in this tab", async () => {
    resolveWith(response());
    render(<AnalyticsAgentTab />);
    await ask("How many sessions last week?");
    await answered();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: strings.reset }));
    expect(screen.getByText(strings.resetConfirmBody)).toBeInTheDocument();

    // The thread is still there until the reset is confirmed.
    expect(screen.getByText("How many sessions last week?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: strings.resetConfirm }));

    await waitFor(() =>
      expect(screen.queryByText("How many sessions last week?")).not.toBeInTheDocument(),
    );
    // Back to the state that teaches.
    expect(screen.getByText(strings.emptyTitle)).toBeInTheDocument();
  });

  it("drops the history along with the thread when reset", async () => {
    resolveWith(response());
    render(<AnalyticsAgentTab />);
    await ask("first question");
    await answered();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: strings.reset }));
    await user.click(screen.getByRole("button", { name: strings.resetConfirm }));

    resolveWith(response());
    await ask("fresh question");

    await waitFor(() => expect(askMock).toHaveBeenCalledTimes(2));
    expect(askMock.mock.calls[1][0].history).toEqual([]);
  });

  it("cannot be reset mid-question", async () => {
    render(<AnalyticsAgentTab />);
    // Nothing asked yet: there is no thread to reset.
    expect(screen.getByRole("button", { name: strings.reset })).toBeDisabled();
  });

  it("says the query matched nothing rather than showing an empty table", async () => {
    resolveWith(
      response({
        answer: "No sessions were completed in that period.",
        columns: [],
        rows: [],
        rowCount: 0,
      }),
    );
    render(<AnalyticsAgentTab />);

    await ask("sessions in 2019?");

    await waitFor(() => expect(screen.getByText(strings.emptyResult)).toBeInTheDocument());
  });
});
