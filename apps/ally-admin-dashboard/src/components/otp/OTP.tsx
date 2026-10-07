import React, { useEffect, FC, useRef } from "react";

import { Input } from "@components";
import { OTPProps } from "@components/types";
import { KeyboardKeys, SINGLE_DIGIT_REGEX } from "@constants";

export const OTP: FC<OTPProps> = ({
  className,
  digitCount = 4,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  placeholder = "_",
  inputClassName,
  ...props
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, digitCount);
  }, [digitCount]);

  const handleInputChange = (index: number, inputValue: string) => {
    if (disabled) return;

    const digit = inputValue.slice(-1);
    if (!SINGLE_DIGIT_REGEX.test(digit)) return;

    const newOtpValue = value.slice(0, index) + digit;
    onChange?.(newOtpValue);

    if (index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtpValue.length === digitCount) {
      onComplete?.(newOtpValue);
    }
  };

  // A code copied from the sign-in email arrives as one paste. Each box only
  // holds one character, so without this a phone user pasting "4821" got just
  // "1" in the first box and had to type the code digit by digit.
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();

    const newOtpValue = (value.slice(0, index) + digits).slice(0, digitCount);
    onChange?.(newOtpValue);
    inputRefs.current[Math.min(newOtpValue.length, digitCount - 1)]?.focus();

    if (newOtpValue.length === digitCount) {
      onComplete?.(newOtpValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === KeyboardKeys.BACKSPACE) {
      const newOtpValue = value.slice(0, -1);
      onChange?.(newOtpValue);

      const focusIndex = Math.min(newOtpValue.length, digitCount - 1);
      inputRefs.current[focusIndex]?.focus();
    }

    if (e.key === KeyboardKeys.ARROW_LEFT && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === KeyboardKeys.ARROW_RIGHT && index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className={`flex gap-3 sm:gap-6 items-center ${className ?? ""}`} {...props}>
      {Array.from({ length: digitCount }, (_, index) => (
        <Input
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ""}
          onChange={e => handleInputChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={e => handlePaste(index, e)}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          placeholder={placeholder}
          className={`max-w-14 h-14 sm:max-w-[64px] sm:h-[64px] bg-neutral-100 rounded-[20px] text-center text-3xl font-medium placeholder:text-neutral-400 placeholder:font-normal placeholder:text-3xl border-0 focus-visible:ring-0 ${inputClassName ?? ""}`}
        />
      ))}
    </div>
  );
};
