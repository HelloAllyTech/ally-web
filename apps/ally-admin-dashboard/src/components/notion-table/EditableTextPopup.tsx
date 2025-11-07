import React, { useState, useRef, useEffect, useCallback } from "react";

import { AutoExpandableTextarea } from "@components";
import { useClickOutside } from "@hooks";

import { EditableTextPopupProps } from "./types";
import { keyCodes } from "./utils";

export const EditableTextPopup: React.FC<EditableTextPopupProps> = ({
  value,
  onChange,
  placeholder = "Click to edit",
  disabled = false,
  width = 100,
  minWidth = 100,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value]);

  const handleTextClick = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setEditValue(value);
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

  const displayText = value || placeholder;
  const isPlaceholder = !value;

  return (
    <div className={`${className}`} style={{ width, minWidth }}>
      <div
        onClick={handleTextClick}
        className={`
          cursor-pointer max-h-[36px] overflow-hidden max-w-[calc(100%-20px)]
          ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-background-secondary"}
          ${isPlaceholder ? "text-text-400" : ""}
        `}
      >
        {disabled ? (
          <span className="flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap w-full cursor-not-allowed">
            --
          </span>
        ) : (
          displayText?.split("\n").map((line, index) => (
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" key={index}>
              {line}
              <br />
            </span>
          ))
        )}
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
            className="w-full py-1 px-2 border border-primary rounded focus:outline-none disabled:bg-neutral-100 disabled:text-text-500 resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb"
          />
        </div>
      )}
    </div>
  );
};

export default EditableTextPopup;
