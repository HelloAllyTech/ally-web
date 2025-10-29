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
    <div className={`flex gap-6 items-center ${className ?? ""}`} {...props}>
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
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          placeholder={placeholder}
          className={`w-[64px] h-[64px] bg-[#F5F5F5] rounded-[12px] text-center text-[28px] font-medium placeholder:text-[#bdbdbd] placeholder:font-normal placeholder:text-[28px] border-0 focus-visible:ring-0 ${inputClassName ?? ""}`}
        />
      ))}
    </div>
  );
};
