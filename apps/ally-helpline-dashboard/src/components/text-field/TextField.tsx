import { FC } from "react";
import { TextField as MuiTextField } from "@mui/material";

import { TextFieldProps } from "./types";

const TextField: FC<TextFieldProps> = ({
    name,
    label,
    errors,
    helperText,
    fullWidth = true,
    register,
    ...props
}) => {
  return (
    <div className="flex flex-col gap-[4px]">
      <span className="text-[12px] text-[#49454F]">{label}</span>
      <MuiTextField
        variant="outlined"
        error={!!errors?.[name]}
        helperText={helperText}
        fullWidth={fullWidth}
        {...(register && register(name))}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#E5E7EB",
            },
            "&:hover fieldset": {
              borderColor: "#D1D5DB",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#6941C6",
            },
            "&.Mui-error fieldset": {
              borderColor: "#EF4444",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#79747E",
            "&.Mui-focused": {
              color: "#6941C6",
            },
            "&.Mui-error": {
              color: "#EF4444",
            },
          },
          "& .MuiInputBase-input": {
            color: "#4A4459",
            fontSize: "14px",
            padding: "12px 16px",
          },
          "& .MuiFormHelperText-root": {
            marginLeft: "2px",
            "&.Mui-error": {
              color: "#EF4444",
            },
          },
        }}
        {...props}
      />
      {errors?.[name] && <span className="text-[12px] text-[#EF4444]">{errors?.[name]?.message as string}</span>}
    </div>
  );
};

export default TextField;
