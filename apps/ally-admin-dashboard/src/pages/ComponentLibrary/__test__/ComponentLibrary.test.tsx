import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({
  useGetComponentTemplatesQuery: vi.fn(),
  useDeleteComponentTemplatesMutation: vi.fn(),
}));

vi.mock("@assets", () => ({
  Trash: () => <span data-testid="trash-icon" />,
}));

vi.mock("@components", () => ({
  NotionTable: ({ tableData, onRowClick, onSelectionChange, tableFooter }: any) => (
    <div data-testid="notion-table">
      {tableData?.data?.map((row: any, idx: number) => (
        <div
          key={row?.id?.rowId ?? idx}
          onClick={() => onRowClick?.(idx)}
          data-testid={`table-row-${idx}`}
        >
          {row?.title?.value ?? "row"}
        </div>
      ))}
      {tableFooter}
      <button
        type="button"
        data-testid="trigger-selection-change"
        onClick={() =>
          onSelectionChange?.([{ id: { value: "tpl-1" } }, { id: { value: "tpl-2" } }])
        }
      >
        Select rows
      </button>
    </div>
  ),
  ListToolbar: ({ searchValue, onSearchChange, action, filter }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange?.(e.target.value)}
      />
      {filter}
      <button onClick={action?.onClick} data-testid="toolbar-action">
        {action?.label}
      </button>
    </div>
  ),
  ActionConfirmationPopup: ({
    isOpen,
    onClose,
    primaryButton,
    secondaryButton,
    title,
    description,
  }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={primaryButton?.onClick} data-testid="confirm-delete">
          {primaryButton?.label}
        </button>
        <button onClick={secondaryButton?.onClick} data-testid="cancel-delete">
          {secondaryButton?.label}
        </button>
        <button onClick={onClose} data-testid="popup-close">
          Close
        </button>
      </div>
    ) : null,
  DropdownField: ({ options, value, onChange }: any) => (
    <select
      data-testid="type-filter"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    DESTRUCTIVE: "destructive",
  },
}));

vi.mock("@constants", () => ({
  en: {
    common: {
      loading: "Loading...",
      loadMore: "Load more",
      noMoreData: "No more data",
      delete: "Delete",
      cancel: "Cancel",
      successfullyDeleted: "Successfully deleted",
      areYouSureYouWantToDelete: "Are you sure you want to delete",
    },
    componentLibrary: {
      title: "Component Library",
      searchPlaceholder: "Search templates...",
      createTemplate: "Create template",
      allTypes: "All types",
      emptyState: "No templates yet. Save one from a course, or create one here.",
      template: "template",
      templates: "templates",
      templateDeletedSuccessfully: "Template deleted successfully",
      failedToDeleteTemplate: "Failed to delete template(s)",
    },
  },
  Permissions: {
    EDIT_ADMIN_TRACK: "edit:admin:track",
    DELETE_ADMIN_TRACK: "delete:admin:track",
  },
  TRACK_ITEM_TYPE_LABELS: {
    ARTICLE: "Article",
    QUIZ: "Quiz",
    VIDEO: "Video",
    JOURNAL: "Journal",
    ANNOTATED_ARTIFACT: "Annotation",
  },
  COMPONENT_LIBRARY_SUPPORTED_TYPES: ["JOURNAL", "QUIZ", "ARTICLE", "VIDEO", "ANNOTATED_ARTIFACT"],
  COMPONENT_LIBRARY_TABLE_COLUMNS: [
    { id: "title", label: "Title", accessor: "title" },
    { id: "type", label: "Type", accessor: "type" },
    { id: "updatedAt", label: "Last updated", accessor: "updatedAt" },
  ],
}));

vi.mock("@utils", () => ({
  formatRelativeTime: () => "2d ago",
  hasPermissions: (perms: string[] | undefined, required: string[]) =>
    Boolean(required.some(r => perms?.includes(r))),
}));

// Platform admin by default (full CRUD).
const mockPermissions = vi.fn(() => ["edit:admin:track", "delete:admin:track"]);
vi.mock("@hooks", () => ({
  useUser: () => ({ permissions: mockPermissions() }),
}));

vi.mock("../ComponentLibrarySidePanel", () => ({
  ComponentLibrarySidePanel: ({ isOpen, type, template, onClose, onDelete }: any) =>
    isOpen ? (
      <div data-testid="side-panel">
        <span data-testid="panel-type">{type}</span>
        <span data-testid="panel-template-title">{template?.title ?? ""}</span>
        <button data-testid="panel-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="panel-delete" onClick={() => template && onDelete(template.id)}>
          Delete
        </button>
      </div>
    ) : null,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

import * as api from "@api";
import { TrackItemType } from "@types";

import { ComponentLibrary } from "../ComponentLibrary";

const mockTemplates = [
  {
    id: "tpl-1",
    type: TrackItemType.ARTICLE,
    title: "Intro Article",
    content: { html: "<p>x</p>" },
    completionCriteria: null,
    createdBy: 1,
    updatedBy: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl-2",
    type: TrackItemType.QUIZ,
    title: "Basics Quiz",
    content: { settings: { passScore: 70, maxAttempts: null }, questions: [] },
    completionCriteria: null,
    createdBy: 1,
    updatedBy: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("ComponentLibrary", () => {
  const mockDeleteComponentTemplates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions.mockReturnValue(["edit:admin:track", "delete:admin:track"]);
    mockDeleteComponentTemplates.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
    (api.useGetComponentTemplatesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { items: mockTemplates, total: mockTemplates.length },
      isLoading: false,
    });
    (api.useDeleteComponentTemplatesMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockDeleteComponentTemplates,
      {},
    ]);
  });

  it("renders the page title", () => {
    render(<ComponentLibrary />);
    expect(screen.getByRole("heading", { name: /component library/i })).toBeInTheDocument();
  });

  it("renders its content unconditionally — gating is entirely the route's requiredFeature/requiredPermissions (RouteLayout.tsx), matching CharacterLibrary, which also has no in-page toggle check", () => {
    // No feature-toggle mock is set up anywhere in this suite; the page still
    // renders its title, toolbar and table purely off permissions + query
    // data, proving there is no second, in-page gate to duplicate the route's.
    render(<ComponentLibrary />);
    expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("notion-table")).toBeInTheDocument();
  });

  it("renders the list toolbar with search, a type filter, and Create template when nothing is selected", () => {
    render(<ComponentLibrary />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("type-filter")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Create template");
  });

  it("renders template rows from the API", () => {
    render(<ComponentLibrary />);
    expect(screen.getByText("Intro Article")).toBeInTheDocument();
    expect(screen.getByText("Basics Quiz")).toBeInTheDocument();
  });

  it("calls useGetComponentTemplatesQuery with limit, offset, search and type", () => {
    render(<ComponentLibrary />);
    expect(api.useGetComponentTemplatesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 30, offset: 0, search: "", type: undefined }),
    );
  });

  it("re-queries scoped to the picked type when the type filter changes", async () => {
    render(<ComponentLibrary />);
    fireEvent.change(screen.getByTestId("type-filter"), { target: { value: "QUIZ" } });

    await waitFor(() => {
      expect(api.useGetComponentTemplatesQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "QUIZ", offset: 0 }),
      );
    });
  });

  it("picking a type from the create popover opens the panel in create mode for that type", async () => {
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("toolbar-action"));
    fireEvent.click(await screen.findByRole("button", { name: "Journal" }));

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-type")).toHaveTextContent(TrackItemType.JOURNAL);
      expect(screen.getByTestId("panel-template-title")).toHaveTextContent("");
    });
  });

  it("clicking a row opens the panel pre-filled with that template", async () => {
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("table-row-0"));

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-type")).toHaveTextContent(TrackItemType.ARTICLE);
      expect(screen.getByTestId("panel-template-title")).toHaveTextContent("Intro Article");
    });
  });

  it("a viewer without edit permission cannot open a row", () => {
    mockPermissions.mockReturnValue(["delete:admin:track"]);
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("table-row-0"));

    expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument();
  });

  it("single delete from the panel calls the delete mutation with just that template's id", async () => {
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("table-row-0"));
    await waitFor(() => expect(screen.getByTestId("side-panel")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("panel-delete"));

    await waitFor(() => {
      expect(mockDeleteComponentTemplates).toHaveBeenCalledWith({ ids: ["tpl-1"] });
      expect(toastSuccess).toHaveBeenCalledWith("Template deleted successfully");
    });
  });

  it("selecting rows shows Delete in the toolbar and bulk-deletes the selection on confirm", async () => {
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("trigger-selection-change"));

    await waitFor(() => expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete"));

    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("confirm-delete"));

    await waitFor(() => {
      expect(mockDeleteComponentTemplates).toHaveBeenCalledWith({ ids: ["tpl-1", "tpl-2"] });
    });
  });

  it("bulk delete confirmation can be cancelled without calling the mutation", async () => {
    render(<ComponentLibrary />);
    fireEvent.click(screen.getByTestId("trigger-selection-change"));
    await waitFor(() => expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete"));
    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cancel-delete"));

    await waitFor(() => {
      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });
    expect(mockDeleteComponentTemplates).not.toHaveBeenCalled();
  });
});
