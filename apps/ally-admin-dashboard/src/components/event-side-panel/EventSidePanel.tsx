import React, { useState, useCallback, useEffect } from "react";

import { ArrowDownFilled, DoubleArrowRight, Trash } from "@assets";
import { AutoExpandableTextarea, EmojiPickerComponent, NumberInput } from "@components";
import { SPEAKER_OPTIONS, en } from "@constants";
import { useDebounce } from "@hooks";
import { UpdateEventDataParam } from "@types";
import { formatCapitalizedEnum } from "@utils";

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
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-[14px] justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-gray-800">{children}</div>
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
      className="flex flex-row items-center justify-center gap-2 text-gray-600 hover:text-gray-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-sm">{en.simulation.editEvent}</span>
    </button>
    {hasEvent && (
      <button onClick={() => onDelete(eventId)} className="flex items-center gap-2">
        <Trash width={14} height={14} />
        <span className="text-sm">{en.simulation.deleteEvent}</span>
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
  const [isSpeakerDropdownOpen, setIsSpeakerDropdownOpen] = useState(false);
  const [formData, setFormData] = useState(selectedEvent);

  useEffect(() => {
    setFormData(selectedEvent);
  }, []);

  useEffect(() => {
    debouncedUpdate();
  }, [formData]);

  const debouncedUpdate = useDebounce(() => {
    onUpdate(formData);
  }, 500);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number) => {
      setIsSpeakerDropdownOpen(false);
      if (!selectedEvent) return;

      setFormData(previousData => ({
        ...previousData,
        [fieldName]: value,
      }));
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

      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-gray-300">
        <PanelHeader
          eventId={selectedEvent?.id}
          onClose={onClose}
          onDelete={handleDelete}
          hasEvent={!!selectedEvent}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400">
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
            <Field label="Event type">
              <span className="text-sm">
                {formatCapitalizedEnum(selectedEvent?.detectionType) || "—"}
              </span>
            </Field>

            <Field label="Speaker">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpeakerDropdownOpen(!isSpeakerDropdownOpen)}
                  className="px-0 py-2 cursor-pointer text-sm flex items-center space-x-2"
                >
                  <span className="truncate">
                    {formatCapitalizedEnum(formData.speaker) || "Add speaker"}
                  </span>
                  <ArrowDownFilled width={8} height={8} />
                </button>
                {isSpeakerDropdownOpen && (
                  <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[30px] space-y-1">
                    {SPEAKER_OPTIONS.map(option => (
                      <div
                        key={option?.value}
                        onClick={() => handleFieldChange("speaker", option.value)}
                        className={`px-3 py-2 cursor-pointer rounded-[6px] flex items-center hover:bg-blue-100 ${formData.speaker === option.value ? "bg-gray-100" : ""}`}
                      >
                        <span className="truncate">{option?.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Add description" multiline={true}>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={20}
                value={formData.description}
                onChange={value => handleFieldChange("description", value)}
                placeholder="Add description"
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400"
              />
            </Field>

            <Field label="Add instruction" multiline={true}>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={20}
                value={formData.branchInstruction}
                onChange={value => handleFieldChange("branchInstruction", value)}
                placeholder="Add instruction"
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400"
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
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-sm w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400"
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
