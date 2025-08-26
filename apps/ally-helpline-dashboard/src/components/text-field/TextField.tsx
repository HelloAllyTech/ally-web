import { FC } from "react";

import { TextField as MuiTextField } from "@mui/material";

import { TextFieldProps } from "./types";

import "./TextField.css";

const heights = {
  small: "30px",
  medium: "40px",
  large: "48px",
};

const TextField: FC<TextFieldProps> = ({
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
      {label && <span className="text-[12px] text-[#49454F]">{label}</span>}
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
          "& .MuiInputBase-root": {
            border: showBorder ? "1px solid #E5E7EB" : "none",
            borderColor: "#E5E7EB !important",
          },
          "& .MuiOutlinedInput-root": {
            ...(!multiline && { height: heights[fieldSize] }),
            backgroundColor: "#FFF",
            padding: 0,
            "& fieldset": {
              border: showBorder ? "1px solid #E5E7EB" : "none",
              borderColor: "#E5E7EB !important",
            },
            "&.Mui-disabled": {
              backgroundColor: "#F6F6F6",
            },
          },
          "& .MuiInputBase-input": {
            ...(!multiline && { height: heights[fieldSize] }),
            boxSizing: "border-box",
            color: "#4A4459",
            fontSize: "14px",
            ...inputStyles,
          },
        }}
        {...props}
      />
      {!hideError && (
        <span className="text-[12px] text-[#EF4444] h-[16px]">
          {(errors?.[name]?.message as string) || errorMessage}
        </span>
      )}
    </div>
  );
};

export default TextField;
