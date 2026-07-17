import { FC, useId } from "react";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";

import { TextFieldProps } from "../types";

const sizeMap = { small: "sm", medium: "md", large: "lg" } as const;

export const TextField: FC<TextFieldProps> = ({
  className,
  disabled,
  errorMessage,
  errors,
  fieldSize = "small",
  fullWidth = true,
  inputStyles,
  label,
  multiline = false,
  name,
  onChange,
  register,
  rows = 1,
  showBorder = true,
  value,
  hideError = true,
  ...props
}) => {
  const generatedId = useId();
  const fieldId = name || generatedId;

  const isInvalid = !!(name && errors?.[name]) || !!errorMessage;
  const invalidText = (name && (errors?.[name]?.message as string)) || errorMessage || undefined;
  const registerProps = register && name ? register(name) : {};

  // Carbon inputs render their own (visually hidden) label for a11y; the
  // component keeps its own styled label span above the field, so Carbon's
  // label is hidden via `hideLabel`.
  const sharedProps = {
    id: fieldId,
    labelText: label ?? "",
    hideLabel: true,
    disabled,
    invalid: isInvalid,
    invalidText: hideError ? undefined : invalidText,
    style: inputStyles,
    value,
    ...registerProps,
    ...(onChange && { onChange }),
    // Remaining native input attributes (type, inputMode, placeholder, …) are
    // forwarded to the underlying Carbon input. Cast to `any` because the
    // generic HTMLInputElement handler types are wider than Carbon's.
    ...(props as any),
  };

  return (
    <div
      className={`flex flex-col ${fullWidth ? "w-full" : ""} ${
        !showBorder ? "[&_.cds--text-input]:border-none [&_.cds--text-area]:border-none" : ""
      } ${className ?? ""}`}
    >
      {label && <span className="text-xs text-typography-800">{label}</span>}
      {multiline ? (
        <TextArea {...sharedProps} rows={rows} />
      ) : (
        <TextInput {...sharedProps} size={sizeMap[fieldSize]} />
      )}
    </div>
  );
};
