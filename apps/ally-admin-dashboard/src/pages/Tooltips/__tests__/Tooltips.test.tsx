import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { configureStore } from "@reduxjs/toolkit";
import { baseAPI } from "@api";
import userSlice from "@reducer/userReducer";
import { fromLocationSlug } from "@utils";

const { mockToast, mockUseGetTooltipsQuery, mockCreateTooltip, mockUpdateTooltip } = vi.hoisted(
  () => ({
    mockToast: { success: vi.fn(), error: vi.fn() },
    mockUseGetTooltipsQuery: vi.fn(),
    mockCreateTooltip: vi.fn(),
    mockUpdateTooltip: vi.fn(),
  }),
);

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@api", async importOriginal => {
  const actual = await importOriginal<typeof import("@api")>();
  return {
    ...actual,
    useGetTooltipsQuery: (...args: any[]) => mockUseGetTooltipsQuery(...args),
    useCreateTooltipMutation: () => [mockCreateTooltip],
    useUpdateTooltipMutation: () => [mockUpdateTooltip],
  };
});

vi.mock("@components", () => ({
  cellTypes: {
    editableText: "editableText",
    switch: "switch",
    normalText: "normalText",
    wrapText: "wrapText",
    emoji_select: "emoji_select",
  },
  NotionTable: ({ tableData, onRowClick, onRowChange, tableFooter }: any) => (
    <div data-testid="notion-table">
      {tableData.data.map((row: any, index: number) => (
        <div
          key={row.id || index}
          data-testid={`table-row-${index}`}
          onClick={() => onRowClick(index)}
        >
          <span data-testid={`location-${index}`}>{row.location}</span>
          <span data-testid={`tip-text-${index}`}>{row.tipText}</span>
          <button
            data-testid={`toggle-active-${index}`}
            onClick={e => {
              e.stopPropagation();
              onRowChange({ columnId: "active", rowIndex: index, value: !row.active });
            }}
          >
            Toggle
          </button>
        </div>
      ))}
      {tableFooter}
    </div>
  ),
  TooltipSidePanel: ({ selectedTooltip, isOpen, onClose, onSave }: any) =>
    isOpen ? (
      <div data-testid="tooltip-side-panel">
        <span data-testid="panel-location">
          {selectedTooltip?.location ? fromLocationSlug(selectedTooltip.location) : ""}
        </span>
        <button data-testid="close-panel" onClick={onClose}>
          Close
        </button>
        {selectedTooltip?.id ? (
          <button
            data-testid="update-from-panel"
            onClick={() =>
              onSave({
                ...selectedTooltip,
                location: fromLocationSlug(selectedTooltip.location),
                tipText: "Updated tip",
              })
            }
          >
            Update
          </button>
        ) : (
          <button
            data-testid="create-from-panel"
            onClick={() =>
              onSave({ location: "New Location", tipText: "New tip text", active: false })
            }
          >
            Create
          </button>
        )}
      </div>
    ) : null,
  ListToolbar: ({ searchValue, onSearchChange, action }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
      />
      {action && (
        <button data-testid="create-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  ),
}));

vi.mock("@constants", () => ({
  TAG_TYPES: { TOOLTIPS: "Tooltips" },
  TOOLTIPS_TABLE_COLUMNS: [],
  SORT_BY: { CREATED_AT: "createdAt" },
  SORT_ORDER: { DESC: "desc" },
  en: {
    tooltip: {
      scenarioTooltips: "Tooltip Management",
      createTooltip: "Create Tooltip",
      searchTooltips: "Search tooltips...",
      tooltipCreated: "Tooltip created successfully",
      tooltipUpdated: "Tooltip updated successfully",
      locationAlreadyExists: "A tooltip for this location already exists",
    },
    errors: {
      failedToCreateTooltip: "Failed to create tooltip",
      failedToUpdateTooltip: "Failed to update tooltip",
    },
    common: {
      loading: "Loading...",
      loadMore: "Load more",
      noMoreData: "No more data",
    },
  },
}));

import { TooltipManagement } from "../Tooltips";

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: userSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"] },
    }).concat(baseAPI.middleware),
});

describe("TooltipManagement", () => {
  const mockTooltips = [
    {
      id: "t-1",
      location: "login_button",
      tipText: "Click to log in",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "t-2",
      location: "profile_icon",
      tipText: "View your profile",
      active: false,
      createdAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "t-3",
      location: "logout_button",
      tipText: "Click to log out",
      active: true,
      createdAt: "2026-01-03T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetTooltipsQuery.mockReturnValue({ data: mockTooltips, isFetching: false });
    mockCreateTooltip.mockResolvedValue({ data: { id: "new-id" } });
    mockUpdateTooltip.mockResolvedValue({ data: true });
  });

  afterEach(() => {
    testStore.dispatch(baseAPI.util.resetApiState());
  });

  const renderComponent = () =>
    render(
      <Provider store={testStore}>
        <TooltipManagement />
      </Provider>,
    );

  describe("Initial rendering", () => {
    it("renders the page title", () => {
      renderComponent();
      expect(screen.getByText("Tooltip Management")).toBeInTheDocument();
    });

    it("renders the search toolbar", () => {
      renderComponent();
      expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
    });

    it("renders the notion table", async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByTestId("notion-table")).toBeInTheDocument());
    });

    it("displays all tooltips in human-readable format in the table", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("location-0")).toHaveTextContent("Login Button");
        expect(screen.getByTestId("location-1")).toHaveTextContent("Profile Icon");
        expect(screen.getByTestId("location-2")).toHaveTextContent("Logout Button");
      });
    });

    it("renders Create Tooltip button", () => {
      renderComponent();
      expect(screen.getByTestId("create-button")).toHaveTextContent("Create Tooltip");
    });
  });

  describe("Loading state", () => {
    it("shows loading text when fetching", () => {
      mockUseGetTooltipsQuery.mockReturnValue({ data: mockTooltips, isFetching: true });
      renderComponent();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows Load more when response length equals limit (30)", async () => {
      mockUseGetTooltipsQuery.mockReturnValue({
        data: new Array(30).fill(mockTooltips[0]).map((t, i) => ({ ...t, id: `t-${i}` })),
        isFetching: false,
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText("Load more")).toBeInTheDocument());
    });

    it("shows No more data when response length is less than limit", async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText("No more data")).toBeInTheDocument());
    });
  });

  describe("Search", () => {
    it("updates search input value when typing", () => {
      renderComponent();
      const input = screen.getByTestId("search-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "login" } });
      expect(input.value).toBe("login");
    });

    it("calls API with search parameter", async () => {
      renderComponent();
      fireEvent.change(screen.getByTestId("search-input"), { target: { value: "login" } });
      await waitFor(() =>
        expect(mockUseGetTooltipsQuery).toHaveBeenCalledWith(
          expect.objectContaining({ search: "login" }),
        ),
      );
    });
  });

  describe("Create tooltip", () => {
    it("opens side panel when Create Tooltip button is clicked", async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => expect(screen.getByTestId("tooltip-side-panel")).toBeInTheDocument());
    });

    it("side panel has no pre-filled location for new tooltip", async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => expect(screen.getByTestId("panel-location")).toHaveTextContent(""));
    });

    it("calls createTooltip with slugified location on save", async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => screen.getByTestId("create-from-panel"));
      fireEvent.click(screen.getByTestId("create-from-panel"));
      await waitFor(() =>
        expect(mockCreateTooltip).toHaveBeenCalledWith(
          expect.objectContaining({ location: "new_location", tipText: "New tip text" }),
        ),
      );
    });

    it("shows success toast and closes panel on successful create", async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => screen.getByTestId("create-from-panel"));
      fireEvent.click(screen.getByTestId("create-from-panel"));
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Tooltip created successfully");
        expect(screen.queryByTestId("tooltip-side-panel")).not.toBeInTheDocument();
      });
    });

    it("shows generic error toast when create fails", async () => {
      mockCreateTooltip.mockResolvedValue({ error: { status: 500 } });
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => screen.getByTestId("create-from-panel"));
      fireEvent.click(screen.getByTestId("create-from-panel"));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to create tooltip"));
    });

    it("shows location already exists toast on 409 conflict", async () => {
      mockCreateTooltip.mockResolvedValue({ error: { status: 409 } });
      renderComponent();
      fireEvent.click(screen.getByTestId("create-button"));
      await waitFor(() => screen.getByTestId("create-from-panel"));
      fireEvent.click(screen.getByTestId("create-from-panel"));
      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith("A tooltip for this location already exists"),
      );
    });
  });

  describe("Edit tooltip", () => {
    it("opens side panel with human-readable location when row is clicked", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      expect(screen.getByTestId("tooltip-side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-location")).toHaveTextContent("Login Button");
    });

    it("closes side panel when close button is clicked", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      fireEvent.click(screen.getByTestId("close-panel"));
      await waitFor(() =>
        expect(screen.queryByTestId("tooltip-side-panel")).not.toBeInTheDocument(),
      );
    });

    it("calls updateTooltip with slugified location on save", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      fireEvent.click(screen.getByTestId("update-from-panel"));
      await waitFor(() =>
        expect(mockUpdateTooltip).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "t-1",
            data: expect.objectContaining({ location: "login_button" }),
          }),
        ),
      );
    });

    it("shows success toast and closes panel on successful update", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      fireEvent.click(screen.getByTestId("update-from-panel"));
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Tooltip updated successfully");
        expect(screen.queryByTestId("tooltip-side-panel")).not.toBeInTheDocument();
      });
    });

    it("shows generic error toast when update fails", async () => {
      mockUpdateTooltip.mockResolvedValue({ error: { status: 500 } });
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      fireEvent.click(screen.getByTestId("update-from-panel"));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to update tooltip"));
    });

    it("shows location already exists toast on 409 conflict during update", async () => {
      mockUpdateTooltip.mockResolvedValue({ error: { status: 409 } });
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("table-row-0")));
      fireEvent.click(screen.getByTestId("update-from-panel"));
      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith("A tooltip for this location already exists"),
      );
    });
  });

  describe("Inline row change", () => {
    it("calls updateTooltip when active is toggled inline", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("toggle-active-0")));
      await waitFor(() =>
        expect(mockUpdateTooltip).toHaveBeenCalledWith(
          expect.objectContaining({ id: "t-1", data: expect.objectContaining({ active: false }) }),
        ),
      );
    });

    it("shows success toast after inline active toggle", async () => {
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("toggle-active-0")));
      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith("Tooltip updated successfully"),
      );
    });

    it("shows error toast when inline change fails", async () => {
      mockUpdateTooltip.mockResolvedValue({ error: { status: 500 } });
      renderComponent();
      await waitFor(() => fireEvent.click(screen.getByTestId("toggle-active-0")));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to update tooltip"));
    });
  });
});
