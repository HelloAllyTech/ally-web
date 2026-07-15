import { ChangeEvent, CSSProperties, InputHTMLAttributes, ReactNode, Ref } from "react";

import { FieldErrors, UseFormRegister } from "react-hook-form";

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "size" | "width" | "height" | "color" | "ref"
> {
  className?: string;
  disabled?: boolean;
  hideError?: boolean;
  errorMessage?: string;
  errors?: FieldErrors<any>;
  fieldSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  inputStyles?: CSSProperties;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  /**
   * Kept for backwards compatibility with existing call sites that used the
   * MUI `InputProps` API. Only the fields the app actually relies on are
   * honoured (`readOnly` and start/end adornments).
   */
  InputProps?: {
    readOnly?: boolean;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
  };
  label?: string;
  multiline?: boolean;
  name?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  register?: UseFormRegister<any>;
  rows?: number;
  showBorder?: boolean;
  value?: string;
}
