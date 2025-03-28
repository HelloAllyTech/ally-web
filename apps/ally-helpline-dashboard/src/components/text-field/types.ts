import { FieldErrors, UseFormRegister } from "react-hook-form";
import { TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { ChangeEvent } from "react";

export interface TextFieldProps extends Omit<MuiTextFieldProps, "variant"> {
  className?: string;
  disabled?: boolean;
  errors?: FieldErrors<any>;
  fieldSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  label?: string;
  multiline?: boolean;
  name?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  register?: UseFormRegister<any>;
  rows?: number;
  value?: string;
}
