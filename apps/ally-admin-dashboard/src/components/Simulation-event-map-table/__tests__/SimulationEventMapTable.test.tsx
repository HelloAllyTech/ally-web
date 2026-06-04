import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API module
vi.mock("@api", () => ({
  useGetSessionEventsQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useGetMappedScenarioEventsQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useMapScenarioEventsMutation: vi.fn(() => [vi.fn()]),
  useDeleteScenarioEventsMutation: vi.fn(() => [vi.fn()]),
}));

import * as api from "@api";

import { SimulationEventMapTable } from "../SimulationEventMapTable";

vi.mock("@assets", () => ({
  Trash: () => <svg data-testid="trash-icon" />,
  Add: () => <svg data-testid="add-icon">+</svg>,
  Refresh: () => <svg data-testid="refresh-icon" />,
}));

vi.mock("@components", () => ({
  NotionTable: ({
    onSelectionChange = () => {},
    onRowClick = () => {},
    onRowChange = () => {},
    tableData = { columns: [] },
  }: any) => (
    <div>
      <div
        data-testid="notion-table"
        data-columns={tableData.columns?.length ?? 0}
        data-column-labels={(tableData.columns ?? []).map((column: any) => column.label).join("|")}
      />
      <button
        onClick={() => onSelectionChange([{ id: { value: "evt-1" } }])}
        data-testid="select-rows"
      >
        select rows
      </button>
      <button onClick={() => onRowClick(0)} data-testid="row-click">
        row click
      </button>
      <button
        onClick={() => onRowChange({ columnId: "name", value: "e1", rowId: "" })}
        data-testid="row-change"
      >
        row change
      </button>
    </div>
  ),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SegmentedToggle: ({ options, value, onChange, label }: any) => (
    <div role="tablist" aria-label={label}>
      {options.map((option: any) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  MappedEventSidePanel: ({ isOpen }: any) =>
    isOpen ? <div data-testid="side-panel-open" /> : null,
  BulkAddEventsSidePanel: ({ isOpen }: any) =>
    isOpen ? <div data-testid="bulk-add-panel-open" /> : null,
  EventMapTableLoader: () => <div data-testid="loader" />,
  cellTypes: {
    dropdownSearchable: "dropdownSearchable",
    switch: "switch",
    emoji_select: "emoji_select",
    editableText: "editableText",
    number: "number",
    timeInput: "timeInput",
    score: "score",
    textAreaWithDropdown: "textAreaWithDropdown",
    tags: "tags",
  },
}));

vi.mock("@constants", () => ({
  en: {
    simulation: {
      addEvent: "Add Event",
      eventConfiguration: "Event Configuration",
      advancedSettings: "Event Configuration",
      eventsDeletedSuccessfully: "Events deleted successfully",
    },
    common: { delete: "Delete" },
    errors: {
      failedToSaveEvents: "Failed to save events",
      failedToDeleteEvent: "Failed to delete event",
    },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  SESSION_EVENT_STATUS_OPTIONS: {
    ACTIVE: "ACTIVE",
  },
  SORT_BY: {
    CREATED_AT: "createdAt",
  },
  SORT_ORDER: {
    DESC: "desc",
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@utils", () => ({
  createNewEvent: vi.fn(() => ({
    id: { value: "", disabled: false, rowId: "" },
    name: { value: "", disabled: false, rowId: "" },
    score: { value: 0, disabled: true, rowId: "" },
    emoji: { value: "🫥", disabled: true, rowId: "" },
    message: { value: "", disabled: true, rowId: "" },
    feedbackStatus: { value: false, disabled: false, rowId: "" },
    branchingStatus: { value: false, disabled: false, rowId: "" },
    branchInstruction: { value: "", disabled: true, rowId: "" },
    checklistVisibilityStatus: { value: false, disabled: false, rowId: "" },
  })),
  addScoreColors: vi.fn((data: any) => data),
  formatToMappedEvent: vi.fn((ev: any) => ({
    id: { value: ev.id, disabled: false, rowId: ev.id },
    name: { value: ev.name || ev.id, disabled: false, rowId: ev.id },
    score: { value: ev.score ?? 0, disabled: false, rowId: ev.id },
    emoji: { value: ev.emoji || "🫥", disabled: false, rowId: ev.id },
    message: { value: ev.message || "", disabled: false, rowId: ev.id },
    feedbackStatus: { value: true, disabled: false, rowId: ev.id },
    branchingStatus: { value: true, disabled: false, rowId: ev.id },
    branchInstruction: { value: ev.branchInstruction || "", disabled: false, rowId: ev.id },
    checklistVisibilityStatus: {
      value: ev.checklistVisibilityStatus ?? false,
      disabled: false,
      rowId: ev.id,
    },
  })),
  convertToApiFormat: vi.fn((events: any[]) =>
    events
      .map((e: any) => ({
        id: e.id?.value,
        name: e.name?.value,
        score: e.score?.value,
        emoji: e.emoji?.value,
        message: e.message?.value,
        feedbackStatus: e.feedbackStatus?.value,
        branchingStatus: e.branchingStatus?.value,
        branchInstruction: e.branchInstruction?.value,
        checklistVisibilityStatus: e.checklistVisibilityStatus?.value ?? false,
      }))
      .filter((ev: any) => typeof ev?.id === "string" && ev.id.trim().length > 0),
  ),
  formatApiResponseToMappedEvent: vi.fn((ev: any) => ({
    id: { value: ev.eventId, disabled: false, rowId: ev.eventId },
    name: { value: ev.name, disabled: false, rowId: ev.eventId },
    score: { value: ev.score, disabled: false, rowId: ev.eventId },
    emoji: { value: ev.emoji, disabled: false, rowId: ev.eventId },
    message: { value: ev.message, disabled: false, rowId: ev.eventId },
    feedbackStatus: { value: ev.feedbackStatus, disabled: false, rowId: ev.eventId },
    branchingStatus: { value: ev.branchingStatus, disabled: false, rowId: ev.eventId },
    branchInstruction: { value: ev.branchInstruction, disabled: false, rowId: ev.eventId },
    checklistVisibilityStatus: {
      value: ev.checklistVisibilityStatus ?? false,
      disabled: false,
      rowId: ev.eventId,
    },
  })),
  createSessionEventsMap: vi.fn((events: any[]) => new Map(events.map((e: any) => [e.id, e]))),
  MAPPED_EVENT_FIELDS: {
    NAME: "name",
    FEEDBACK_STATUS: "feedbackStatus",
    EMOJI: "emoji",
    MESSAGE: "message",
    SCORE: "score",
    START_TIME: "startTime",
    END_TIME: "endTime",
    MAX_OCCURRENCES: "maxOccurrences",
    MIN_GAP_TIME: "minGapTime",
    OCCURRENCE_INTERVAL: "occurrenceInterval",
    MIN_SCORE: "minScore",
    MAX_SCORE: "maxScore",
    BRANCHING_STATUS: "branchingStatus",
    BRANCH_INSTRUCTION: "branchInstruction",
    CHECKLIST_VISIBILITY_STATUS: "checklistVisibilityStatus",
    TAGS: "tags",
  },
  isObject: vi.fn((v: any) => typeof v === "object" && v !== null),
  isNonEmptyString: vi.fn((v: any) => typeof v === "string" && v.trim().length > 0),
}));

describe("SimulationEventMapTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default return values
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any);
    vi.mocked(api.useMapScenarioEventsMutation).mockReturnValue([vi.fn()] as any);
    vi.mocked(api.useDeleteScenarioEventsMutation).mockReturnValue([vi.fn()] as any);
  });

  it("shows loader while data is loading", () => {
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<SimulationEventMapTable simulationId={"123"} />);
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByText("Add Event")).not.toBeInTheDocument();
  });

  it("renders table and disabled add button when there is a blank new row", () => {
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValueOnce({
      data: { data: [{ id: "e1", name: "Event 1" }] },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValueOnce({
      data: { data: [] },
      isLoading: false,
    } as any);

    render(<SimulationEventMapTable simulationId={"123"} />);

    expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    const addBtn = screen.getByText("Add Event").closest("button") as HTMLButtonElement;
    expect(addBtn).toBeDisabled();
  });

  it("defaults to full view and switches to checklist view columns", () => {
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValueOnce({
      data: { data: [{ id: "e1", name: "Event 1" }] },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValueOnce({
      data: { data: [] },
      isLoading: false,
    } as any);

    render(<SimulationEventMapTable simulationId={"123"} />);

    const table = screen.getByTestId("notion-table");
    expect(table).toHaveAttribute("data-columns", "16");
    expect(table).toHaveAttribute(
      "data-column-labels",
      expect.stringContaining("Real time feedback emoji"),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Checklist View" }));

    expect(table).toHaveAttribute("data-columns", "5");
    expect(table).toHaveAttribute(
      "data-column-labels",
      "Event name|Real time feedback message|Session quality score|Checklist visibility|Tags",
    );
  });

  it("enables add and opens side panel when API returns existing mapped events", async () => {
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: { data: [{ id: "e1", name: "Event 1" }] },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: {
        data: [
          {
            eventId: "e1",
            name: "Event 1",
            score: 0,
            emoji: "🫥",
            message: "",
            feedbackStatus: false,
            branchingStatus: false,
            branchInstruction: "",
            checklistVisibilityStatus: false,
          },
        ],
      },
      isLoading: false,
    } as any);

    render(<SimulationEventMapTable simulationId={"123"} />);

    // Wait for the component to process the mapped events
    await waitFor(() => {
      const addBtn = screen.getByText("Add Event").closest("button") as HTMLButtonElement;
      expect(addBtn).not.toBeDisabled();
    });

    const addBtn = screen.getByText("Add Event").closest("button") as HTMLButtonElement;
    fireEvent.click(addBtn);
    expect(screen.getByTestId("side-panel-open")).toBeInTheDocument();
  });

  it("shows delete button when rows are selected and calls delete mutation", async () => {
    const deleteMock = vi.fn().mockResolvedValueOnce({});
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: { data: [{ id: "e1", name: "Event 1" }] },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: {
        data: [
          {
            eventId: "e1",
            name: "Event 1",
            score: 0,
            emoji: "🫥",
            message: "",
            feedbackStatus: false,
            branchingStatus: false,
            branchInstruction: "",
            checklistVisibilityStatus: false,
          },
        ],
      },
      isLoading: false,
    } as any);
    vi.mocked(api.useDeleteScenarioEventsMutation).mockReturnValue([deleteMock] as any);

    render(<SimulationEventMapTable simulationId={"123"} />);

    // Wait for mapped events to be processed
    await waitFor(() => {
      const addBtn = screen.getByText("Add Event").closest("button") as HTMLButtonElement;
      expect(addBtn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("select-rows"));

    await waitFor(() => {
      const delBtn = screen.getByText("Delete");
      expect(delBtn).toBeInTheDocument();
    });

    const delBtn = screen.getByText("Delete");
    fireEvent.click(delBtn);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  it("only sends updated events to the API when a row is changed", async () => {
    const mapMock = vi.fn().mockResolvedValueOnce({});
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: {
        data: [
          { id: "e1", name: "Event 1", detectionType: "SCORE" },
          { id: "e2", name: "Event 2", detectionType: "SCORE" },
        ],
      },
      isLoading: false,
    } as any);
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: {
        data: [
          {
            eventId: "e1",
            name: "Event 1",
            score: 0,
            emoji: "🫥",
            message: "",
            feedbackStatus: false,
            branchingStatus: false,
            branchInstruction: "",
            checklistVisibilityStatus: false,
          },
          {
            eventId: "e2",
            name: "Event 2",
            score: 0,
            emoji: "🫥",
            message: "",
            feedbackStatus: false,
            branchingStatus: false,
            branchInstruction: "",
            checklistVisibilityStatus: false,
          },
        ],
      },
      isLoading: false,
    } as any);
    vi.mocked(api.useMapScenarioEventsMutation).mockReturnValue([mapMock] as any);

    render(<SimulationEventMapTable simulationId={"123"} />);

    await waitFor(() => {
      const addBtn = screen.getByText("Add Event").closest("button") as HTMLButtonElement;
      expect(addBtn).not.toBeDisabled();
    });

    // Simulate changing a row value (specifically 'name' column triggers immediate event swap)
    fireEvent.click(screen.getByTestId("row-change"));

    // Wait until our debounce or saveEventsToApi finishes
    await waitFor(() => {
      expect(mapMock).toHaveBeenCalled();
    });

    // Validate payload only sent the updated row (length 1) instead of all rows
    const payload = mapMock.mock.calls[0][0];
    expect(payload).toEqual({
      scenarioId: 123,
      events: expect.any(Array),
    });
    expect(payload.events.length).toBe(1);
    expect(payload.events[0].id).toBe("e1");
  });
});
