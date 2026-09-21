import React from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KbDocumentSourceType, KbDocumentStatus } from "@types";

/**
 * The load-bearing assertion here is the POLLING one.
 *
 * Ingest is asynchronous, so the corpus table only shows real progress if it polls while a document
 * is in flight — and only stops hammering the endpoint if it clears the interval once everything is
 * terminal. Both halves are invisible to a reader and easy to break in a refactor, so the interval
 * passed to the query hook is asserted directly.
 */

// The `@constants` mock object must be INLINED: vi.mock factories are hoisted above any
// module-scope consts, so referencing one from inside would throw at import time.
vi.mock("@constants", () => ({
  TooltipLocation: { WA_CORPUS_STATUS: "a", WA_CORPUS_CHUNKS: "b", WA_CORPUS_SOURCE_TYPE: "c" },
  en: {
    common: { save: "Save", cancel: "Cancel", search: "Search" },
    whatsappBot: {
      corpus: {
        subtitle: "Documents the bot answers from.",
        searchPlaceholder: "Search",
        create: "Add document",
        edit: "Edit document",
        refresh: "Refresh",
        includeArchived: "Show archived",
        columnTitle: "Document",
        columnStatus: "Status",
        columnChunks: "Passages",
        columnOrganisations: "Organisations",
        columnUpdated: "Updated",
        sourceType: { paste: "Text", pdf: "PDF", docx: "Word", epub: "EPUB", url: "URL" },
        status: {
          pending: "Queued",
          extracting: "Reading",
          chunking: "Splitting",
          indexing: "Indexing",
          indexed: "Indexed",
          failed: "Failed",
        },
        retry: "Retry",
        retryQueued: "Queued",
        archive: "Archive",
        unarchive: "Unarchive",
        archivedBadge: "ARCHIVED",
        archiveConfirmTitle: "Archive this document?",
        archiveConfirmDescription: "The bot will stop using it.",
        empty: "No documents yet",
        emptySubtitle: "Add the reference material.",
        emptyFiltered: "No documents match those filters",
        emptyFilteredSubtitle: "Try a different search term.",
        listError: "Could not load the corpus.",
        listErrorSubtitle: "Use Refresh to try again.",
        loading: "Loading documents…",
        indexedOf: "of",
        statsIndexed: "Indexed",
        statsFailed: "Failed",
        statsInProgress: "In progress",
        statsPassages: "Passages",
        previousPage: "Previous",
        nextPage: "Next",
        saveFailed: "Could not save",
        audienceAllBadge: "All",
        audienceNoneCell: "Nobody",
        audienceMore: "+{count} more",
        audienceLabel: "Available to",
        audienceHelp: "Who can get answers.",
        audienceAll: "All organisations",
        audienceSpecific: "Specific organisations",
        audiencePickLabel: "Organisations",
        audiencePickPlaceholder: "Search organisations",
        audienceNoneWarning: "No organisations selected.",
        audienceSaved: "Organisations updated",
        audienceIndexFailed: "Index not updated",
        filterButton: "Filter",
        filterOrganisationLabel: "Organisation",
      },
    },
  },
  DOCUMENT_MAX_PASTE_CHARS: 200000,
  // Needed transitively: CorpusTab -> CorpusDocumentPanel -> DocumentUploadField reads these.
  FILE_SIZE_LIMITS: { DOCUMENT: 25 * 1024 * 1024 },
  ACCEPT_ATTRIBUTES: {
    PDF: "application/pdf,.pdf",
    DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx",
    EPUB: "application/epub+zip,.epub",
  },
  DOCUMENT_UPLOAD_FORMATS: {
    pdf: { mime: "application/pdf", extensions: [".pdf"] },
    docx: {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extensions: [".docx"],
    },
    epub: { mime: "application/epub+zip", extensions: [".epub"] },
  },
}));

const getDocumentsSpy = vi.fn();

vi.mock("@api", () => ({
  useGetKbDocumentsQuery: (params: unknown, options: unknown) => {
    getDocumentsSpy(params, options);
    return mockQueryResult;
  },
  useGetKbStatsQuery: () => ({ data: undefined }),
  useGetTenantsQuery: () => ({ data: { data: mockTenants } }),
  useSetKbDocumentAudienceMutation: () => [vi.fn(), { isLoading: false }],
  useReindexKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useArchiveKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useUnarchiveKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useCreateKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateKbDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useReplaceKbDocumentContentMutation: () => [vi.fn(), { isLoading: false }],
  useCreateKbUploadUrlMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
  EmptyState: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
  EntityTable: ({
    rows,
    actions,
    columns,
  }: {
    rows: { id: string }[];
    actions?: unknown[];
    columns?: { key: string; render?: (row: unknown) => React.ReactNode }[];
  }) => (
    <table>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} data-testid="row">
            <td>{row.id}</td>
            {/* The organisations cell is rendered so its wording can be asserted — it is the one
                column whose text changes what an admin believes about who can see a document. */}
            <td data-testid={`organisations-${row.id}`}>
              {columns?.find(column => column.key === "organisations")?.render?.(row)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td data-testid="action-count">{actions?.length ?? 0}</td>
        </tr>
      </tfoot>
    </table>
  ),
  ListToolbar: () => <div data-testid="toolbar" />,
  FilterDropdown: () => null,
  ListPagination: () => <div data-testid="pagination" />,
  Button: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  EntityField: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  EntitySidePanel: () => null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineNotification: ({ title }: { title: string }) => <div role="alert">{title}</div>,
  SkeletonText: () => <div data-testid="skeleton" />,
  Checkbox: ({ labelText }: { labelText: string }) => <label>{labelText}</label>,
  AutoExpandableTextarea: () => null,
  ContentSwitcher: () => null,
  Switch: () => null,
  TextInput: () => null,
  FilterableMultiSelect: () => null,
  RadioButton: () => null,
  RadioButtonGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@icons", () => ({
  Refresh: () => <span />,
  Unarchive: () => <span />,
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

/** Two organisations, so the cell's "names, not ids" behaviour is observable. */
const mockTenants = [
  { id: "tenant-a", name: "Acme Health" },
  { id: "tenant-b", name: "Beacon Care" },
];

let mockQueryResult: {
  data?: { documents: unknown[]; count: number };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const doc = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "doc-1",
  title: "WHO mhGAP Intervention Guide",
  sourceType: KbDocumentSourceType.PDF,
  sourceUrl: null,
  fileName: "mhgap.pdf",
  contentType: "application/pdf",
  sizeBytes: 1000,
  language: "en",
  tags: [],
  status: KbDocumentStatus.INDEXED,
  statusMessage: null,
  chunkCount: 10,
  indexedChunkCount: 10,
  isGlobal: true,
  tenantIds: [],
  isArchived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  ...over,
});

// Imported after the mocks so the component picks them up.
const { CorpusTab } = await import("../CorpusTab");

describe("CorpusTab", () => {
  beforeEach(() => {
    getDocumentsSpy.mockClear();
    mockQueryResult = {
      data: { documents: [], count: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  const pollIntervalFromLastCall = (): number => {
    const calls = getDocumentsSpy.mock.calls;
    const last = calls[calls.length - 1];
    return (last?.[1] as { pollingInterval?: number })?.pollingInterval ?? -1;
  };

  describe("polling", () => {
    it("does not poll when every document is terminal", () => {
      mockQueryResult.data = {
        documents: [
          doc({ id: "a", status: KbDocumentStatus.INDEXED }),
          doc({ id: "b", status: KbDocumentStatus.FAILED }),
        ],
        count: 2,
      };

      render(<CorpusTab />);

      // 0 disables polling in RTK Query. Without this the tab would poll a settled corpus forever.
      expect(pollIntervalFromLastCall()).toBe(0);
    });

    it("polls while any document is still being processed", () => {
      mockQueryResult.data = {
        documents: [
          doc({ id: "a", status: KbDocumentStatus.INDEXED }),
          doc({ id: "b", status: KbDocumentStatus.INDEXING }),
        ],
        count: 2,
      };

      render(<CorpusTab />);

      expect(pollIntervalFromLastCall()).toBeGreaterThan(0);
    });

    it.each([
      KbDocumentStatus.PENDING,
      KbDocumentStatus.EXTRACTING,
      KbDocumentStatus.CHUNKING,
      KbDocumentStatus.INDEXING,
    ])("treats %s as in flight", status => {
      mockQueryResult.data = { documents: [doc({ status })], count: 1 };

      render(<CorpusTab />);

      expect(pollIntervalFromLastCall()).toBeGreaterThan(0);
    });

    it("does not poll an empty corpus", () => {
      render(<CorpusTab />);
      expect(pollIntervalFromLastCall()).toBe(0);
    });
  });

  describe("empty states", () => {
    it("offers the create action when the corpus is genuinely empty", () => {
      render(<CorpusTab />);
      expect(screen.getByText("No documents yet")).toBeTruthy();
      expect(screen.getByText("Add the reference material.")).toBeTruthy();
    });
  });

  describe("failure state", () => {
    it("shows an error banner rather than an empty state", () => {
      // An empty state on a failed request reads as "there are no documents", which is a very
      // different thing from "we could not reach the server".
      mockQueryResult.isError = true;
      mockQueryResult.data = undefined;

      render(<CorpusTab />);

      expect(screen.getByRole("alert").textContent).toContain("Could not load the corpus.");
      expect(screen.queryByText("No documents yet")).toBeNull();
    });
  });

  describe("rows", () => {
    it("renders one row per document", () => {
      mockQueryResult.data = {
        documents: [doc({ id: "a" }), doc({ id: "b" })],
        count: 2,
      };

      render(<CorpusTab />);

      expect(screen.getAllByTestId("row")).toHaveLength(2);
    });
  });
});

describe("CorpusTab organisations column", () => {
  /**
   * The cell's wording is what an admin trusts when deciding whether a customer should be able to
   * see a document, so each of the three states says something different on purpose. The
   * dangerous one is "available to nobody": it is savable, and a dash or a blank would be
   * indistinguishable from a document nobody happens to ask about.
   */
  it("says All for a global document", () => {
    mockQueryResult = {
      data: { documents: [doc({ isGlobal: true, tenantIds: [] })], count: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<CorpusTab />);

    expect(screen.getByTestId("organisations-doc-1").textContent).toBe("All");
  });

  it("names the organisations rather than counting them", () => {
    mockQueryResult = {
      data: {
        documents: [doc({ isGlobal: false, tenantIds: ["tenant-a", "tenant-b"] })],
        count: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<CorpusTab />);

    expect(screen.getByTestId("organisations-doc-1").textContent).toBe("Acme Health, Beacon Care");
  });

  it("calls out a document that reaches nobody", () => {
    mockQueryResult = {
      data: { documents: [doc({ isGlobal: false, tenantIds: [] })], count: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<CorpusTab />);

    expect(screen.getByTestId("organisations-doc-1").textContent).toBe("Nobody");
  });

  it("does not send an organisation filter until one is chosen", () => {
    // A tenantId on the list request changes what it returns to "what this customer can see",
    // which is a different question from "what is in the corpus" — the default must be the latter.
    mockQueryResult = {
      data: { documents: [doc()], count: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<CorpusTab />);

    expect(getDocumentsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: undefined }),
      expect.anything(),
    );
  });
});
