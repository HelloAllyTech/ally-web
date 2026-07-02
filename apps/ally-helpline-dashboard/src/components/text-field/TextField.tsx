import { FC, WheelEventHandler } from "react";

import { TextField as MuiTextField } from "@mui/material";

import { numberInputStyles } from "./TextField.styles";
import { TextFieldProps } from "./types";

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
  type,
  onWheel,
  ...props
}) => {
  // <input type="number"> silently increments/decrements on scroll when
  // focused — a well-known browser quirk. Blurring on wheel lets the page
  // keep scrolling normally instead of mutating the value the user typed.
  const handleWheel: WheelEventHandler<HTMLDivElement> = e => {
    if (type === "number") {
      (e.target as HTMLElement).blur();
    }
    onWheel?.(e);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-xs text-typography-700">{label}</span>}
      <MuiTextField
        disabled={disabled}
        error={!!errors?.[name] || !!errorMessage}
        fullWidth={fullWidth}
        multiline={multiline}
        {...(register && register(name))}
        rows={rows}
        {...(onChange && { onChange })}
        value={value}
        type={type}
        onWheel={handleWheel}
        variant="outlined"
        sx={{
          "& .MuiInputBase-root": {
            border: showBorder ? "1px solid #E5E7EB" : "none",
            borderColor: "#E5E7EB !important",
          },
          "& .MuiOutlinedInput-root": {
            ...(!multiline && { height: heights[fieldSize] }),
            backgroundColor: "#FFF",
            ...(showBorder && multiline ? { padding: "12px" } : { padding: 0 }),
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
            // Hide number input spinners
            "&[type='number']": numberInputStyles,
          },
        }}
        {...props}
      />
      {!hideError && (
        <span className="text-xs text-destructive-500 h-[16px]">
          {(errors?.[name]?.message as string) || errorMessage}
        </span>
      )}
    </div>
  );
};

export default TextField;
