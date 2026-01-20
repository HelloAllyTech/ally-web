import React, { useState, useRef, useEffect, useCallback } from "react";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  StandardTriggerConditions,
  MultiLevelCombinationTriggerConditions,
  CombinationTriggerConditions,
} from "@components";
import { EVENT_DETECTION_TYPES } from "@constants";
import { useClickOutside } from "@hooks";

interface EditableTriggerConditionsPopupProps {
  eventType: string | undefined;
  triggerCondition: any;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
  minWidth?: number;
  className?: string;
  currentEventId?: string;
}

export const EditableTriggerConditionsPopup: React.FC<EditableTriggerConditionsPopupProps> = ({
  eventType,
  triggerCondition,
  onChange,
  disabled = false,
  width = 100,
  minWidth = 100,
  className = "",
  currentEventId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editTriggerCondition, setEditTriggerCondition] = useState(triggerCondition || {});
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTriggerCondition(triggerCondition || {});
  }, [triggerCondition]);

  const handleTextClick = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleSave = useCallback(() => {
    // Only call onChange when closing the popup (on blur)
    if (JSON.stringify(editTriggerCondition) !== JSON.stringify(triggerCondition)) {
      onChange(editTriggerCondition);
    }
    setIsOpen(false);
  }, [editTriggerCondition, triggerCondition, onChange]);

  const handleClickOutsideCallback = useCallback(() => {
    if (isOpen) handleSave();
  }, [isOpen, handleSave]);

  const handleFieldChange = useCallback(
    (field: string, fieldValue: string | number | string[] | any) => {
      setEditTriggerCondition(prev => ({
        ...prev,
        [field]: fieldValue,
      }));
    },
    [],
  );

  useClickOutside(popupRef, handleClickOutsideCallback);

  return (
    <div className={`${className} flex flex-wrap items-start w-full`}>
      {/* Always display trigger conditions inline */}
      <div
        onClick={handleTextClick}
        className={`
          cursor-pointer w-full overflow-x-hidden custom-scrollbar
          ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-background-secondary"}
        `}
      >
        {disabled ? (
          <div className="flex items-center justify-center w-full cursor-not-allowed">
            <span>--</span>
          </div>
        ) : eventType === EVENT_DETECTION_TYPES.COMBINATION ? (
          FEATURE_FLAGS_MAP.MULTI_LEVEL_COMBINATION_TRIGGER_CONDITIONS_FLAG ? (
            <MultiLevelCombinationTriggerConditions
              triggerCondition={editTriggerCondition}
              isInTable={true}
              onChange={handleFieldChange}
              currentEventId={currentEventId}
            />
          ) : (
            <CombinationTriggerConditions
              triggerCondition={editTriggerCondition}
              isInTable={true}
              onChange={handleFieldChange}
              currentEventId={currentEventId}
            />
          )
        ) : (
          <StandardTriggerConditions
            eventType={eventType}
            triggerCondition={editTriggerCondition}
            onChange={handleFieldChange}
            isInTable={true}
          />
        )}
      </div>
      {/* Popup for editing */}
      {isOpen && (
        <div ref={popupRef} className="absolute z-50 top-[0px] left-[0px] overflow-visible">
          <div
            className="bg-background border-[0.5px] border-primary-500 rounded-sm shadow-lg overflow-visible py-2 px-1 min-h-[50px] w-auto"
            style={{
              minWidth: minWidth || width || 400,
              width: width,
            }}
          >
            <div className="max-w-full overflow-scroll custom-scrollbar pb-1">
              {eventType === EVENT_DETECTION_TYPES.COMBINATION ? (
                FEATURE_FLAGS_MAP.MULTI_LEVEL_COMBINATION_TRIGGER_CONDITIONS_FLAG ? (
                  <MultiLevelCombinationTriggerConditions
                    triggerCondition={editTriggerCondition}
                    isInTable={false}
                    onChange={handleFieldChange}
                    currentEventId={currentEventId}
                  />
                ) : (
                  <CombinationTriggerConditions
                    triggerCondition={editTriggerCondition}
                    isInTable={false}
                    onChange={handleFieldChange}
                    currentEventId={currentEventId}
                  />
                )
              ) : (
                <StandardTriggerConditions
                  eventType={eventType}
                  triggerCondition={editTriggerCondition}
                  onChange={handleFieldChange}
                  isInTable={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableTriggerConditionsPopup;
