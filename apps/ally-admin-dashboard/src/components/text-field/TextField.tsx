import { FC } from "react";

import { TextField as MuiTextField } from "@mui/material";

import { TextFieldProps } from "../types";

const heights = {
  small: "30px",
  medium: "40px",
  large: "48px",
};

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
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-xs text-typography-800">{label}</span>}
      <MuiTextField
        disabled={disabled}
        error={!!errors?.[name] || !!errorMessage}
        fullWidth={fullWidth}
        multiline={multiline}
        {...(register && register(name))}
        rows={rows}
        {...(onChange && { onChange })}
        value={value}
        variant="outlined"
        sx={{
          // Carbon field tokens: border-subtle (gray-20), square corners come
          // from the global MUI theme (shape.borderRadius: 0).
          "& .MuiInputBase-root": {
            border: showBorder ? "1px solid #e0e0e0" : "none",
            borderColor: "#e0e0e0 !important",
          },
          "& .MuiOutlinedInput-root": {
            ...(!multiline && { height: heights[fieldSize] }),
            backgroundColor: "#FFF",
            ...(showBorder && multiline ? { padding: "12px" } : { padding: 0 }),
            "& fieldset": {
              border: showBorder ? "1px solid #e0e0e0" : "none",
              borderColor: "#e0e0e0 !important",
            },
            "&.Mui-disabled": {
              backgroundColor: "#f4f4f4", // gray-10
            },
          },
          "& .MuiInputBase-input": {
            ...(!multiline && { height: heights[fieldSize] }),
            boxSizing: "border-box",
            color: "#161616", // Carbon text-primary
            fontSize: "14px",
            ...inputStyles,
          },
        }}
        {...props}
      />
      {!hideError && (
        <span className="text-xs text-destructive-400 h-[16px]">
          {(errors?.[name]?.message as string) || errorMessage}
        </span>
      )}
    </div>
  );
};
