import { FieldErrors, UseFormRegister } from "react-hook-form";
import { TextFieldProps as MuiTextFieldProps } from "@mui/material";

export interface TextFieldProps extends Omit<MuiTextFieldProps, "variant"> {
  name: string;
  label?: string;
  errors?: FieldErrors<any>;
  helperText?: string;
  fullWidth?: boolean;
  register: UseFormRegister<any>;
}
