import React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The load-bearing assertions here are the PHONE-MASKING ones.
 *
 * These rows hold mental healthcare workers' clinical questions next to their phone numbers, and this
 * screen gets screenshotted. So two properties are asserted directly rather than left to a reader's
 * eye: the list renders only the last four digits, and the full number reaches the screen only after
 * an explicit reveal — which must be a mutation, so RTK Query never refetches it on mount or on cache
 * invalidation and quietly re-emits identifiable data nobody asked for.
 */

// Inlined: vi.mock factories are hoisted above module-scope consts.
vi.mock("@constants", () => ({
  TooltipLocation: { WA_REVEAL_PHONE: "wa_reveal_phone", WA_BLOCK_CONTACT: "wa_block_contact" },
  en: {
    common: { cancel: "Cancel", loading: "Loading…" },
    whatsappBot: {
      corpus: { previousPage: "Previous", nextPage: "Next" },
      conversations: {
        subtitle: "What workers asked.",
        searchPlaceholder: "Search message text",
        columnContact: "Contact",
        columnLast: "Last message",
        columnMessages: "Messages",
        columnLanguage: "Language",
        declinedOnly: "Only unanswered",
        reveal: "Reveal number",
        revealed: "Number revealed",
        revealFailed: "Could not reveal",
        block: "Block",
        unblock: "Unblock",
        blocked: "Blocked",
        blockedBadge: "BLOCKED",
        blockConfirmTitle: "Block this number?",
        blockConfirmDescription: "Messages will be dropped.",
        empty: "No conversations yet",
        emptySubtitle: "Threads appear here.",
        emptyFiltered: "No conversations match those filters",
        emptyFilteredSubtitle: "Try a wider range.",
        loadError: "Could not load conversations.",
        threadHeading: "Thread",
        numberEnding: "Phone number ending",
        dateFrom: "From",
        dateTo: "To",
        languageFilter: "Language",
        anyLanguage: "Any language",
        outcomeFilter: "Outcome",
        anyOutcome: "Any outcome",
        clearFilters: "Clear filters",
        handledBy: {},
      },
    },
  },
}));

const revealSpy = vi.fn();
const listQuerySpy = vi.fn();

vi.mock("@api", () => ({
  useGetWaConversationsQuery: (params: unknown) => {
    listQuerySpy(params);
    return mockQueryResult;
  },
  useGetWaConversationLanguagesQuery: () => ({ data: ["en", "hi"] }),
  useRevealWaContactPhoneMutation: () => [revealSpy, { isLoading: false }],
  useBlockWaContactMutation: () => [vi.fn(), { isLoading: false }],
  useUnblockWaContactMutation: () => [vi.fn(), { isLoading: false }],
  useGetWaConversationQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useGetWaCitationQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
  EmptyState: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
  // Renders the real column output, which is what the masking assertions read.
  EntityTable: ({
    rows,
    columns,
    actions,
  }: {
    rows: { id: string }[];
    columns: { key: string; render?: (row: unknown) => React.ReactNode }[];
    actions?: { key: string; hidden?: (row: unknown) => boolean }[];
  }) => {
    capturedColumns = columns;
    return (
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
    );
  },
  ListToolbar: () => <div data-testid="toolbar" />,
  ListPagination: () => <div data-testid="pagination" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div role="alert">{title}</div>,
  SkeletonText: () => <div data-testid="skeleton" />,
  Tag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Checkbox: ({ labelText }: { labelText: string }) => <label>{labelText}</label>,
  CarbonDropdown: ({ titleText }: { titleText: string }) => <div>{titleText}</div>,
  DatePicker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DatePickerInput: ({ labelText }: { labelText: string }) => <label>{labelText}</label>,
}));

vi.mock("@components/app-tooltip", () => ({
  AppTooltip: ({ children }: { children?: React.ReactNode }) => children,
  TooltipHint: () => null,
}));

vi.mock("@icons", () => ({
  Chat: () => <span />,
  Eye: () => <span />,
  Unarchive: () => <span />,
  Unpublish: () => <span />,
  DoubleArrowRight: () => <span />,
}));

vi.mock("@utils", () => ({
  formatDate: (v: string) => v,
  formatRelativeTime: () => "2d ago",
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let capturedColumns: { key: string; sortKey?: string }[] = [];
const lastColumns = () => capturedColumns;

let mockQueryResult: {
  data?: { conversations: unknown[]; count: number };
  isLoading: boolean;
  isError: boolean;
};

const thread = (over: Record<string, unknown> = {}) => ({
  id: "conv-1",
  contactId: "contact-1",
  startedAt: "2026-08-01T00:00:00Z",
  lastMessageAt: "2026-08-02T00:00:00Z",
  messageCount: 4,
  lastLanguage: "hi",
  phoneLast4: "4821",
  consentStatus: "granted",
  blockedAt: null,
  ...over,
});

const { ConversationsTab } = await import("../ConversationsTab");

// A real router rather than a mocked useSearchParams: the open thread is held in the URL now, and a
// stub would assert against the stub instead of the behaviour.
const renderTab = () =>
  render(
    <MemoryRouter>
      <ConversationsTab />
    </MemoryRouter>,
  );

describe("ConversationsTab", () => {
  beforeEach(() => {
    revealSpy.mockReset();
    listQuerySpy.mockClear();
    mockQueryResult = { data: { conversations: [], count: 0 }, isLoading: false, isError: false };
  });

  describe("phone masking", () => {
    it("renders only the last four digits, and announces them as such", () => {
      mockQueryResult.data = { conversations: [thread()], count: 1 };

      renderTab();

      // Queried by accessible name, not by the rendered glyphs. The masking dots are aria-hidden
      // precisely so a screen reader says "Phone number ending 4821" rather than reading four
      // bullets aloud — asserting the label is what pins that, and it also proves the full number
      // is not on the page.
      const cell = screen.getByLabelText("Phone number ending 4821");
      expect(cell.textContent).toBe("••••4821");
      expect(screen.queryByText(/\+\d{6,}/)).toBeNull();
    });

    it("does not fetch the full number as part of loading the list", () => {
      mockQueryResult.data = { conversations: [thread()], count: 1 };

      renderTab();

      // Reveal is a mutation precisely so it cannot fire on mount. If this ever fails, an admin
      // opening the tab is silently pulling every worker's number out of the database.
      expect(revealSpy).not.toHaveBeenCalled();
    });

    it("offers the reveal action on an unrevealed row", () => {
      mockQueryResult.data = { conversations: [thread()], count: 1 };

      renderTab();

      expect(screen.getByTestId("actions").textContent).toContain("reveal");
    });
  });

  describe("blocking", () => {
    it("offers Block on an active contact and Unblock on a blocked one", () => {
      mockQueryResult.data = {
        conversations: [
          thread({ id: "a", contactId: "c-a" }),
          thread({ id: "b", contactId: "c-b", blockedAt: "2026-08-03T00:00:00Z" }),
        ],
        count: 2,
      };

      renderTab();

      const [active, blocked] = screen.getAllByTestId("actions");
      expect(active.textContent).toContain("block");
      expect(active.textContent).not.toContain("unblock");
      expect(blocked.textContent).toContain("unblock");
    });

    it("marks a blocked thread in the list", () => {
      mockQueryResult.data = {
        conversations: [thread({ blockedAt: "2026-08-03T00:00:00Z" })],
        count: 1,
      };

      renderTab();

      expect(screen.getByText("BLOCKED")).toBeTruthy();
    });
  });

  describe("empty and failure states", () => {
    it("distinguishes an empty log from a filtered-empty one", () => {
      renderTab();
      expect(screen.getByText("No conversations yet")).toBeTruthy();
    });

    it("shows an error banner rather than an empty state", () => {
      mockQueryResult.isError = true;
      mockQueryResult.data = undefined;

      renderTab();

      expect(screen.getByRole("alert").textContent).toContain("Could not load conversations.");
      expect(screen.queryByText("No conversations yet")).toBeNull();
    });
  });
});

describe("ConversationsTab sorting", () => {
  beforeEach(() => {
    listQuerySpy.mockClear();
    mockQueryResult = {
      data: { conversations: [thread()], count: 1 },
      isLoading: false,
      isError: false,
    };
  });

  it("asks the SERVER to sort, newest first by default", () => {
    renderTab();

    // Server-side, not client-side: the list is server-paged, so reordering the 25 rows on screen
    // would present itself as sorting all of them and quietly be wrong.
    const params = listQuerySpy.mock.calls[0]?.[0] as { sortBy?: string; sortDir?: string };
    expect(params.sortBy).toBe("lastMessageAt");
    expect(params.sortDir).toBe("desc");
  });

  it("marks the time and size columns sortable, and the contact column not", () => {
    renderTab();

    const keys = lastColumns().map(col => col.sortKey);
    expect(keys).toContain("lastMessageAt");
    expect(keys).toContain("messageCount");
    // A phone number column has no meaningful order, and the server does not offer one.
    expect(lastColumns().find(col => col.key === "contact")?.sortKey).toBeUndefined();
  });
});
