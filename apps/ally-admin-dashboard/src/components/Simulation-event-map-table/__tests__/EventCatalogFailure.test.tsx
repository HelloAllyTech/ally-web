// The event catalogue behind the advanced-events picker is one request. When it
// fails, the picker used to render as an ordinary empty list — every search
// answered "No results" — so the failure looked like "that event doesn't
// exist", and reloading the whole page was the only way out. These tests pin
// the two halves of the fix: the failure is named where the search happens, and
// the table's own refresh control actually refetches.

// `@constants` first: SimulationCreator.ts imports `cellTypes` from the
// `@components` barrel, so pulling constants in through the component under
// test leaves that circular edge half-initialised.
import "@constants";

import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@api", async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useGetSessionEventsQuery: vi.fn(),
    useGetMappedScenarioEventsQuery: vi.fn(),
    useMapScenarioEventsMutation: vi.fn(() => [vi.fn(() => Promise.resolve({}))]),
    useDeleteScenarioEventsMutation: vi.fn(() => [vi.fn(() => Promise.resolve({}))]),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import * as api from "@api";
import { en } from "@constants";
import { store } from "@src/store";

import { SimulationEventMapTable } from "../SimulationEventMapTable";

const CATALOG = [
  { id: "e1", name: "Rude language detected", eventCode: "BC-RUDE", detectionType: "BEHAVIOR" },
  { id: "e2", name: "Low score threshold crossed", eventCode: "SC-LOW", detectionType: "SCORE" },
  { id: "e3", name: "Demonstrated active listening", eventCode: "SS-LISTEN", detectionType: "SS" },
];

const MAPPED = [
  {
    eventId: "e3",
    id: "e3",
    name: "Demonstrated active listening",
    score: 0,
    emoji: "🫥",
    message: "",
    feedbackStatus: false,
    branchingStatus: false,
    branchInstruction: "",
  },
];

const renderTable = () =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/create-simulation/edit/2"]}>
        <SimulationEventMapTable simulationId="2" />
      </MemoryRouter>
    </Provider>,
  );

const openEventPicker = () => {
  fireEvent.click(screen.getByText(en.simulation.addEvent));
  fireEvent.click(screen.getByText("Select an event"));
};

describe("SimulationEventMapTable — event catalogue failures", () => {
  let refetchSessionEvents: ReturnType<typeof vi.fn>;
  let refetchMappedEvents: ReturnType<typeof vi.fn>;

  const mockCatalog = (overrides: Record<string, unknown>) => {
    vi.mocked(api.useGetSessionEventsQuery).mockReturnValue({
      data: { data: CATALOG },
      isLoading: false,
      isError: false,
      refetch: refetchSessionEvents,
      ...overrides,
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    refetchSessionEvents = vi.fn();
    refetchMappedEvents = vi.fn();
    mockCatalog({});
    vi.mocked(api.useGetMappedScenarioEventsQuery).mockReturnValue({
      data: { data: MAPPED },
      isLoading: false,
      refetch: refetchMappedEvents,
    } as any);
  });

  it("finds an event by name when the catalogue loaded", () => {
    renderTable();
    openEventPicker();

    fireEvent.change(screen.getByPlaceholderText("Search events"), {
      target: { value: "rude" },
    });

    expect(screen.getByText(/Rude language detected/)).toBeTruthy();
    expect(screen.queryByText(/No results/i)).toBeNull();
    expect(screen.queryByText(en.simulation.eventCatalogLoadFailed)).toBeNull();
  });

  it("names the failure in the picker instead of answering 'No results'", () => {
    mockCatalog({ data: undefined, isError: true });
    renderTable();
    openEventPicker();

    fireEvent.change(screen.getByPlaceholderText("Search events"), {
      target: { value: "rude" },
    });

    expect(screen.queryByText(/No results/i)).toBeNull();
    // Named in the dropdown (where the search happens) and in the toolbar.
    expect(screen.getAllByText(en.simulation.eventCatalogLoadFailed).length).toBeGreaterThan(0);
  });

  it("retries the catalogue from the picker's own retry control", () => {
    mockCatalog({ data: undefined, isError: true });
    renderTable();
    openEventPicker();

    // The panel covers the table, so the retry offered next to the failure has
    // to be the one inside the dropdown.
    const retryButtons = screen.getAllByText(en.common.retry);
    fireEvent.click(retryButtons[retryButtons.length - 1]);

    expect(refetchSessionEvents).toHaveBeenCalled();
  });

  it("refetches both the catalogue and the mapping when refresh is clicked", () => {
    renderTable();

    fireEvent.click(screen.getByLabelText(en.simulation.reloadEvents));

    expect(refetchSessionEvents).toHaveBeenCalledTimes(1);
    expect(refetchMappedEvents).toHaveBeenCalledTimes(1);
  });

  it("asks for the catalogue on mount rather than serving a cached failure", () => {
    renderTable();

    const options = vi.mocked(api.useGetSessionEventsQuery).mock.calls[0]?.[1];
    expect(options).toMatchObject({ refetchOnMountOrArgChange: true });
  });
});
