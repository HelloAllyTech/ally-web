import React, { useState, useRef, useEffect } from "react";

export interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  value = "",
  onChange,
  placeholder = "hh:mm:ss",
  className = "",
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const formatTime = (input: string): string => {
    const digits = input.replace(/\D/g, "");

    const limitedDigits = digits.slice(0, 6);

    let formatted = "";
    for (let i = 0; i < limitedDigits.length; i++) {
      if (i === 2 || i === 4) {
        formatted += ":";
      }
      formatted += limitedDigits[i];
    }

    return formatted;
  };

  const validateTime = (timeString: string): string => {
    if (!timeString) {
      return timeString;
    }

    // Extract digits and pad to 6 digits with trailing zeros
    const digits = timeString.replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
    const paddedTime = `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;

    const parts = paddedTime.split(":");
    if (parts.length !== 3) {
      return timeString;
    }

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    let seconds = parseInt(parts[2], 10);

    // Clamp values to valid ranges
    if (!isNaN(hours)) {
      hours = Math.max(0, Math.min(23, hours));
    }
    if (!isNaN(minutes)) {
      minutes = Math.max(0, Math.min(59, minutes));
    }
    if (!isNaN(seconds)) {
      seconds = Math.max(0, Math.min(59, seconds));
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    const digitsBefore = displayValue.replace(/\D/g, "");
    const newDigits = input.replace(/\D/g, "");

    const formatted = formatTime(newDigits);
    setDisplayValue(formatted);

    let newCursorPosition = cursorPosition;
    if (newDigits.length > digitsBefore.length) {
      const colonCountBefore = (displayValue.match(/:/g) || []).length;
      const colonCountAfter = (formatted.match(/:/g) || []).length;

      if (colonCountAfter > colonCountBefore) {
        newCursorPosition = cursorPosition + 1;
      } else {
        newCursorPosition = cursorPosition;
      }
    } else if (newDigits.length < digitsBefore.length) {
      const colonCountBefore = (displayValue.match(/:/g) || []).length;
      const colonCountAfter = (formatted.match(/:/g) || []).length;

      if (colonCountAfter < colonCountBefore) {
        newCursorPosition = Math.max(0, cursorPosition - 1);
      }
    }

    newCursorPosition = Math.min(newCursorPosition, formatted.length);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);

    if (onChange) {
      onChange(formatted);
    }
  };

  const handleBlur = () => {
    // Validate and format on blur
    if (displayValue) {
      const validated = validateTime(displayValue);
      setDisplayValue(validated);
      if (onChange && validated !== displayValue) {
        onChange(validated);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const digits = pastedText.replace(/\D/g, "").slice(0, 6);
    const formatted = formatTime(digits);
    setDisplayValue(formatted);

    if (onChange) {
      onChange(formatted);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(formatted.length, formatted.length);
      }
    }, 0);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={8}
      pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
      className={`w-full rounded-sm text-sm placeholder:text-typography-600 focus:outline-none px-2 py-1 h-6 ${className}`}
    />
  );
};
