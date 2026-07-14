import React, { useState, useCallback, useEffect } from "react";

import { AutoExpandableTextarea, Tooltip } from "@ally-ui-mono/ui-shared";
import { DoubleArrowRight, TooltipIcon, Trash } from "@assets";
import {
  ActionConfirmationPopup,
  EmojiPickerComponent,
  TriggerConditions,
  NumberInput,
  OccurrenceControlSection,
  ScoreWindowSection,
  TimeWindowSection,
  EVENT_TYPE_POPUP_OPTIONS,
  TextareaWithTriggerDropdown,
  SimpleTagSelector,
} from "@components";
import { en, EVENT_DETECTION_TYPES } from "@constants";
import { useDebounce } from "@hooks";
import { UpdateEventDataParam, isCombinationTriggerCondition, COMBINATION_OPERATOR } from "@types";
import { isValidCombinationExpression } from "@utils";

interface EventSidePanelProps {
  selectedEvent: UpdateEventDataParam | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onUpdate: (event: UpdateEventDataParam) => void;
  canDelete?: boolean;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
  tooltip?: boolean;
  tooltipTitle?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  children,
  multiline = false,
  tooltip,
  tooltipTitle,
}) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] flex items-center gap-2 ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">{label}</span>
      {tooltip && (
        <Tooltip label={tooltipTitle || label} align="top">
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      )}
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  eventId: string;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  hasEvent: boolean;
  isReadOnly: boolean;
  canDelete: boolean;
}> = ({ eventId, onClose, onDelete, hasEvent, isReadOnly, canDelete }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isReadOnly ? en.simulation.viewEvent : en.simulation.editEvent}
      </span>
    </button>
    {hasEvent && !isReadOnly && canDelete && (
      <button onClick={() => onDelete(eventId)} className="flex items-center gap-2">
        <Trash width={14} height={14} />
        <span className="text-base font-tertiary font-medium text-typography-900">
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
  canDelete = true,
}) => {
  const [formData, setFormData] = useState(selectedEvent);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const isReadOnly = selectedEvent?.isEditable === false;

  useEffect(() => {
    if (selectedEvent) {
      // Initialize default structure for combination events for UI purposes only
      if (
        selectedEvent.detectionType === EVENT_DETECTION_TYPES.COMBINATION &&
        (!selectedEvent.triggerCondition ||
          (selectedEvent.triggerCondition as any)?.expression === null)
      ) {
        setFormData({
          ...selectedEvent,
          triggerCondition: {
            expression: {
              type: COMBINATION_OPERATOR.AND,
              left: { id: "" },
              right: { id: "" },
            },
          },
        });
      } else {
        setFormData(selectedEvent);
      }
    } else {
      setFormData(selectedEvent);
    }
  }, [selectedEvent]);

  const debouncedUpdate = useDebounce(() => onUpdate(formData), 500);

  useEffect(() => {
    if (isReadOnly) return;
    debouncedUpdate();
  }, [formData]);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number | object) => {
      if (!selectedEvent) return;

      setFormData(previousData => {
        return {
          ...previousData,
          [fieldName]: value,
        };
      });
    },
    [selectedEvent],
  );

  const handleTriggerConditionChange = useCallback(
    (field: string, value: string | number | string[] | any) => {
      if (!selectedEvent) return;

      setFormData(
        previousData =>
          ({
            ...previousData,
            triggerCondition: {
              ...(previousData.triggerCondition || {}),
              [field]: value,
            },
          }) as UpdateEventDataParam,
      );
    },
    [selectedEvent],
  );

  /**
   * Helper to update detection config fields
   * Reduces repetitive code for updating nested detectionConfig properties
   */
  const handleDetectionConfigChange = useCallback(
    (field: string, value: any) => {
      if (!selectedEvent) return;

      setFormData(previousData => ({
        ...previousData,
        detectionConfig: {
          ...previousData.detectionConfig,
          [field]: value,
        },
      }));
    },
    [selectedEvent],
  );

  const handleDelete = useCallback(() => {
    if (selectedEvent?.id) {
      onDelete(selectedEvent.id);
    }
  }, [selectedEvent, onDelete]);

  const handleClose = useCallback(() => {
    // Check if this is a combination event with exactly one event selected (incomplete state)
    // Show modal only when exactly one event is selected, not when both are empty or both are selected
    if (
      formData?.detectionType === EVENT_DETECTION_TYPES.COMBINATION &&
      formData?.triggerCondition &&
      isCombinationTriggerCondition(formData.triggerCondition)
    ) {
      const expression = formData.triggerCondition.expression;
      if (!isValidCombinationExpression(expression)) {
        setShowConfirmationModal(true);
        return; // Show modal instead of closing
      }
    }
    onClose();
  }, [formData, onClose]);

  const convertEventTypeFormat = (eventType: string) => {
    return EVENT_TYPE_POPUP_OPTIONS.find(option => option.value === eventType)?.label || eventType;
  };

  const handleConfirmClose = useCallback(() => {
    setShowConfirmationModal(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />

      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light">
        <PanelHeader
          eventId={selectedEvent?.id}
          onClose={handleClose}
          onDelete={handleDelete}
          hasEvent={!!selectedEvent}
          isReadOnly={isReadOnly}
          canDelete={canDelete}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          {isReadOnly && (
            <div className="mb-4 rounded-md bg-neutral-100 px-4 py-3 text-base text-typography-700">
              {en.simulation.eventReadOnly}
            </div>
          )}
          <div className="mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={event => handleFieldChange("name", event.target.value)}
              placeholder="New Event"
              className="border-none focus:outline-none text-2xl font-light w-full"
              disabled={isReadOnly}
            />
          </div>

          <div className={`space-y-3 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`}>
            <div>
              <Field label="Event code">
                <div className="text-base text-neutral-800">{formData.eventCode || "—"}</div>
              </Field>
              <Field label="Event type">
                <div>{convertEventTypeFormat(formData.detectionType || "-")}</div>
              </Field>
            </div>
            {/* Trigger Conditions Field */}

            <TriggerConditions
              eventType={formData.detectionType}
              triggerCondition={formData.triggerCondition}
              onChange={handleTriggerConditionChange}
              currentEventId={formData.id}
            />

            <OccurrenceControlSection
              eventType={formData.detectionType}
              maxOccurrences={formData?.detectionConfig?.maxOccurrences}
              minGapTime={formData?.detectionConfig?.minGapTime as string}
              occurrenceInterval={formData?.detectionConfig?.occurrenceInterval}
              onMaxOccurrencesChange={value => handleDetectionConfigChange("maxOccurrences", value)}
              onMinGapTimeChange={value => handleDetectionConfigChange("minGapTime", value)}
              onOccurrenceIntervalChange={value =>
                handleDetectionConfigChange("occurrenceInterval", value)
              }
            />

            {formData?.detectionType !== EVENT_DETECTION_TYPES.TIME_BASED && (
              <TimeWindowSection
                startTime={formData?.detectionConfig?.startTime as string}
                endTime={formData?.detectionConfig?.endTime as string}
                onStartTimeChange={value => handleDetectionConfigChange("startTime", value)}
                onEndTimeChange={value => handleDetectionConfigChange("endTime", value)}
              />
            )}

            {formData?.detectionType !== EVENT_DETECTION_TYPES.SCORE_BASED && (
              <ScoreWindowSection
                minScore={formData?.detectionConfig?.minScore}
                maxScore={formData?.detectionConfig?.maxScore}
                onMinScoreChange={value => handleDetectionConfigChange("minScore", value)}
                onMaxScoreChange={value => handleDetectionConfigChange("maxScore", value)}
              />
            )}

            <div className="flex-1 h-[1px] bg-border-light" />
            <Field
              label="Branch description"
              multiline
              tooltip
              tooltipTitle='Use "<" to access dynamic content for branching in simulations.'
            >
              <TextareaWithTriggerDropdown
                value={formData.branchInstruction}
                onChange={value => handleFieldChange("branchInstruction", value)}
                placeholder="Add instruction"
                alwaysOpen
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
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
              />
            </Field>

            <Field label="Default real time feedback emoji">
              <EmojiPickerComponent
                className="max-w-[60px] pr-[25px]"
                onEmojiClick={emoji => handleFieldChange("emoji", emoji)}
                buttonText={formData.emoji}
              />
            </Field>

            <Field label="Tags">
              <div className="w-full">
                <SimpleTagSelector
                  tags={formData.tags || []}
                  updateTags={tags => handleFieldChange("tags", tags)}
                  label=""
                />
              </div>
            </Field>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirmationModal}
        onClose={handleCancelClose}
        title="Incomplete Combination Event"
        description="Please select both event conditions for the combination event to be saved. Are you sure you want to close?"
        primaryButton={{
          label: "Close Anyway",
          onClick: handleConfirmClose,
        }}
        secondaryButton={{
          label: "Go Back",
          onClick: handleCancelClose,
        }}
      />
    </div>
  );
};
