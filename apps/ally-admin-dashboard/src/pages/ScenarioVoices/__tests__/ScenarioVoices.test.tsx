import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ScenarioVoices } from "../ScenarioVoices";

// Create mock functions first
const useGetScenarioVoicesQueryMock = vi.fn();
const useGetAvailableLanguageVoicesQueryMock = vi.fn();
const useCreateScenarioVoiceMutationMock = vi.fn();
const useUpdateScenarioVoiceMutationMock = vi.fn();

// Mock API hooks
vi.mock("@api", () => ({
  useGetScenarioVoicesQuery: useGetScenarioVoicesQueryMock,
  useGetAvailableLanguageVoicesQuery: useGetAvailableLanguageVoicesQueryMock,
  useCreateScenarioVoiceMutation: useCreateScenarioVoiceMutationMock,
  useUpdateScenarioVoiceMutation: useUpdateScenarioVoiceMutationMock,
}));

// Mock components
vi.mock("@components", () => ({
  NotionTable: ({ data, columns, onRowClick }: any) => (
    <div data-testid="notion-table">
      {data?.map((row: any, idx: number) => (
        <div key={idx} onClick={() => onRowClick?.(idx)} data-testid={`table-row-${idx}`}>
          {row.name}
        </div>
      ))}
    </div>
  ),
  ListToolbar: ({ onSearch, onActionClick }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        onChange={e => onSearch?.(e.target.value)}
        placeholder="Search voices..."
      />
      <button data-testid="create-button" onClick={onActionClick}>
        Create
      </button>
    </div>
  ),
  ScenarioVoiceSidePanel: ({ isOpen, onClose, onUpdate }: any) =>
    isOpen ? (
      <div data-testid="side-panel">
        <button data-testid="close-panel" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="save-voice"
          onClick={() =>
            onUpdate({
              id: "voice-1",
              name: "Test Voice",
              provider: "Google",
              languageId: 1,
              config: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        >
          Save
        </button>
      </div>
    ) : null,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    voiceCreatedSuccessfully: "Voice created successfully",
    voiceUpdatedSuccessfully: "Voice updated successfully",
    scenarioVoices: "Scenario Voices",
    searchVoices: "Search voices...",
    createVoice: "Create new voice",
  },
  SCENARIO_VOICE_COLUMNS: [],
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

describe("ScenarioVoices Page", () => {
  const mockVoices = [
    {
      id: "voice-1",
      name: "Voice One",
      provider: "Google",
      languageId: 1,
      config: { model: "neural", age: "adult" },
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "voice-2",
      name: "Voice Two",
      provider: "Azure",
      languageId: 2,
      config: { model: "standard", age: "child" },
      createdAt: "2024-01-14T10:00:00Z",
      updatedAt: "2024-01-14T10:00:00Z",
    },
  ];

  const mockLanguages = [
    { id: "en", name: "English" },
    { id: "es", name: "Spanish" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useGetScenarioVoicesQueryMock.mockReturnValue({
      data: { voices: mockVoices },
      isFetching: false,
      error: null,
    });

    useGetAvailableLanguageVoicesQueryMock.mockReturnValue({
      data: mockLanguages,
      isFetching: false,
      error: null,
    });

    useCreateScenarioVoiceMutationMock.mockReturnValue([
      vi.fn().mockResolvedValue({ data: { voices: [mockVoices[0]] } }),
      { isLoading: false },
    ]);

    useUpdateScenarioVoiceMutationMock.mockReturnValue([
      vi.fn().mockResolvedValue({ data: mockVoices[0] }),
      { isLoading: false },
    ]);
  });

  it("renders scenario voices page with toolbar and table", () => {
    render(<ScenarioVoices />);

    expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("notion-table")).toBeInTheDocument();
  });

  it("renders voices in table", () => {
    render(<ScenarioVoices />);

    expect(screen.getByText("Voice One")).toBeInTheDocument();
    expect(screen.getByText("Voice Two")).toBeInTheDocument();
  });

  it("opens side panel when create button is clicked", async () => {
    render(<ScenarioVoices />);

    const createButton = screen.getByTestId("create-button");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });
  });

  it("closes side panel when close button is clicked", async () => {
    render(<ScenarioVoices />);

    const createButton = screen.getByTestId("create-button");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId("close-panel");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument();
    });
  });

  it("opens side panel when table row is clicked", async () => {
    render(<ScenarioVoices />);

    const tableRow = screen.getByTestId("table-row-0");
    fireEvent.click(tableRow);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });
  });

  it("handles search query changes", async () => {
    render(<ScenarioVoices />);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "Voice One" } });

    await waitFor(() => {
      expect(useGetScenarioVoicesQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          searchName: "Voice One",
        }),
      );
    });
  });

  it("creates new voice and shows success toast", async () => {
    const { toast } = require("sonner");

    render(<ScenarioVoices />);

    const createButton = screen.getByTestId("create-button");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId("save-voice");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Voice created successfully");
    });
  });

  it("resets offset when search query changes", async () => {
    render(<ScenarioVoices />);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      // Verify API called with offset 0 after search
      expect(useGetScenarioVoicesQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
        }),
      );
    });
  });

  it("handles voice selection and opens side panel with voice data", async () => {
    render(<ScenarioVoices />);

    const tableRow = screen.getByTestId("table-row-0");
    fireEvent.click(tableRow);

    await waitFor(() => {
      expect(screen.getByTestId("side-panel")).toBeInTheDocument();
    });
  });
});
