import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock API hooks
vi.mock("@api", () => ({
  useGetLanguagesQuery: vi.fn(),
  useCreateLanguageMutation: vi.fn(),
  useUpdateLanguageMutation: vi.fn(),
  // The page reads the STT registry to fill the Speech Recognition dropdown.
  useGetSttConfigsQuery: () => ({ data: [], isFetching: false }),
  useGetLlmConfigsQuery: () => ({ data: [], isFetching: false }),
}));

import * as api from "@api";
import { ScenarioLanguages } from "../LanguageManagement";

// Mock components
vi.mock("@components", () => ({
  NotionTable: ({ tableData, onRowClick }: any) => (
    <div data-testid="notion-table">
      {tableData?.data?.map((row: any, idx: number) => (
        <div key={idx} onClick={() => onRowClick?.(idx)} data-testid={`table-row-${idx}`}>
          {row.label}
        </div>
      ))}
    </div>
  ),
  ListToolbar: ({ action }: any) => (
    <div data-testid="list-toolbar">
      <button onClick={action.onClick} data-testid="create-button">
        {action.label}
      </button>
    </div>
  ),
  LanguageManagementSidePanel: ({ isOpen, selectedLanguage, onUpdate, onClose }: any) =>
    isOpen ? (
      <div data-testid="side-panel">
        <button onClick={() => onUpdate(selectedLanguage)} data-testid="save-button">
          Save
        </button>
        <button onClick={onClose} data-testid="close-button">
          Close
        </button>
      </div>
    ) : null,
}));

// Mock constants
vi.mock("@constants", () => ({
  buildConfigPickerOptions: (configs: any[], inheritLabel: string) => [
    { value: "", label: inheritLabel },
    ...configs.map(c => ({ value: c.id, label: c.name })),
  ],
  en: {
    simulation: {
      languageCreatedSuccessfully: "Language created successfully",
      languageUpdatedSuccessfully: "Language updated successfully",
      scenarioLanguages: "Scenario Languages",
      searchLanguages: "Search languages...",
      createLanguage: "Create new language",
    },
    common: {
      loading: "Loading...",
      loadMore: "Load More",
      noMoreData: "No more data",
    },
    errors: {
      failedToCreateEvent: "Failed to create event",
    },
  },
  SCENARIO_LANGUAGE_COLUMNS: [],
  SORT_BY: { CREATED_AT: "createdAt" },
  SORT_ORDER: { DESC: "desc" },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("Languages Page", () => {
  const mockLanguages = [
    {
      id: "lang-1",
      label: "English",
      value: "en",
      translationCode: "en-US",
      llmProviderConfig: {},
      sttProviderConfig: {},
      active: true,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "lang-2",
      label: "Spanish",
      value: "es",
      translationCode: "es-ES",
      llmProviderConfig: {},
      sttProviderConfig: {},
      active: true,
      createdAt: "2024-01-14T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.useGetLanguagesQuery as any).mockReturnValue({
      data: mockLanguages,
      isFetching: false,
      isError: false,
    });
    (api.useCreateLanguageMutation as any).mockReturnValue([
      vi.fn().mockResolvedValue({ data: mockLanguages[0] }),
      {},
    ]);
    (api.useUpdateLanguageMutation as any).mockReturnValue([
      vi.fn().mockResolvedValue({ data: mockLanguages[0] }),
      {},
    ]);
  });

  it("should render the languages page", () => {
    render(<ScenarioLanguages />);
    expect(screen.getByText("Scenario Languages")).toBeInTheDocument();
  });

  it("should display the create button", () => {
    render(<ScenarioLanguages />);
    expect(screen.getByTestId("create-button")).toBeInTheDocument();
  });

  it("should open side panel when create button is clicked", async () => {
    render(<ScenarioLanguages />);
    const createButton = screen.getByTestId("create-button");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });
  });
});
