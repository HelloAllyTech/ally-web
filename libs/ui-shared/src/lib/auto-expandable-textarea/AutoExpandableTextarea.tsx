"use client";

import React, { useRef, useEffect } from "react";

export interface AutoExpandableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxLines?: number;
  maxLength?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  id?: string;
}

export const AutoExpandableTextarea: React.FC<AutoExpandableTextareaProps> = ({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  width,
  className = "",
  minHeight = 50,
  minWidth = 100,
  maxLines = 10,
  maxLength,
  onKeyDown,
  onBlur,
  autoFocus = false,
  id,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = `${minHeight}px`;

      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      const maxHeight = lineHeight * maxLines;

      if (scrollHeight > minHeight) {
        textarea.style.height = Math.min(scrollHeight, maxHeight) + "px";
      }
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [autoFocus]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const currentLength = value?.length ?? 0;

  return (
    <div className="w-full flex flex-col">
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        style={{ width, minWidth }}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full mt-[-8px] px-0 py-0 text-typography-900 placeholder:text-typography-600 focus:outline-none disabled:bg-neutral-100 disabled:text-typography-800 resize-none overflow-y-auto custom-scrollbar ${className}`}
      />
      {maxLength != null && (
        <div
          className={`text-right text-xs mt-1 ${currentLength === maxLength ? "text-red-500" : "text-typography-600"}`}
        >
          {currentLength} / {maxLength.toString()}
        </div>
      )}
    </div>
  );
};
