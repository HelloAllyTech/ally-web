import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const generateMock = vi.fn();
const acceptMock = vi.fn();
const rejectMock = vi.fn();
const refetchMock = vi.fn();
const duplicatesMock = vi.fn();

// Partial mock: the store wires every other slice off `@api`, so replacing the
// whole module would take the app's store down with it. Only the hooks this tab
// and its dialogs call are stubbed. No rAF stub is needed — nothing here mounts a
// Carbon chart.
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<typeof import("@api")>()),
  useGetAnalyticsSuggestionsQuery: (args: { status?: string }) => listMock(args),
  useGenerateAnalyticsSuggestionsMutation: () => [generateMock, { isLoading: false }],
  useAcceptAnalyticsSuggestionMutation: () => [acceptMock, { isLoading: false }],
  useRejectAnalyticsSuggestionMutation: () => [rejectMock, { isLoading: false }],
  useGetRoadmapProductGoalsQuery: () => ({
    data: [
      { id: "g1", name: "Engagement & Usability", position: 0 },
      { id: "g2", name: "Reliability & Trust", position: 1 },
    ],
    isLoading: false,
    isError: false,
  }),
  useRoadmapAiDuplicatesMutation: () => [duplicatesMock, { isLoading: false }],
}));

import { en } from "@constants";
import {
  AnalyticsSuggestion,
  AnalyticsSuggestionStatus,
  RoadmapOpportunityType,
} from "@types";

import { SuggestionsTab } from "../tabs/suggestions/SuggestionsTab";

const strings = en.analyticsSuggestions;

const suggestion = (overrides: Partial<AnalyticsSuggestion> = {}): AnalyticsSuggestion => ({
  id: "sug-1",
  batchId: "batch-1",
  title: "Learners stall after their first session",
  body: "Most learners who finish one roleplay never start a second.",
  rationale: "The activation funnel drops 70% between session one and two.",
  evidence: ["1,200 learners completed one session; 340 completed two"],
  suggestedGoal: "Engagement & Usability",
  suggestedType: RoadmapOpportunityType.IDEA,
  status: AnalyticsSuggestionStatus.PENDING,
  rejectedReason: null,
  opportunityId: null,
  window: { range: "30d", from: "2026-07-01", to: "2026-07-30", label: "Last 30 days" },
  model: "claude-test",
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
  ...overrides,
});

const listReturns = (items: AnalyticsSuggestion[], extra: Record<string, unknown> = {}) =>
  listMock.mockReturnValue({
    data: { items, count: items.length },
    isLoading: false,
    isError: false,
    refetch: refetchMock,
    ...extra,
  });

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

describe("SuggestionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listReturns([]);
    duplicatesMock.mockReturnValue({ unwrap: () => Promise.resolve({ matches: [] }) });
  });

  it("teaches what Generate does before anything has been generated", () => {
    render(<SuggestionsTab />);

    expect(screen.getByText(strings.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(strings.emptySubtitle)).toBeInTheDocument();
  });

  it("defaults to the pending queue", () => {
    render(<SuggestionsTab />);

    expect(listMock).toHaveBeenCalledWith({ status: AnalyticsSuggestionStatus.PENDING });
  });

  it("renders a card with its window and model as provenance", () => {
    listReturns([suggestion()]);
    render(<SuggestionsTab />);

    expect(screen.getByText("Learners stall after their first session")).toBeInTheDocument();
    expect(
      screen.getByText(fill(strings.provenance, { window: "Last 30 days", model: "claude-test" })),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1,200 learners completed one session; 340 completed two"),
    ).toBeInTheDocument();
  });

  it("groups cards under the batch's window and generated date", () => {
    listReturns([
      suggestion({ id: "a", batchId: "batch-1" }),
      suggestion({ id: "b", batchId: "batch-1", title: "Second in batch one" }),
      suggestion({
        id: "c",
        batchId: "batch-2",
        title: "From an older run",
        window: { range: null, from: "2026-01-01", to: "2026-03-31", label: "2026-01-01 → 2026-03-31" },
      }),
    ]);
    render(<SuggestionsTab />);

    const headings = screen.getAllByRole("heading", { level: 4 });
    const batchHeadings = headings.filter(h => h.textContent?.includes("generated"));
    expect(batchHeadings).toHaveLength(2);
    expect(batchHeadings[0].textContent).toContain("Last 30 days");
    expect(batchHeadings[1].textContent).toContain("2026-01-01 → 2026-03-31");
  });

  it("says so when the model's goal was not a live one", () => {
    listReturns([suggestion({ suggestedGoal: null })]);
    render(<SuggestionsTab />);

    expect(screen.getByText(strings.noGoalMatched)).toBeInTheDocument();
  });

  it("shows the recorded reason on a rejected card", () => {
    listReturns([
      suggestion({
        status: AnalyticsSuggestionStatus.REJECTED,
        rejectedReason: "Already covered by the tracks work",
      }),
    ]);
    render(<SuggestionsTab />);

    expect(
      screen.getByText(
        fill(strings.rejectedBecause, { reason: "Already covered by the tracks work" }),
      ),
    ).toBeInTheDocument();
    // A decided card offers no decision.
    expect(screen.queryByRole("button", { name: strings.accept })).not.toBeInTheDocument();
  });

  it("links an accepted card to the roadmap, and says so when the item is gone", () => {
    listReturns([
      suggestion({ status: AnalyticsSuggestionStatus.ACCEPTED, opportunityId: "opp-9" }),
    ]);
    const { unmount } = render(<SuggestionsTab />);
    expect(screen.getByText(strings.viewOnRoadmap)).toHaveAttribute(
      "href",
      "/product-roadmap?opportunity=opp-9",
    );
    unmount();

    listReturns([
      suggestion({ status: AnalyticsSuggestionStatus.ACCEPTED, opportunityId: null }),
    ]);
    render(<SuggestionsTab />);
    expect(screen.getByText(strings.opportunityGone)).toBeInTheDocument();
  });

  it("keeps a load failure on screen with a retry", async () => {
    listMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchMock,
    });
    render(<SuggestionsTab />);

    expect(screen.getByText(strings.loadFailed)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: strings.retry }));
    expect(refetchMock).toHaveBeenCalled();
  });

  describe("generate", () => {
    const openGenerate = async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: strings.generate }));
      return user;
    };

    it("sends the chosen preset", async () => {
      generateMock.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            batchId: "batch-9",
            window: { range: "90d", from: "2026-05-03", to: "2026-07-31", label: "Last 90 days" },
            model: "claude-test",
            suggestions: [suggestion({ batchId: "batch-9" })],
            sections: { included: ["platformOverview"], failed: [] },
          }),
      });
      render(<SuggestionsTab />);
      const user = await openGenerate();

      await user.click(screen.getByLabelText(strings.period90d));
      await user.click(screen.getByRole("button", { name: strings.generateSubmit }));

      await waitFor(() => expect(generateMock).toHaveBeenCalledWith({ range: "90d" }));
    });

    it("blocks a custom range that has only one date", async () => {
      render(<SuggestionsTab />);
      const user = await openGenerate();

      await user.click(screen.getByLabelText(strings.periodCustom));

      expect(screen.getByText(strings.customIncomplete)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: strings.generateSubmit })).toBeDisabled();
      expect(generateMock).not.toHaveBeenCalled();
    });

    it("keeps a failed run's explanation inside the dialog", async () => {
      generateMock.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: "The model was unreachable." } }),
      });
      render(<SuggestionsTab />);
      const user = await openGenerate();

      await user.click(screen.getByRole("button", { name: strings.generateSubmit }));

      await waitFor(() =>
        expect(screen.getByText("The model was unreachable.")).toBeInTheDocument(),
      );
      // Still open, so the reader can pick a different window and retry.
      expect(screen.getByRole("button", { name: strings.generateSubmit })).toBeInTheDocument();
    });

    it("reports the sections the run could not read", async () => {
      generateMock.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            batchId: "batch-9",
            window: { range: "30d", from: "2026-07-01", to: "2026-07-30", label: "Last 30 days" },
            model: "claude-test",
            suggestions: [suggestion()],
            sections: {
              included: ["platformOverview"],
              failed: ["scribeOverview: query failed"],
            },
          }),
      });
      render(<SuggestionsTab />);
      const user = await openGenerate();

      await user.click(screen.getByRole("button", { name: strings.generateSubmit }));

      await waitFor(() =>
        expect(screen.getByText("scribeOverview: query failed")).toBeInTheDocument(),
      );
      expect(
        screen.getByText(fill(strings.sectionsUnavailable, { count: 1 })),
      ).toBeInTheDocument();
    });

    it("treats a run that proposed nothing as a result, not a failure", async () => {
      generateMock.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            batchId: "batch-9",
            window: { range: "30d", from: "2026-07-01", to: "2026-07-30", label: "Last 30 days" },
            model: "claude-test",
            suggestions: [],
            sections: { included: ["platformOverview"], failed: [] },
          }),
      });
      render(<SuggestionsTab />);
      const user = await openGenerate();

      await user.click(screen.getByRole("button", { name: strings.generateSubmit }));

      // The dialog closes on success even with zero suggestions, and no error shows.
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: strings.generateSubmit }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.queryByText(strings.generateFailed)).not.toBeInTheDocument();
    });
  });

  describe("accept", () => {
    const openAccept = async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: strings.accept }));
      return user;
    };

    it("prefills the model's draft, editably", async () => {
      listReturns([suggestion()]);
      render(<SuggestionsTab />);
      await openAccept();

      expect(screen.getByLabelText(strings.descriptionLabel)).toHaveValue(
        "Most learners who finish one roleplay never start a second.",
      );
      expect(screen.getByLabelText(strings.goalLabel)).toHaveValue("Engagement & Usability");
    });

    it("files the reviewer's edited values, not the model's draft", async () => {
      acceptMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      listReturns([suggestion()]);
      render(<SuggestionsTab />);
      const user = await openAccept();

      const field = screen.getByLabelText(strings.descriptionLabel);
      await user.clear(field);
      await user.type(field, "Reworded before filing");
      await user.selectOptions(screen.getByLabelText(strings.goalLabel), "Reliability & Trust");
      await user.click(screen.getByRole("button", { name: strings.acceptSubmit }));

      await waitFor(() =>
        expect(acceptMock).toHaveBeenCalledWith({
          id: "sug-1",
          body: {
            description: "Reworded before filing",
            productGoal: "Reliability & Trust",
            type: RoadmapOpportunityType.IDEA,
          },
        }),
      );
    });

    it("keeps the form open when the goal is no longer live", async () => {
      acceptMock.mockReturnValue({
        unwrap: () =>
          Promise.reject({
            status: 422,
            data: { message: '"Engagement & Usability" is not a live product goal.' },
          }),
      });
      listReturns([suggestion()]);
      render(<SuggestionsTab />);
      const user = await openAccept();

      await user.click(screen.getByRole("button", { name: strings.acceptSubmit }));

      await waitFor(() =>
        expect(
          screen.getByText('"Engagement & Usability" is not a live product goal.'),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole("button", { name: strings.acceptSubmit })).toBeInTheDocument();
    });
  });

  describe("reject", () => {
    it("submits with no reason when none is given", async () => {
      rejectMock.mockReturnValue({ unwrap: () => Promise.resolve(suggestion()) });
      listReturns([suggestion()]);
      render(<SuggestionsTab />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: strings.reject }));
      await user.click(screen.getByRole("button", { name: strings.rejectSubmit }));

      await waitFor(() =>
        expect(rejectMock).toHaveBeenCalledWith({ id: "sug-1", body: {} }),
      );
    });

    it("passes a typed reason through, trimmed", async () => {
      rejectMock.mockReturnValue({ unwrap: () => Promise.resolve(suggestion()) });
      listReturns([suggestion()]);
      render(<SuggestionsTab />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: strings.reject }));
      await user.type(screen.getByLabelText(strings.reasonLabel), "  Not this year  ");
      await user.click(screen.getByRole("button", { name: strings.rejectSubmit }));

      await waitFor(() =>
        expect(rejectMock).toHaveBeenCalledWith({
          id: "sug-1",
          body: { reason: "Not this year" },
        }),
      );
    });
  });
});
