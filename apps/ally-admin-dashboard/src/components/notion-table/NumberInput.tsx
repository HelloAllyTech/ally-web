import React, { useState, useRef, useEffect } from "react";

import { ArrowDownFilled } from "@assets";
import { isNumber } from "@utils";

import { NumberInputProps } from "./types";
import { keyCodes } from "./utils";

export const NumberInput: React.FC<NumberInputProps> = ({
  value = 0,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  placeholder = "0",
  disabled = false,
  className = "",
  inputClassName = "",
  spinnerClassName = "",
}) => {
  const normalizedValue = isNumber(value) ? value : 0;
  const [inputValue, setInputValue] = useState(normalizedValue.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = isNumber(value) ? value : 0;
    setInputValue(next.toString());
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(Math.max(numValue, min), max);
      onChange?.(clampedValue);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setInputValue(normalizedValue.toString());
    } else {
      const clampedValue = Math.min(Math.max(numValue, min), max);
      setInputValue(clampedValue.toString());
      onChange?.(clampedValue);
    }
  };

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(normalizedValue + step, max);
    setInputValue(newValue.toString());
    onChange?.(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(normalizedValue - step, min);
    setInputValue(newValue.toString());
    onChange?.(newValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === keyCodes.arrowUp) {
      event.preventDefault();
      handleIncrement();
    } else if (event.key === keyCodes.arrowDown) {
      event.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={7}
        className={`
          w-[70%] min-w-[60px] pr-8 py-2
          bg-transparent
          disabled:disabled:text-typography-500 disabled:cursor-not-allowed
          hover:bg-transparent focus:outline-none
          text-left
          ${inputClassName}
        `}
      />

      <div className={`absolute left-[70px] flex flex-col gap-2 ${spinnerClassName}`}>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || normalizedValue >= max}
          className={`
            flex items-center justify-center
            text-typography-400 hover:text-typography-500
            disabled:text-border-light disabled:cursor-not-allowed
            transition-colors duration-150
            ${isFocused ? "text-typography-500" : ""}
          `}
        >
          <ArrowDownFilled width={8} height={8} className="rotate-180 transform" />
        </button>

        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || normalizedValue <= min}
          className={`
            flex items-center justify-center
            text-typography-400 hover:text-typography-500
            disabled:text-border-light disabled:cursor-not-allowed
            transition-colors duration-150
            ${isFocused ? "text-typography-500" : ""}
          `}
        >
          <ArrowDownFilled width={8} height={8} />
        </button>
      </div>
    </div>
  );
};

export default NumberInput;
