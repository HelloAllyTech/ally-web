import React, { useEffect, FC, useRef } from "react";

import { cn } from "@/utils/tailwind";
import { Input } from "@/components/generic/input";
import { KeyboardKeys, SINGLE_DIGIT_REGEX } from "@/constants/common";

export interface OTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  digitCount?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

const OTP: FC<OTPProps> = ({
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

    // Take only the last character if multiple characters are entered
    const digit = inputValue.slice(-1);
    if (!SINGLE_DIGIT_REGEX.test(digit)) return;

    const newOtpValue = value.slice(0, index) + digit;
    onChange?.(newOtpValue);

    // Auto-advance to next field
    if (index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtpValue.length === digitCount) {
      onComplete?.(newOtpValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === KeyboardKeys.BACKSPACE) {
      const newOtpValue = value.slice(0, -1);
      onChange?.(newOtpValue);

      // Move focus to the appropriate field
      const focusIndex = Math.min(newOtpValue.length, digitCount - 1);
      inputRefs.current[focusIndex]?.focus();
    }

    // Arrow key navigation
    if (e.key === KeyboardKeys.ARROW_LEFT && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === KeyboardKeys.ARROW_RIGHT && index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className={cn("flex gap-6 items-center", className)} {...props}>
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
          className={cn(
            "w-[64px] h-[64px] bg-[#F5F5F5] rounded-[12px] text-center text-[20px] font-medium placeholder:text-[#bdbdbd] placeholder:font-normal placeholder:text-[28px] border-0 focus-visible:ring-0",
            inputClassName,
          )}
        />
      ))}
    </div>
  );
};

export default OTP;
