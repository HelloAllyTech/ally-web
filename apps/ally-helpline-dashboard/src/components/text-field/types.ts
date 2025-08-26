import { ChangeEvent, CSSProperties } from "react";

import { TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { FieldErrors, UseFormRegister } from "react-hook-form";

export interface TextFieldProps extends Omit<MuiTextFieldProps, "variant"> {
  className?: string;
  disabled?: boolean;
  hideError?: boolean;
  errorMessage?: string;
  errors?: FieldErrors<any>;
  fieldSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  inputStyles?: CSSProperties;
  label?: string;
  multiline?: boolean;
  name?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  register?: UseFormRegister<any>;
  rows?: number;
  showBorder?: boolean;
  value?: string;
}
