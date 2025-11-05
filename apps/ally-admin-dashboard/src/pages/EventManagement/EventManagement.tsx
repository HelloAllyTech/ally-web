import React, { useEffect, useState, useMemo, useCallback } from "react";

import { generateSequentialEventName } from "@utils/eventNameGenerator";
import { toast } from "sonner";

import {
  useGetSessionEventsQuery,
  useUpdateSessionEventMutation,
  useCreateSessionEventsMutation,
  useDeleteSessionEventsMutation,
} from "@api";
import { Trash } from "@assets";
import {
  NotionTable,
  EventSidePanel,
  ListToolbar,
  ActionConfirmationPopup,
  EventTypeSelectionDialog,
} from "@components";
import { EventType } from "@components/event-type-selection-dialog";
import { ButtonVariant } from "@components/types";
import {
  SORT_BY,
  SORT_ORDER,
  EVENT_MANAGEMENT_TABLE_COLUMNS,
  en,
  SESSION_EVENT_STATUS_OPTIONS,
} from "@constants";
import { UpdateEventDataParam } from "@types";

export const EventManagement: React.FC = () => {
  const limit = 30;

  const [offset, setOffset] = useState<number>(0);
  const [events, setEvents] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [eventSearch, setEventSearch] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<UpdateEventDataParam | null>(null);
  const [showDeleteConfirmationPopup, setShowDeleteConfirmationPopup] = useState<boolean>(false);
  const [showEventTypeDialog, setShowEventTypeDialog] = useState<boolean>(false);

  const { data: sessionEventsData, isFetching } = useGetSessionEventsQuery({
    visibilityType: SESSION_EVENT_STATUS_OPTIONS.ACTIVE,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    searchName: eventSearch,
  });
  const [updateSessionEvent] = useUpdateSessionEventMutation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [createSessionEvents] = useCreateSessionEventsMutation(); // Used in production code (commented out for testing)
  const [deleteSessionEvents] = useDeleteSessionEventsMutation();

  // Handle data updates when query data changes
  useEffect(() => {
    const incoming = sessionEventsData?.data;
    if (incoming) {
      setHasMore(incoming.length === limit);

      if (offset === 0) {
        setEvents(incoming);
      } else {
        setEvents(prev => {
          const seen = new Set(prev.map(event => event.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }
    }
  }, [sessionEventsData, offset]);

  const onSearchChange = (value: string) => {
    setEventSearch(value);
    setOffset(0);
  };

  const handleNewEventClick = () => {
    setShowEventTypeDialog(true);
  };

  const handleEventTypeSelect = async (eventType: EventType) => {
    // Get all existing event names to generate sequential name
    const existingEventNames = events
      .map(event => event.name || "")
      .filter(name => name.length > 0);

    // Generate sequential event name based on type
    const eventName = generateSequentialEventName(eventType, existingEventNames);

    let triggerCondition:
      | { operator: string; value: string | number; speaker?: string }
      | { conditions: any[] }
      | undefined;

    if (eventType === "TIME_BASED") {
      triggerCondition = { operator: "LESS_THAN", value: "00:20:00" };
    } else if (eventType === "SCORE_BASED") {
      triggerCondition = { operator: "GREATER_THAN", value: 0, speaker: "CARE_GIVER" };
    } else if (eventType === "COMBINATION") {
      triggerCondition = {
        conditions: [
          { eventId: "", status: "OCCURRED" },
          { eventId: "", status: "OCCURRED", operator: "AND" },
        ],
      };
    }

    const newEvent = {
      name: `${eventName} - Test Event`,
      description: "",
      score: 0,
      emoji: "🫥",
      message: "",
      branchInstruction: "",
      detectionType: eventType,
      visibilityType: "ACTIVE",
      speaker: "CARE_GIVER",
      sentences: [],
      triggerCondition,
    };

    // TODO: TESTING MODE - Skip API call for testing
    // Revert: Remove the test mode flag and uncomment the API call below
    const TEST_MODE = true; // Set to false to enable API calls

    if (TEST_MODE) {
      // For testing: Open sidebar with mock event without API call
      setSelectedEvent({ ...newEvent, id: `test-${Date.now()}` });
      setIsSidePanelOpen(true);
      toast.success("Test mode: Event sidebar opened (no API call)");
      return;
    }

    // PRODUCTION CODE - Uncomment when ready to test with API
    // try {
    //   const response = await createSessionEvents({ events: [newEvent] });
    //   if (response.error) {
    //     toast.error("Failed to create event");
    //   } else {
    //     toast.success("Event created successfully");
    //     setSelectedEvent({ ...newEvent, id: response.data?.[0]?.id || "" });
    //     setIsSidePanelOpen(true);
    //   }
    // } catch {
    //   toast.error("An error occurred while creating event");
    // }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handleEventSelect = (rowIndex: number) => {
    if (rowIndex !== null && events?.length > 0) {
      setSelectedEvent(events[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedEvent(null);
  };

  const createEventObject = (event: UpdateEventDataParam) => {
    return {
      id: { value: event.id || "", disabled: false, rowId: event.id },
      name: { value: event.name || "", disabled: false, rowId: event.id },
      detectionType: { value: event.detectionType || "", disabled: false, rowId: event.id },
      speaker: { value: event.speaker || "", disabled: false, rowId: event.id },
      description: { value: event.sentences?.join("\n") || "", disabled: false, rowId: event.id },
      branchInstruction: { value: event.branchInstruction || "", disabled: false, rowId: event.id },
      score: {
        value: Number.isInteger(event.score) ? event.score : 0,
        disabled: false,
        rowId: event.id,
      },
      message: { value: event.message || "", disabled: false, rowId: event.id },
      emoji: { value: event.emoji || "", disabled: false, rowId: event.id },
      visibilityType: { value: event.visibilityType || "", disabled: false, rowId: event.id },
      sentences: { value: event.sentences || [], disabled: false, rowId: event.id },
    };
  };

  const sidePanelEvent = useMemo(() => {
    if (!selectedEvent) return null;
    // Return the plain object for the side panel (it doesn't use the new structure)
    return {
      id: selectedEvent.id || "",
      name: selectedEvent.name || "",
      detectionType: selectedEvent.detectionType || "",
      speaker: selectedEvent.speaker || "",
      description: selectedEvent.description || "",
      branchInstruction: selectedEvent.branchInstruction || "",
      score: Number.isInteger(selectedEvent.score) ? selectedEvent.score : 0,
      message: selectedEvent.message || "",
      emoji: selectedEvent.emoji || "",
      visibilityType: selectedEvent.visibilityType || "",
      sentences: selectedEvent.sentences || [],
      triggerCondition: selectedEvent.triggerCondition,
    };
  }, [selectedEvent]);

  const tableData = useMemo(() => {
    return {
      data: events?.map(event => createEventObject(event)),
      columns: EVENT_MANAGEMENT_TABLE_COLUMNS,
    };
  }, [events]);

  const tableFooter = (
    <button
      type="button"
      onClick={handleLoadMore}
      className="flex justify-start items-center py-4 text-typography-800 hover:text-typography-600 disabled:opacity-50 w-[200px]"
      disabled={isFetching || !hasMore}
    >
      <span>+</span>
      <span className="text-base ml-[5px]">
        {isFetching ? en.common.loading : hasMore ? en.common.loadMore : en.common.noMoreData}
      </span>
    </button>
  );

  const handleUpdateEventTable = async (action: {
    columnId?: string;
    value?: any;
    rowIndex?: number;
    rowId?: string;
  }) => {
    const { columnId, value, rowId } = action;
    const selectedEvent = events.find(event => event.id === rowId);
    if (value !== undefined && selectedEvent) {
      const currentEvent = { ...selectedEvent, [columnId]: value };
      onUpdateEvent(currentEvent);
    }
  };

  const onUpdateEvent = async (event: UpdateEventDataParam) => {
    if (event) {
      // Convert back to plain format for API
      const payload: any = {
        name: event.name || "",
        detectionType: event.detectionType || "",
        speaker: event.speaker || "",
        description: event.description || "",
        branchInstruction: event.branchInstruction || "",
        score: Number.isInteger(event.score) ? event.score : 0,
        message: event.message || "",
        emoji: event.emoji || "",
        visibilityType: event.visibilityType || "",
        sentences: event.description?.length > 0 ? event.description?.split("\n") : [],
      };

      // Include triggerCondition if it exists
      if (event.triggerCondition) {
        payload.triggerCondition = event.triggerCondition;
      }

      try {
        const response = await updateSessionEvent({ id: event.id || "", event: payload });
        if (response.error) toast.error("Error updating event");
      } catch {
        toast.error("Error updating event");
      }
    }
  };

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedEvents(markedRows);
  }, []);

  const handleDeleteEvents = async (eventIds: string[]) => {
    if (eventIds.length === 0) return;

    try {
      const response = await deleteSessionEvents({ eventIds });
      if (response.error) {
        toast.error("Failed to delete events");
      } else {
        toast.success(
          `Successfully deleted ${selectedEvents.length} ${selectedEvents.length > 1 ? "events" : "event"}`,
        );
        setShowDeleteConfirmationPopup(false);
        setSelectedEvents([]);
        setIsSidePanelOpen(false);
        setSelectedEvent(null);
      }
    } catch {
      toast.error("An error occurred while deleting events");
    }
  };

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6">{en.simulation.simulationEvents}</h1>
        <ListToolbar
          searchValue={eventSearch}
          onSearchChange={onSearchChange}
          action={
            selectedEvents.length > 0
              ? {
                  label: en.common.delete,
                  variant: ButtonVariant.SECONDARY,
                  icon: (
                    <div className="w-3 h-3">
                      <Trash />
                    </div>
                  ),
                  onClick: () => setShowDeleteConfirmationPopup(true),
                }
              : {
                  label: en.simulation.createNewEvent,
                  variant: ButtonVariant.PRIMARY,
                  onClick: handleNewEventClick,
                }
          }
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={tableData}
            onRowChange={handleUpdateEventTable}
            onRowClick={handleEventSelect}
            tableFooter={tableFooter}
            onSelectionChange={handleSelectionChange}
          />
        </div>
        {selectedEvent && isSidePanelOpen && (
          <EventSidePanel
            selectedEvent={sidePanelEvent}
            isOpen={isSidePanelOpen}
            onClose={handleSidePanelClose}
            onDelete={(eventId: string) => handleDeleteEvents([eventId])}
            onUpdate={onUpdateEvent}
          />
        )}
        {showDeleteConfirmationPopup && (
          <ActionConfirmationPopup
            isOpen={showDeleteConfirmationPopup}
            onClose={() => setShowDeleteConfirmationPopup(false)}
            title={`Delete ${selectedEvents.length > 1 ? "events" : "event"}`}
            description={`Are you sure you want to delete ${selectedEvents.length} ${selectedEvents.length > 1 ? "events" : "event"}?`}
            primaryButton={{
              label: en.common.delete,
              onClick: () =>
                handleDeleteEvents(selectedEvents?.map(event => event.id?.value || event.id) || []),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
            secondaryButton={{
              label: en.common.cancel,
              onClick: () => setShowDeleteConfirmationPopup(false),
              variant: ButtonVariant.SECONDARY,
            }}
          />
        )}
        <EventTypeSelectionDialog
          isOpen={showEventTypeDialog}
          onClose={() => setShowEventTypeDialog(false)}
          onSelect={handleEventTypeSelect}
        />
      </div>
    </div>
  );
};
