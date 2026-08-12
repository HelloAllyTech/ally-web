import React from "react";

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WaUnansweredReason, WaUnansweredStatus } from "@types";

/**
 * Two properties worth pinning here.
 *
 * The queue must default to OPEN. It is a worklist; showing resolved items by default would bury the
 * questions that still need a decision under every one already handled.
 *
 * And a row must show BOTH the best similarity and the hit count. Those two numbers distinguish the
 * two different fixes: 0.41 over four hits is a threshold that is too strict, while nothing over zero
 * hits is material the corpus does not have. Either number alone cannot tell them apart.
 */

vi.mock("@constants", () => ({
  TooltipLocation: { WA_UNANSWERED_REASON: "a", WA_UNANSWERED_SCORE: "b" },
  en: {
    common: { loading: "Loading…" },
    whatsappBot: {
      corpus: { previousPage: "Previous", nextPage: "Next" },
      unanswered: {
        subtitle: "Questions the corpus could not answer.",
        reasonHelp: "Bulk below-threshold means the threshold is too high.",
        columnQuestion: "Question",
        columnReason: "Why",
        columnScore: "Best match",
        columnAsked: "Asked",
        reason: {
          no_hits: "Nothing found",
          below_threshold: "Below the threshold",
          model_declined: "Passages were not enough",
          error: "Something failed",
        },
        status: {
          open: "Open",
          triaged: "Triaged",
          answered: "Answered",
          dismissed: "Dismissed",
        },
        markTriaged: "Mark triaged",
        markAnswered: "Mark answered",
        dismiss: "Dismiss",
        updated: "Updated",
        updateFailed: "Could not update",
        empty: "Nothing unanswered",
        emptySubtitle: "The corpus is covering what people ask.",
        loadError: "Could not load the queue.",
        statusFilter: "Status",
        anyReason: "Any",
        answerHeading: "Answer this question",
      },
    },
  },
}));

const listSpy = vi.fn();

vi.mock("@api", () => ({
  useGetWaUnansweredQuery: (params: unknown) => {
    listSpy(params);
    return mockQueryResult;
  },
  useUpdateWaUnansweredMutation: () => [vi.fn(), { isLoading: false }],
  useCreateDocumentFromWaUnansweredMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({
  EmptyState: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
  EntityTable: ({
    rows,
    columns,
    actions,
  }: {
    rows: { id: string }[];
    columns: { key: string; render?: (row: unknown) => React.ReactNode }[];
    actions?: { key: string; hidden?: (row: unknown) => boolean }[];
  }) => (
    <table>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} data-testid="row">
            {columns.map(col => (
              <td key={col.key}>{col.render ? col.render(row) : null}</td>
            ))}
            <td data-testid="actions">
              {(actions ?? [])
                .filter(action => !action.hidden?.(row))
                .map(action => action.key)
                .join(",")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  EntityField: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  EntitySidePanel: () => null,
  ListPagination: () => <div data-testid="pagination" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div role="alert">{title}</div>,
  AutoExpandableTextarea: () => null,
  TextInput: () => null,
  SkeletonText: () => <div data-testid="skeleton" />,
  Tag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  CarbonDropdown: ({ titleText }: { titleText: string }) => <div>{titleText}</div>,
}));

vi.mock("@icons", () => ({
  Cancel: () => <span />,
  Chat: () => <span />,
  Document: () => <span />,
  Tick: () => <span />,
}));

vi.mock("@components/app-tooltip", () => ({
  AppTooltip: ({ children }: { children?: React.ReactNode }) => children,
  TooltipHint: () => null,
}));

vi.mock("@utils", () => ({
  formatDate: (v: string) => v,
  formatRelativeTime: () => "2d ago",
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let mockQueryResult: {
  data?: { questions: unknown[]; count: number };
  isLoading: boolean;
  isError: boolean;
};

const question = (over: Record<string, unknown> = {}) => ({
  id: "q-1",
  messageId: "m-1",
  conversationId: "conv-1",
  questionText: "How do I assess suicide risk over the phone?",
  language: "en",
  reason: WaUnansweredReason.BELOW_THRESHOLD,
  topSimilarity: "0.4123",
  hitCount: 4,
  status: WaUnansweredStatus.OPEN,
  assignedTo: null,
  resolutionNote: null,
  linkedDocumentId: null,
  createdAt: "2026-08-02T00:00:00Z",
  ...over,
});

const { UnansweredTab } = await import("../UnansweredTab");

// A real router: the queue now links out to the conversation a gap came from, via search params.
const renderTab = () =>
  render(
    <MemoryRouter>
      <UnansweredTab />
    </MemoryRouter>,
  );

describe("UnansweredTab", () => {
  beforeEach(() => {
    listSpy.mockClear();
    mockQueryResult = { data: { questions: [], count: 0 }, isLoading: false, isError: false };
  });

  describe("default filter", () => {
    it("asks for open questions only", () => {
      renderTab();

      const params = listSpy.mock.calls[0]?.[0] as { status?: string; reason?: string };
      expect(params.status).toBe(WaUnansweredStatus.OPEN);
      // No reason filter by default: pre-filtering to one failure mode would hide the distribution,
      // which is the thing that tells an operator which fix to apply.
      expect(params.reason).toBeUndefined();
    });
  });

  describe("row detail", () => {
    it("shows the best similarity together with the hit count", () => {
      mockQueryResult.data = { questions: [question()], count: 1 };

      renderTab();

      expect(screen.getByText("0.41 / 4")).toBeTruthy();
    });

    it("shows a dash when nothing was retrieved at all", () => {
      mockQueryResult.data = {
        questions: [
          question({ reason: WaUnansweredReason.NO_HITS, topSimilarity: null, hitCount: 0 }),
        ],
        count: 1,
      };

      renderTab();

      // Scoped to the row: the reason labels also populate the filter dropdown, so an unscoped
      // query matches the <option> too.
      const row = within(screen.getByTestId("row"));
      expect(row.getByText("—")).toBeTruthy();
      expect(row.getByText("Nothing found")).toBeTruthy();
    });
  });

  describe("actions", () => {
    it("offers triage only while a question is still open", () => {
      mockQueryResult.data = {
        questions: [
          question({ id: "a", status: WaUnansweredStatus.OPEN }),
          question({ id: "b", status: WaUnansweredStatus.TRIAGED }),
        ],
        count: 2,
      };

      renderTab();

      const [open, triaged] = screen.getAllByTestId("actions");
      expect(open.textContent).toContain("triage");
      expect(triaged.textContent).not.toContain("triage");
    });

    it("does not offer dismiss on an already-resolved question", () => {
      mockQueryResult.data = {
        questions: [question({ status: WaUnansweredStatus.ANSWERED })],
        count: 1,
      };

      renderTab();

      expect(screen.getByTestId("actions").textContent).not.toContain("dismiss");
    });

    it("always offers the answer action, which is the point of the queue", () => {
      mockQueryResult.data = { questions: [question()], count: 1 };

      renderTab();

      expect(screen.getByTestId("actions").textContent).toContain("answer");
    });
  });

  describe("empty and failure states", () => {
    it("says the corpus is covering things rather than showing an error", () => {
      renderTab();
      expect(screen.getByText("Nothing unanswered")).toBeTruthy();
    });

    it("shows an error banner rather than an empty queue", () => {
      mockQueryResult.isError = true;
      mockQueryResult.data = undefined;

      renderTab();

      expect(screen.getByRole("alert").textContent).toContain("Could not load the queue.");
      expect(screen.queryByText("Nothing unanswered")).toBeNull();
    });
  });
});
