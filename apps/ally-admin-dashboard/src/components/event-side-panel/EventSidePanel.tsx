import React, { useState, useCallback, useEffect, useMemo } from "react";

import { DoubleArrowRight, Trash } from "@assets";
import { AutoExpandableTextarea, EmojiPickerComponent, TriggerConditions } from "@components";
import { EVENT_TYPE_OPTIONS, EventType } from "@components/event-type-selection-dialog";
import { NumberInput } from "@components/notion-table";
import { en } from "@constants";
import { useDebounce } from "@hooks";
import { SessionEventDetectionType, UpdateEventDataParam } from "@types";

// TODO: TESTING MODE - Skip API calls for testing
// Revert: Set to false to enable API calls
const TEST_MODE = true;

interface EventSidePanelProps {
  selectedEvent: UpdateEventDataParam | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onUpdate: (event: UpdateEventDataParam) => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, multiline = false }) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-sm font-medium text-typography-800">{label}</span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  eventId: string;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  hasEvent: boolean;
}> = ({ eventId, onClose, onDelete, hasEvent }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">{en.simulation.editEvent}</span>
    </button>
    {hasEvent && (
      <button onClick={() => onDelete(eventId)} className="flex items-center gap-2">
        <Trash width={14} height={14} />
        <span className="text-sm font-tertiary font-medium text-typography-900">
          {en.simulation.deleteEvent}
        </span>
      </button>
    )}
  </div>
);

// Helper function to extract event code from name (e.g., "SS001 - Test Event" -> "SS001")
const extractEventCode = (name: string | undefined): string => {
  if (!name) return "";
  // Match pattern like "SS001", "TB002", etc. (prefix + 3 digits)
  const match = name.match(/^([A-Z]{2}\d{3})/);
  return match ? match[1] : "";
};

// Helper function to get display name for event type (e.g., "TIME_BASED" -> "time based")
const getEventTypeDisplayName = (detectionType: string | undefined): string => {
  if (!detectionType) return "";
  const typeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === (detectionType as EventType));
  if (!typeOption) return "";

  // Convert label to lowercase for "Sample X event" format
  // "Sentence Similarity" -> "sentence similarity"
  // "Time Based" -> "time based"
  // "Score Based" -> "score based"
  // "Combination of:" -> "combination"
  if (typeOption.label === "Combination of") {
    return "combination";
  }
  return typeOption.label.toLowerCase();
};

export const EventSidePanel: React.FC<EventSidePanelProps> = ({
  selectedEvent,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
}) => {
  const [formData, setFormData] = useState(selectedEvent);

  useEffect(() => {
    setFormData(selectedEvent);
  }, [selectedEvent]);

  const debouncedUpdate = useDebounce(() => {
    if (formData) {
      // Block API calls for COMBINATION events
      if (formData.detectionType === SessionEventDetectionType.COMBINATION) {
        return;
      }
      // Only call onUpdate if not in TEST_MODE
      if (!TEST_MODE) {
        onUpdate(formData);
      }
      // In TEST_MODE, updates are skipped silently
    }
  }, 500);

  useEffect(() => {
    if (formData && formData !== selectedEvent) {
      debouncedUpdate();
    }
  }, [formData, selectedEvent, debouncedUpdate]);

  // Extract event code and display name from formData
  const eventCode = useMemo(() => extractEventCode(formData?.name), [formData?.name]);
  const eventTypeDisplayName = useMemo(
    () => getEventTypeDisplayName(formData?.detectionType),
    [formData?.detectionType],
  );

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number | object) => {
      if (!selectedEvent) return;

      setFormData(previousData => {
        const updatedData = {
          ...previousData,
          [fieldName]: value,
        };

        return updatedData;
      });
    },
    [selectedEvent],
  );

  const handleTriggerConditionChange = useCallback(
    (field: string, value: string | number | string[]) => {
      if (!selectedEvent) return;

      setFormData(previousData => {
        // Handle sentences separately (not part of triggerCondition)
        if (field === "sentences") {
          return {
            ...previousData,
            sentences: value as string[],
          } as UpdateEventDataParam;
        }

        // Handle speaker in triggerCondition for sentence similarity
        if (
          field === "speaker" &&
          previousData.detectionType === SessionEventDetectionType.SENTENCE_SIMILARITY
        ) {
          return {
            ...previousData,
            speaker: value as string,
          } as UpdateEventDataParam;
        }

        // Handle conditions array for combination events
        if (
          field === "conditions" &&
          previousData.detectionType === SessionEventDetectionType.COMBINATION
        ) {
          return {
            ...previousData,
            triggerCondition: {
              conditions: value as any[],
            },
          } as UpdateEventDataParam;
        }

        // Handle other triggerCondition fields
        const currentTrigger = previousData.triggerCondition || {};
        return {
          ...previousData,
          triggerCondition: {
            ...currentTrigger,
            [field]: value,
          },
        } as UpdateEventDataParam;
      });
    },
    [selectedEvent],
  );

  const handleDelete = useCallback(() => {
    if (selectedEvent?.id) {
      onDelete(selectedEvent.id);
    }
  }, [selectedEvent, onDelete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light">
        <PanelHeader
          eventId={selectedEvent?.id}
          onClose={onClose}
          onDelete={handleDelete}
          hasEvent={!!selectedEvent}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb">
          <div className="mb-4">
            <div className="text-2xl font-light w-full">
              {eventTypeDisplayName ? `Sample ${eventTypeDisplayName} event` : "Sample event"}
            </div>
          </div>

          <div className="space-y-3">
            <Field label="Event code">
              <div className="text-sm text-neutral-800">{eventCode || "—"}</div>
            </Field>

            {/* Trigger Conditions Field */}
            {(formData?.detectionType === "TIME_BASED" ||
              formData?.detectionType === "SCORE_BASED" ||
              formData?.detectionType === SessionEventDetectionType.SENTENCE_SIMILARITY ||
              formData?.detectionType === SessionEventDetectionType.COMBINATION) && (
              <TriggerConditions
                eventType={formData.detectionType}
                triggerCondition={formData.triggerCondition}
                sentences={formData.sentences}
                onChange={handleTriggerConditionChange}
              />
            )}

            <Field label="Branch description" multiline={true}>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={20}
                value={formData.branchInstruction}
                onChange={value => handleFieldChange("branchInstruction", value)}
                placeholder="Add instruction"
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb"
              />
            </Field>

            <Field label="Default session quality score">
              <NumberInput
                value={Number(formData.score)}
                onChange={value => handleFieldChange("score", value)}
              />
            </Field>

            <Field label="Default real time feedback message" multiline={true}>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={20}
                value={formData.message}
                onChange={value => handleFieldChange("message", value)}
                placeholder="Add message"
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb"
              />
            </Field>

            <Field label="Default real time feedback emoji">
              <EmojiPickerComponent
                className="max-w-[60px] pr-[25px]"
                onEmojiClick={emoji => handleFieldChange("emoji", emoji)}
                buttonText={formData.emoji}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
};
