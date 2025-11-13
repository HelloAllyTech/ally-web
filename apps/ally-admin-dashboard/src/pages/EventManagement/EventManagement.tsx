import React, { useEffect, useState, useMemo, useCallback } from "react";

import { convertEventToApiPayload } from "@src/utils/eventManagement";
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

    const newEvent: UpdateEventDataParam = {
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
    // Convert UpdateEventDataParam to SessionEvent format for API
    // const apiEvent = convertEventToApiPayload(newEvent);
    // if (!apiEvent) {
    //   toast.error("Failed to convert event to API format");
    //   return;
    // }
    // try {
    //   const response = await createSessionEvents({ events: [apiEvent] });
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

  const createEventObject = useCallback((event: UpdateEventDataParam) => {
    // Helper function to extract time-dependent flag
    const getTimeDependent = (event: UpdateEventDataParam): boolean => {
      return (
        event.detectionType === "TIME_BASED" ||
        (event.triggerCondition &&
          "value" in event.triggerCondition &&
          typeof event.triggerCondition.value === "string")
      );
    };

    // Helper function to extract session time
    const getSessionTime = (event: UpdateEventDataParam): string => {
      if (
        event.detectionType === "TIME_BASED" &&
        event.triggerCondition &&
        "value" in event.triggerCondition
      ) {
        return typeof event.triggerCondition.value === "string" ? event.triggerCondition.value : "";
      }
      return "";
    };

    // Helper function to extract time condition
    const getTimeCondition = (event: UpdateEventDataParam): string => {
      if (
        event.detectionType === "TIME_BASED" &&
        event.triggerCondition &&
        "operator" in event.triggerCondition
      ) {
        return event.triggerCondition.operator || "";
      }
      return "";
    };

    // Helper function to extract score-dependent flag
    const getScoreDependent = (event: UpdateEventDataParam): boolean => {
      return event.detectionType === "SCORE_BASED";
    };

    // Helper function to extract score condition
    const getScoreCondition = (event: UpdateEventDataParam): string => {
      if (
        event.detectionType === "SCORE_BASED" &&
        event.triggerCondition &&
        "operator" in event.triggerCondition
      ) {
        return event.triggerCondition.operator || "";
      }
      return "";
    };

    // Extract values from triggerCondition or use defaults
    const timeDependent = getTimeDependent(event);
    const sessionTime = getSessionTime(event);
    const timeCondition = getTimeCondition(event);
    const scoreDependent = getScoreDependent(event);
    const scoreCondition = getScoreCondition(event);

    // For now, use dummy/default values for fields not in backend
    // These will be replaced when API is integrated
    const sessionScoreEditable = (event as any).sessionScoreEditable ?? false;
    const combineTimeScore = (event as any).combineTimeScore ?? "";

    // Convert booleans to "Yes"/"No" for dropdowns
    const timeDependentValue = timeDependent ? "Yes" : "No";
    const scoreDependentValue = scoreDependent ? "Yes" : "No";

    return {
      id: { value: event.id || "", disabled: false, rowId: event.id },
      detectionType: { value: event.detectionType || "", disabled: false, rowId: event.id },
      name: { value: event.name || "", disabled: false, rowId: event.id },
      triggerConditions: {
        value: event.triggerCondition || null,
        disabled: false,
        rowId: event.id,
      },
      timeDependent: { value: timeDependentValue, disabled: false, rowId: event.id },
      sessionTime: { value: sessionTime, disabled: false, rowId: event.id },
      timeCondition: { value: timeCondition, disabled: false, rowId: event.id },
      scoreDependent: { value: scoreDependentValue, disabled: false, rowId: event.id },
      sessionScoreEditable: { value: sessionScoreEditable, disabled: false, rowId: event.id },
      scoreCondition: { value: scoreCondition, disabled: false, rowId: event.id },
      combineTimeScore: { value: combineTimeScore, disabled: false, rowId: event.id },
      branchInstruction: {
        value: event.branchInstruction || "",
        disabled: false,
        rowId: event.id,
      },
      score: {
        value: Number.isInteger(event.score) ? event.score : 0,
        disabled: false,
        rowId: event.id,
      },
      message: { value: event.message || "", disabled: false, rowId: event.id },
      emoji: { value: event.emoji || "", disabled: false, rowId: event.id },
      // Keep these for internal use
      visibilityType: { value: event.visibilityType || "", disabled: false, rowId: event.id },
      sentences: { value: event.sentences || [], disabled: false, rowId: event.id },
      triggerCondition: { value: event.triggerCondition, disabled: false, rowId: event.id },
    };
  }, []);

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
      if (columnId === "detectionType") {
        // When event type changes, reset triggerCondition based on new type
        updatedEvent.detectionType = value;
        if (value === "TIME_BASED") {
          updatedEvent.triggerCondition = { operator: "LESS_THAN", value: "00:20:00" };
        } else if (value === "SCORE_BASED") {
          updatedEvent.triggerCondition = { operator: "GREATER_THAN", value: 0 };
        } else if (value === "SENTENCE_SIMILARITY") {
          updatedEvent.triggerCondition = { operator: "", value: "" };
          updatedEvent.sentences = [];
        } else if (value === "COMBINATION") {
          updatedEvent.triggerCondition = {
            conditions: [
              { eventId: "", status: "OCCURRED" },
              { eventId: "", status: "OCCURRED", operator: "AND" },
            ],
          };
        }
      } else if (columnId === "sessionTime" && selectedEvent.detectionType === "TIME_BASED") {
        // Update time value in triggerCondition
        updatedEvent.triggerCondition = {
          ...(selectedEvent.triggerCondition as any),
          value: value,
        };
      } else if (columnId === "timeCondition" && selectedEvent.detectionType === "TIME_BASED") {
        // Update time operator in triggerCondition
        updatedEvent.triggerCondition = {
          ...(selectedEvent.triggerCondition as any),
          operator: value,
        };
      } else if (columnId === "scoreCondition" && selectedEvent.detectionType === "SCORE_BASED") {
        // Update score operator in triggerCondition
        updatedEvent.triggerCondition = {
          ...(selectedEvent.triggerCondition as any),
          operator: value,
        };
      } else if (columnId === "timeDependent") {
        // Handle Yes/No dropdown - if Yes and not TIME_BASED, switch to TIME_BASED
        if (value === "Yes" && selectedEvent.detectionType !== "TIME_BASED") {
          updatedEvent.detectionType = "TIME_BASED";
          updatedEvent.triggerCondition = { operator: "LESS_THAN", value: "00:20:00" };
        } else if (value === "No" && selectedEvent.detectionType === "TIME_BASED") {
          // If turning off, we might want to keep the type but this is a business logic decision
          // For now, we'll just update the flag
        }
        // Note: timeDependent is derived from detectionType, so we don't store it separately
      } else if (columnId === "scoreDependent") {
        // Handle Yes/No dropdown - if Yes and not SCORE_BASED, switch to SCORE_BASED
        if (value === "Yes" && selectedEvent.detectionType !== "SCORE_BASED") {
          updatedEvent.detectionType = "SCORE_BASED";
          updatedEvent.triggerCondition = { operator: "GREATER_THAN", value: 0 };
        }
        // Note: scoreDependent is derived from detectionType, so we don't store it separately
      } else if (columnId === "triggerConditions") {
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
