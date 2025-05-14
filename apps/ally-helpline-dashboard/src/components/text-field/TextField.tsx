import { FC } from "react";
import { TextField as MuiTextField } from "@mui/material";

import { TextFieldProps } from "./types";

import "./TextField.css";

const heights = {
    small: "30px",
    medium: "40px",
    large: "48px"
  };

const TextField: FC<TextFieldProps> = ({
  className,
  disabled,
  errors,
  fieldSize = "small",
  fullWidth = true,
  label,
  multiline = false,
  name,
  onChange,
  register,
  rows = 1,
  value,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-[4px] ${className}`}>
      {label && <span className="text-[12px] text-[#49454F]">{label}</span>}
      <MuiTextField
        disabled={disabled}
        error={!!errors?.[name]}
        fullWidth={fullWidth}
        multiline={multiline}
        {...(register && register(name))}
        rows={rows}
        {...(onChange && { onChange })}
        value={value}
        variant="outlined"
        sx={{
          "& .MuiInputBase-root": {
            border: "1px solid #E5E7EB",
            borderColor: "#E5E7EB !important",
          },
          "& .MuiOutlinedInput-root": {
            ...(!multiline && {height: heights[fieldSize]}),
            backgroundColor: "#FFF",
            padding: 0,
            "& fieldset": {
              border: "1px solid #E5E7EB",
              borderColor: "#E5E7EB !important",
            },
            "&.Mui-disabled": {
              backgroundColor: "#F6F6F6",
            },
          },
          "& .MuiInputBase-input": {
            ...(!multiline && {height: heights[fieldSize]}),
            boxSizing: "border-box",
            color: "#4A4459",
            fontSize: "14px",
            padding: "12px 16px",
          },
        }}
        {...props}
      />
      {errors?.[name] && <span className="text-[12px] text-[#EF4444]">{errors?.[name]?.message as string}</span>}
    </div>
  );
};

export default TextField;
