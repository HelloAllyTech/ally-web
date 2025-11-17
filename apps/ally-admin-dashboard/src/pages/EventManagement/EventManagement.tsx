import React, { useEffect, useState, useMemo, useCallback } from "react";

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
  EVENT_TYPE_OPTIONS,
} from "@constants";
import { convertEventToApiPayload, convertApiResponseToEvent } from "@src/utils/eventManagement";
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
  const [createSessionEvents] = useCreateSessionEventsMutation();
  const [deleteSessionEvents] = useDeleteSessionEventsMutation();

  // Handle data updates when query data changes
  useEffect(() => {
    const incoming = sessionEventsData?.data;
    if (incoming) {
      setHasMore(incoming.length === limit);

      // Convert API response format to frontend format
      const convertedEvents = incoming.map(apiEvent => convertApiResponseToEvent(apiEvent));

      if (offset === 0) {
        setEvents(convertedEvents);
      } else {
        setEvents(prev => {
          const seen = new Set(prev.map(event => event.id));
          const merged = [...prev];
          for (const item of convertedEvents) {
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
    // Helper function to get display name for event type (e.g., "TIME_BASED" -> "time based")
    const getEventTypeDisplayName = (detectionType: EventType): string => {
      const typeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === detectionType);
      if (!typeOption) return "";
      // Convert to lowercase for "Sample X event" format
      return typeOption.label.toLowerCase();
    };

    // Generate event name in "Sample time based event" format
    const eventTypeDisplayName = getEventTypeDisplayName(eventType);
    const eventName = `Sample ${eventTypeDisplayName} event`;

    let triggerCondition: any;

    if (eventType === "TIME_BASED") {
      triggerCondition = { operator: "LESS_THAN", value: "00:20:00" };
    } else if (eventType === "SCORE_BASED") {
      triggerCondition = { operator: "GREATER_THAN", value: 0, speaker: "CARE_GIVER" };
    } else if (eventType === "SENTENCE_SIMILARITY") {
      triggerCondition = { speaker: "CARE_GIVER", sentences: [] };
    } else if (eventType === "COMBINATION") {
      triggerCondition = {
        conditions: [
          { eventId: "", status: "OCCURRED" },
          { eventId: "", status: "OCCURRED", operator: "AND" },
        ],
      };
    }

    const newEvent: UpdateEventDataParam = {
      name: eventName,
      description: "",
      score: 0,
      emoji: "🫥",
      message: "",
      branchInstruction: "",
      detectionType: eventType,
      visibilityType: "ACTIVE",
      triggerCondition,
    };

    // Convert UpdateEventDataParam to SessionEvent format for API
    const apiEvent = convertEventToApiPayload(newEvent);
    if (!apiEvent) {
      toast.error("Failed to convert event to API format");
      return;
    }
    try {
      const response = await createSessionEvents({ events: [apiEvent] });
      if (response.error) {
        toast.error("Failed to create event");
      } else {
        toast.success("Event created successfully");
        setSelectedEvent({ ...newEvent, id: response.data?.[0]?.id || "" });
        setIsSidePanelOpen(true);
      }
    } catch {
      toast.error("An error occurred while creating event");
    }
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

  const createEventObject = useCallback((event: UpdateEventDataParam) => {
    const triggerCondition = event.triggerCondition || {};

    return {
      id: { value: event.id || "", disabled: false, rowId: event.id },
      detectionType: { value: event.detectionType || "", disabled: true, rowId: event.id },
      name: { value: event.name || "", disabled: false, rowId: event.id },
      triggerConditions: { value: triggerCondition, disabled: false, rowId: event.id },
      branchInstruction: { value: event.branchInstruction || "", disabled: false, rowId: event.id },
      score: { value: event.score ?? 0, disabled: false, rowId: event.id },
      message: { value: event.message || "", disabled: false, rowId: event.id },
      emoji: { value: event.emoji || "", disabled: false, rowId: event.id },
      visibilityType: { value: event.visibilityType || "", disabled: false, rowId: event.id },
      triggerCondition: { value: triggerCondition, disabled: false, rowId: event.id },
    };
  }, []);

  const sidePanelEvent = useMemo(() => {
    if (!selectedEvent) return null;
    // Return the plain object for the side panel
    return {
      id: selectedEvent.id || "",
      name: selectedEvent.name || "",
      detectionType: selectedEvent.detectionType || "",
      description: selectedEvent.description || "",
      branchInstruction: selectedEvent.branchInstruction || "",
      score: Number.isInteger(selectedEvent.score) ? selectedEvent.score : 0,
      message: selectedEvent.message || "",
      emoji: selectedEvent.emoji || "",
      visibilityType: selectedEvent.visibilityType || "",
      triggerCondition: selectedEvent.triggerCondition,
    };
  }, [selectedEvent]);

  const tableData = useMemo(() => {
    return {
      data: events?.map(event => createEventObject(event)),
      columns: EVENT_MANAGEMENT_TABLE_COLUMNS,
    };
  }, [events, createEventObject]);

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
      const updatedEvent: UpdateEventDataParam = { ...selectedEvent };

      // Handle fields that update triggerCondition
      if (columnId === "triggerConditions") {
        // Update the triggerCondition object directly
        updatedEvent.triggerCondition = value;
      } else {
        // For other fields, update directly
        (updatedEvent as any)[columnId] = value;
      }

      onUpdateEvent(updatedEvent);
    }
  };

  const onUpdateEvent = async (event: UpdateEventDataParam) => {
    if (event) {
      // Block API calls for COMBINATION events
      if (event.detectionType === "COMBINATION") {
        return;
      }

      // Convert to API payload format using utility function
      const payload = convertEventToApiPayload(event);

      if (!payload) {
        return;
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
