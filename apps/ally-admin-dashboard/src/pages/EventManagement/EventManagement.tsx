import React, { useEffect, useState, useMemo, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";
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
import { ButtonVariant } from "@components/types";
import {
  SORT_BY,
  SORT_ORDER,
  EVENT_MANAGEMENT_TABLE_COLUMNS,
  en,
  SESSION_EVENT_STATUS_OPTIONS,
  EVENT_DETECTION_TYPES,
  Permissions,
} from "@constants";
import { setAvailableEvents } from "@reducer";
import { RootState } from "@store";
import { UpdateEventDataParam } from "@types";
import {
  convertEventToApiPayload,
  convertApiResponseToEvent,
  isDetectionConfigField,
} from "@utils";

export const EventManagement: React.FC = () => {
  const limit = 30;
  const dispatch = useDispatch();
  const permissions = useSelector((state: RootState) => state.user.permissions);
  // Multi-tenant admins can create and edit (their own) events but not delete any.
  const canDeleteEvents = !!permissions?.includes(Permissions.DELETE_EVENT);

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

      // Convert API response format to event
      const eventsData = incoming.map(eventPayload => convertApiResponseToEvent(eventPayload));

      if (offset === 0) {
        setEvents(eventsData);
      } else {
        setEvents(prev => {
          const seen = new Set(prev.map(event => event.id));
          const merged = [...prev];
          for (const item of eventsData) {
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

  const handleEventTypeSelect = async (eventType: string) => {
    const newEvent: UpdateEventDataParam = {
      name: "New Event",
      description: "",
      score: 0,
      emoji: "🫥",
      message: "",
      branchInstruction: "",
      detectionType: eventType,
      visibilityType: "ACTIVE",
      triggerCondition: null,
      tags: [],
    };

    const eventPayload = convertEventToApiPayload(newEvent);
    if (!eventPayload) {
      return;
    }
    try {
      const response = await createSessionEvents({ events: [eventPayload] });
      if (response.error) {
        toast.error(en.errors.failedToCreateEvent); //response.error
      } else {
        toast.success(en.simulation.eventCreatedSuccessfully);
        const createdEvent = response.data?.[0]
          ? convertApiResponseToEvent(response.data[0])
          : { ...newEvent, id: "" };
        setSelectedEvent(createdEvent);
        setIsSidePanelOpen(true);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedToCreateEvent);
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
    const isEditable = event.isEditable ?? true;
    const isDisabled = !isEditable;
    const isTimeBased = event.detectionType === EVENT_DETECTION_TYPES.TIME_BASED;
    const isScoreBased = event.detectionType === EVENT_DETECTION_TYPES.SCORE_BASED;

    return {
      id: { value: event.id || "", disabled: false, rowId: event.id },
      detectionType: { value: event.detectionType || "", disabled: true, rowId: event.id },
      name: { value: event.name || "", disabled: isDisabled, rowId: event.id },
      eventCode: { value: event.eventCode || "", disabled: true, rowId: event.id },
      triggerCondition: { value: triggerCondition, disabled: isDisabled, rowId: event.id },
      branchInstruction: {
        value: event.branchInstruction || "",
        disabled: isDisabled,
        rowId: event.id,
      },
      score: { value: event.score ?? 0, disabled: isDisabled, rowId: event.id },
      message: { value: event.message || "", disabled: isDisabled, rowId: event.id },
      emoji: { value: event.emoji || "", disabled: isDisabled, rowId: event.id },
      visibilityType: { value: event.visibilityType || "", disabled: isDisabled, rowId: event.id },
      maxOccurrences: {
        value: event.detectionConfig?.maxOccurrences,
        disabled: isDisabled,
        rowId: event.id,
      },
      minGapTime: {
        value: event.detectionConfig?.minGapTime,
        disabled: isDisabled,
        rowId: event.id,
      },
      occurrenceInterval: {
        value: event.detectionConfig?.occurrenceInterval,
        disabled: isDisabled || event.detectionType !== EVENT_DETECTION_TYPES.BINARY_CLASSIFIER,
        rowId: event.id,
      },
      startTime: {
        value: event.detectionConfig?.startTime,
        disabled: isDisabled || isTimeBased,
        rowId: event.id,
      },
      endTime: {
        value: event.detectionConfig?.endTime,
        disabled: isDisabled || isTimeBased,
        rowId: event.id,
      },
      minScore: {
        value: event.detectionConfig?.minScore,
        disabled: isDisabled || isScoreBased,
        rowId: event.id,
      },
      maxScore: {
        value: event.detectionConfig?.maxScore,
        disabled: isDisabled || isScoreBased,
        rowId: event.id,
      },
      isEditable: { value: isEditable, disabled: false, rowId: event.id },
      tags: { value: event.tags || [], disabled: true, rowId: event.id },
    };
  }, []);

  const sidePanelEvent = useMemo(() => {
    if (!selectedEvent) return null;
    // Return the plain object for the side panel
    return {
      id: selectedEvent.id || "",
      name: selectedEvent.name || "",
      eventCode: selectedEvent.eventCode || "",
      detectionType: selectedEvent.detectionType || "",
      description: selectedEvent.description || "",
      branchInstruction: selectedEvent.branchInstruction || "",
      score: Number.isInteger(selectedEvent.score) ? selectedEvent.score : 0,
      message: selectedEvent.message || "",
      emoji: selectedEvent.emoji || "",
      visibilityType: selectedEvent.visibilityType || "",
      triggerCondition: selectedEvent.triggerCondition,
      detectionConfig: selectedEvent.detectionConfig,
      isEditable: selectedEvent.isEditable ?? true,
      tags: selectedEvent.tags || [],
    };
  }, [selectedEvent]);

  // Extract available events for combination trigger conditions and dispatch to Redux
  const availableEvents = useMemo(() => {
    return (events || []).map(event => ({
      id: event.id || "",
      name: event.name || "",
      eventCode: event.eventCode || "",
    }));
  }, [events]);

  // Dispatch available events to Redux store
  useEffect(() => {
    dispatch(setAvailableEvents(availableEvents));
  }, [availableEvents, dispatch]);

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
      className="flex justify-start items-center py-4 text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
      disabled={isFetching || !hasMore}
    >
      <span>+</span>
      <span className="text-base ml-[5px] font-primary">
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
      if (isDetectionConfigField(columnId)) {
        const updatedEventDetectionConfig = { ...selectedEvent.detectionConfig, [columnId]: value };
        updatedEvent.detectionConfig = updatedEventDetectionConfig;
      } else {
        (updatedEvent as any)[columnId] = value;
      }

      onUpdateEvent(updatedEvent);
    }
  };

  const onUpdateEvent = async (event: UpdateEventDataParam) => {
    if (event) {
      // Convert to API payload format using utility function
      const eventPayload = convertEventToApiPayload(event);

      if (!eventPayload) {
        return;
      }

      try {
        const response: any = await updateSessionEvent({ id: event.id || "", event: eventPayload });
        if (response.error)
          toast.error(response?.error?.data?.message || en.errors.errorUpdatingEvent);
      } catch {
        toast.error(en.errors.errorUpdatingEvent);
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
        toast.error(en.errors.failedToDeleteEvent);
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
      toast.error(en.errors.failedToDeleteEvent);
    }
  };

  const listToolbarAction = useMemo(() => {
    return selectedEvents.length > 0 && canDeleteEvents
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
        };
  }, [selectedEvents, canDeleteEvents, handleNewEventClick]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">{en.simulation.events}</h1>
        <ListToolbar
          searchValue={eventSearch}
          onSearchChange={onSearchChange}
          action={listToolbarAction}
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
            canDelete={canDeleteEvents}
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
