import { FC, useId, WheelEventHandler } from "react";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { formFieldProtectionProps } from "@constants/formFieldProtection";

import { TextFieldProps } from "./types";

const sizeMap = {
  small: "sm",
  medium: "md",
  large: "lg",
} as const;

const TextField: FC<TextFieldProps> = ({
  className,
  disabled,
  errorMessage,
  errors,
  fieldSize = "small",
  fullWidth = true,
  id,
  inputRef,
  inputStyles,
  InputProps,
  label,
  multiline = false,
  name,
  onChange,
  register,
  rows = 1,
  showBorder = true,
  value,
  hideError = true,
  type,
  onWheel,
  ...props
}) => {
  // <input type="number"> silently increments/decrements on scroll when
  // focused — a well-known browser quirk. Blurring on wheel lets the page
  // keep scrolling normally instead of mutating the value the user typed.
  const handleWheel: WheelEventHandler<HTMLElement> = e => {
    if (type === "number") {
      (e.target as HTMLElement).blur();
    }
    (onWheel as WheelEventHandler<HTMLElement> | undefined)?.(e);
  };

  const errorText = (errors?.[name ?? ""]?.message as string) || errorMessage;
  const invalid = !!errors?.[name ?? ""] || !!errorMessage;
  // Each field needs a UNIQUE, stable id. The old `"text-field"` constant gave
  // every field the same id, which breaks label↔input association and lets the
  // browser's autofill/password manager treat them as one group — a known cause
  // of focus being stolen after a single keystroke.
  const generatedId = useId();
  const fieldId = id || name || generatedId;

  const registerProps = register && name ? register(name) : {};

  const sharedProps = {
    id: fieldId,
    labelText: label || name || "input",
    hideLabel: true,
    disabled,
    invalid,
    value,
    readOnly: InputProps?.readOnly,
    style: inputStyles,
    ref: inputRef,
    onWheel: handleWheel,
    // Callers can still override the protection hints via `props`.
    ...formFieldProtectionProps,
    ...registerProps,
    ...(onChange ? { onChange } : {}),
    ...(props as Record<string, unknown>),
  };

  const carbonProps = sharedProps as any;

  const inputElement = multiline ? (
    <TextArea {...carbonProps} rows={rows} />
  ) : (
    <TextInput {...carbonProps} type={type} size={sizeMap[fieldSize]} />
  );

  const hasAdornment = !!InputProps?.startAdornment || !!InputProps?.endAdornment;

  return (
    <div className={`flex flex-col ${fullWidth ? "w-full" : ""} ${className ?? ""}`}>
      {label && <span className="text-xs text-typography-700">{label}</span>}
      {hasAdornment ? (
        <div
          className={`flex items-center gap-2 w-full ${showBorder ? "border border-[#E5E7EB] rounded" : ""}`}
        >
          {InputProps?.startAdornment}
          <div className="flex-1 min-w-0">{inputElement}</div>
          {InputProps?.endAdornment}
        </div>
      ) : (
        inputElement
      )}
      {!hideError && <span className="text-xs text-destructive-500 h-[16px]">{errorText}</span>}
    </div>
  );
};

export default TextField;
