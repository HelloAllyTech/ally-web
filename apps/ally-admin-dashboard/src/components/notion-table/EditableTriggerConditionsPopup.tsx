import React, { useState, useRef, useEffect, useCallback } from "react";

import {
  TriggerConditions,
  StandardTriggerConditions,
  CombinationTriggerConditions,
} from "@components";
import { useClickOutside } from "@hooks";
import { EVENT_DETECTION_TYPES } from "@src/constants/eventTypes";

interface EditableTriggerConditionsPopupProps {
  eventType: string | undefined;
  triggerCondition: any;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
  minWidth?: number;
  className?: string;
}

export const EditableTriggerConditionsPopup: React.FC<EditableTriggerConditionsPopupProps> = ({
  eventType,
  triggerCondition,
  onChange,
  disabled = false,
  width = 100,
  minWidth = 100,
  className = "",
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
    if (isOpen) {
      handleSave();
    }
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
    <div className={`${className}`}>
      {/* Always display trigger conditions inline */}
      <div
        onClick={handleTextClick}
        className={`
          cursor-pointer overflow-hidden
          ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-background-secondary"}
        `}
      >
        {disabled ? (
          <div className="flex items-center justify-center w-full cursor-not-allowed">
            <span>--</span>
          </div>
        ) : (
          <TriggerConditions
            eventType={eventType}
            triggerCondition={triggerCondition}
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
            <div className="max-w-full overflow-visible">
              {eventType === EVENT_DETECTION_TYPES.COMBINATION ? (
                <CombinationTriggerConditions
                  triggerCondition={editTriggerCondition}
                  isInTable={false}
                  onChange={handleFieldChange}
                />
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
