import React, { useState, useRef, useEffect, useCallback } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useClickOutside } from "@hooks";

import { EditableTextPopupProps } from "./types";
import { keyCodes } from "./utils";

/** Normalize value to string; handles array (e.g. instructions from API), number, or other. */
function valueToDisplayString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

export const EditableTextPopup: React.FC<EditableTextPopupProps> = ({
  value,
  onChange,
  placeholder = "Click to edit",
  disabled = false,
  width = 100,
  minWidth = 100,
  className = "",
  maxLength,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(() => valueToDisplayString(value));
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const displayValue = valueToDisplayString(value);
    setEditValue(maxLength != null ? displayValue.slice(0, maxLength) : displayValue);
  }, [value, maxLength]);

  const handleTextClick = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setEditValue(valueToDisplayString(value));
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === keyCodes.escape) {
      event.preventDefault();
      handleCancel();
    }
  };

  const handleClickOutsideCallback = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      handleSave();
    }
  }, [isOpen, editValue]);

  useClickOutside(popupRef, handleClickOutsideCallback);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 0);
    }
  }, [isOpen]);

  const displayText = valueToDisplayString(value);
  const textToShow = displayText || placeholder;
  const isPlaceholder = !displayText;

  return (
    <div
      className={`${className} max-h-[360px] overflow-y-auto custom-scrollbar`}
      style={{ width, minWidth }}
    >
      <div
        onClick={handleTextClick}
        className={`
          h-full overflow-hidden max-w-[calc(100%-20px)]
          ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-background-secondary"}
          ${isPlaceholder ? "text-typography-600" : ""}
        `}
      >
        {String(textToShow)
          .split("\n")
          .map((line, index) => (
            <span className="overflow-hidden text-wrap whitespace-nowrap" key={index}>
              {line}
              <br />
            </span>
          ))}
      </div>
      {isOpen && (
        <div ref={popupRef} className="absolute z-50 top-[8px] left-[0px]">
          <AutoExpandableTextarea
            value={editValue}
            width={width}
            minWidth={minWidth}
            autoFocus={true}
            onChange={setEditValue}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="w-full py-1 px-2 border-[0.5px] border-primary-500 rounded-sm focus:outline-none disabled:bg-neutral-100 disabled:text-typography-800 resize-none overflow-y-auto custom-scrollbar"
          />
        </div>
      )}
    </div>
  );
};

export default EditableTextPopup;
