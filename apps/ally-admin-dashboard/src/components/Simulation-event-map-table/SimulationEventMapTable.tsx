// This component is used to display the event map table for the simulation

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import {
  useGetSessionEventsQuery,
  useMapScenarioEventsMutation,
  useDeleteScenarioEventsMutation,
  useGetMappedScenarioEventsQuery,
} from "@api";
import { Add, Refresh, Trash } from "@assets";
import {
  NotionTable,
  cellTypes,
  Button,
  MappedEventSidePanel,
  EventMapTableLoader,
  BulkAddEventsSidePanel,
  SegmentedToggle,
} from "@components";
import { ButtonVariant } from "@components/types";
import { SESSION_EVENT_STATUS_OPTIONS, SORT_BY, SORT_ORDER, en } from "@constants";
import { UpdateScenarioEventDataParam } from "@types";
import {
  createNewEvent,
  formatToMappedEvent,
  convertToApiFormat,
  formatApiResponseToMappedEvent,
  createSessionEventsMap,
  MAPPED_EVENT_FIELDS,
  isNonEmptyString,
  addScoreColors,
} from "@utils";

interface SimulationEventMapTableProps {
  simulationId: string | undefined;
  /**
   * When set, the table operates in version mode: it loads from `versionEvents`
   * (the draft version's snapshot) and reports every change up via
   * `onVersionEventsChange` instead of writing to the live scenario. The live
   * scenario is only touched when the version is published.
   */
  versionId?: string;
  versionEvents?: any[];
  onVersionEventsChange?: (events: any[]) => void;
}

const DEBOUNCE_DELAY = 500;
const CHECKLIST_VIEW_COLUMN_IDS = new Set([
  "name",
  "message",
  "score",
  "checklistVisibilityStatus",
  "tags",
]);

type EventMapViewMode = "full" | "checklist";
const VIEW_MODE_OPTIONS = [
  { label: "Full View", value: "full" },
  { label: "Checklist View", value: "checklist" },
] as const;

export const SimulationEventMapTable: FC<SimulationEventMapTableProps> = ({
  simulationId,
  versionId,
  versionEvents,
  onVersionEventsChange,
}) => {
  const [mappedEvents, setMappedEvents] = useState<UpdateScenarioEventDataParam[]>([
    createNewEvent(),
  ]);
  const [eventOrderMapping, setEventOrderMapping] = useState<Record<string, number>>({});
  const [selectedEventRows, setSelectedEventRows] = useState<UpdateScenarioEventDataParam[]>([]);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] =
    useState<UpdateScenarioEventDataParam | null>(null);
  const [isBulkAddPanelOpen, setIsBulkAddPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<EventMapViewMode>("full");

  const { data: sessionEventsData, isLoading: isSessionEventsLoading } = useGetSessionEventsQuery({
    visibilityType: SESSION_EVENT_STATUS_OPTIONS.ACTIVE,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
  });
  const { data: mappedScenarioEventsData, isLoading: isMappedEventsLoading } =
    useGetMappedScenarioEventsQuery(
      {
        id: String(simulationId || ""),
      },
      {
        refetchOnMountOrArgChange: true,
      },
    );

  const [mapScenarioEvents] = useMapScenarioEventsMutation();
  const [deleteScenarioEvents] = useDeleteScenarioEventsMutation();

  const sessionEvents = useMemo(() => sessionEventsData?.data || [], [sessionEventsData]);
  const isLoading = isSessionEventsLoading || isMappedEventsLoading;

  const tableRef = useRef<HTMLDivElement>(null);

  // Tracks edits that are queued (debounced) or in-flight to the API. The
  // server-sync effect below must not overwrite local state while this is
  // non-empty/true, or a save made shortly after another save's refetch
  // resolves gets silently reverted (and never re-sent).
  const changedEventsRef = useRef<Map<string, UpdateScenarioEventDataParam>>(new Map());
  const isSavingRef = useRef(false);

  // Create a memoized map for quick event lookup
  const sessionEventsMap = useMemo(() => createSessionEventsMap(sessionEvents), [sessionEvents]);

  // Calculate available session events options (excluding already mapped events)
  const sessionEventsOptions = useMemo(() => {
    const sessionEventIds = new Set(sessionEvents.map(event => event.id));
    const mappedEventIds = new Set(
      mappedEvents
        .map(mappedEvent => mappedEvent.id?.value)
        .filter(eventId => sessionEventIds.has(eventId as string)),
    );
    return sessionEvents
      .filter(event => !mappedEventIds.has(event.id))
      .map(event => ({ label: event.name, value: event.id }));
  }, [sessionEvents, mappedEvents]);

  // Initialize mapped events. In version mode, seed from the version snapshot
  // when it has events; otherwise fall back to the live mapping (so branching
  // an older scenario that predates event-versioning still shows its events,
  // which then get captured into the draft on first edit).
  useEffect(() => {
    // Skip syncing from the server while a save is queued or in-flight — this
    // effect also re-runs on the refetch that every save triggers (they share
    // the SIMULATION_EVENTS tag), and overwriting local state mid-edit would
    // silently drop whatever hasn't round-tripped yet.
    if (changedEventsRef.current.size > 0 || isSavingRef.current) return;

    // An array (even empty) is authoritative — the version captured its events.
    // Only `undefined` (a version predating event-versioning) falls back to the
    // live mapping so branching an older scenario keeps its events.
    const sourceData =
      versionId && Array.isArray(versionEvents) ? versionEvents : mappedScenarioEventsData?.data;

    if (sourceData && sourceData.length > 0) {
      const formattedEvents = sourceData.map((event: any) =>
        formatApiResponseToMappedEvent(
          event,
          sessionEventsMap.get(event.eventId ?? event.id)?.detectionType,
        ),
      );

      if (mappedEvents.length <= 1) updateEventOrderMapping(formattedEvents);
      setMappedEvents(formattedEvents);
    } else {
      setMappedEvents([createNewEvent()]);
    }
  }, [mappedScenarioEventsData, sessionEventsMap, versionId, versionEvents]);

  // Version mode: report the full event set to the parent on every change so it
  // can be saved into the version config (never to the live scenario). Deps are
  // intentionally limited to the event set + version id.
  useEffect(() => {
    if (!versionId || !onVersionEventsChange) return;
    onVersionEventsChange(convertToApiFormat(mappedEvents));
  }, [mappedEvents, versionId]);

  // Table columns configuration
  const tableColumns = useMemo(() => {
    return [
      {
        id: MAPPED_EVENT_FIELDS.NAME,
        label: "Event name",
        accessor: MAPPED_EVENT_FIELDS.NAME,
        placeholder: "Select an event",
        dataType: cellTypes.dropdownSearchable,
        options: sessionEventsOptions,
        minWidth: 180,
      },
      {
        id: MAPPED_EVENT_FIELDS.FEEDBACK_STATUS,
        label: "Real time feedback status",
        accessor: MAPPED_EVENT_FIELDS.FEEDBACK_STATUS,
        dataType: cellTypes.switch,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.EMOJI,
        label: "Real time feedback emoji",
        accessor: MAPPED_EVENT_FIELDS.EMOJI,
        dataType: cellTypes.emoji_select,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.MESSAGE,
        label: "Real time feedback message",
        accessor: MAPPED_EVENT_FIELDS.MESSAGE,
        placeholder: "Add feedback",
        dataType: cellTypes.editableText,
        options: [],
        minWidth: 180,
      },
      {
        id: MAPPED_EVENT_FIELDS.SCORE,
        label: "Session quality score",
        accessor: MAPPED_EVENT_FIELDS.SCORE,
        placeholder: "Add score",
        dataType: cellTypes.number,
        options: [],
        minWidth: 120,
      },

      {
        id: MAPPED_EVENT_FIELDS.START_TIME,
        label: "Applicable from",
        accessor: MAPPED_EVENT_FIELDS.START_TIME,
        dataType: cellTypes.timeInput,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.END_TIME,
        label: "Applicable till",
        accessor: MAPPED_EVENT_FIELDS.END_TIME,
        dataType: cellTypes.timeInput,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.MAX_OCCURRENCES,
        label: "Max occurrences",
        accessor: MAPPED_EVENT_FIELDS.MAX_OCCURRENCES,
        dataType: cellTypes.score,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.MIN_GAP_TIME,
        label: "Min gap time",
        accessor: MAPPED_EVENT_FIELDS.MIN_GAP_TIME,
        dataType: cellTypes.timeInput,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.OCCURRENCE_INTERVAL,
        label: "Occurrence Interval",
        accessor: MAPPED_EVENT_FIELDS.OCCURRENCE_INTERVAL,
        dataType: cellTypes.number,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.MIN_SCORE,
        label: "Min score",
        accessor: MAPPED_EVENT_FIELDS.MIN_SCORE,
        dataType: cellTypes.score,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.MAX_SCORE,
        label: "Max score",
        accessor: MAPPED_EVENT_FIELDS.MAX_SCORE,
        dataType: cellTypes.score,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.BRANCHING_STATUS,
        label: "Branching status",
        accessor: MAPPED_EVENT_FIELDS.BRANCHING_STATUS,
        dataType: cellTypes.switch,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION,
        label: "Branch to state",
        accessor: MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION,
        placeholder: "Add branch to state",
        dataType: cellTypes.textAreaWithDropdown,
        options: [],
        minWidth: 180,
      },
      {
        id: MAPPED_EVENT_FIELDS.CHECKLIST_VISIBILITY_STATUS,
        label: "Checklist visibility",
        accessor: MAPPED_EVENT_FIELDS.CHECKLIST_VISIBILITY_STATUS,
        dataType: cellTypes.switch,
        options: [],
        minWidth: 120,
      },
      {
        id: MAPPED_EVENT_FIELDS.TAGS,
        label: "Tags",
        accessor: MAPPED_EVENT_FIELDS.TAGS,
        dataType: cellTypes.tags,
        options: [],
        minWidth: 150,
      },
    ];
  }, [sessionEventsOptions]);

  const visibleColumns = useMemo(() => {
    if (viewMode === "full") {
      return tableColumns;
    }

    return tableColumns.filter(column => CHECKLIST_VIEW_COLUMN_IDS.has(column.id));
  }, [tableColumns, viewMode]);

  const updateEventOrderMapping = (events: UpdateScenarioEventDataParam[]) => {
    const sortedEvents = [...events].sort((a, b) => (a.score?.value ?? 0) - (b.score?.value ?? 0));
    const orderMapping = sortedEvents.reduce(
      (acc, event, index) => {
        acc[event.id?.value || ""] = index + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    setEventOrderMapping(orderMapping);
  };

  const onReloadMappedEvents = () => {
    setTimeout(() => {
      updateEventOrderMapping(mappedEvents);
      // Target the NotionTable's scrollable container (has overflow-auto class)
      const scrollableElement = tableRef.current?.querySelector(".overflow-auto");
      scrollableElement?.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const sortMappedEvents = useMemo(() => {
    return [...mappedEvents].sort((a, b) => {
      const orderA = eventOrderMapping[a.id.value] ?? Number.MAX_SAFE_INTEGER;
      const orderB = eventOrderMapping[b.id.value] ?? Number.MAX_SAFE_INTEGER;

      return orderA - orderB;
    });
  }, [mappedEvents, eventOrderMapping]);

  const tableData = useMemo(() => {
    return addScoreColors(sortMappedEvents);
  }, [sortMappedEvents]);

  // Helper function to save events to API
  const saveEventsToApi = useCallback(
    async (events: UpdateScenarioEventDataParam[]) => {
      if (!simulationId) return;
      // Version mode persists through onVersionEventsChange (see effect above);
      // never write event changes to the live scenario.
      if (versionId) return;
      const apiEvents = convertToApiFormat(events);
      isSavingRef.current = true;
      try {
        const response: any = await mapScenarioEvents({
          scenarioId: Number(simulationId),
          events: apiEvents,
        });
        if (response?.error?.data?.message) {
          toast.error(response.error.data.message || en.errors.failedToSaveEvents);
        }
      } catch {
        toast.error(en.errors.failedToSaveEvents);
      } finally {
        isSavingRef.current = false;
      }
    },
    [simulationId, mapScenarioEvents, versionId],
  );

  // Debounced save for cell updates (to prevent multiple saves when typing quickly in number input)
  const debouncedSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSaveEventsToApi = useCallback(
    (event: UpdateScenarioEventDataParam) => {
      if (event.id?.value) {
        changedEventsRef.current.set(event.id.value as string, event);
      }

      if (debouncedSaveTimeoutRef.current) {
        clearTimeout(debouncedSaveTimeoutRef.current);
      }
      debouncedSaveTimeoutRef.current = setTimeout(() => {
        const eventsToSave = Array.from(changedEventsRef.current.values());
        if (eventsToSave.length > 0) {
          saveEventsToApi(eventsToSave);
          changedEventsRef.current.clear();
        }
      }, DEBOUNCE_DELAY);
    },
    [saveEventsToApi],
  );

  // Helper function to update an event by ID
  const updateEventById = useCallback(
    (
      eventId: string,
      updater: (event: UpdateScenarioEventDataParam) => UpdateScenarioEventDataParam,
    ) => {
      let updatedEvent: UpdateScenarioEventDataParam | null = null;
      const updatedEvents = mappedEvents.map(event => {
        if (event.id?.value === eventId) {
          updatedEvent = updater(event);
          return updatedEvent;
        }
        return event;
      });
      setMappedEvents(updatedEvents);
      if (updatedEvent) {
        debouncedSaveEventsToApi(updatedEvent);
      }
    },
    [mappedEvents, debouncedSaveEventsToApi],
  );

  // Add a new event row
  const handleAddEventInternal = () => {
    const newEvent = createNewEvent();
    setMappedEvents(previousEvents => [newEvent, ...previousEvents]);
    setSelectedEventForEdit(newEvent);
    setIsSidePanelOpen(true);
  };

  // Handle event selection changes in the table
  const handleEventSelectionChange = useCallback(
    (selectedEvents: UpdateScenarioEventDataParam[]) => {
      setSelectedEventRows(previousSelected => {
        if (previousSelected.length === selectedEvents.length) {
          const previousIds = new Set(previousSelected.map(event => event.id.value));
          const allSame = selectedEvents.every(event => previousIds.has(event.id.value));
          if (allSame) return previousSelected;
        }
        return selectedEvents;
      });
    },
    [],
  );

  // Delete selected events
  const handleDeleteSelectedEvents = async () => {
    try {
      const eventIds = selectedEventRows.map(event => event.id.value)?.filter(isNonEmptyString);
      // Version mode: removal is reflected in local state and reported up via
      // the version-events effect; don't delete from the live scenario.
      if (eventIds?.length > 0 && !versionId) {
        await deleteScenarioEvents({
          scenarioId: Number(simulationId),
          eventIds: selectedEventRows.map(event => event.id.value),
        });
      }
      setMappedEvents(previousEvents =>
        previousEvents.filter(event => !selectedEventRows.includes(event)),
      );
      setSelectedEventRows([]);
      toast.success(en.simulation.eventsDeletedSuccessfully);
    } catch {
      toast.error(en.errors.failedToSaveEvents);
    }
  };

  // Handle table cell updates
  const handleUpdateEventTable = useCallback(
    action => {
      const { columnId, value, rowId } = action;

      if (columnId === MAPPED_EVENT_FIELDS.NAME) {
        // When updating name, value is the event ID, so find the event details
        const selectedEvent = sessionEventsMap.get(value);
        if (selectedEvent) {
          const formattedEvent = formatToMappedEvent(selectedEvent);
          const updatedEvents = mappedEvents.map(mappedEvent =>
            mappedEvent?.id?.value === rowId ? formattedEvent : mappedEvent,
          );
          setMappedEvents(updatedEvents);
          saveEventsToApi([formattedEvent]);
        }
      } else {
        // For other columns, just update that specific field using rowId
        updateEventById(rowId, mappedEvent => ({
          ...mappedEvent,
          [columnId]: { value, disabled: false, rowId },
        }));
      }
    },
    [mappedEvents, sessionEventsMap, saveEventsToApi, updateEventById],
  );

  // Open side panel for event editing
  const handleOpenMappedEventSidePanel = (rowIndex: number) => {
    const selectedEvent = tableData[rowIndex];
    if (selectedEvent && selectedEvent.id?.value) {
      setSelectedEventForEdit(selectedEvent);
    } else {
      setSelectedEventForEdit(createNewEvent());
    }
    setIsSidePanelOpen(true);
  };

  // Close side panel
  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedEventForEdit(null);
  };

  // Update mapped event from side panel
  const handleUpdateMappedEvent = (updatedEvent: UpdateScenarioEventDataParam) => {
    const updatedEvents = mappedEvents.map(event =>
      event.id?.value === updatedEvent.id?.value ? updatedEvent : event,
    );
    setMappedEvents(updatedEvents);
    saveEventsToApi([updatedEvent]);
  };

  // Delete mapped event from side panel
  const handleDeleteMappedEvent = async (eventId?: string) => {
    try {
      if (isNonEmptyString(eventId)) {
        await deleteScenarioEvents({
          scenarioId: Number(simulationId),
          eventIds: [eventId],
        });
        toast.success("Event deleted successfully");
      }
      setMappedEvents(previousEvents =>
        previousEvents.filter(event => event.id?.value !== eventId),
      );
      handleCloseSidePanel();
    } catch {
      toast.error(en.errors.failedToDeleteEvent);
    }
  };

  // Handle event selection from side panel
  const handleEventSelect = useCallback(
    (eventId: string) => {
      const selectedSessionEvent = sessionEventsMap.get(eventId);
      if (selectedSessionEvent) {
        const formattedEvent = formatToMappedEvent(selectedSessionEvent);
        setSelectedEventForEdit(formattedEvent);

        const updatedEvents = mappedEvents.map(event =>
          event.id?.value === "" ? formattedEvent : event,
        );
        setMappedEvents(updatedEvents);
        saveEventsToApi([formattedEvent]);
      }
    },
    [sessionEventsMap, mappedEvents, saveEventsToApi],
  );

  // Handle bulk add events
  const handleBulkAddEvents = useCallback(
    async (events: UpdateScenarioEventDataParam[]) => {
      if (events.length === 0) {
        setIsBulkAddPanelOpen(false);
        return;
      }

      // Add events to the beginning of mappedEvents array
      const updatedEvents = [...events, ...mappedEvents];
      setMappedEvents(updatedEvents);

      // Save to API
      await saveEventsToApi(events);

      // Close panel
      setIsBulkAddPanelOpen(false);

      // Show success message
      toast.success(en.simulation.bulkAddSuccess(events.length));
    },
    [mappedEvents, saveEventsToApi],
  );

  const renderBulkAddButton = () => {
    return (
      <Button variant={ButtonVariant.PRIMARY} onClick={() => setIsBulkAddPanelOpen(true)}>
        <Add />
        {en.simulation.bulkAddEvents}
      </Button>
    );
  };

  // Render action buttons (Add or Delete)
  const renderActionButtons = () => {
    const disabled = Boolean(mappedEvents?.find(event => event?.id?.value === ""));
    if (selectedEventRows?.length > 0) {
      return (
        <Button variant={ButtonVariant.SECONDARY} onClick={handleDeleteSelectedEvents}>
          <Trash /> {` ${en.common.delete}`}
        </Button>
      );
    }
    return (
      <Button disabled={disabled} variant={ButtonVariant.PRIMARY} onClick={handleAddEventInternal}>
        <Add />
        {`${en.simulation.addEvent}`}
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
        <div className="flex flex-row items-center gap-2 text-lg font-semibold text-typography-900 font-primary">
          <div className="cursor-pointer" onClick={onReloadMappedEvents}>
            <Refresh className="w-4 h-4" />
          </div>
          <SegmentedToggle
            label="Advanced settings view"
            value={viewMode}
            options={VIEW_MODE_OPTIONS}
            onChange={setViewMode}
          />
        </div>
        <div className="flex gap-2">
          {!isLoading && (
            <>
              {renderBulkAddButton()}
              {renderActionButtons()}
            </>
          )}
        </div>
      </div>
      <div
        ref={tableRef}
        className="p-6 pt-4 pr-0 overflow-y-hidden overflow-x-scroll w-full custom-scrollbar"
      >
        {isLoading ? (
          <EventMapTableLoader />
        ) : (
          <NotionTable
            tableData={{
              data: tableData,
              columns: visibleColumns,
            }}
            onRowChange={handleUpdateEventTable}
            onRowClick={handleOpenMappedEventSidePanel}
            onSelectionChange={handleEventSelectionChange}
            tableFooter={<div className="h-[200px]" />}
          />
        )}
      </div>
      <MappedEventSidePanel
        selectedEvent={selectedEventForEdit}
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
        onDelete={handleDeleteMappedEvent}
        onUpdate={handleUpdateMappedEvent}
        sessionEvents={sessionEvents}
        availableEventOptions={sessionEventsOptions}
        onEventSelect={handleEventSelect}
      />
      <BulkAddEventsSidePanel
        isOpen={isBulkAddPanelOpen}
        onClose={() => setIsBulkAddPanelOpen(false)}
        sessionEvents={sessionEvents}
        mappedEvents={mappedEvents}
        onBulkAdd={handleBulkAddEvents}
      />
    </div>
  );
};
