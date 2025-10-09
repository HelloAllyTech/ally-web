import { FC } from "react";

import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";

import { DatePickerProps } from "./types";

const DatePicker: FC<DatePickerProps> = ({ value, onChange, disableFuture, maxDate }) => {
  return (
    <MuiDatePicker
      value={value}
      onChange={onChange}
      disableFuture={disableFuture}
      maxDate={maxDate}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          sx: {
            "& .MuiPickersInputBase-root, & .MuiInputBase-root": {
              borderRadius: "4px",
              padding: "8px",
              backgroundColor: "#fff",
              height: "36px",

              "& .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #D2D2D2",
              },
              "&:hover .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #D2D2D2",
              },
              "&.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #0957D0",
              },
            },
          },
        },
      }}
    />
  );
};

export default DatePicker;
