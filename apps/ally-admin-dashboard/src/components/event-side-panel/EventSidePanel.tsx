import React, { useState, useCallback, useEffect } from "react";

import { DoubleArrowRight, Trash } from "@assets";
import {
  ActionConfirmationPopup,
  AutoExpandableTextarea,
  EmojiPickerComponent,
  TriggerConditions,
} from "@components";
import { NumberInput } from "@components/notion-table";
import { en, EVENT_DETECTION_TYPES } from "@constants";
import { useDebounce } from "@hooks";
import { UpdateEventDataParam } from "@types";
import { isExactlyOneEventSelected } from "@utils";

import { isCombinationTriggerCondition } from "../../types/triggerConditions";

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
  const [formData, setFormData] = useState(selectedEvent);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      // Initialize default combination trigger condition if needed
      if (
        selectedEvent.detectionType === EVENT_DETECTION_TYPES.COMBINATION &&
        (!selectedEvent.triggerCondition ||
          (selectedEvent.triggerCondition as any)?.expression === null)
      ) {
        setFormData({
          ...selectedEvent,
          triggerCondition: {
            expression: {
              type: "AND",
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

  const debouncedUpdate = useDebounce(() => {
    onUpdate(formData);
  }, 500);

  useEffect(() => {
    debouncedUpdate();

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      setFormData(previousData => {
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

  const handleClose = useCallback(() => {
    // Check if this is a combination event with exactly one event selected (incomplete state)
    // Show modal only when exactly one event is selected, not when both are empty or both are selected
    if (
      formData?.detectionType === EVENT_DETECTION_TYPES.COMBINATION &&
      formData?.triggerCondition &&
      isCombinationTriggerCondition(formData.triggerCondition)
    ) {
      const expression = formData.triggerCondition.expression;
      if (isExactlyOneEventSelected(expression)) {
        setShowConfirmationModal(true);
        return; // Show modal instead of closing
      }
    }
    onClose();
  }, [formData, onClose]);

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
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb">
          <div className="mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={event => handleFieldChange("name", event.target.value)}
              placeholder="New Event"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <div className="space-y-3">
            {/* <Field label="Event code">
              <div className="text-sm text-neutral-800">{eventCode || "—"}</div>
            </Field> */}

            {/* Trigger Conditions Field */}
            {(formData?.detectionType === EVENT_DETECTION_TYPES.TIME_BASED ||
              formData?.detectionType === EVENT_DETECTION_TYPES.SCORE_BASED ||
              formData?.detectionType === EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY ||
              formData?.detectionType === EVENT_DETECTION_TYPES.COMBINATION) && (
              <TriggerConditions
                eventType={formData.detectionType}
                triggerCondition={formData.triggerCondition}
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
