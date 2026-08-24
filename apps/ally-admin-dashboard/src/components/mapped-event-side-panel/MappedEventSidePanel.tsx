import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { ArrowDownFilled, DoubleArrowRight, Trash } from "@assets";
import {
  EmojiPickerComponent,
  NumberInput,
  ToggleSwitch,
  OccurrenceControlSection,
  ScoreWindowSection,
  TimeWindowSection,
  TextareaWithTriggerDropdown,
} from "@components";
import { en } from "@constants";
import { useDebounce, useClickOutside } from "@hooks";
import { UpdateScenarioEventDataParam, SessionEvent, SessionEventDetectionType } from "@types";
import { isObject, MAPPED_EVENT_FIELDS } from "@utils";

// Constants
const DEBOUNCE_DELAY = 500;
const TEXTAREA_MAX_LINES = 20;
const TEXTAREA_MIN_HEIGHT = 20;

const FIELD_DEPENDENCIES: Record<string, readonly string[]> = {
  feedbackStatus: [
    MAPPED_EVENT_FIELDS.SCORE,
    MAPPED_EVENT_FIELDS.EMOJI,
    MAPPED_EVENT_FIELDS.MESSAGE,
  ],
  branchingStatus: [MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION],
  detectionConfigStatus: [
    MAPPED_EVENT_FIELDS.MAX_OCCURRENCES,
    MAPPED_EVENT_FIELDS.MIN_GAP_TIME,
    MAPPED_EVENT_FIELDS.OCCURRENCE_INTERVAL,
    MAPPED_EVENT_FIELDS.START_TIME,
    MAPPED_EVENT_FIELDS.END_TIME,
    MAPPED_EVENT_FIELDS.MIN_SCORE,
    MAPPED_EVENT_FIELDS.MAX_SCORE,
  ],
};

interface MappedEventSidePanelProps {
  selectedEvent: UpdateScenarioEventDataParam | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onUpdate: (event: UpdateScenarioEventDataParam) => void;
  sessionEvents: SessionEvent[];
  availableEventOptions: Array<{ label: string; value: string }>;
  onEventSelect: (eventId: string) => void;
  /**
   * The event catalogue behind `availableEventOptions` failed to load. Without
   * this the picker cannot tell "nothing matched your search" from "we never
   * got the list", and it always said the former — so a failed fetch read as
   * "that event doesn't exist" and only a page reload fixed it.
   */
  catalogFailedToLoad?: boolean;
  onRetryCatalog?: () => void;
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
      className="flex flex-row items-center justify-center gap-2 text-typography-800 hover:text-neutral-800"
    >
      <span className="inline-flex w-[14px] h-[14px]">
        <DoubleArrowRight />
      </span>
      <span className="text-sm">{en.simulation.editEvent}</span>
    </button>
    {hasEvent && (
      <button onClick={() => onDelete(eventId)} className="flex items-center gap-2">
        <span className="inline-flex w-[14px] h-[14px]">
          <Trash />
        </span>
        <span className="text-sm">{en.simulation.deleteEvent}</span>
      </button>
    )}
  </div>
);

const EventDropdown: React.FC<{
  isOpen: boolean;
  selectedEventName: string;
  availableOptions: Array<{ label: string; value: string }>;
  sessionEvents: SessionEvent[];
  onToggle: () => void;
  onSelect: (eventId: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  catalogFailedToLoad?: boolean;
  onRetryCatalog?: () => void;
}> = ({
  isOpen,
  selectedEventName,
  availableOptions,
  sessionEvents,
  onToggle,
  onSelect,
  dropdownRef,
  catalogFailedToLoad = false,
  onRetryCatalog,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to format event display name with eventCode
  const getEventDisplayName = useCallback(
    (eventId: string): string => {
      const event = sessionEvents.find(e => e.id === eventId);
      if (!event) return "";
      return event.eventCode ? `${event.eventCode} - ${event.name}` : event.name || "";
    },
    [sessionEvents],
  );

  // Format options with eventCode - eventName
  const formattedOptions = useMemo(() => {
    return availableOptions.map(option => ({
      ...option,
      label: getEventDisplayName(option.value) || option.label,
    }));
  }, [availableOptions, getEventDisplayName]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return formattedOptions;
    return formattedOptions.filter(option => option.label.toLowerCase().includes(normalizedQuery));
  }, [formattedOptions, query]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="text-2xl font-light w-full text-left flex items-center justify-start hover:text-typography-800 transition-colors"
      >
        <span className={selectedEventName === "Select an event" ? "text-typography-600" : ""}>
          {selectedEventName}
        </span>
        <span className="ml-2 inline-flex w-[12px] h-[12px]">
          <ArrowDownFilled />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 bg-white border border-border-light min-w-[300px] max-h-[300px] overflow-y-auto rounded-[6px] left-0 top-[40px] shadow-lg custom-scrollbar">
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search events"
              className="w-full px-3 py-2 border border-border-light rounded focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
              type="text"
            />
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.value}
                onClick={() => onSelect(option.value)}
                className="px-4 py-3 cursor-pointer hover:bg-primary-50 transition-colors"
              >
                <span className="text-sm">{option.label}</span>
              </div>
            ))
          ) : catalogFailedToLoad ? (
            // Say the list never arrived, and offer the retry here: this
            // dropdown is inside a full-screen panel, so the table's own retry
            // control is not reachable from where the search actually happens.
            <div className="px-4 py-3 text-sm text-typography-800 flex items-center gap-2">
              {en.simulation.eventCatalogLoadFailed}
              {onRetryCatalog && (
                <button
                  type="button"
                  className="underline text-primary-600"
                  onClick={onRetryCatalog}
                >
                  {en.common.retry}
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-typography-800">No results</div>
          )}
        </div>
      )}
    </div>
  );
};

const FormTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => (
  <AutoExpandableTextarea
    maxLines={TEXTAREA_MAX_LINES}
    minHeight={TEXTAREA_MIN_HEIGHT}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="py-2 pt-[16px] px-0 border-none disabled:bg-transparent focus:outline-none text-sm w-full resize-none overflow-y-auto custom-scrollbar"
    disabled={disabled}
  />
);

export const MappedEventSidePanel: React.FC<MappedEventSidePanelProps> = ({
  selectedEvent,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  sessionEvents,
  availableEventOptions,
  onEventSelect,
  catalogFailedToLoad = false,
  onRetryCatalog,
}) => {
  const [formData, setFormData] = useState(selectedEvent);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsEventDropdownOpen(false));

  // Memoized computed values
  const isNewEvent = useMemo(() => !selectedEvent?.id?.value, [selectedEvent?.id?.value]);

  const selectedEventName = useMemo(
    () =>
      sessionEvents.find(event => event.id === selectedEvent?.id?.value)?.name || "Select an event",
    [sessionEvents, selectedEvent?.id?.value],
  );

  const selectedEventDetectionType = useMemo(
    () => sessionEvents.find(event => event.id === selectedEvent?.id?.value)?.detectionType,
    [sessionEvents, selectedEvent?.id?.value],
  );

  // Sync form data with selected event
  useEffect(() => {
    setFormData(selectedEvent);
  }, [selectedEvent]);

  // Create a stable debounced update function
  const triggerUpdate = useCallback(
    (updatedData: UpdateScenarioEventDataParam) => {
      if (updatedData?.id?.value) {
        onUpdate(updatedData);
      }
    },
    [onUpdate],
  );

  const debouncedUpdate = useDebounce(triggerUpdate, DEBOUNCE_DELAY);

  // Update field value helper
  const updateFieldValue = useCallback(
    (fieldName: keyof UpdateScenarioEventDataParam, value: string | number | boolean) => {
      setFormData(previousData => {
        if (!previousData) return previousData;

        const currentField = previousData[fieldName];
        if (isObject(currentField) && currentField !== null && "value" in currentField) {
          const updatedData = {
            ...previousData,
            [fieldName]: {
              ...currentField,
              value,
            },
          };
          // Trigger debounced update with the new data
          debouncedUpdate(updatedData);
          return updatedData;
        }
        return previousData;
      });
    },
    [debouncedUpdate],
  );

  // Update dependent fields based on toggle status
  const updateDependentFields = useCallback(
    (updatedData: UpdateScenarioEventDataParam, fieldName: string, enabled: boolean) => {
      const dependentFields = FIELD_DEPENDENCIES[fieldName] || [];

      dependentFields.forEach(dependentField => {
        const field = updatedData[dependentField as keyof UpdateScenarioEventDataParam];
        if (isObject(field) && field !== null && "disabled" in field) {
          (updatedData[dependentField as keyof UpdateScenarioEventDataParam] as any) = {
            ...field,
            disabled: !enabled,
          };
        }
      });

      return updatedData;
    },
    [],
  );

  const handleFieldChange = useCallback(
    (fieldName: keyof UpdateScenarioEventDataParam, value: string | number | boolean) => {
      if (!selectedEvent) return;
      updateFieldValue(fieldName, value);
    },
    [selectedEvent, updateFieldValue],
  );

  const handleToggleChange = useCallback(
    (fieldName: keyof UpdateScenarioEventDataParam, enabled: boolean) => {
      if (!selectedEvent) return;

      setFormData(previousData => {
        if (!previousData) return previousData;

        let updatedData = {
          ...previousData,
          [fieldName]: {
            ...previousData[fieldName],
            value: enabled,
          },
        };

        updatedData = updateDependentFields(updatedData, fieldName, enabled);
        // Trigger debounced update with the new data
        debouncedUpdate(updatedData);
        return updatedData;
      });
    },
    [selectedEvent, updateDependentFields, debouncedUpdate],
  );

  const handleDelete = useCallback(() => {
    onDelete(selectedEvent?.id?.value);
  }, [selectedEvent, onDelete]);

  const handleEventSelection = useCallback(
    (eventId: string) => {
      setIsEventDropdownOpen(false);
      onEventSelect(eventId);
    },
    [onEventSelect],
  );

  const toggleDropdown = useCallback(() => {
    setIsEventDropdownOpen(prev => !prev);
  }, []);

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light">
        <PanelHeader
          eventId={selectedEvent?.id?.value || ""}
          onClose={onClose}
          onDelete={handleDelete}
          hasEvent={!!selectedEvent}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            {isNewEvent ? (
              <EventDropdown
                isOpen={isEventDropdownOpen}
                selectedEventName={selectedEventName}
                availableOptions={availableEventOptions}
                sessionEvents={sessionEvents}
                onToggle={toggleDropdown}
                onSelect={handleEventSelection}
                dropdownRef={dropdownRef}
                catalogFailedToLoad={catalogFailedToLoad}
                onRetryCatalog={onRetryCatalog}
              />
            ) : (
              <div className="text-2xl font-light w-full">{selectedEventName}</div>
            )}
          </div>

          <div className="space-y-3">
            <Field label="Real time feedback status">
              <ToggleSwitch
                enabled={formData.feedbackStatus?.value || false}
                onChange={enabled =>
                  handleToggleChange(MAPPED_EVENT_FIELDS.FEEDBACK_STATUS, enabled)
                }
                label="Real time feedback status"
              />
            </Field>

            <Field label="Real time feedback emoji">
              <EmojiPickerComponent
                className="max-w-[60px] pr-[25px]"
                onEmojiClick={emoji => handleFieldChange(MAPPED_EVENT_FIELDS.EMOJI, emoji)}
                buttonText={formData.emoji?.value || "🫥"}
                disabled={formData.emoji?.disabled}
              />
            </Field>

            <Field label="Real time feedback message" multiline={true}>
              <FormTextarea
                value={formData.message?.value || ""}
                onChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.MESSAGE, value)}
                placeholder="Add feedback message"
                disabled={formData.message?.disabled}
              />
            </Field>

            <Field label="Session quality score">
              <NumberInput
                value={Number(formData.score?.value || 0)}
                onChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.SCORE, value || 0)}
                disabled={formData.score?.disabled}
              />
            </Field>

            <OccurrenceControlSection
              eventType={selectedEventDetectionType as string}
              maxOccurrences={formData?.maxOccurrences?.value}
              minGapTime={formData?.minGapTime?.value as string}
              occurrenceInterval={formData?.occurrenceInterval?.value}
              onMaxOccurrencesChange={value =>
                handleFieldChange(MAPPED_EVENT_FIELDS.MAX_OCCURRENCES, value)
              }
              onMinGapTimeChange={value =>
                handleFieldChange(MAPPED_EVENT_FIELDS.MIN_GAP_TIME, value)
              }
              onOccurrenceIntervalChange={value =>
                handleFieldChange(MAPPED_EVENT_FIELDS.OCCURRENCE_INTERVAL, value)
              }
            />

            {selectedEventDetectionType !== SessionEventDetectionType.TIME && (
              <TimeWindowSection
                startTime={formData?.startTime?.value as string}
                endTime={formData?.endTime?.value as string}
                onStartTimeChange={value =>
                  handleFieldChange(MAPPED_EVENT_FIELDS.START_TIME, value)
                }
                onEndTimeChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.END_TIME, value)}
              />
            )}

            {selectedEventDetectionType !== SessionEventDetectionType.SCORE && (
              <ScoreWindowSection
                minScore={formData?.minScore?.value}
                maxScore={formData?.maxScore?.value}
                onMinScoreChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.MIN_SCORE, value)}
                onMaxScoreChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.MAX_SCORE, value)}
              />
            )}
            <div className="border-t" />
            <Field label="Branching status">
              <ToggleSwitch
                enabled={formData.branchingStatus?.value || false}
                onChange={enabled =>
                  handleToggleChange(MAPPED_EVENT_FIELDS.BRANCHING_STATUS, enabled)
                }
                label="Branching status"
              />
            </Field>
            <Field label="Branch to state" multiline={true}>
              <TextareaWithTriggerDropdown
                value={formData.branchInstruction?.value || ""}
                onChange={value => handleFieldChange(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, value)}
                placeholder="Add branch to state"
                disabled={formData.branchInstruction?.disabled}
                alwaysOpen
              />
            </Field>
            <Field label="Checklist visibility">
              <ToggleSwitch
                enabled={formData.checklistVisibilityStatus?.value || false}
                onChange={enabled =>
                  handleToggleChange(MAPPED_EVENT_FIELDS.CHECKLIST_VISIBILITY_STATUS, enabled)
                }
                label="Checklist visibility"
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
};
