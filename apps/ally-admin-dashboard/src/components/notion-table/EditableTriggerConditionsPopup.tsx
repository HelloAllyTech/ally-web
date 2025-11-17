import React, { useState, useRef, useEffect, useCallback } from "react";

import { TriggerConditions } from "@components";
import { StandardTriggerConditions } from "@components/trigger-conditions";
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

  useClickOutside(popupRef, handleClickOutsideCallback);

  return (
    <div className={`${className} relative flex items-center`} style={{ width, minWidth }}>
      {/* Always display trigger conditions inline */}
      <div
        onClick={handleTextClick}
        className={`
          cursor-pointer max-h-[36px] overflow-hidden max-w-[calc(100%-20px)] w-full
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
            onChange={() => {
              // No-op for display mode - changes only happen in popup
            }}
          />
        )}
      </div>
      {/* Popup for editing */}
      {isOpen && (
        <div ref={popupRef} className="absolute z-50 overflow-visible" style={{ top: 0, left: 0 }}>
          <div
            className="bg-white border border-primary-500 shadow-lg overflow-visible"
            style={{
              minWidth: minWidth || width || 400,
              width: width,
              minHeight: "100%",
              padding: "8px 16px",
            }}
          >
            <div className="max-w-full overflow-visible">
              {eventType === "COMBINATION" ? (
                <TriggerConditions
                  eventType={eventType}
                  triggerCondition={editTriggerCondition}
                  isInTable={false}
                  onChange={(field: string, fieldValue: string | number | string[]) => {
                    const updatedTriggerCondition = {
                      ...editTriggerCondition,
                      [field]: fieldValue,
                    };
                    setEditTriggerCondition(updatedTriggerCondition);
                  }}
                />
              ) : (
                <StandardTriggerConditions
                  eventType={eventType}
                  triggerCondition={editTriggerCondition}
                  onChange={(field: string, fieldValue: string | number | string[]) => {
                    const updatedTriggerCondition = {
                      ...editTriggerCondition,
                      [field]: fieldValue,
                    };
                    setEditTriggerCondition(updatedTriggerCondition);
                  }}
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
