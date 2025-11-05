import React, { useState, useCallback, useEffect } from "react";

import { generateSequentialEventName } from "@utils/eventNameGenerator";

import { ArrowDownFilled, DoubleArrowRight, Trash } from "@assets";
import { AutoExpandableTextarea, EmojiPickerComponent, TriggerConditions } from "@components";
import { EVENT_TYPE_OPTIONS, EventType } from "@components/event-type-selection-dialog";
import { NumberInput } from "@components/notion-table";
import { en } from "@constants";
import { useDebounce } from "@hooks";
import { UpdateEventDataParam } from "@types";
import { formatCapitalizedEnum } from "@utils";

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

export const EventSidePanel: React.FC<EventSidePanelProps> = ({
  selectedEvent,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
}) => {
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [formData, setFormData] = useState(selectedEvent);

  useEffect(() => {
    setFormData(selectedEvent);
  }, [selectedEvent]);

  const debouncedUpdate = useDebounce(() => {
    if (formData) {
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
  }, [formData]);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number | object) => {
      setIsEventTypeDropdownOpen(false);
      if (!selectedEvent) return;

      setFormData(previousData => {
        const updatedData = {
          ...previousData,
          [fieldName]: value,
        };

        // If event type changes, regenerate the event name based on new type
        if (fieldName === "detectionType" && previousData.name) {
          // Extract the base name without "- Test Event" suffix
          const baseName = previousData.name.replace(/\s*-?\s*Test\s*Event\s*/gi, "").trim();

          // Generate new sequential name based on the new event type
          const newEventType = value as EventType;
          const typeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === newEventType);

          if (typeOption) {
            // Try to preserve the number from the old name if it matches the old prefix
            const oldTypeOption = EVENT_TYPE_OPTIONS.find(
              opt => opt.value === previousData.detectionType,
            );
            let newName = baseName;

            if (oldTypeOption && baseName.startsWith(oldTypeOption.prefix)) {
              // Extract number from old name and use it with new prefix
              const numberMatch = baseName.match(/\d+/);
              if (numberMatch) {
                const number = numberMatch[0].padStart(3, "0");
                newName = `${typeOption.prefix}${number}`;
              } else {
                // Fallback: generate new sequential name
                newName = generateSequentialEventName(newEventType, [baseName]);
              }
            } else {
              // Generate new sequential name based on new type
              newName = generateSequentialEventName(newEventType, [baseName]);
            }

            updatedData.name = `${newName} - Test Event`;
          }
        }

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
        if (field === "speaker" && previousData.detectionType === "SENTENCE_SIMILARITY") {
          return {
            ...previousData,
            speaker: value as string,
          } as UpdateEventDataParam;
        }

        // Handle conditions array for combination events
        if (field === "conditions" && previousData.detectionType === "COMBINATION") {
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
            <input
              type="text"
              value={formData.name || ""}
              onChange={event => {
                const newName = event.target.value.replace(" - Test Event", "");
                handleFieldChange("name", `${newName} - Test Event`);
              }}
              placeholder="New Event"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <div className="space-y-3">
            <Field label="Event type">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEventTypeDropdownOpen(!isEventTypeDropdownOpen)}
                  className="px-0 py-2 cursor-pointer text-sm flex items-center space-x-2"
                >
                  <span className="truncate">
                    {formData.detectionType
                      ? (EVENT_TYPE_OPTIONS.find(opt => opt.value === formData.detectionType)
                          ?.label ?? formatCapitalizedEnum(formData.detectionType))
                      : "Select event type"}
                  </span>
                  <ArrowDownFilled />
                </button>
                {isEventTypeDropdownOpen && (
                  <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[200px] rounded-[6px] left-[0px] top-[30px] space-y-1">
                    {EVENT_TYPE_OPTIONS.map(option => (
                      <div
                        key={option.value}
                        onClick={() => handleFieldChange("detectionType", option.value)}
                        className={`px-3 py-2 cursor-pointer rounded-[6px] flex items-center hover:bg-blue-100 ${
                          formData.detectionType === option.value ? "bg-gray-100" : ""
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* Trigger Conditions Field */}
            {(formData.detectionType === "TIME_BASED" ||
              formData.detectionType === "SCORE_BASED" ||
              formData.detectionType === "SENTENCE_SIMILARITY" ||
              formData.detectionType === "COMBINATION") && (
              <TriggerConditions
                eventType={formData.detectionType}
                triggerCondition={formData.triggerCondition}
                sentences={formData.sentences}
                onChange={handleTriggerConditionChange}
              />
            )}

            <Field label="Event description" multiline={true}>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={20}
                value={formData.description}
                onChange={value => handleFieldChange("description", value)}
                placeholder="Add description"
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb"
              />
            </Field>

            <Field label="Default branch description" multiline={true}>
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
