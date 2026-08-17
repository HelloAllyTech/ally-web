import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@api", () => ({
  useGetCharactersQuery: vi.fn(),
  useDeleteCharacterMutation: vi.fn(),
  useUpdateCharacterMutation: vi.fn(),
}));

import * as api from "@api";
import { CharacterLibrary } from "../CharacterLibrary";

vi.mock("@assets", () => ({
  Trash: () => <span data-testid="trash-icon" />,
  WandStars: () => <span data-testid="wand-stars-icon" />,
}));

vi.mock("@components", () => ({
  NotionTable: ({
    tableData,
    onRowClick,
    onRowChange,
    onSelectionChange,
    tableFooter,
    hideSelectionColumn,
  }: any) => (
    <div data-testid="notion-table">
      <span data-testid="hide-selection-column">{String(Boolean(hideSelectionColumn))}</span>
      <span data-testid="column-ids">
        {tableData?.columns?.map((c: any) => c.id).join(",")}
      </span>
      {tableData?.data?.map((row: any, idx: number) => (
        <div
          key={row?.id?.rowId ?? idx}
          onClick={() => onRowClick?.(idx)}
          data-testid={`table-row-${idx}`}
        >
          {row?.name?.value ?? "row"}
        </div>
      ))}
      {tableFooter}
      <button
        type="button"
        data-testid="trigger-selection-change"
        onClick={() => onSelectionChange?.([{ id: { value: "char-1" } }])}
      >
        Select one
      </button>
      <button
        type="button"
        data-testid="trigger-row-change"
        onClick={() =>
          onRowChange?.({ columnId: "name", value: "Updated", rowId: "char-1", rowIndex: 0 })
        }
      >
        Update row
      </button>
    </div>
  ),
  ListToolbar: ({ searchValue, onSearchChange, action }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange?.(e.target.value)}
      />
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
  CharacterSidePanel: ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    selectedCharacter,
    isNewCharacter,
    readOnly,
  }: any) =>
    isOpen ? (
      <div data-testid="character-side-panel">
        <span data-testid="side-panel-new">{String(isNewCharacter)}</span>
        <span data-testid="side-panel-readonly">{String(Boolean(readOnly))}</span>
        <button
          onClick={() => onSave?.({ ...selectedCharacter, name: "Saved Name" })}
          data-testid="side-panel-save"
        >
          Save
        </button>
        <button
          onClick={() => selectedCharacter?.id && onDelete?.(selectedCharacter.id)}
          data-testid="side-panel-delete"
        >
          Delete
        </button>
        <button onClick={onClose} data-testid="side-panel-close">
          Close
        </button>
      </div>
    ) : null,
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
    simulation: {
      characters: "Characters",
      characterCreatedSuccessfully: "Character created successfully",
      characterUpdatedSuccessfully: "Character updated successfully",
      characterDeletedSuccessfully: "Character deleted successfully",
      failedToDeleteCharacter: "Failed to delete character",
      failedToUpdateCharacter: "Failed to update character",
      createNewCharacter: "Create new character",
      createWithInterviewAgent: "Create with interview agent",
      allyOwnedCharacter: "Ally (global)",
    },
    common: {
      loading: "Loading...",
      loadMore: "Load more",
      noMoreData: "No more data",
      delete: "Delete",
      cancel: "Cancel",
      characters: "characters",
      character: "character",
      successfullyDeleted: "Successfully deleted",
      areYouSureYouWantToDelete: "Are you sure you want to delete",
    },
    errors: {
      failedToDeleteCharacter: "Failed to delete character(s)",
    },
  },
  CHARACTER_LIBRARY_TABLE_COLUMNS: [
    { id: "name", label: "Name", accessor: "name" },
    { id: "age", label: "Age", accessor: "age" },
  ],
  CHARACTER_LIBRARY_OWNER_COLUMNS: [
    { id: "createdByName", label: "Created by", accessor: "createdByName" },
    { id: "tenantName", label: "Organisation", accessor: "tenantName" },
  ],
  Permissions: {
    VIEW_CHARACTER_LIBRARY: "view:scenario-character",
    CREATE_CHARACTER_LIBRARY: "create:scenario-character",
    EDIT_CHARACTER_LIBRARY: "edit:scenario-character",
    DELETE_CHARACTER_LIBRARY: "delete:scenario-character",
  },
  ROUTES: {
    CHARACTER_LIBRARY_INTERVIEW: "/character-library/interview",
  },
}));

// Platform admin by default (full CRUD). Tenant-admin cases narrow this to
// view + create.
const mockPermissions = vi.fn(() => [
  "view:scenario-character",
  "create:scenario-character",
  "edit:scenario-character",
  "delete:scenario-character",
]);
vi.mock("@hooks", () => ({
  useUser: () => ({ permissions: mockPermissions() }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

const mockCharacters = [
  {
    id: "char-1",
    name: "Alice",
    age: "30",
    gender: "Female",
    profession: "Engineer",
    currentLocation: "NYC",
    genderIdentity: "",
    sexualOrientation: "",
  },
  {
    id: "char-2",
    name: "Bob",
    age: "25",
    gender: "Male",
    profession: "Designer",
    currentLocation: "LA",
    genderIdentity: "",
    sexualOrientation: "",
  },
];

const renderCharacterLibrary = () =>
  render(
    <MemoryRouter>
      <CharacterLibrary />
    </MemoryRouter>,
  );

describe("CharacterLibrary", () => {
  const mockDeleteCharacter = vi.fn();
  const mockUpdateCharacter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks wipes the default implementation too — restore the
    // platform-admin permission set each test.
    mockPermissions.mockReturnValue([
      "view:scenario-character",
      "create:scenario-character",
      "edit:scenario-character",
      "delete:scenario-character",
    ]);
    mockDeleteCharacter.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockUpdateCharacter.mockReturnValue({ unwrap: () => Promise.resolve() });
    (api.useGetCharactersQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { characters: mockCharacters },
      isLoading: false,
    });
    (api.useDeleteCharacterMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockDeleteCharacter,
      {},
    ]);
    (api.useUpdateCharacterMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockUpdateCharacter,
      {},
    ]);
  });

  it("renders the page title", () => {
    renderCharacterLibrary();
    expect(screen.getByRole("heading", { name: /characters/i })).toBeInTheDocument();
  });

  it("renders list toolbar with create new character action when no selection", () => {
    renderCharacterLibrary();
    expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Create new character");
  });

  it("opens side panel when create new character is clicked", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("toolbar-action"));

    await waitFor(() => {
      expect(screen.getByTestId("character-side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("side-panel-new")).toHaveTextContent("true");
    });
  });

  it("renders character table with data from API", () => {
    renderCharacterLibrary();
    expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls useGetCharactersQuery with limit, offset and search", () => {
    renderCharacterLibrary();
    expect(api.useGetCharactersQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 30,
        offset: 0,
        search: "",
      }),
    );
  });

  it("updates search and resets offset when search changes", async () => {
    renderCharacterLibrary();
    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(api.useGetCharactersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "test",
          offset: 0,
        }),
      );
    });
  });

  it("load more button shows load more text when hasMore and not loading", () => {
    const thirtyCharacters = Array.from({ length: 30 }, (_, i) => ({
      ...mockCharacters[0],
      id: `char-${i}`,
      name: `Character ${i}`,
    }));
    (api.useGetCharactersQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { characters: thirtyCharacters },
      isLoading: false,
    });
    renderCharacterLibrary();
    expect(screen.getByText("Load more")).toBeInTheDocument();
  });

  it("load more is disabled when loading", () => {
    (api.useGetCharactersQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { characters: mockCharacters },
      isLoading: true,
    });
    renderCharacterLibrary();
    const loadMoreButton = screen.getByRole("button", { name: /loading/i });
    expect(loadMoreButton).toBeDisabled();
  });

  it("opens side panel with selected character when row is clicked", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("table-row-0"));

    await waitFor(() => {
      expect(screen.getByTestId("character-side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("side-panel-new")).toHaveTextContent("false");
    });
  });

  it("closes side panel when close is clicked", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("character-side-panel")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("side-panel-close"));
    await waitFor(() => {
      expect(screen.queryByTestId("character-side-panel")).not.toBeInTheDocument();
    });
  });

  it("saving new character adds to list and shows success toast", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("character-side-panel")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("side-panel-save"));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Character created successfully");
    });
  });

  it("saving existing character shows update toast", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("table-row-0"));
    await waitFor(() => expect(screen.getByTestId("character-side-panel")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("side-panel-save"));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Character updated successfully");
    });
  });

  it("delete character calls API and shows success toast", async () => {
    mockDeleteCharacter.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("table-row-0"));
    await waitFor(() => expect(screen.getByTestId("character-side-panel")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("side-panel-delete"));

    await waitFor(() => {
      expect(mockDeleteCharacter).toHaveBeenCalledWith({ scenarioCharacterIds: ["char-1"] });
      expect(toastSuccess).toHaveBeenCalledWith("Character deleted successfully");
    });
  });

  it("delete character shows error toast on API failure", async () => {
    mockDeleteCharacter.mockReturnValue({ unwrap: () => Promise.reject(new Error("API error")) });
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("table-row-0"));
    await waitFor(() => expect(screen.getByTestId("character-side-panel")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("side-panel-delete"));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to delete character");
    });
  });

  it("selection change shows delete in toolbar and opens confirmation on delete click", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("trigger-selection-change"));

    await waitFor(() => {
      expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete");
    });

    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => {
      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
    });
  });

  it("confirmation popup cancel closes popup", async () => {
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("trigger-selection-change"));
    await waitFor(() => expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete"));
    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cancel-delete"));
    await waitFor(() => {
      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });
  });

  it("confirm delete calls delete API and shows success toast", async () => {
    mockDeleteCharacter.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("trigger-selection-change"));
    await waitFor(() => expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete"));
    fireEvent.click(screen.getByTestId("toolbar-action"));
    await waitFor(() => expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("confirm-delete"));

    await waitFor(() => {
      expect(mockDeleteCharacter).toHaveBeenCalledWith({ scenarioCharacterIds: ["char-1"] });
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  it("inline table update calls updateCharacter and shows success toast", async () => {
    mockUpdateCharacter.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("trigger-row-change"));

    await waitFor(() => {
      expect(mockUpdateCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "char-1",
          data: expect.objectContaining({ name: "Updated" }),
        }),
      );
      expect(toastSuccess).toHaveBeenCalledWith("Character updated successfully");
    });
  });

  it("inline table update shows error toast on API failure", async () => {
    mockUpdateCharacter.mockReturnValue({
      unwrap: () => Promise.reject(new Error("Update failed")),
    });
    renderCharacterLibrary();
    fireEvent.click(screen.getByTestId("trigger-row-change"));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to update character");
    });
  });

  describe("tenant admin (view + create only)", () => {
    const asTenantAdmin = () =>
      mockPermissions.mockReturnValue(["view:scenario-character", "create:scenario-character"]);

    it("hides the owner columns, which only mean something across orgs", async () => {
      asTenantAdmin();
      renderCharacterLibrary();

      await waitFor(() => {
        expect(screen.getByTestId("column-ids").textContent).toBe("name,age");
      });
    });

    it("shows the owner columns for a platform admin", async () => {
      renderCharacterLibrary();

      await waitFor(() => {
        expect(screen.getByTestId("column-ids").textContent).toBe(
          "name,age,createdByName,tenantName",
        );
      });
    });

    it("hides the bulk-select column so there is no delete path", async () => {
      asTenantAdmin();
      renderCharacterLibrary();

      await waitFor(() => {
        expect(screen.getByTestId("hide-selection-column").textContent).toBe("true");
      });
    });

    it("opens an existing character read-only", async () => {
      asTenantAdmin();
      renderCharacterLibrary();

      fireEvent.click(await screen.findByTestId("table-row-0"));

      expect(screen.getByTestId("side-panel-readonly").textContent).toBe("true");
    });

    it("still opens the create panel editable", async () => {
      asTenantAdmin();
      renderCharacterLibrary();

      fireEvent.click(await screen.findByTestId("toolbar-action"));

      expect(screen.getByTestId("side-panel-new").textContent).toBe("true");
      expect(screen.getByTestId("side-panel-readonly").textContent).toBe("false");
    });
  });
});
