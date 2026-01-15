import React, { useEffect, useMemo, useRef, useState } from "react";

import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { useGetDynamicBranchingInstructionQuery } from "@api";
import { useClickOutside } from "@hooks";

import { PopupWrapper } from "../popup-wrapper";
import { tokenizeAngleText } from "./utils";

const HighlightLayer = React.memo(({ value }: { value: string }) => {
  const tokens = useMemo(() => tokenizeAngleText(value), [value]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {tokens.map((token, index) =>
        token.type === "highlight" ? (
          <span key={index} className="text-primary-600">
            {token.value}
          </span>
        ) : (
          <span key={index} className="text-typography-900">
            {token.value}
          </span>
        ),
      )}
      {value.endsWith("\n") && <br />}
    </div>
  );
});

const DisplayHighlight = ({ value }: { value: string }) => {
  const tokens = useMemo(() => tokenizeAngleText(value), [value]);

  return (
    <>
      {tokens.map((token, index) =>
        token.type === "highlight" ? (
          <span key={index} className="text-primary-600">
            {token.value}
          </span>
        ) : (
          <span key={index} className="text-typography-900">
            {token.value}
          </span>
        ),
      )}
    </>
  );
};

interface TextareaWithTriggerDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  alwaysOpen?: boolean;
}

export const TextareaWithTriggerDropdown: React.FC<TextareaWithTriggerDropdownProps> = ({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  alwaysOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editValue, setEditValue] = useState(value ?? "");
  const [isEditorOpen, setIsEditorOpen] = useState(alwaysOpen);
  const [showDropdown, setShowDropdown] = useState(false);

  const editValueRef = useRef(editValue);

  useEffect(() => {
    editValueRef.current = editValue;
  }, [editValue]);

  useEffect(() => {
    if (value !== editValueRef.current) {
      setEditValue(value ?? "");
    }
  }, [value]);

  const { id } = useParams();
  const { data: options = [] } = useGetDynamicBranchingInstructionQuery(
    id ? Number(id) : undefined,
  );

  const isInsideUnclosedAngle = (text: string, cursor: number) => {
    if (cursor <= 0) return false;
    const open = text.lastIndexOf("<", cursor - 1);
    if (open === -1) return false;
    const close = text.lastIndexOf(">", cursor - 1);
    return open > close;
  };

  const findLastOpenBracket = (text: string, cursor: number) => {
    const open = text.lastIndexOf("<", cursor - 1);
    const close = text.lastIndexOf(">", cursor - 1);
    return open > close ? open : -1;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    const lastChar = text[cursor - 1];

    if (lastChar === "<" && isInsideUnclosedAngle(text, cursor - 1)) {
      toast.error("Nested '<' is not allowed");
      return;
    }

    setEditValue(text);

    if (lastChar === "<") {
      setShowDropdown(true);
    } else if (lastChar === ">" || !isInsideUnclosedAngle(text, cursor)) {
      setShowDropdown(false);
    }
  };

  const handleSelect = (option: string) => {
    if (!textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart;
    const openIndex = findLastOpenBracket(editValueRef.current, cursor);
    if (openIndex === -1) return;

    const newValue =
      editValueRef.current.slice(0, openIndex) + `<${option}>` + editValueRef.current.slice(cursor);

    setEditValue(newValue);
    editValueRef.current = newValue;
    onChange(newValue);
    setShowDropdown(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const closeEditor = () => {
    onChange(editValueRef.current);
    if (!alwaysOpen) {
      setIsEditorOpen(false);
    }
    setShowDropdown(false);
  };

  useClickOutside(containerRef, () => {
    if (isEditorOpen) closeEditor();
  });

  const isPlaceholder = !value;
  const commonStyles = "p-2 text-sm leading-[20px] w-full font-inherit";

  return (
    <div ref={containerRef} className="relative w-full">
      {!isEditorOpen && (
        <div
          onClick={() => !disabled && setIsEditorOpen(true)}
          className={`h-[36px] px-2 py-1 flex items-center overflow-hidden ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
          ${isPlaceholder ? "text-typography-600" : ""}
    `}
        >
          <div className="truncate whitespace-nowrap w-full">
            {isPlaceholder ? placeholder : <DisplayHighlight value={value} />}
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="relative w-full rounded-md bg-white">
          <div className="relative min-h-[56px]">
            <div className={`pointer-events-none ${commonStyles}`}>
              <HighlightLayer value={editValue} />
            </div>

            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={handleChange}
              autoFocus
              disabled={disabled}
              placeholder={placeholder}
              className={`absolute inset-0 resize-none bg-transparent text-transparent caret-black focus:outline-none ${commonStyles} ${className}`}
            />
          </div>

          <PopupWrapper
            isOpen={showDropdown}
            onClose={() => setShowDropdown(false)}
            anchorElement={textareaRef.current}
            className="min-w-[50px] max-w-[20vw] max-h-32 overflow-auto custom-scrollbar"
          >
            {options.map(option => (
              <div
                key={option}
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option);
                }}
                className="cursor-pointer px-3 py-2 hover:bg-neutral-100 font-primary text-sm"
              >
                {option}
              </div>
            ))}
          </PopupWrapper>
        </div>
      )}
    </div>
  );
};
