import React, { useRef, useEffect } from "react";

export interface AutoExpandableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
  className?: string;
  minHeight?: number;
  maxLines?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

export const AutoExpandableTextarea: React.FC<AutoExpandableTextareaProps> = ({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  width,
  className = "",
  minHeight = 50,
  maxLines = 20,
  onKeyDown,
  onBlur,
  autoFocus = false,
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

  return (
    <textarea
      ref={textareaRef}
      value={value}
      style={{ width: width }}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full mt-[-8px] px-0 py-0 text-text-700 focus:outline-none disabled:bg-neutral-100 disabled:text-text-500 resize-none overflow-y-auto [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb ${className}`}
    />
  );
};
